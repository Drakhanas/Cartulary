
// Track image references during Markdown export. Returns a safe filename for
// the manifest, deduping by source value so the same image referenced in multiple
// entries is collected once.
const imageManifestEntry = (sourceValue, manifest) => {
  if (!sourceValue || typeof sourceValue !== "string") return "missing.png";
  if (manifest.bySource[sourceValue]) return manifest.bySource[sourceValue];

  let safeName;
  if (sourceValue.startsWith("data:")) {
    // base64 data URL — generate a name based on count + extension from MIME
    const mimeMatch = sourceValue.match(/^data:image\/([a-z0-9+]+)/i);
    const ext = mimeMatch ? (mimeMatch[1] === "jpeg" ? "jpg" : mimeMatch[1]) : "png";
    safeName = `inline-${manifest.inlineCount + 1}.${ext}`;
    manifest.inlineCount++;
  } else {
    // Folder-mode filename — strip path, dedupe with -2, -3 suffix if collision
    const base = sourceValue.split(/[\\/]/).pop() || "image";
    safeName = base;
    let n = 1;
    while (Object.values(manifest.bySource).includes(safeName)) {
      n++;
      const dot = base.lastIndexOf(".");
      safeName = dot >= 0 ? `${base.substring(0, dot)}-${n}${base.substring(dot)}` : `${base}-${n}`;
    }
  }

  manifest.bySource[sourceValue] = safeName;
  manifest.entries.push({ source: sourceValue, filename: safeName });
  return safeName;
};

// Longform note: literal text with optional 5-space indents and page-break
// dividers (form-feed \f on its own line). Serialized per surface so indents
// survive Markdown (4+ leading spaces would otherwise become a code block)
// and dividers become --- / <hr>.
const longformToMarkdown = (val) => {
  if (val == null) return "";
  return String(val).split("\f").map(seg =>
    seg.split("\n").map(line => {
      const lead = line.match(/^ +/);
      return lead ? "&nbsp;".repeat(lead[0].length) + line.slice(lead[0].length) : line;
    }).join("\n")
  ).join("\n\n---\n\n");
};
const longformToHtml = (val) => {
  if (val == null) return "";
  return String(val).split("\f")
    .map(seg => `<div style="white-space:pre-wrap">${htmlEscape(seg)}</div>`)
    .join('<hr style="page-break-before:always;border:none;border-top:1px solid #ccc;margin:0.9em 0" />');
};

const renderFieldForMd = (field, val, ctx) => {
  if (val == null || val === "" || (Array.isArray(val) && val.length === 0)) return null;
  const { entryById, calendar, options } = ctx;

  switch (field.type) {
    case "text":
      // v1.7 r043: a Short Text's [[links]] too, as the entry view reads them.
      return resolveWikiLinksForMd(String(val), ctx.wiki);

    case "number":
    case "url":
      return String(val);

    case "select":
      // v1.3: select values can be bare strings (legacy / no otherTextField)
      // or {value, customText} objects (otherTextField enabled). Use the
      // helper so the customText replaces "Other" cleanly when it's set.
      return formatSelectDisplay(val) || null;

    case "multiselect":
      // v1.5: array of chosen option strings. Empty handled by the null-guard
      // at the top of the function; here join the picks.
      return Array.isArray(val)
        ? (val.filter(x => x != null && String(x).trim() !== "").map(x => String(x).trim()).join(", ") || null)
        : null;

    case "tags":
      return typeof val === "string" ? val : "";

    case "date":
      return val;

    case "calendar-date":
      if (!val || val.year == null) return null;
      return (val.approximate ? "~" : "") + formatCalendarDate(val, calendar);

    case "calendar-date-range": {
      if (!val || (!val.start && !val.end)) return null;
      const startStr = val.start && val.start.year != null
        ? (val.start.approximate ? "~" : "") + formatCalendarDate(val.start, calendar)
        : "?";
      const endStr = val.end && val.end.year != null
        ? (val.end.approximate ? "~" : "") + formatCalendarDate(val.end, calendar)
        : "ongoing";
      return `${startStr} → ${endStr}`;
    }

    case "color":
      return null;

    case "image": {
      if (ctx.options?.collectImages && ctx.imageManifest) {
        // Produce a Markdown image link pointing to images/<filename>; the caller
        // resolves the actual bytes later (FSAA or base64) when assembling the zip.
        const safeName = imageManifestEntry(val, ctx.imageManifest);
        return `![](images/${safeName})`;
      }
      return `(image: ${val})`;
    }

    case "textarea":
      return resolveWikiLinksForMd(val, ctx.wiki);

    // v1.7 r043: written as the HTML export writes it, where it was
    // "[object Object]".
    case "name-history": {
      const items = Array.isArray(val) ? val.filter(it => it && it.name) : [];
      if (items.length === 0) return null;
      const fmt = (d) => (d && d.year != null ? (d.approximate ? "~" : "") + formatCalendarDate(d, calendar) : null);
      return items.map(it => {
        const from = fmt(it.from), to = fmt(it.to);
        const dates = from && to ? `${from} – ${to}` : from ? `from ${from}` : to ? `until ${to}` : "";
        return dates ? `${it.name} (${dates})` : it.name;
      }).join("; ");
    }

    case "longform":
      return longformToMarkdown(val);

    case "entry-ref": {
      const items = field.relationKind
        ? getRelationValues(val, field.multi)
        : (field.multi ? (Array.isArray(val) ? val.filter(Boolean) : []) : (val ? [val] : [])).map(id => ({ id }));
      const isSpouse = field.relationKind === SPOUSE_KIND;
      const fmt = (d) => d && d.year != null ? `${d.approximate ? "~" : ""}${formatCalendarDate(d, ctx.calendar)}` : null;
      const rendered = items.map(it => {
        // v1.7 r003: a body, a Glossopoeia record, or a map writes its name too.
        const ref = entryById[it.id] || (ctx.nodeById && ctx.nodeById[it.id]);
        if (!ref) return "(missing entry)";
        const labelPart = it.label ? ` (called "${it.label}")` : "";
        const statusPart = it.status && it.status !== "active" ? ` [${it.status}]` : "";
        let datesPart = "";
        if (isSpouse) {
          const mStr = fmt(it.marriedOn);
          const eStr = fmt(it.endedOn);
          if (mStr && eStr) datesPart = ` — married ${mStr}, ended ${eStr}`;
          else if (mStr) datesPart = ` — married ${mStr}`;
          else if (eStr) datesPart = ` — ended ${eStr}`;
        }
        return `${ref.name}${labelPart}${statusPart}${datesPart}`;
      });
      return rendered.length ? rendered.join(", ") : null;
    }

    case "group": {
      if (!Array.isArray(val) || val.length === 0) return null;
      // Indent nested groups so subgroup content sits visually below the
      // parent's bullet. Three spaces per depth level matches the existing
      // convention for the "   - " subfield bullet at depth 0.
      const depth = ctx.groupDepth || 0;
      const indent = "   ".repeat(depth);
      const subCtx = { ...ctx, groupDepth: depth + 1 };
      const out = [];
      val.forEach((inst, i) => {
        out.push(`\n${indent}${i + 1}.`);
        (field.subfields || []).forEach(sub => {
          if (sub.secret && !options.includeSecrets) return;
          // v1.3: showWhen evaluated against this group instance's values
          if (!isFieldVisible(sub, inst)) return;
          const subVal = inst[sub.id];
          const sr = renderFieldForMd(sub, subVal, subCtx);
          if (sr == null || sr === "") return;
          const marker = sub.secret ? " [SECRET]" : "";
          out.push(`${indent}   - **${sub.label}${marker}:** ${sr}`);
        });
      });
      return out.join("\n");
    }

    case "grid": {
      const g = coerceGridValue(val);
      if (gridIsEmpty(g)) return null;
      const esc = (s) => String(s == null ? "" : s).replace(/\|/g, "\\|").replace(/\n/g, " ");
      const cellStr = (rid, cid) => {
        const cell = g.cells[rid]?.[cid];
        if (gridCellIsEmpty(cell)) return "";
        const { type, value: cv } = cell;
        if (type === "entry-ref") { const ref = entryById[cv] || (ctx.nodeById && ctx.nodeById[cv]); return ref ? ref.name : "(missing entry)"; }
        if (type === "calendar-date") return cv && cv.year != null ? (cv.approximate ? "~" : "") + formatCalendarDate(cv, ctx.calendar) : "";
        if (type === "calendar-date-range") {
          const s = cv.start && cv.start.year != null ? (cv.start.approximate ? "~" : "") + formatCalendarDate(cv.start, ctx.calendar) : "?";
          const e2 = cv.end && cv.end.year != null ? (cv.end.approximate ? "~" : "") + formatCalendarDate(cv.end, ctx.calendar) : "ongoing";
          return `${s} → ${e2}`;
        }
        return String(cv);
      };
      const corner = (g.colAxisLabel || g.rowAxisLabel) ? esc([g.rowAxisLabel, g.colAxisLabel].filter(Boolean).join(" / ")) : "";
      const header = [corner, ...g.cols.map(c => esc(c.label))];
      const lines = [`| ${header.join(" | ")} |`, `| ${header.map(() => "---").join(" | ")} |`];
      g.rows.forEach(r => {
        lines.push(`| ${[esc(r.label), ...g.cols.map(c => esc(cellStr(r.id, c.id)))].join(" | ")} |`);
      });
      return "\n" + lines.join("\n") + "\n";
    }

    default:
      return String(val);
  }
};

// Render one entry's body (everything inside its heading) as markdown lines.
// Used by both the full-world export and the single-entry export. Returns an
// array of lines (no trailing empty line; caller controls separation).
const renderEntryBodyMarkdown = (entry, tpl, ctx, options) => {
  const lines = [];
  if (entry.tags && entry.tags.length) {
    lines.push(`**Tags:** ${entry.tags.join(", ")}`);
    lines.push("");
  }
  const inlineLines = [];
  const blockSections = [];
  // v1.3: pre-index cascade children so when we render a cascade parent we
  // can append the child's value in the same row, and we skip the child's
  // own iteration (it's already in the parent's row). Same convention as the
  // Concordance hover pane.
  const cascadeChildByParentId = {};
  for (const f of (tpl.fields || [])) {
    if (f.type === "select" && f.dependsOn) cascadeChildByParentId[f.dependsOn] = f;
  }
  tpl.fields.forEach(field => {
    if (field.secret && !options.includeSecrets) return;
    // v1.3: showWhen conditional visibility — skip hidden fields from export
    if (!isFieldVisible(field, entry.fields || {})) return;
    // Skip cascade children — rendered combined with parent
    if (field.type === "select" && field.dependsOn) return;
    const val = (entry.fields || {})[field.id];
    let rendered = renderFieldForMd(field, val, ctx);
    if (rendered == null || rendered === "") return;
    // If this is a cascade parent, append the child's display value
    if (field.type === "select") {
      const childField = cascadeChildByParentId[field.id];
      if (childField) {
        const childDisplay = formatSelectDisplay((entry.fields || {})[childField.id]);
        if (childDisplay && childDisplay.trim()) {
          rendered = `${rendered} - ${childDisplay.trim()}`;
        }
      }
    }
    const marker = field.secret ? " [SECRET]" : "";
    const isLong = field.type === "textarea" || field.type === "longform" || field.type === "group" || field.type === "grid" ||
                   (typeof rendered === "string" && rendered.length > 120);
    if (isLong) {
      blockSections.push({ label: `${field.label}${marker}`, content: rendered });
    } else {
      inlineLines.push(`- **${field.label}${marker}:** ${rendered}`);
    }
  });
  if (inlineLines.length) {
    lines.push(...inlineLines);
    lines.push("");
  }
  blockSections.forEach(b => {
    lines.push(`**${b.label}:**`);
    lines.push("");
    lines.push(b.content);
    lines.push("");
  });
  if (entry.mapData?.pins?.length) {
    lines.push(`**Pins:**`);
    entry.mapData.pins.forEach(pin => {
      const linked = pin.entryId ? ctx.entryById[pin.entryId] : null;
      const label = pin.label || "(unlabeled)";
      const target = linked ? ` → ${linked.name}` : "";
      const notes = pin.notes ? ` — ${pin.notes}` : "";
      lines.push(`- ${label}${target}${notes}`);
    });
    lines.push("");
  }
  return lines;
};

// Build a single-entry markdown export. Self-contained — includes a brief
// world-context header so the file makes sense out of context.
const buildSingleEntryMarkdown = (entry, template, state, options = { includeSecrets: false }) => {
  const { entries, world } = state;
  const entryById = Object.fromEntries(entries.map(e => [e.id, e]));
  // v1.7 r043: [[links]] through the world's one resolver, and the entry's
  // dates in its own calendar, as the HTML export has them by default.
  const ctx = { entryById, nodeById: registeredNodeIndex(state), wiki: wikiResolverOf(state), calendar: getCalendar(state, entry.calendarId), options, imageManifest: null };

  const out = [];
  out.push(`# ${entry.name || "(unnamed)"}`);
  out.push("");
  out.push(`*${template.icon} ${template.name} · from ${world.name || "Untitled World"}*  `);
  out.push(`*Exported ${new Date().toISOString().slice(0, 10)} as Markdown.*${options.includeSecrets ? "  \n*Secret-marked fields included.*" : ""}`);
  out.push("");
  out.push(...renderEntryBodyMarkdown(entry, template, ctx, options));
  return out.join("\n");
};

// Build a family-tree-shaped markdown export from a focal person. Walks
// ancestors via Sosa-Stradonitz numbering (focal=1, parent=2N/2N+1) for the
// indented hierarchy, then lists spouses, siblings, and descendants. Uses
// only entries reachable from the focal — not the whole world.
const buildFamilyTreeMarkdown = (focalId, state) => {
  const { entries, templates, world } = state;
  const entryById = Object.fromEntries(entries.map(e => [e.id, e]));
  const tplById = Object.fromEntries(templates.map(t => [t.id, t]));
  const focal = entryById[focalId];
  if (!focal) return null;

  const family = buildFamilyData(entries, templates);
  const { parentsOf, childrenOf, spousesOf } = family;

  const nameOf = (id) => entryById[id]?.name || "(unknown)";
  const statusOf = (id) => {
    const e = entryById[id];
    if (!e) return null;
    const tpl = tplById[e.templateId];
    if (!tpl) return null;
    const statusField = tpl.fields.find(f => f.label === "Status" && f.type === "select");
    if (!statusField) return null;
    return e.fields?.[statusField.id] || null;
  };
  const deceasedMark = (id) => statusOf(id) === "Deceased" ? " ✝" : "";

  const sortParents = (parents) => [...parents].sort((a, b) => {
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
  const parentLabels = {};
  {
    const queue = [{ id: focalId, num: 1 }];
    while (queue.length > 0) {
      const { id, num } = queue.shift();
      const gen = Math.floor(Math.log2(num));
      if (gen >= 8) continue;
      const sorted = sortParents(parentsOf[id] || []);
      if (sorted[0] && !sosa[sorted[0].id]) {
        sosa[sorted[0].id] = num * 2;
        parentLabels[sorted[0].id] = sorted[0].label || "Parent";
        queue.push({ id: sorted[0].id, num: num * 2 });
      }
      if (sorted[1] && !sosa[sorted[1].id]) {
        sosa[sorted[1].id] = num * 2 + 1;
        parentLabels[sorted[1].id] = sorted[1].label || "Parent";
        queue.push({ id: sorted[1].id, num: num * 2 + 1 });
      }
    }
  }
  const numToId = {};
  Object.entries(sosa).forEach(([id, num]) => { numToId[num] = id; });

  const renderAncestors = () => {
    const lines = [];
    const recurse = (id, num, depth) => {
      const indent = "  ".repeat(depth);
      const label = parentLabels[id];
      const labelText = label ? ` *(${label})*` : "";
      lines.push(`${indent}- **${num}.** ${nameOf(id)}${labelText}${deceasedMark(id)}`);
      const fid = numToId[num * 2];
      const mid = numToId[num * 2 + 1];
      if (fid) recurse(fid, num * 2, depth + 1);
      if (mid) recurse(mid, num * 2 + 1, depth + 1);
    };
    if (numToId[2]) recurse(numToId[2], 2, 0);
    if (numToId[3]) recurse(numToId[3], 3, 0);
    return lines;
  };

  // Collect parents 3+ on any traced person — Sosa only places the first two
  // sorted parents per child. Extras would otherwise be silently dropped from
  // the export (the Family Tree view places them beside Sosa positions, but
  // markdown's hierarchical bullet structure makes inline placement awkward).
  // We list them in an addendum at the end of the Ancestors section.
  const renderExtraParents = () => {
    const traced = new Set([focalId, ...Object.keys(sosa)]);
    const extras = [];
    traced.forEach(id => {
      const sorted = sortParents(parentsOf[id] || []);
      sorted.forEach((p, idx) => {
        if (idx < 2) return;  // first two are Sosa-placed
        extras.push({ childId: id, parent: p });
      });
    });
    if (extras.length === 0) return [];
    const out = [];
    out.push(`*Additional parents (3+ on a single child) — placed beside the Sosa positions in the Linea view, listed here for completeness:*`);
    out.push("");
    extras.forEach(({ childId, parent }) => {
      const pLabel = parent.label ? ` (${parent.label})` : "";
      out.push(`- ${nameOf(parent.id)}${pLabel}${deceasedMark(parent.id)} → parent of ${nameOf(childId)}`);
    });
    return out;
  };

  const renderSpouses = () => {
    const spouses = spousesOf[focalId] || [];
    if (spouses.length === 0) return [];
    return spouses.map(s => {
      const status = s.status === "former" ? "Former" : s.status === "estranged" ? "Estranged" : "Active";
      const lab = s.label || "Spouse";
      return `- ${nameOf(s.id)}${deceasedMark(s.id)} — *${lab}, ${status}*`;
    });
  };

  const renderSiblings = () => {
    const focalParents = (parentsOf[focalId] || []).map(p => p.id);
    if (focalParents.length === 0) return [];
    const sibIds = new Set();
    Object.entries(parentsOf).forEach(([eid, parents]) => {
      if (eid === focalId) return;
      if (parents.some(p => focalParents.includes(p.id))) sibIds.add(eid);
    });
    if (sibIds.size === 0) return [];
    return [...sibIds]
      .sort((a, b) => (nameOf(a) || "").localeCompare(nameOf(b) || ""))
      .map(id => `- ${nameOf(id)}${deceasedMark(id)}`);
  };

  const renderDescendants = () => {
    const lines = [];
    const seen = new Set();
    const recurse = (id, depth) => {
      if (seen.has(id) || depth > 6) return;
      seen.add(id);
      const indent = "  ".repeat(depth);
      lines.push(`${indent}- ${nameOf(id)}${deceasedMark(id)}`);
      const kids = (childrenOf[id] || [])
        .map(c => c.id)
        .sort((a, b) => (nameOf(a) || "").localeCompare(nameOf(b) || ""));
      kids.forEach(cid => recurse(cid, depth + 1));
    };
    const directKids = (childrenOf[focalId] || [])
      .map(c => c.id)
      .sort((a, b) => (nameOf(a) || "").localeCompare(nameOf(b) || ""));
    directKids.forEach(cid => recurse(cid, 0));
    return lines;
  };

  const ancestorLines = renderAncestors();
  const extraParentLines = renderExtraParents();
  const spouseLines = renderSpouses();
  const siblingLines = renderSiblings();
  const descendantLines = renderDescendants();

  const out = [];
  out.push(`# Linea: ${focal.name}`);
  out.push("");
  out.push(`*From ${world.name || "Untitled World"}, exported ${new Date().toISOString().slice(0, 10)}.*`);
  out.push("");
  out.push(`**Focal person:** ${focal.name}${deceasedMark(focalId)}`);
  out.push("");

  if (ancestorLines.length > 0) {
    out.push(`## Ancestors`);
    out.push("");
    out.push(`*Numbered by Sosa-Stradonitz: focal is 1, parents are 2 (father) and 3 (mother), grandparents 4–7, great-grandparents 8–15, etc. Father / mother sides come from parent label hints with ID-sort as the fallback — same rule as the Linea view.*`);
    out.push("");
    out.push(...ancestorLines);
    if (extraParentLines.length > 0) {
      out.push("");
      out.push(...extraParentLines);
    }
    out.push("");
  } else if (extraParentLines.length > 0) {
    // Edge case: no Sosa-numbered ancestors but extra parents exist (would
    // mean focal has 3+ parents but none of them have parents themselves)
    out.push(`## Ancestors`);
    out.push("");
    out.push(...extraParentLines);
    out.push("");
  }

  if (spouseLines.length > 0) {
    out.push(`## Spouses`);
    out.push("");
    out.push(...spouseLines);
    out.push("");
  }

  if (siblingLines.length > 0) {
    out.push(`## Siblings`);
    out.push("");
    out.push(...siblingLines);
    out.push("");
  }

  if (descendantLines.length > 0) {
    out.push(`## Descendants`);
    out.push("");
    out.push(...descendantLines);
    out.push("");
  }

  if (ancestorLines.length === 0 && extraParentLines.length === 0 && spouseLines.length === 0 && siblingLines.length === 0 && descendantLines.length === 0) {
    out.push(`*No family relations recorded for this person.*`);
    out.push("");
  }

  return out.join("\n");
};

const buildMarkdownExport = (state, options = { includeSecrets: false }) => {
  const { templates, entries, world } = state;
  const entryById = Object.fromEntries(entries.map(e => [e.id, e]));
  const imageManifest = options.collectImages ? { bySource: {}, entries: [], inlineCount: 0 } : null;
  // v1.7 r043: [[links]] through the world's one resolver.
  const ctx = { entryById, nodeById: registeredNodeIndex(state), wiki: wikiResolverOf(state), calendar: world.calendar, options, imageManifest };

  const out = [];
  // Header block
  out.push(`# ${world.name || "Untitled World"}`);
  out.push("");
  if (world.description) {
    out.push(resolveWikiLinksForMd(world.description, ctx.wiki));
    out.push("");
  }
  out.push(`*Exported ${new Date().toISOString().slice(0, 10)} as Markdown.*  `);
  out.push(`*${entries.length} ${entries.length === 1 ? "entry" : "entries"} across ${templates.length} ${templates.length === 1 ? "template" : "templates"}.*`);
  if (!options.includeSecrets) {
    out.push(`*Secret-marked fields excluded from this export.*`);
  } else {
    out.push(`*Secret-marked fields included.*`);
  }
  out.push("");

  // Calendar
  if (world.calendar) {
    out.push(`## Calendar`);
    out.push("");
    out.push(`**Name:** ${world.calendar.name || "Unnamed"}`);
    out.push("");
    if (Array.isArray(world.calendar.months) && world.calendar.months.length) {
      out.push(`**Months (${world.calendar.months.length}):**`);
      world.calendar.months.forEach((m, i) => {
        out.push(`${i + 1}. ${m.name} — ${m.days} days`);
      });
      out.push("");
    }
    if (Array.isArray(world.calendar.eras) && world.calendar.eras.length) {
      out.push(`**Eras:**`);
      world.calendar.eras.forEach(e => {
        const short = e.shortName ? ` (${e.shortName})` : "";
        const start = e.startYear != null ? `, starts year ${e.startYear}` : "";
        out.push(`- ${e.name}${short}${start}`);
      });
      out.push("");
    }
    if (world.calendar.notes) {
      out.push(world.calendar.notes);
      out.push("");
    }
  }

  // Group entries by template
  const byTemplate = {};
  templates.forEach(t => { byTemplate[t.id] = []; });
  entries.forEach(e => {
    if (byTemplate[e.templateId]) byTemplate[e.templateId].push(e);
  });

  // Render each template's entries
  templates.forEach(tpl => {
    const list = byTemplate[tpl.id];
    if (!list || list.length === 0) return;
    const sorted = [...list].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    out.push(`## ${tpl.name} (${sorted.length})`);
    out.push("");

    sorted.forEach(entry => {
      out.push(`### ${entry.name || "(unnamed)"}`);
      out.push("");
      // v1.7 r043: each entry's dates in its own calendar, as the HTML
      // export has them by default, where every date was the primary's.
      out.push(...renderEntryBodyMarkdown(entry, tpl, { ...ctx, calendar: getCalendar(state, entry.calendarId) }, options));
    });
  });

  // Maps section (v1.6 r001). Maps are records in state.cartographia, rendered
  // through the shared body renderer with the fixed map schema; the pin block
  // fires off mapData. Mirrors v1.5 output (fields + pins); the canvas image is
  // not embedded in markdown, same as before.
  const mapRecords = Array.isArray(state.cartographia)
    ? [...state.cartographia].sort((a, b) => (a.name || "").localeCompare(b.name || ""))
    : [];
  if (mapRecords.length > 0) {
    const mapSchema = cartographiaMapSchema();
    out.push(`## Maps (${mapRecords.length})`);
    out.push("");
    mapRecords.forEach(rec => {
      out.push(`### ${rec.name || "(unnamed map)"}`);
      out.push("");
      out.push(...renderEntryBodyMarkdown(rec, mapSchema, ctx, options));
    });
  }

  const md = out.join("\n");
  if (imageManifest) return { markdown: md, imageManifest };
  return md;
};

// ─── HTML export ──────────────────────────────────────────────────────────────
//
// Single-file HTML export per world. Self-contained: inlined CSS, base64 images
// (data URLs ship inline; FSAA filenames render as placeholders in stage 02 and
// get async-resolved in stage 03 alongside map rendering). Pre-rendered
// markdown. No external requests after open. Read-only artifact for sharing
// with non-Cartulary users.

// HTML-escape helper. Defensive against null/undefined.
const htmlEscape = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
);

// Collect every image reference across all entries' fields + map mapData.image.
// Walks group subfields recursively so image fields nested inside repeating
// groups get caught. Returns a Set of unique source strings.
const collectImageRefsForHtmlExport = (state) => {
  const refs = new Set();
  const walk = (fields, valueMap) => {
    if (!Array.isArray(fields) || !valueMap) return;
    fields.forEach(f => {
      const val = valueMap[f.id];
      if (val == null) return;
      if (f.type === "image" && typeof val === "string" && val) {
        refs.add(val);
      } else if (f.type === "group" && Array.isArray(val)) {
        val.forEach(inst => walk(f.subfields || [], inst));
      }
    });
  };
  state.entries.forEach(entry => {
    const tpl = state.templates.find(t => t.id === entry.templateId);
    if (!tpl) return;
    walk(tpl.fields || [], entry.fields || {});
  });
  // Map canvas backgrounds now live in the cartographia slice, not on entries;
  // raster layers' images (r043) sit beside them in the drawing.
  (Array.isArray(state.cartographia) ? state.cartographia : []).forEach(rec => {
    if (rec && rec.mapData && typeof rec.mapData.image === "string" && rec.mapData.image) {
      refs.add(rec.mapData.image);
    }
    const layers = rec && rec.mapData && rec.mapData.drawing && Array.isArray(rec.mapData.drawing.layers) ? rec.mapData.drawing.layers : [];
    layers.forEach(l => {
      if (l && l.kind === "raster" && typeof l.image === "string" && l.image) refs.add(l.image);
    });
  });
  return refs;
};

// Resolve every image reference to a data URL. Data URLs already inline pass
// through; FSAA filenames are fetched via dirHandle.getFileHandle + fileToDataUrl.
// Missing files (FSAA folder disconnected, file moved, etc.) resolve to null,
// which the renderer surfaces as a placeholder.
const resolveImageManifestForHtmlExport = async (refs, dirHandle) => {
  const manifest = new Map();
  for (const ref of refs) {
    if (!ref || typeof ref !== "string") {
      manifest.set(ref, null);
      continue;
    }
    if (ref.startsWith("data:")) {
      manifest.set(ref, ref);
      continue;
    }
    if (!dirHandle) {
      manifest.set(ref, null);
      continue;
    }
    try {
      const fh = await dirHandle.getFileHandle(ref);
      const file = await fh.getFile();
      const dataUrl = await fileToDataUrl(file);
      manifest.set(ref, dataUrl);
    } catch (e) {
      console.warn(`HTML export: image not found: ${ref}`, e);
      manifest.set(ref, null);
    }
  }
  return manifest;
};

// Natural pixel size of an image given as a data URL, or null if it will not
// decode. The map canvas's viewBox is the image's natural size (pins are
// normalized to that rect), so the export has to know it before it can write
// the svg; the manifest only carries the bytes.
const loadImageNaturalSizeForExport = (src) => new Promise(resolve => {
  const img = new Image();
  img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
  img.onerror = () => resolve(null);
  img.src = src;
});

// Map<image ref, {width, height}|null> for every map image the manifest
// resolved. Entry-field images are not measured; nothing positions against them.
const resolveMapImageSizesForHtmlExport = async (state, manifest) => {
  const sizes = new Map();
  if (!manifest) return sizes;
  const maps = Array.isArray(state.cartographia) ? state.cartographia : [];
  for (const rec of maps) {
    const ref = rec && rec.mapData && rec.mapData.image;
    if (!ref || sizes.has(ref)) continue;
    const dataUrl = manifest.get(ref);
    if (!dataUrl) continue;
    sizes.set(ref, await loadImageNaturalSizeForExport(dataUrl));
  }
  return sizes;
};

// Project a calendar-date value from one calendar's frame to another, via
// absoluteDay. Returns the projected {year, monthIndex, day, approximate}
// or null if conversion fails. When fromCal === toCal, returns the original
// value unchanged. Used when the export forces all dates into a chosen
// calendar (options.dateCalendarId !== "per-entry").
const projectDateForExport = (date, fromCal, toCal) => {
  if (!date || date.year == null) return null;
  if (!fromCal || !toCal) return date;
  if (fromCal === toCal) return date;
  const abs = calendarDateToAbsoluteDay(fromCal, date);
  if (abs == null) return null;
  const projected = absoluteDayToCalendarDate(toCal, abs);
  if (!projected) return null;
  // Preserve approximate flag — it's about the source date's certainty,
  // not the projection itself.
  if (date.approximate) projected.approximate = true;
  return projected;
};

// Format a calendar-date for HTML export, doing per-export calendar projection
// when needed. ctx.displayCalendar is the calendar to render into;
// ctx.entryCalendar is the source frame. Returns the formatted string with
// "~" prefix when approximate, or null when the date is empty/unprojectable.
const formatDateForHtml = (date, ctx) => {
  if (!date || date.year == null) return null;
  let v = date;
  if (ctx.entryCalendar !== ctx.displayCalendar) {
    v = projectDateForExport(date, ctx.entryCalendar, ctx.displayCalendar);
    if (!v) return null;
  }
  return (v.approximate || date.approximate ? "~" : "") + formatCalendarDate(v, ctx.displayCalendar);
};

// v1.7 r003: the registered records (bodies, Glossopoeia records, maps) by id,
// for an export's context, so a reference to one resolves as an entry's does.
const registeredNodeIndex = (state) =>
  Object.fromEntries(getRegisteredGraphNodes(state).map(n => [n.id, n]));

// v1.7 r003: one reference value in the HTML export. An entry links to its
// article, and so does a map, whose article reuses the entry-<id> scheme; a
// body or a Glossopoeia record has no article, so it's its name, titled with
// its type; an id nothing has is the broken-link span it always was. Since
// v1.7 r023 a context may name what its file holds (articleIds, a Fabula
// bible's): then a reference to one of them links to its article, and any
// other reference is its name, a map's with its source's name as a body's.
const refLinkHtml = (id, ctx) => {
  const ref = ctx.entryById[id];
  const node = ctx.nodeById ? ctx.nodeById[id] : null;
  if (ctx.articleIds) {
    const named = ref || node;
    if (named && ctx.articleIds.has(id)) return `<a class="entry-ref-link" href="#entry-${htmlEscape(id)}">${htmlEscape(named.name)}</a>`;
    if (ref) return `<span class="entry-ref-record" title="World entry">${htmlEscape(ref.name)}</span>`;
  } else {
    if (ref) return `<a class="entry-ref-link" href="#entry-${htmlEscape(ref.id)}">${htmlEscape(ref.name)}</a>`;
    if (node && node.templateId === SYNTH_TPL_MAP) return `<a class="entry-ref-link" href="#entry-${htmlEscape(node.id)}">${htmlEscape(node.name)}</a>`;
  }
  if (node) {
    const src = getRegisteredSourceById(node.templateId);
    return `<span class="entry-ref-record" title="${htmlEscape(src ? src.name : "")}">${htmlEscape(node.name)}</span>`;
  }
  return `<span class="broken-link" title="Referenced entry no longer exists">(missing entry)</span>`;
};

// Render one field's value as HTML. Mirrors renderFieldForMd's structure but
// emits HTML strings (already escaped) and resolves cross-references as anchor
// hrefs. Returns null when the value is empty / should be suppressed.
const renderFieldForHtml = (field, val, ctx) => {
  if (val == null || val === "" || (Array.isArray(val) && val.length === 0)) return null;
  const { entryById, options } = ctx;

  switch (field.type) {
    case "text":
      // v1.7 r043: a Short Text's [[links]] too, as the entry view reads them.
      return resolveWikiLinksForHtml(String(val), ctx.wiki, htmlEscape, ctx.articleIds);

    case "number":
      return htmlEscape(val);

    case "url": {
      // Sanitize the URL protocol: javascript:, vbscript:, and data: URLs
      // are XSS vectors when the export is opened by someone other than the
      // world author. Permit http(s), mailto, tel, and bare paths/anchors;
      // anything else renders as plain text without an href.
      const v = String(val == null ? "" : val).trim();
      const lower = v.toLowerCase();
      const dangerous = lower.startsWith("javascript:") || lower.startsWith("vbscript:") || lower.startsWith("data:") || lower.startsWith("file:");
      if (dangerous) {
        return `<span class="field-link-blocked" title="Blocked URL protocol">${htmlEscape(v)}</span>`;
      }
      return `<a class="field-link" href="${htmlEscape(v)}" target="_blank" rel="noopener noreferrer">${htmlEscape(v)}</a>`;
    }

    case "select":
      return htmlEscape(formatSelectDisplay(val) || "") || null;

    case "multiselect":
      return Array.isArray(val)
        ? (val.filter(x => x != null && String(x).trim() !== "").map(x => htmlEscape(String(x).trim())).join(", ") || null)
        : null;

    case "tags":
      return typeof val === "string" ? htmlEscape(val) : "";

    case "date":
      return htmlEscape(val);

    case "calendar-date":
      return htmlEscape(formatDateForHtml(val, ctx) || "") || null;

    case "calendar-date-range": {
      if (!val || (!val.start && !val.end)) return null;
      const startStr = val.start && val.start.year != null ? formatDateForHtml(val.start, ctx) : "?";
      const endStr = val.end && val.end.year != null ? formatDateForHtml(val.end, ctx) : "ongoing";
      return `${htmlEscape(startStr || "?")} &rarr; ${htmlEscape(endStr || "ongoing")}`;
    }

    case "color":
      return null;

    case "image": {
      // ctx.imageManifest is a Map<string, string|null>: source ref → data URL
      // (or null if unresolvable). Inline data URLs and FSAA filenames both
      // resolved during the pre-render manifest pass.
      if (typeof val !== "string" || !val) return null;
      const dataUrl = ctx.imageManifest ? ctx.imageManifest.get(val) : null;
      if (dataUrl) {
        return `<img class="field-image" src="${htmlEscape(dataUrl)}" alt="" loading="lazy" />`;
      }
      return `<span class="field-image-placeholder">(image not embedded: ${htmlEscape(val)})</span>`;
    }

    case "textarea": {
      // Resolve wiki-links to anchor hrefs, then run through marked.parse to
      // process the surrounding markdown. marked treats the inline anchor HTML
      // as-is and processes the rest as markdown.
      const withLinks = resolveWikiLinksForHtml(val, ctx.wiki, htmlEscape, ctx.articleIds);
      if (typeof marked !== "undefined" && marked.parse) {
        try {
          return marked.parse(withLinks);
        } catch (e) {
          // Fallback to escaped text on parse failure
          return `<p>${withLinks}</p>`;
        }
      }
      return `<p>${withLinks}</p>`;
    }

    case "longform":
      return longformToHtml(val);

    case "entry-ref": {
      const items = field.relationKind
        ? getRelationValues(val, field.multi)
        : (field.multi ? (Array.isArray(val) ? val.filter(Boolean) : []) : (val ? [val] : [])).map(id => ({ id }));
      const isSpouse = field.relationKind === SPOUSE_KIND;
      const rendered = items.map(it => {
        const linkOrSpan = refLinkHtml(it.id, ctx);
        const labelPart = it.label ? ` <span class="entry-ref-label">(called &ldquo;${htmlEscape(it.label)}&rdquo;)</span>` : "";
        const statusPart = it.status && it.status !== "active" ? ` <span class="entry-ref-status">[${htmlEscape(it.status)}]</span>` : "";
        let datesPart = "";
        if (isSpouse) {
          const mStr = it.marriedOn && it.marriedOn.year != null ? formatDateForHtml(it.marriedOn, ctx) : null;
          const eStr = it.endedOn && it.endedOn.year != null ? formatDateForHtml(it.endedOn, ctx) : null;
          if (mStr && eStr) datesPart = ` <span class="entry-ref-dates">&mdash; married ${htmlEscape(mStr)}, ended ${htmlEscape(eStr)}</span>`;
          else if (mStr) datesPart = ` <span class="entry-ref-dates">&mdash; married ${htmlEscape(mStr)}</span>`;
          else if (eStr) datesPart = ` <span class="entry-ref-dates">&mdash; ended ${htmlEscape(eStr)}</span>`;
        }
        return `${linkOrSpan}${labelPart}${statusPart}${datesPart}`;
      });
      return rendered.length ? rendered.join(", ") : null;
    }

    case "name-history": {
      const items = Array.isArray(val) ? val.filter(it => it && it.name) : [];
      if (items.length === 0) return null;
      const rows = items.map(it => {
        const fromStr = it.from && it.from.year != null ? formatDateForHtml(it.from, ctx) : null;
        const toStr = it.to && it.to.year != null ? formatDateForHtml(it.to, ctx) : null;
        let dateStr = "";
        if (fromStr && toStr) dateStr = `${fromStr} &ndash; ${toStr}`;
        else if (fromStr) dateStr = `from ${fromStr}`;
        else if (toStr) dateStr = `until ${toStr}`;
        return `<li><span class="name-history-name">${htmlEscape(it.name)}</span>${dateStr ? ` <span class="name-history-date">(${htmlEscape(dateStr)})</span>` : ""}</li>`;
      });
      return `<ul class="name-history">${rows.join("")}</ul>`;
    }

    case "group": {
      if (!Array.isArray(val) || val.length === 0) return null;
      const subCtx = { ...ctx };
      const instances = val.map((inst, i) => {
        const rows = [];
        (field.subfields || []).forEach(sub => {
          if (sub.secret && !options.includeSecrets) return;
          if (!isFieldVisible(sub, inst)) return;
          const subVal = inst[sub.id];
          const sr = renderFieldForHtml(sub, subVal, subCtx);
          if (sr == null || sr === "") return;
          const marker = sub.secret ? ' <span class="secret-marker">[SECRET]</span>' : "";
          rows.push(`<dt>${htmlEscape(sub.label)}${marker}</dt><dd>${sr}</dd>`);
        });
        if (rows.length === 0) return "";
        return `<li class="group-instance"><div class="group-instance-num">${i + 1}.</div><dl class="group-fields">${rows.join("")}</dl></li>`;
      }).filter(s => s.length > 0);
      if (instances.length === 0) return null;
      return `<ol class="group-list">${instances.join("")}</ol>`;
    }

    case "grid": {
      const g = coerceGridValue(val);
      if (gridIsEmpty(g)) return null;
      const cellHtml = (rid, cid) => {
        const cell = g.cells[rid]?.[cid];
        if (gridCellIsEmpty(cell)) return "";
        const { type, value: cv } = cell;
        if (type === "entry-ref") return refLinkHtml(cv, ctx);
        if (type === "calendar-date") return cv && cv.year != null ? htmlEscape(formatDateForHtml(cv, ctx)) : "";
        if (type === "calendar-date-range") {
          const s = cv.start && cv.start.year != null ? htmlEscape(formatDateForHtml(cv.start, ctx)) : "?";
          const e2 = cv.end && cv.end.year != null ? htmlEscape(formatDateForHtml(cv.end, ctx)) : "ongoing";
          return `${s} &rarr; ${e2}`;
        }
        return htmlEscape(String(cv));
      };
      const bd = 'style="border:1px solid rgba(128,128,128,.4);padding:4px 8px;text-align:left"';
      const corner = htmlEscape([g.rowAxisLabel, g.colAxisLabel].filter(Boolean).join(" / "));
      const head = `<tr><th ${bd}>${corner}</th>${g.cols.map(c => `<th ${bd}>${htmlEscape(c.label)}</th>`).join("")}</tr>`;
      const body = g.rows.map(r =>
        `<tr><th ${bd}>${htmlEscape(r.label)}</th>${g.cols.map(c => `<td ${bd}>${cellHtml(r.id, c.id)}</td>`).join("")}</tr>`
      ).join("");
      return `<table class="field-grid-table" style="border-collapse:collapse"><thead>${head}</thead><tbody>${body}</tbody></table>`;
    }

    default:
      return htmlEscape(String(val));
  }
};

// Render a map record's mapData as the drawing canvas (the one svg tree, string
// serialized; the image inlined inside it when there is one) with the
// absolute-positioned pin overlay + numbered legend below. Pins filter through
// isPinVisibleAtAbsDay when ctx.currentMomentDay is set; null currentMomentDay
// shows all pins (per the warning-and-proceed flow in the export modal).
const renderMapHtml = (entry, tpl, state, ctx) => {
  const mapData = ensureMapData(entry.mapData);
  const allPins = Array.isArray(mapData.pins) ? mapData.pins : [];

  // currentMoment-aware pin filtering. Permanent pins always visible (handled
  // inside isPinVisibleAtAbsDay). Null currentMoment → no filter, all pins
  // render — matches the warning-and-proceed user choice.
  let visiblePins;
  if (ctx.currentMomentDay != null) {
    const entriesById = ctx.entryById;
    const templatesById = Object.fromEntries(state.templates.map(t => [t.id, t]));
    visiblePins = allPins.filter(pin => isPinVisibleAtAbsDay(pin, entriesById, templatesById, state, ctx.currentMomentDay));
  } else {
    visiblePins = allPins;
  }

  // Resolve the map background image through the manifest, and its natural
  // size through the sizes map; the canvas is drawn at that size.
  const imageDataUrl = (mapData.image && ctx.imageManifest) ? ctx.imageManifest.get(mapData.image) : null;
  const imageSize = (imageDataUrl && ctx.imageSizes) ? ctx.imageSizes.get(mapData.image) : null;
  // Raster layers (r043) resolve through the same manifest; one the manifest
  // could not read is left out of the drawing and named under it.
  const layerImages = {};
  const layersMissing = [];
  ensureDrawingShape(mapData.drawing).layers.forEach(l => {
    if (l.kind !== "raster" || !l.image || !l.visible) return;
    const v = l.image.startsWith("data:") ? l.image : (ctx.imageManifest ? ctx.imageManifest.get(l.image) : null);
    if (v) layerImages[l.image] = v; else layersMissing.push(l);
  });
  const layerNotes = layersMissing.map(l => `<div class="map-image-placeholder">(raster layer "${htmlEscape(l.name)}" not embedded: ${htmlEscape(l.image)})</div>`).join("");

  let imgHtml;
  if (imageDataUrl) {
    imgHtml = mapTreeToString(buildMapDrawingTree(mapData.drawing, {
      id: entry.id,
      className: "map-image",
      label: entry.name,
      imageHref: imageDataUrl,
      imageWidth: imageSize ? imageSize.width : null,
      imageHeight: imageSize ? imageSize.height : null,
      stamps: state.mapStamps,
      layerImages,
    })) + layerNotes;
  } else if (mapData.image) {
    imgHtml = `<div class="map-image-placeholder">(map image not embedded: ${htmlEscape(mapData.image)})</div>` + layerNotes;
  } else if (visiblePins.length === 0 && !mapDrawingHasContent(mapData.drawing)) {
    return `<div class="map-empty">(empty map: no image, no drawing, no pins)</div>`;
  } else {
    imgHtml = mapTreeToString(buildMapDrawingTree(mapData.drawing, { id: entry.id, className: "map-image", label: entry.name, stamps: state.mapStamps, layerImages })) + layerNotes;
  }

  // Numbered pin overlay. Each pin is an anchor (linked) or span (unlinked /
  // broken) positioned at (pin.x*100%, pin.y*100%) inside the container. The
  // marker is a numbered circle; the title attribute carries the entry name
  // and label for hover discovery.
  const pinDivs = visiblePins.map((pin, i) => {
    const num = i + 1;
    const linked = pin.entryId ? ctx.entryById[pin.entryId] : null;
    const labelText = pin.label || (linked ? linked.name : "(unlabeled)");
    const titleParts = [];
    if (pin.label) titleParts.push(pin.label);
    if (linked && linked.name !== pin.label) titleParts.push(`→ ${linked.name}`);
    if (pin.entryId && !linked) titleParts.push("(missing entry)");
    if (pin.permanent) titleParts.push("[permanent]");
    const titleAttr = titleParts.length > 0 ? titleParts.join(" ") : labelText;
    const color = pin.color || "";
    // Defensive: malformed mapData might have pins with non-numeric x/y.
    // Toiled-on Number(...).toFixed(2) would produce "NaN" → broken CSS
    // positioning. Default to center (0.5) when the value isn't a finite
    // number; better visible at center than stuck at top-left from CSS-NaN.
    const safeFraction = (v) => Number.isFinite(v) ? v : 0.5;
    const x = (safeFraction(pin.x) * 100).toFixed(2);
    const y = (safeFraction(pin.y) * 100).toFixed(2);
    const styleAttr = `left:${x}%;top:${y}%`;
    const markerStyle = color ? ` style="background:${htmlEscape(color)}"` : "";
    if (linked) {
      return `<a class="map-pin" href="#entry-${htmlEscape(linked.id)}" style="${styleAttr}" title="${htmlEscape(titleAttr)}"><span class="map-pin-marker"${markerStyle}>${num}</span></a>`;
    }
    return `<span class="map-pin" style="${styleAttr}" title="${htmlEscape(titleAttr)}"><span class="map-pin-marker"${markerStyle}>${num}</span></span>`;
  }).join("");

  // Legend below the map — numbered, links to each pin's linked entry when set.
  // Always rendered when any pins are visible; provides print-friendly + a11y
  // pin-name surface that hover labels can't.
  let legendHtml = "";
  if (visiblePins.length > 0) {
    const items = visiblePins.map((pin, i) => {
      const num = i + 1;
      const linked = pin.entryId ? ctx.entryById[pin.entryId] : null;
      const labelText = pin.label || (linked ? linked.name : "(unlabeled)");
      const linkBroken = pin.entryId && !linked;
      const permanentMark = pin.permanent ? ` <span class="map-legend-permanent" title="Permanent: always visible">\u25C7</span>` : "";
      if (linked) {
        return `<li><span class="map-legend-num">${num}.</span> <a href="#entry-${htmlEscape(linked.id)}">${htmlEscape(labelText)}</a>${permanentMark}</li>`;
      }
      if (linkBroken) {
        return `<li><span class="map-legend-num">${num}.</span> <span class="broken-link" title="Referenced entry no longer exists">${htmlEscape(labelText)}</span>${permanentMark}</li>`;
      }
      return `<li><span class="map-legend-num">${num}.</span> ${htmlEscape(labelText)}${permanentMark}</li>`;
    }).join("");
    legendHtml = `<ol class="map-legend">${items}</ol>`;
  }

  // Note about filtering — shown when currentMomentDay is set AND some pins
  // were filtered out, so the reader understands why pin count differs from
  // the entry's full pin list. Suppressed when null currentMomentDay (no
  // filter applied) or when no pins were hidden.
  let filterNote = "";
  if (ctx.currentMomentDay != null && visiblePins.length < allPins.length) {
    const hidden = allPins.length - visiblePins.length;
    filterNote = `<div class="map-filter-note">Showing ${visiblePins.length} of ${allPins.length} pins (${hidden} hidden by current-moment time filter)</div>`;
  }

  return `<div class="map-container">
    ${imgHtml}
    <div class="map-pins">${pinDivs}</div>
  </div>
  ${filterNote}
  ${legendHtml}`;
};

// v1.7 r023: an entry's fields as its article holds them, the short ones as
// a <dl> definition list and the block ones (textareas, groups, name-history,
// multi-line content) as <section> blocks after it, walked in template order
// under the secret, showWhen, and cascade rules. The article renderer below
// takes its field listing from here, and a Fabula record's bible takes it
// inside an article of its own.
const renderEntryFieldsHtml = (entry, tpl, state, ctx, options) => {
  const inlineRows = [];
  const blockSections = [];

  // Pre-index cascade children (mirrors markdown export logic)
  const cascadeChildByParentId = {};
  for (const f of (tpl.fields || [])) {
    if (f.type === "select" && f.dependsOn) cascadeChildByParentId[f.dependsOn] = f;
  }

  // Determine display/entry calendars for date projection
  const entryCal = getCalendar(state, entry.calendarId);
  const fieldCtx = { ...ctx, entryCalendar: entryCal };

  (tpl.fields || []).forEach(field => {
    if (field.secret && !options.includeSecrets) return;
    if (!isFieldVisible(field, entry.fields || {})) return;
    if (field.type === "select" && field.dependsOn) return;  // cascade child handled with parent
    const val = (entry.fields || {})[field.id];
    let rendered = renderFieldForHtml(field, val, fieldCtx);
    if (rendered == null || rendered === "") return;

    // Cascade parent — append child display
    if (field.type === "select") {
      const childField = cascadeChildByParentId[field.id];
      if (childField) {
        const childDisplay = formatSelectDisplay((entry.fields || {})[childField.id]);
        if (childDisplay && childDisplay.trim()) {
          rendered = `${rendered} &mdash; ${htmlEscape(childDisplay.trim())}`;
        }
      }
    }

    const marker = field.secret ? ' <span class="secret-marker">[SECRET]</span>' : "";
    const isBlock = field.type === "textarea" || field.type === "longform" || field.type === "group" || field.type === "grid" || field.type === "name-history";
    if (isBlock) {
      blockSections.push({ label: field.label, marker, content: rendered });
    } else {
      inlineRows.push(`<dt>${htmlEscape(field.label)}${marker}</dt><dd>${rendered}</dd>`);
    }
  });

  const inlineHtml = inlineRows.length > 0 ? `<dl class="entry-fields">${inlineRows.join("")}</dl>` : "";
  const blockHtml = blockSections.map(b =>
    `<section class="entry-block"><h3>${htmlEscape(b.label)}${b.marker}</h3><div class="entry-block-content">${b.content}</div></section>`
  ).join("");
  return `${inlineHtml}\n    ${blockHtml}`;
};

// Render one entry as a full <article> block: its title and badge, the
// obituary line, the tags, a map's canvas, and its fields
// (renderEntryFieldsHtml).
const renderEntryArticleHtml = (entry, tpl, state, ctx, options, canvasHtml) => {
  const fieldsHtml = renderEntryFieldsHtml(entry, tpl, state, ctx, options);

  // The entry's calendar, for the obituary line
  const entryCal = getCalendar(state, entry.calendarId);

  // Tags chips (renders only when present, before fields)
  const tagsHtml = (entry.tags && entry.tags.length > 0)
    ? `<div class="entry-tags-bar">${entry.tags.map(t => `<span class="entry-tag">${htmlEscape(t)}</span>`).join("")}</div>`
    : "";

  // Obituary line for deceased person-like entries — mirrors EntryView in-app
  let obituaryHtml = "";
  if (templateSupportsDeceased(tpl)) {
    const firstRange = (tpl.fields || []).find(f => f.type === "calendar-date-range");
    // Respect secret status: if the lifespan field is marked secret and the
    // export excludes secrets, suppress the obituary line — otherwise the
    // age would leak the hidden death dates.
    if (firstRange && (!firstRange.secret || options.includeSecrets)) {
      const lifespanVal = (entry.fields || {})[firstRange.id];
      const currentMomentDay = ctx.currentMomentDay;
      const ageResult = computeLifespanAge(lifespanVal, entryCal, entry, tpl, currentMomentDay);
      if (ageResult && ageResult.isDeceased) {
        const prefix = ageResult.approximate ? "~" : "";
        obituaryHtml = `<div class="entry-obituary">Died at age ${prefix}${ageResult.age}</div>`;
      }
    }
  }

  // Canvas slot: for map records, the caller passes the pre-rendered map block
  // (image + pin overlay + legend) to sit ahead of the field listing. Entries
  // pass nothing.
  const mapHtml = canvasHtml || "";

  return `<article id="entry-${htmlEscape(entry.id)}" class="entry">
    <h2 class="entry-title">${htmlEscape(entry.name || "(unnamed)")}</h2>
    <div class="entry-badge"><span class="entry-badge-icon" style="color:${htmlEscape(tpl.color || "")}">${htmlEscape(tpl.icon || "")}</span> ${htmlEscape(tpl.name)}</div>
    ${obituaryHtml}
    ${tagsHtml}
    ${mapHtml}
    ${fieldsHtml}
  </article>`;
};

// Theme CSS extraction. Reads the resolved values of the CSS variables Cartulary
// uses for theming from the live document, so the exported HTML inherits the
// user's currently-active theme without bundling the theme switcher.
const extractThemeVars = () => {
  if (typeof document === "undefined" || !document.documentElement) return {};
  const cs = getComputedStyle(document.documentElement);
  const vars = ["--bg", "--surf2", "--surf3", "--text", "--text-bright", "--text-dim", "--border", "--border2", "--accent", "--accent-dim", "--warn"];
  const out = {};
  vars.forEach(v => {
    const value = cs.getPropertyValue(v).trim();
    if (value) out[v] = value;
  });
  return out;
};

// The CSS bundled into the export. Uses CSS variables so theme inheritance
// works via the :root block emitted from extractThemeVars(). Mirrors the
// in-app aesthetic at a high level without trying to replicate the full UI —
// the export is a long-form readable document, not the app shell.
const buildHtmlExportStyles = (themeVars) => {
  const rootVars = Object.entries(themeVars).map(([k, v]) => `  ${k}: ${v};`).join("\n");
  // Sensible defaults in case extraction failed (shouldn't happen but defensive)
  const defaults = `
  --bg: #faf8f3;
  --surf2: #f3efe6;
  --surf3: #ebe6da;
  --text: #2a2a2a;
  --text-bright: #1a1a1a;
  --text-dim: #6a6a6a;
  --border: #d8d2c4;
  --border2: #c0b9a8;
  --accent: #7a5c3a;
  --accent-dim: #a08766;
  --warn: #c0820a;`;
  return `
:root {
${defaults}
${rootVars}
}
html, body { margin: 0; padding: 0; }
body {
  font-family: Georgia, 'Iowan Old Style', 'Palatino Linotype', serif;
  font-size: 17px;
  line-height: 1.65;
  color: var(--text);
  background: var(--bg);
  max-width: 780px;
  margin: 0 auto;
  padding: 40px 28px 80px;
}
a { color: var(--accent); text-decoration: none; border-bottom: 1px solid var(--border); }
a:hover { color: var(--text-bright); border-bottom-color: var(--accent); }
.wiki-link, .entry-ref-link { color: var(--accent); text-decoration: none; border-bottom: 1px solid var(--border); }
.wiki-link:hover, .entry-ref-link:hover { color: var(--text-bright); border-bottom-color: var(--accent); }
.broken-link { color: var(--text-dim); font-style: italic; cursor: help; border-bottom: 1px dotted var(--border2); }
header.world-hdr { border-bottom: 1px solid var(--border); padding-bottom: 24px; margin-bottom: 32px; }
header.world-hdr h1 { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 44px; font-weight: 400; color: var(--text-bright); line-height: 1.1; margin: 0 0 12px; }
header.world-hdr .world-desc { color: var(--text); font-size: 17px; margin: 12px 0 16px; }
header.world-hdr .export-meta { color: var(--text-dim); font-size: 14px; font-style: italic; margin: 16px 0 0; }
nav.toc { background: var(--surf2); border: 1px solid var(--border); border-radius: 4px; padding: 20px 24px; margin: 0 0 48px; }
nav.toc h2 { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 28px; font-weight: 400; color: var(--text-bright); margin: 0 0 16px; }
nav.toc .toc-template-group { margin: 18px 0 0; }
nav.toc .toc-template-group:not(:first-of-type) { margin-top: 24px; }
nav.toc .toc-template-group:not(:first-of-type)::before {
  content: "";
  display: block;
  width: 25%;
  height: 1px;
  background: var(--border);
  margin: 0 auto 24px;
}
nav.toc .toc-template-group h3 { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 20px; font-weight: 500; color: var(--text-bright); margin: 0 0 8px; display: flex; align-items: center; gap: 8px; }
nav.toc .toc-template-icon { font-size: 18px; }
nav.toc .toc-template-count { color: var(--text-dim); font-size: 13px; font-weight: 400; margin-left: auto; }
nav.toc ul { list-style: none; padding: 0; margin: 0; columns: 2; column-gap: 28px; }
nav.toc li { break-inside: avoid; padding: 2px 0; font-size: 15px; }
nav.toc a { border-bottom: none; color: var(--text); }
nav.toc a:hover { color: var(--accent); }
main { display: flex; flex-direction: column; gap: 0; }
article.entry { scroll-margin-top: 24px; }
article.entry:target h2.entry-title { color: var(--accent); }
/* Inter-entry and inter-template separators. Flex with space-between
 * distributes the glyphs edge-to-edge across the full content width — first
 * glyph flush with the left margin, last flush with the right, equal gaps
 * between. */
.entry-separator, .template-separator {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--accent-dim);
  line-height: 1;
}
.entry-separator { font-size: 18px; margin: 56px 0; }
.template-separator { font-size: 24px; margin: 80px 0; }
.entry-separator > span, .template-separator > span { flex: 0 0 auto; }
.entry-title { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 32px; font-weight: 400; color: var(--text-bright); margin: 0 0 6px; line-height: 1.15; }
.entry-badge { font-size: 12px; letter-spacing: 0.09em; text-transform: uppercase; color: var(--text-dim); margin-bottom: 14px; display: flex; gap: 7px; align-items: center; }
.entry-badge-icon { font-size: 14px; }
.entry-obituary { font-family: 'Cormorant Garamond', Georgia, serif; font-style: italic; font-size: 16px; color: var(--text-dim); margin: -8px 0 14px; }
.entry-tags-bar { display: flex; flex-wrap: wrap; gap: 5px; margin: 0 0 18px; }
.entry-tag { padding: 2px 10px; background: var(--surf3); border: 1px solid var(--border2); border-radius: 20px; font-size: 12px; color: var(--text); }
dl.entry-fields { display: grid; grid-template-columns: max-content 1fr; gap: 6px 18px; margin: 0 0 18px; }
dl.entry-fields dt { font-weight: 600; color: var(--text-dim); font-size: 14px; }
dl.entry-fields dd { margin: 0; font-size: 15px; }
.entry-block { margin: 22px 0; }
.entry-block h3 { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 20px; font-weight: 500; color: var(--text-bright); margin: 0 0 10px; }
.entry-block-content { font-size: 16px; }
.entry-block-content p { margin: 0 0 10px; }
.entry-block-content p:last-child { margin-bottom: 0; }
.entry-block-content ul, .entry-block-content ol { padding-left: 24px; }
.entry-block-content blockquote { border-left: 3px solid var(--border2); padding-left: 14px; color: var(--text-dim); margin: 12px 0; font-style: italic; }
.entry-block-content code { background: var(--surf3); padding: 1px 5px; border-radius: 3px; font-size: 0.92em; }
.entry-block-content pre { background: var(--surf2); padding: 12px 14px; border-radius: 4px; overflow-x: auto; }
.entry-block-content pre code { background: none; padding: 0; }
.name-history { list-style: none; padding: 0 0 0 18px; margin: 0; border-left: 1px solid var(--border); }
.name-history li { padding: 3px 0; font-size: 15px; }
.name-history-name { color: var(--text); }
.name-history-date { color: var(--text-dim); font-size: 13px; font-style: italic; }
.group-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px; }
.group-instance { background: var(--surf2); border-radius: 4px; padding: 12px 14px; }
.group-instance-num { color: var(--text-dim); font-size: 13px; font-weight: 600; margin: 0 0 6px; }
.group-fields { display: grid; grid-template-columns: max-content 1fr; gap: 4px 16px; margin: 0; }
.group-fields dt { font-weight: 500; color: var(--text-dim); font-size: 13px; }
.group-fields dd { margin: 0; font-size: 14px; }
.entry-ref-label, .entry-ref-status, .entry-ref-dates { color: var(--text-dim); font-size: 0.92em; }
.field-image { max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0; }
.field-image-placeholder { color: var(--text-dim); font-style: italic; font-size: 0.9em; }
.field-link { color: var(--accent); }
.field-link-blocked { color: var(--text-dim); font-style: italic; text-decoration: line-through; }
.secret-marker { color: var(--warn); font-size: 0.85em; font-weight: 600; }
.skip-to-content { position: absolute; left: -9999px; top: 0; background: var(--accent); color: #fff; padding: 8px 14px; border-radius: 4px; z-index: 100; }
.skip-to-content:focus { left: 16px; top: 16px; }
.empty-world { padding: 60px 0; text-align: center; color: var(--text-dim); font-style: italic; }
.back-to-top { text-align: center; margin: 48px 0 0; padding: 16px 0 0; border-top: 1px solid var(--border); }
.back-to-top a { color: var(--text-dim); border-bottom: none; font-size: 14px; letter-spacing: 0.04em; }
.back-to-top a:hover { color: var(--accent); }
.map-container { position: relative; margin: 18px 0; border: 1px solid var(--border); border-radius: 4px; overflow: hidden; background: var(--surf2); }
.map-image { display: block; width: 100%; height: auto; }
.map-image-placeholder { padding: 40px; text-align: center; color: var(--text-dim); font-style: italic; }
.map-empty { padding: 24px; text-align: center; color: var(--text-dim); font-style: italic; background: var(--surf2); border: 1px solid var(--border); border-radius: 4px; margin: 18px 0; }
.map-pins { position: absolute; inset: 0; pointer-events: none; }
.map-pin { position: absolute; transform: translate(-50%, -50%); pointer-events: auto; text-decoration: none; border-bottom: none; }
.map-pin-marker { display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: var(--accent); color: #fff; font-size: 13px; font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,0.3); border: 2px solid var(--bg); font-family: Georgia, serif; }
.map-pin:hover .map-pin-marker { transform: scale(1.1); transition: transform 0.12s; }
.map-filter-note { margin: 10px 0 0; color: var(--text-dim); font-size: 13px; font-style: italic; }
.map-legend { margin: 14px 0 0; padding-left: 0; list-style: none; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 4px 18px; }
.map-legend li { font-size: 14px; padding: 2px 0; }
.map-legend-num { color: var(--text-dim); font-weight: 600; margin-right: 6px; }
.map-legend-permanent { color: var(--accent-dim); font-size: 0.9em; margin-left: 4px; }
footer.export-footer { margin-top: 64px; padding-top: 20px; border-top: 1px solid var(--border); color: var(--text-dim); font-size: 13px; text-align: center; }
footer.export-footer a { color: var(--text-dim); }
@media print {
  @page { margin: 1.5cm; }
  body { max-width: 100%; padding: 0; font-size: 12pt; background: white; }
  nav.toc { page-break-after: always; }
  nav.toc ul { columns: 1; }
  article.entry { page-break-inside: avoid; margin-bottom: 24px; }
  .entry-separator, .template-separator { color: #666; }
  .map-pin-marker { box-shadow: none; border-color: #fff; }
  .skip-to-content, .back-to-top { display: none; }
  a, .wiki-link, .entry-ref-link { color: var(--text); border-bottom: none; }
  footer.export-footer { page-break-before: avoid; }
}
@media (max-width: 600px) {
  body { padding: 24px 16px 60px; font-size: 15px; }
  header.world-hdr h1 { font-size: 32px; }
  .entry-title { font-size: 24px; }
  nav.toc ul { columns: 1; }
  dl.entry-fields, .group-fields { grid-template-columns: 1fr; gap: 2px 0; }
  dl.entry-fields dt, .group-fields dt { padding-top: 8px; }
}
`;
};

const buildHtmlExport = async (state, options, dirHandle) => {
  options = options || { includeSecrets: false, dateCalendarId: "per-entry" };
  const { templates, entries, world } = state;
  const exportDate = new Date().toISOString().slice(0, 10);
  const entryCount = entries.length;
  const templateCount = templates.length;

  // Indexes
  const entryById = Object.fromEntries(entries.map(e => [e.id, e]));

  // Pre-render image manifest pass: collect every image reference across the
  // world (entry fields, group subfields, map backgrounds), then resolve each
  // to an inline data URL. FSAA filenames are async-fetched via dirHandle;
  // missing files surface as placeholders.
  const imageRefs = collectImageRefsForHtmlExport(state);
  const imageManifest = await resolveImageManifestForHtmlExport(imageRefs, dirHandle);
  const imageSizes = await resolveMapImageSizesForHtmlExport(state, imageManifest);

  // Resolve display calendar choice
  let displayCalendarChoice;
  if (options.dateCalendarId === "per-entry" || !options.dateCalendarId) {
    displayCalendarChoice = "per-entry";
  } else if (options.dateCalendarId === "primary") {
    displayCalendarChoice = world.calendar;
  } else {
    displayCalendarChoice = (state.calendars || []).find(c => c.id === options.dateCalendarId) || world.calendar;
  }

  // Current moment for auto-age / obituary line / pin filtering (Y/M/D in
  // primary's frame → absoluteDay)
  let currentMomentDay = null;
  const cm = world.currentMoment;
  if (cm && cm.year != null) {
    currentMomentDay = calendarDateToAbsoluteDay(world.calendar, cm);
  }

  // Build per-entry context. When displayCalendarChoice === "per-entry", the
  // displayCalendar varies by entry; when forced, it's the same for all.
  // Entries' renderArticleHtml call computes entryCal and overrides ctx.entryCalendar.
  const baseCtx = {
    entryById,
    nodeById: registeredNodeIndex(state),
    // v1.7 r043: [[links]] through the world's one resolver.
    wiki: wikiResolverOf(state),
    options,
    currentMomentDay,
    imageManifest,
    imageSizes,
  };

  // Group entries by template; alphabetical within group
  const byTemplate = {};
  templates.forEach(t => { byTemplate[t.id] = []; });
  entries.forEach(e => {
    if (byTemplate[e.templateId]) byTemplate[e.templateId].push(e);
  });
  // Templates with entries, ordered as in state.templates
  const populatedTemplates = templates
    .filter(t => byTemplate[t.id] && byTemplate[t.id].length > 0)
    .map(t => ({ tpl: t, list: [...byTemplate[t.id]].sort((a, b) => (a.name || "").localeCompare(b.name || "")) }));

  // ToC
  const tocSections = populatedTemplates.map(({ tpl, list }) => {
    const items = list.map(e => `<li><a href="#entry-${htmlEscape(e.id)}">${htmlEscape(e.name || "(unnamed)")}</a></li>`).join("");
    return `<section class="toc-template-group">
      <h3><span class="toc-template-icon" style="color:${htmlEscape(tpl.color || "")}">${htmlEscape(tpl.icon || "")}</span>${htmlEscape(tpl.name)}<span class="toc-template-count">${list.length}</span></h3>
      <ul>${items}</ul>
    </section>`;
  }).join("");

  // Entry articles wrapped in template sections. Separators emitted as actual
  // flex elements (not CSS pseudo-elements) so each glyph can be a span and
  // justify-content: space-between can distribute them edge-to-edge across
  // the content width.
  const ENTRY_SEP_CHARS = "\u203B\u203B\u203B\u203B\u203B";   // ※※※※※
  const TEMPLATE_SEP_CHARS = "\u2042\u2042\u2042\u2042\u2042"; // ⁂⁂⁂⁂⁂
  const renderSep = (chars, cls) =>
    `<div class="${cls}">${chars.split("").map(c => `<span>${c}</span>`).join("")}</div>`;

  const articlesHtml = populatedTemplates.map(({ tpl, list }, tplIdx) => {
    const entriesHtml = list.map((entry, entryIdx) => {
      // Resolve per-entry displayCalendar
      const entryCal = getCalendar(state, entry.calendarId);
      const displayCal = displayCalendarChoice === "per-entry" ? entryCal : displayCalendarChoice;
      const ctx = { ...baseCtx, displayCalendar: displayCal };
      const sep = entryIdx > 0 ? renderSep(ENTRY_SEP_CHARS, "entry-separator") : "";
      return sep + renderEntryArticleHtml(entry, tpl, state, ctx, options);
    }).join("\n");
    const tplSep = tplIdx > 0 ? renderSep(TEMPLATE_SEP_CHARS, "template-separator") : "";
    return tplSep + `<section class="template-section">\n${entriesHtml}\n</section>`;
  }).join("\n");

  // Maps section (v1.6 r001). Maps are records in state.cartographia, rendered
  // through the shared article renderer with the canvas passed as canvasHtml.
  // Article ids reuse the entry-<id> scheme so pin links (#entry-<id>) resolve.
  const mapRecords = Array.isArray(state.cartographia)
    ? [...state.cartographia].sort((a, b) => (a.name || "").localeCompare(b.name || ""))
    : [];
  const mapSchema = cartographiaMapSchema();
  const mapsArticlesHtml = mapRecords.map((rec, i) => {
    const ctx = { ...baseCtx, displayCalendar: world.calendar };
    const canvasHtml = renderMapHtml(rec, mapSchema, state, ctx);
    const sep = i > 0 ? renderSep(ENTRY_SEP_CHARS, "entry-separator") : "";
    return sep + renderEntryArticleHtml(rec, mapSchema, state, ctx, options, canvasHtml);
  }).join("\n");
  const mapsSectionHtml = mapRecords.length > 0
    ? (populatedTemplates.length > 0 ? renderSep(TEMPLATE_SEP_CHARS, "template-separator") : "")
      + `<section class="template-section">\n${mapsArticlesHtml}\n</section>`
    : "";
  const allArticlesHtml = articlesHtml + (mapsSectionHtml ? "\n" + mapsSectionHtml : "");
  const mapsTocHtml = mapRecords.length > 0
    ? `<section class="toc-template-group">
      <h3><span class="toc-template-icon" style="color:#7ec8c8">\u25a3</span>Map<span class="toc-template-count">${mapRecords.length}</span></h3>
      <ul>${mapRecords.map(m => `<li><a href="#entry-${htmlEscape(m.id)}">${htmlEscape(m.name || "(unnamed map)")}</a></li>`).join("")}</ul>
    </section>`
    : "";

  // Header
  const worldName = htmlEscape(world.name || "Untitled World");
  const worldDescPlain = world.description ? String(world.description).replace(/\s+/g, " ").trim().slice(0, 200) : "";
  const descHtml = world.description
    ? `<div class="world-desc">${marked && marked.parse ? marked.parse(resolveWikiLinksForHtml(world.description, baseCtx.wiki, htmlEscape)) : htmlEscape(world.description)}</div>`
    : "";

  // World metadata — last-updated date alongside export date when present.
  // fmtDate from the App produces "May 15, 2026"-style strings; mirror that.
  const worldUpdated = world.updatedAt ? new Date(world.updatedAt) : null;
  const worldUpdatedStr = worldUpdated && !isNaN(worldUpdated.getTime())
    ? worldUpdated.toISOString().slice(0, 10)
    : null;

  // Date-calendar note for the meta line. Tells the reader which calendar(s)
  // dates render in, so a multi-calendar world doesn't read as ambiguously
  // dated. Single-calendar worlds get no note (every date is in the only
  // calendar that exists).
  let dateCalendarNote = "";
  const additionalCalendarsCount = Array.isArray(state.calendars) ? state.calendars.length : 0;
  if (additionalCalendarsCount > 0) {
    if (displayCalendarChoice === "per-entry") {
      dateCalendarNote = " &middot; dates in each entry's native calendar";
    } else if (displayCalendarChoice && displayCalendarChoice.name) {
      dateCalendarNote = ` &middot; dates rendered in ${htmlEscape(displayCalendarChoice.name)}`;
    }
  }

  // CSS
  const themeVars = extractThemeVars();
  const css = buildHtmlExportStyles(themeVars);

  // Empty-world fallback: when no template has any entries, the ToC and main
  // would otherwise emit as empty elements. Provide a clear notice instead.
  const hasContent = populatedTemplates.length > 0 || mapRecords.length > 0;
  const tocHtml = hasContent
    ? `<nav class="toc" aria-label="Table of contents"><h2 id="toc">Contents</h2>${tocSections}${mapsTocHtml}</nav>`
    : "";
  const mainHtml = hasContent
    ? `<main id="main">\n${allArticlesHtml}\n<div class="back-to-top"><a href="#top">&uarr; Back to top</a></div>\n</main>`
    : `<main id="main"><div class="empty-world">This world has no entries yet.</div></main>`;

  // Doc
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="generator" content="Cartulary v1.7">
${worldDescPlain ? `<meta name="description" content="${htmlEscape(worldDescPlain)}">` : ""}
<title>${worldName}</title>
<style>${css}</style>
</head>
<body id="top">
<a class="skip-to-content" href="#main">Skip to content</a>
<header class="world-hdr">
<h1>${worldName}</h1>
${descHtml}
<div class="export-meta">Exported ${exportDate}${worldUpdatedStr && worldUpdatedStr !== exportDate ? ` &middot; world last edited ${worldUpdatedStr}` : ""} &middot; ${entryCount} ${entryCount === 1 ? "entry" : "entries"} across ${populatedTemplates.length} ${populatedTemplates.length === 1 ? "template" : "templates"}${options.includeSecrets ? " &middot; secrets included" : ""}${dateCalendarNote}</div>
</header>
${tocHtml}
${mainHtml}
<footer class="export-footer">
Generated by Cartulary v1.7 &middot; <a href="https://drakhanas.itch.io/cartulary">drakhanas.itch.io/cartulary</a>
</footer>
</body>
</html>`;
};

// ─── HTML export modal ────────────────────────────────────────────────────────
//
// World-level HTML export configuration. Opened from the Project view's export
// section. Exposes:
//   - Include secret fields toggle
//   - Render-dates-in calendar selector (only when world has additional calendars)
// Surfaces a warning banner when currentMoment is null AND world contains map
// entries — without a current moment, map pin time-filtering can't snapshot, so
// all pins render regardless of time-bound visibility. User can cancel and set
// currentMoment in Kalendarium, or proceed with all-pins fallback.

function HtmlExportModal({ state, onCancel, onConfirm }) {
  const [includeSecrets, setIncludeSecrets] = useState(false);
  const [dateCalendarId, setDateCalendarId] = useState("per-entry");

  // Detect maps — informs currentMoment warning banner
  const hasMaps = useMemo(() => {
    return (Array.isArray(state.cartographia) ? state.cartographia : []).length > 0;
  }, [state.cartographia]);

  const currentMomentNull = !state.world.currentMoment || state.world.currentMoment.year == null;
  const showCurrentMomentWarning = hasMaps && currentMomentNull;

  // Calendar dropdown: include primary plus all additional. "per-entry" is the
  // default and means each entry's bound calendar drives its date rendering.
  const additionalCalendars = state.calendars || [];
  const hasMultipleCalendars = additionalCalendars.length > 0;
  const primaryName = state.world.calendar?.name || "Primary";

  const submit = () => {
    onConfirm({ includeSecrets, dateCalendarId });
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">Export world as HTML</div>
        <div className="modal-body">
          <div style={{ marginBottom: 16, color: "var(--text-dim)", fontSize: "calc(13px * var(--font-scale))" }}>
            Generates a single self-contained HTML file. Cross-references between entries become anchor links. Maps render as static images with pin overlays. The exported file is read-only — for sharing with people who don't have Cartulary.
          </div>

          {showCurrentMomentWarning && (
            <div className="modal-notice modal-notice-warning" style={{ marginBottom: 16 }}>
              <strong>No current moment is set in Kalendarium.</strong> Your world contains maps with time-bound pins, but without a current moment all pins will render regardless of their time-aware visibility. For time-accurate maps, cancel and set a current moment in Kalendarium first.
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={includeSecrets} onChange={e => setIncludeSecrets(e.target.checked)} />
              Include secret-marked fields
            </label>
          </div>

          {hasMultipleCalendars && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 6, color: "var(--text-dim)", fontSize: "calc(13px * var(--font-scale))" }}>
                Render dates in
              </label>
              <select value={dateCalendarId} onChange={e => setDateCalendarId(e.target.value)} className="input" style={{ width: "100%" }}>
                <option value="per-entry">Each entry's bound calendar (default)</option>
                <option value="primary">Force everything in {primaryName}</option>
                {additionalCalendars.map(c => (
                  <option key={c.id} value={c.id}>
                    Force everything in {c.name || "Unnamed"}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-accent" onClick={submit}>Export</button>
        </div>
      </div>
    </div>
  );
}