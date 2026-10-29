
// ─── Entry list ────────────────────────────────────────────────────────────────

function EntryList({ entries, templates, search, onSearch, sortBy, onSort, onSelect, showTemplate, variantAxis, onSetVariant }) {
  // Variant picker renders only when the axis is configured AND there's
  // something to pick (derived values exist, or a stale active needs to be
  // visible so the user can switch back to All). A stale active — a value no
  // longer present in any template's axis options — is injected as an option
  // rather than blanked, so the select never silently misrepresents state.
  const showVariantPicker = variantAxis && (variantAxis.values.length > 0 || variantAxis.active);
  return (
    <>
      <div className="list-controls">
        <input className="search-input" placeholder="Search entries..." value={search} onChange={e => onSearch(e.target.value)} />
        {showVariantPicker && (
          <select className="input sort-sel" value={variantAxis.active} onChange={e => onSetVariant(e.target.value)} title="Variant filter">
            <option value="">All</option>
            {variantAxis.values.map(v => <option key={v} value={v}>{v}</option>)}
            {variantAxis.active && !variantAxis.values.includes(variantAxis.active) && (
              <option value={variantAxis.active}>{variantAxis.active}</option>
            )}
          </select>
        )}
        <select className="input sort-sel" value={sortBy} onChange={e => onSort(e.target.value)}>
          <option value="name-asc">Name A → Z</option>
          <option value="name-desc">Name Z → A</option>
          <option value="updated-desc">Recently updated</option>
          <option value="updated-asc">Oldest updated</option>
          <option value="created-desc">Recently created</option>
          <option value="created-asc">Oldest created</option>
        </select>
      </div>
      <div className="entry-list">
        {entries.length === 0
          ? <div className="empty">
              <div className="empty-glyph">◈</div>
              <div className="empty-text">{search ? "Nothing matches that search." : "No entries yet."}</div>
            </div>
          : entries.map(e => {
              const t = templates.find(tt => tt.id === e.templateId);
              return (
                <div key={e.id} className="entry-card" onClick={() => onSelect(e.id)}>
                  <div className="entry-card-main">
                    <div className="entry-card-name">{e.name}</div>
                    <div className="entry-card-meta">
                      {showTemplate && t && <span style={{ color: t.color, fontVariantEmoji: "text" }}>{t.icon} {t.name}</span>}
                      <span>{fmtDate(e.updatedAt)}</span>
                    </div>
                    {(e.tags || []).length > 0 && (
                      <div className="entry-card-tags">
                        {e.tags.map(tag => <span key={tag} className="entry-card-tag">#{tag}</span>)}
                      </div>
                    )}
                  </div>
                  <span className="entry-card-arrow">→</span>
                </div>
              );
            })
        }
      </div>
    </>
  );
}

// ─── Entry view ────────────────────────────────────────────────────────────────

function EntryView({ entry, template, templates, entries, onOpenEntry, onSelectTag, showSecrets, imageFolder, dirHandle, calendar, onExportEntry, exportTitle, state, onUpdateViewPrefs, canvasSlot, panels, foldedPanels, onTogglePanel, registeredNodes: nodesGiven, badgeExtra, footSlot, wide }) {
  if (!template) return <div className="entry-view"><div className="empty">Template not found.</div></div>;
  // currentMoment is stored as { year, monthIndex, day } in primary's frame
  // (calendar-position invariant under primary structural edits). Derive
  // absoluteDay on read so FieldValueDisplay can do raw integer math against
  // entry lifespan start.absoluteDay. Null when no current moment is set.
  const currentMomentDay = (() => {
    const cm = state?.world?.currentMoment;
    if (!cm || cm.year == null) return null;
    return calendarDateToAbsoluteDay(state.world.calendar, cm);
  })();
  // v1.7 r003: the records that aren't entries (bodies, Glossopoeia records,
  // maps), so a reference to one shows its name (resolveRefTarget). Since
  // r012 a caller can give its own, named as its form names them, as a
  // Fabula page gives its story's (fabulaStoryNodes).
  const registeredNodes = nodesGiven || (state ? getRegisteredGraphNodes(state) : []);
  // v1.7 r022: wide widens the column to the pane, for Fabula's Timeline
  // tab; every child but one marked entry-view-full stays in the reading
  // width, centered as before.
  return (
    <div className={wide ? "entry-view entry-view-wide" : "entry-view"}>
      <div className="entry-header-row">
        <div className="entry-title">{entry.name}</div>
        {onExportEntry && (
          <button
            className="btn btn-ghost btn-small entry-export-btn"
            onClick={() => onExportEntry(entry.id)}
            title={exportTitle || (showSecrets ? "Download this entry as Markdown (.md). Secret fields included." : "Download this entry as Markdown (.md). Secret fields excluded.")}
          >
            Export ↓
          </button>
        )}
      </div>
      <div className="entry-badge">
        <span style={{ color: template.color, fontVariantEmoji: "text" }}>{template.icon}</span>
        {template.name}
        {/* v1.7 r012: a word between the kind and the date, as an act's, a chapter's, or a scene's place in its outline (II.4.A). */}
        {badgeExtra && <><span style={{ color: "var(--border2)" }}>·</span><span className="entry-badge-position">{badgeExtra}</span></>}
        <span style={{ color: "var(--border2)" }}>·</span>
        <span>Updated {fmtDate(entry.updatedAt)}</span>
      </div>
      {(() => {
        // Obituary line: biographical summary for deceased person-like entries.
        // Same gate as the inline lifespan-field suffix (templateSupportsDeceased
        // + first calendar-date-range field). Renders only when result is a
        // deceased computation (has both start and end dates).
        // Respect secret status: if the lifespan field is marked secret and
        // secrets are hidden, suppress the obituary line — otherwise the age
        // would leak the hidden death dates.
        if (!templateSupportsDeceased(template)) return null;
        const firstRange = (template.fields || []).find(f => f.type === "calendar-date-range");
        if (!firstRange) return null;
        if (firstRange.secret && !showSecrets) return null;
        const value = (entry.fields || {})[firstRange.id];
        const ageResult = computeLifespanAge(value, calendar, entry, template, currentMomentDay);
        if (!ageResult || !ageResult.isDeceased) return null;
        const prefix = ageResult.approximate ? "~" : "";
        return <div className="entry-obituary">Died at age {prefix}{ageResult.age}</div>;
      })()}
      {(entry.tags || []).length > 0 && (
        <div className="entry-tags-bar">
          {entry.tags.map(tag => <span key={tag} className="entry-tag" onClick={() => onSelectTag(tag)}>#{tag}</span>)}
        </div>
      )}
      <div className="divider" />
      {canvasSlot}
      {fieldPanelSegments(template.fields, panels).map(seg => {
        // v1.7 r008: fields under panels, each heading folding its own; a
        // template without panels is one segment, drawn as before.
        const units = buildFieldLayoutUnits(
        seg.fields,
        (f) => isFieldVisibleDisplay(f, entry.fields || {}, showSecrets)
      ).map(unit => {
        if (unit.kind === "full") {
          const field = unit.field;
          const val = (entry.fields || {})[field.id];
          return (
            <div key={field.id} className={`field-group ${field.secret ? "secret" : ""}`}>
              <div className="field-label">
                <span>{field.label}</span>
                {field.secret && <span className="secret-tag">SECRET</span>}
              </div>
              <FieldValueDisplay field={field} value={val} entries={entries} templates={templates} bodies={state?.celestialBodies} registeredNodes={registeredNodes} onOpenEntry={onOpenEntry} imageFolder={imageFolder} dirHandle={dirHandle} calendar={calendar} entry={entry} template={template} currentMomentDay={currentMomentDay} />
            </div>
          );
        }
        // unit.kind === "pair" — both halves guaranteed visible by predicate filter.
        const { a, b } = unit;
        const aFields = entry.fields || {};
        const aVal = aFields[a.id];
        const bVal = aFields[b.id];
        return (
          <div key={`pair-${a.id}-${b.id}`} className="field-row">
            <div className={`field-group ${a.secret ? "secret" : ""}`}>
              <div className="field-label" title={a.label}>
                <span>{a.label}</span>
                {a.secret && <span className="secret-tag">SECRET</span>}
              </div>
              <FieldValueDisplay field={a} value={aVal} entries={entries} templates={templates} bodies={state?.celestialBodies} registeredNodes={registeredNodes} onOpenEntry={onOpenEntry} imageFolder={imageFolder} dirHandle={dirHandle} calendar={calendar} entry={entry} template={template} currentMomentDay={currentMomentDay} />
            </div>
            <div className={`field-group ${b.secret ? "secret" : ""}`}>
              <div className="field-label" title={b.label}>
                <span>{b.label}</span>
                {b.secret && <span className="secret-tag">SECRET</span>}
              </div>
              <FieldValueDisplay field={b} value={bVal} entries={entries} templates={templates} bodies={state?.celestialBodies} registeredNodes={registeredNodes} onOpenEntry={onOpenEntry} imageFolder={imageFolder} dirHandle={dirHandle} calendar={calendar} entry={entry} template={template} currentMomentDay={currentMomentDay} />
            </div>
          </div>
        );
      });
        if (!seg.panel) return <React.Fragment key="fields">{units}</React.Fragment>;
        const folded = !!(foldedPanels && foldedPanels[seg.panel.id]);
        // An empty field doesn't show here, so an open panel with none filled
        // in says so rather than leaving its heading bare.
        return (
          <React.Fragment key={`panel-${seg.panel.id}`}>
            <FieldPanelHeading panel={seg.panel} folded={folded} onToggle={onTogglePanel} />
            {!folded && (units.length > 0 ? units : <div className="field-hint field-panel-empty" style={{ marginTop: -8, marginBottom: 22 }}>Nothing in {seg.panel.label} yet.</div>)}
          </React.Fragment>
        );
      })}
      {/* v1.7 r014: what the caller draws under the fields, as a scene's page draws its research. */}
      {footSlot}
    </div>
  );
}

// v1.7 r008: a template's fields as segments for drawing, the fields that
// belong to no panel first and then each panel's own, in the panels' order,
// so a half-width pair never straddles a heading. Without panels the whole
// list is one segment, drawn as it always was. A field names its panel by id
// (field.panel); panels are [{ id, label }], given by the caller.
const fieldPanelSegments = (fields, panels) => {
  const all = Array.isArray(fields) ? fields : [];
  if (!Array.isArray(panels) || panels.length === 0) return [{ panel: null, fields: all }];
  const known = new Set(panels.map(p => p.id));
  return [
    { panel: null, fields: all.filter(f => !(f && known.has(f.panel))) },
    ...panels.map(p => ({ panel: p, fields: all.filter(f => f && f.panel === p.id) })),
  ];
};

// A panel's heading, which folds the panel away and back (v1.7 r008). The
// folds are the caller's to keep.
function FieldPanelHeading({ panel, folded, onToggle }) {
  return (
    <button
      type="button"
      className="field-panel-heading"
      aria-expanded={!folded}
      onClick={() => { if (onToggle) onToggle(panel.id); }}
      title={folded ? `Show the ${panel.label} panel` : `Fold the ${panel.label} panel away`}
      style={{ display: "flex", alignItems: "baseline", gap: 10, width: "100%", margin: "30px 0 18px", padding: "0 0 8px", background: "transparent", border: "none", borderBottom: "1px solid var(--border)", color: "var(--text-bright)", fontFamily: "'Cormorant Garamond', serif", fontSize: "calc(22px * var(--font-scale))", fontWeight: 500, textAlign: "left", cursor: "pointer" }}
    >
      <span aria-hidden="true" style={{ color: "var(--accent)", fontFamily: "'DM Sans', sans-serif", fontSize: "calc(12px * var(--font-scale))", width: 12, flexShrink: 0 }}>{folded ? "\u25B8" : "\u25BE"}</span>
      <span>{panel.label}</span>
    </button>
  );
}

// Renders a single-line text value with `[[Name]]` and `[[Name|display]]` wiki-link
// syntax resolved to clickable cross-references. Display-side only — text-input edit
// surfaces remain plain (autocomplete for `[[` in text inputs is a separate task).
//
// Resolution mirrors MarkdownDisplay's logic: primary entry name beats name-history
// alias, first match wins by storage order, case-insensitive. Broken links (no
// matching entry) render with the same .wiki-link-broken affordance as in markdown.
//
// Reuses the broadened .wiki-link CSS so visual treatment matches markdown rendering.
function InlineWikiLinkText({ value, entries, templates, bodies, onOpenEntry }) {
  const { primaryByLower, historyByLower, bodiesByLower } = useMemo(() => {
    const primary = new Map();
    (entries || []).forEach(e => {
      if (!e.name) return;
      const k = e.name.trim().toLowerCase();
      if (!primary.has(k)) primary.set(k, e);
    });
    const history = new Map();
    if (Array.isArray(templates)) {
      const tplById = Object.fromEntries(templates.map(t => [t.id, t]));
      (entries || []).forEach(e => {
        const tpl = tplById[e.templateId];
        const altNames = getEntryNameHistory(e, tpl);
        altNames.forEach(n => {
          const k = (n || "").trim().toLowerCase();
          if (!k) return;
          if (!primary.has(k) && !history.has(k)) history.set(k, e);
        });
      });
    }
    // r026: bodies as a third resolution tier, below entries on name
    // collision. Indexed by primary name + comma-split otherNames.
    const bodiesMap = new Map();
    (bodies || []).forEach(b => {
      if (!b || !b.name) return;
      const k = b.name.trim().toLowerCase();
      if (k && !primary.has(k) && !history.has(k) && !bodiesMap.has(k)) {
        bodiesMap.set(k, b);
      }
      if (typeof b.otherNames === "string" && b.otherNames.trim()) {
        b.otherNames.split(",").forEach(alias => {
          const ak = alias.trim().toLowerCase();
          if (!ak) return;
          if (!primary.has(ak) && !history.has(ak) && !bodiesMap.has(ak)) {
            bodiesMap.set(ak, b);
          }
        });
      }
    });
    return { primaryByLower: primary, historyByLower: history, bodiesByLower: bodiesMap };
  }, [entries, templates, bodies]);

  if (!value || typeof value !== "string" || !value.includes("[[")) {
    return <>{value || ""}</>;
  }

  const nodes = [];
  let lastIdx = 0;
  let key = 0;
  // Same pattern as the marked wikiLink tokenizer: [[<target>]] or [[<target>|<display>]],
  // no newline inside brackets, target can contain anything except ] or newline.
  const regex = /\[\[([^\]\n]+)\]\]/g;
  let m;
  while ((m = regex.exec(value)) !== null) {
    if (m.index > lastIdx) {
      nodes.push(value.substring(lastIdx, m.index));
    }
    const inner = m[1].trim();
    const pipe = inner.indexOf("|");
    const target = pipe >= 0 ? inner.substring(0, pipe).trim() : inner;
    const display = pipe >= 0 ? inner.substring(pipe + 1).trim() : inner;
    const lookup = target.toLowerCase();
    const found = primaryByLower.get(lookup) || historyByLower.get(lookup) || bodiesByLower.get(lookup);
    if (found) {
      const id = found.id;
      nodes.push(
        <a key={`wl-${key++}`} className="wiki-link wiki-link-found" href="#"
          onClick={(e) => { e.preventDefault(); onOpenEntry && onOpenEntry(id); }}
        >{display}</a>
      );
    } else {
      nodes.push(
        <a key={`wl-${key++}`} className="wiki-link wiki-link-broken" href="#"
          title="No entry with that name"
          onClick={(e) => e.preventDefault()}
        >{display}</a>
      );
    }
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < value.length) {
    nodes.push(value.substring(lastIdx));
  }
  return <>{nodes}</>;
}

// ─── Referenced by (v1.7 r041) ─────────────────────────────────────────────────
// docs/pipes-spec.md, section 4, with Drak's calls at the cut: on a record's
// page, after its fields and its page's own lists, what links to it, from the
// link index (linksTo, 22_trunk). One row per source, naming it and every
// field it links through, grouped by kind: entries by template in the
// templates' order, then Fabula's kinds in Fabula's order, then maps,
// stemmas, bodies, ConLangs, and the world description (Drak's call 2). Rows
// run A to Z, numbers in order (Kin 2 before Kin 10), but acts, chapters,
// and scenes by their place in their story's outline, and a Fabula record
// below the story names its story. A row opens its source, but a ConLang's,
// which has no page yet, as its chips open nowhere. A link through a secret
// field shows only while secrets are shown, and a page nothing links to
// shows no list. A group past REFERENCED_BY_SHOWN rows shows that many and a
// Show all button, until the page is left (Drak's call 4).

const REFERENCED_BY_SHOWN = 10;

// The links the thread, theme, and scene pages' own lists show, which their
// Referenced by leaves out so nothing shows twice (Drak's call 1): a story's,
// a scene's, a plot point's, or a promise's Threads on a Plot Thread's page,
// a story's Themes or a scene's Motifs on a Theme's, and a research note's
// Used In on a scene's (fabulaRoleStories, fabulaNotesOf).
const REFERENCED_BY_LISTED = {
  threads: [["story", "threads"], ["scene", "threads"], ["plotPoint", "threads"], ["promise", "threads"]],
  themes: [["story", "themes"], ["scene", "motifs"]],
  scene: [["research", "usedIn"]],
};

// A target's rows in their groups, in the list's order: [{ key, title, icon,
// color, rows }], each row { src, labels, place, story }.
const referencedByGroups = (state, targetId, showSecrets, exclude) => {
  const rows = new Map();
  linksTo(state, targetId).forEach(l => {
    if (l.secret && !showSecrets) return;
    if (exclude && l.src.kind === "fabula" && exclude.some(([kind, field]) => kind === l.src.group && field === l.field)) return;
    let r = rows.get(l.src.id);
    if (!r) { r = { src: l.src, labels: [] }; rows.set(l.src.id, r); }
    if (l.label && !r.labels.includes(l.label)) r.labels.push(l.label);
  });
  if (rows.size === 0) return [];
  const fab = (state && state.fabula) || {};
  const storyNames = new Map((Array.isArray(fab.stories) ? fab.stories : []).filter(st => st && st.id).map(st => [st.id, st.name || "(untitled story)"]));
  const storyRank = new Map(fabulaIndexStories(state).map((st, i) => [st.id, i]));
  const outlines = new Map();
  const placeOf = (src) => {
    if (src.kind !== "fabula" || !src.storyId || !["part", "chapter", "scene"].includes(src.group)) return null;
    if (!outlines.has(src.storyId)) outlines.set(src.storyId, fabulaOutlinePlaces(state, src.storyId));
    return outlines.get(src.storyId).get(src.id) || null;
  };
  const byKey = new Map();
  rows.forEach(r => {
    const key = `${r.src.kind}:${r.src.group}`;
    const place = placeOf(r.src);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push({ ...r, place: place ? place.path : null, at: place ? place.index : null, story: r.src.storyId ? (storyNames.get(r.src.storyId) || null) : null });
  });
  const source = (id) => getRegisteredSourceById(id) || {};
  const order = [
    ...((state && state.templates) || []).filter(t => t && t.id).map(t => ({ key: `entry:${t.id}`, title: t.name || "(untitled template)", icon: t.icon, color: t.color })),
    ...FABULA_KINDS.map(k => ({ key: `fabula:${k.kind}`, title: k.label, icon: source(k.id).icon, color: k.color })),
    ...[["map", SYNTH_TPL_MAP], ["stemma", SYNTH_TPL_STEMMA], ["body", BODY_REF_SENTINEL], ["conlang", SYNTH_TPL_CONLANG]]
      .map(([kind, id]) => ({ key: `${kind}:${kind}`, title: source(id).name || kind, icon: source(id).icon, color: source(id).color })),
    { key: "world:world", title: "World", icon: null, color: null },
  ];
  const byName = (a, b) => (a.src.name || "").localeCompare(b.src.name || "", undefined, { sensitivity: "base", numeric: true });
  const last = Number.MAX_SAFE_INTEGER;
  const rank = (r) => (storyRank.has(r.src.storyId) ? storyRank.get(r.src.storyId) : last);
  const byPlace = (a, b) => (rank(a) - rank(b)) || ((a.at == null ? last : a.at) - (b.at == null ? last : b.at)) || byName(a, b);
  const groups = [];
  const take = (g, list) => groups.push({ ...g, rows: list.sort(/^fabula:(part|chapter|scene)$/.test(g.key) ? byPlace : byName) });
  order.forEach(g => {
    const list = byKey.get(g.key);
    if (!list) return;
    byKey.delete(g.key);
    take(g, list);
  });
  // Entries whose template is gone, last.
  byKey.forEach((list, key) => take({ key, title: "(template deleted)", icon: null, color: null }, list));
  return groups;
};

// The list, keyed by its target where it's drawn, so a Show all lasts while
// the page does.
function ReferencedBy({ state, targetId, showSecrets, onOpenEntry, exclude }) {
  const [opened, setOpened] = useState(() => new Set());
  const groups = useMemo(() => referencedByGroups(state, targetId, showSecrets, exclude), [state, targetId, showSecrets, exclude]);
  if (groups.length === 0) return null;
  return (
    <div className="referenced-by" style={{ marginTop: 26 }}>
      <div className="field-label"><span>Referenced by</span></div>
      {groups.map(g => {
        const all = opened.has(g.key) || g.rows.length <= REFERENCED_BY_SHOWN;
        return (
          <div key={g.key} className="referenced-by-group" data-group={g.key} style={{ marginBottom: 16 }}>
            <div className="referenced-by-heading" style={{ display: "flex", alignItems: "baseline", gap: 7, margin: "0 0 6px", fontSize: 12.5, color: "var(--text-dim)" }}>
              {g.icon && <span style={{ color: g.color || "var(--text-dim)", fontVariantEmoji: "text" }}>{g.icon}</span>}
              <span className="referenced-by-title" style={{ color: "var(--text)" }}>{g.title}</span>
              <span className="referenced-by-count">{g.rows.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
              {(all ? g.rows : g.rows.slice(0, REFERENCED_BY_SHOWN)).map(r => {
                const opens = !!onOpenEntry && r.src.kind !== "conlang";
                const open = () => onOpenEntry(r.src.id);
                const tail = [r.story, r.labels.join(", ")].filter(Boolean).join(" · ");
                return (
                  <div
                    key={r.src.id}
                    className="referenced-by-row"
                    data-source={r.src.id}
                    role={opens ? "button" : undefined}
                    tabIndex={opens ? 0 : undefined}
                    title={opens ? `Open ${r.src.name || "this"}` : undefined}
                    onClick={opens ? open : undefined}
                    onKeyDown={opens ? (e => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); open(); } }) : undefined}
                    style={{ padding: "8px 14px", background: "var(--surf)", display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 10, rowGap: 2, cursor: opens ? "pointer" : "default" }}
                  >
                    <span className="referenced-by-name" style={{ fontSize: 14, minWidth: 0, overflowWrap: "anywhere" }}>
                      {r.place && <span className="referenced-by-place" style={{ color: "var(--text-dim)", marginRight: 6 }}>{r.place}</span>}
                      {r.src.name || "(untitled)"}
                    </span>
                    {tail && <span className="referenced-by-fields" style={{ fontSize: 12.5, color: "var(--text-dim)", minWidth: 0, overflowWrap: "anywhere" }}>{tail}</span>}
                  </div>
                );
              })}
            </div>
            {!all && (
              <button type="button" className="btn btn-ghost btn-small referenced-by-more" style={{ marginTop: 6 }} onClick={() => setOpened(s => new Set([...s, g.key]))}>
                Show all {g.rows.length}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Longform + markdown display ───────────────────────────────────────────────

function LongformDisplay({ value }) {
  const segs = String(value || "").split("\f");
  return (
    <div className="field-val longform-display">
      {segs.map((seg, i) => (
        <React.Fragment key={i}>
          {i > 0 && <hr className="longform-break" />}
          <div className="longform-seg">{seg}</div>
        </React.Fragment>
      ))}
    </div>
  );
}

function MarkdownDisplay({ markdown, entries, templates, bodies, onOpenEntry, dirHandle }) {
  const containerRef = useRef(null);

  const html = useMemo(() => {
    if (!markdown) return "";
    let h;
    try { h = marked.parse(markdown); }
    catch (e) { console.error("md parse failed", e); return `<p>${markdown}</p>`; }

    // Build name resolution table:
    //   1. Primary names (entry.name) — first match wins by storage order
    //   2. name-history names — fallback only used if no primary match exists
    //   3. r026: celestial body names — fallback below entries so existing
    //      entry/history matches always win on name collision. Includes the
    //      body's primary name plus comma-split "Other Names" string.
    // Primary always beats history. If two entries share an alias, first wins.
    const primaryByLower = new Map();
    entries.forEach(e => {
      if (!e.name) return;
      const k = e.name.trim().toLowerCase();
      if (!primaryByLower.has(k)) primaryByLower.set(k, e);
    });
    const historyByLower = new Map();
    if (Array.isArray(templates)) {
      const tplById = Object.fromEntries(templates.map(t => [t.id, t]));
      entries.forEach(e => {
        const tpl = tplById[e.templateId];
        const altNames = getEntryNameHistory(e, tpl);
        altNames.forEach(n => {
          const k = n.trim().toLowerCase();
          if (!primaryByLower.has(k) && !historyByLower.has(k)) {
            historyByLower.set(k, e);
          }
        });
      });
    }
    const bodiesByLower = new Map();
    if (Array.isArray(bodies)) {
      bodies.forEach(b => {
        if (!b || !b.name) return;
        const k = b.name.trim().toLowerCase();
        if (k && !primaryByLower.has(k) && !historyByLower.has(k) && !bodiesByLower.has(k)) {
          bodiesByLower.set(k, b);
        }
        if (typeof b.otherNames === "string" && b.otherNames.trim()) {
          b.otherNames.split(",").forEach(alias => {
            const ak = alias.trim().toLowerCase();
            if (!ak) return;
            if (!primaryByLower.has(ak) && !historyByLower.has(ak) && !bodiesByLower.has(ak)) {
              bodiesByLower.set(ak, b);
            }
          });
        }
      });
    }

    // Post-process wiki-links
    const tmp = document.createElement("div");
    tmp.innerHTML = h;
    tmp.querySelectorAll(".wiki-link").forEach(link => {
      const name = (link.dataset.name || "").trim().toLowerCase();
      const found = primaryByLower.get(name) || historyByLower.get(name) || bodiesByLower.get(name);
      if (found) {
        link.dataset.entryId = found.id;
        link.classList.add("wiki-link-found");
      } else {
        link.classList.add("wiki-link-broken");
        link.title = "No entry with that name";
      }
    });
    return tmp.innerHTML;
  }, [markdown, entries, templates, bodies]);

  // Wiki-link click handler
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e) => {
      const link = e.target.closest(".wiki-link-found");
      if (link && link.dataset.entryId) {
        e.preventDefault();
        onOpenEntry && onOpenEntry(link.dataset.entryId);
      }
    };
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [onOpenEntry, html]);

  // Resolve folder-based images via FSAA
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const objectUrls = [];
    const imgs = el.querySelectorAll("img.md-img-folder");
    if (imgs.length === 0) return;

    if (!dirHandle) {
      imgs.forEach(img => {
        img.classList.add("md-img-missing");
        img.alt = `Set up image folder to display: ${img.dataset.filename}`;
      });
      return;
    }

    imgs.forEach(async (img) => {
      const filename = img.dataset.filename;
      try {
        const fh = await dirHandle.getFileHandle(filename);
        const file = await fh.getFile();
        const url = URL.createObjectURL(file);
        objectUrls.push(url);
        img.src = url;
        img.classList.remove("md-img-missing");
      } catch (err) {
        img.classList.add("md-img-missing");
        img.alt = `Image not found: ${filename}`;
      }
    });

    return () => { objectUrls.forEach(u => URL.revokeObjectURL(u)); };
  }, [html, dirHandle]);

  return <div ref={containerRef} className="md-content" dangerouslySetInnerHTML={{ __html: html }} />;
}

// v1.7 r003: what a reference value points at, for display: an entry, a body,
// or another registered record (a Glossopoeia record, a map, and since r007 a
// Fabula record), or null when nothing has its id. `open` says whether a
// click can take you there: entries, maps, and bodies open; a Glossopoeia
// record has no route yet, so it shows as a plain chip (Drak, 2026-10-24),
// and since v1.7's r009 a Fabula record with a page of its own opens too
// (fabulaRecordOpens; Drak, 2026-10-25), and since r011 an act, a chapter,
// or a scene does as well. `kind` names the record's type for a chip that
// can't be opened. Since r012 `place` is an act's, a chapter's, or a scene's
// position and its own name, apart, when the nodes given carry them
// (fabulaStoryNodes), for a chip to draw the position quieter than the name.
const resolveRefTarget = (id, entries, bodies, registeredNodes) => {
  if (!id) return null;
  const e = (entries || []).find(x => x && x.id === id);
  if (e) return { name: e.name, open: true };
  const b = (bodies || []).find(x => x && x.id === id);
  if (b) return { name: b.name, open: true };
  const n = (registeredNodes || []).find(x => x && x.id === id);
  if (!n) return null;
  const src = getRegisteredSourceById(n.templateId);
  return { name: n.name, place: n.place || null, open: n.templateId === SYNTH_TPL_MAP || n.templateId === BODY_REF_SENTINEL || n.templateId === SYNTH_TPL_STEMMA || fabulaRecordOpens(n.templateId), kind: src ? src.name : "" };
};

function FieldValueDisplay({ field, value, entries, templates, bodies, registeredNodes, onOpenEntry, imageFolder, dirHandle, calendar, entry, template, currentMomentDay }) {
  const ftype = field.type;
  if (ftype === "textarea") return <MarkdownDisplay markdown={value || ""} entries={entries} templates={templates} bodies={bodies} onOpenEntry={onOpenEntry} dirHandle={dirHandle} />;
  if (ftype === "longform") return <LongformDisplay value={value || ""} />;
  if (ftype === "text") return <div className="field-val"><InlineWikiLinkText value={value} entries={entries} templates={templates} bodies={bodies} onOpenEntry={onOpenEntry} /></div>;
  if (ftype === "number") return <div className="field-val">{value}</div>;
  if (ftype === "date") return <div className="field-val">{fmtDate(value) || value}</div>;
  if (ftype === "calendar-date") {
    if (!value || value.year == null) return <span className="field-empty">—</span>;
    return <div className="field-val cal-date-display">{`${value.approximate ? "~" : ""}${formatCalendarDate(value, calendar)}`}</div>;
  }
  if (ftype === "calendar-date-range") {
    if (!value || (!value.start && !value.end)) return <span className="field-empty">—</span>;
    const startStr = value.start && value.start.year != null ? formatCalendarDate(value.start, calendar) : "?";
    const endStr = value.end && value.end.year != null ? formatCalendarDate(value.end, calendar) : "ongoing";
    const approxStart = value.start?.approximate ? "~" : "";
    const approxEnd = value.end?.approximate ? "~" : "";
    // Auto-age suffix: fires only when (a) entry+template are in scope (top-
    // level field display, not a group subfield), (b) the template is person-
    // like (has a Status field that includes "Deceased" as an option), and
    // (c) this field is the FIRST calendar-date-range field on the template —
    // matches the lifespan convention used by Linea, Stemma, Concordance hover.
    let ageSuffix = null;
    if (entry && template && templateSupportsDeceased(template)) {
      const firstRange = (template.fields || []).find(f => f.type === "calendar-date-range");
      if (firstRange && firstRange.id === field.id) {
        const ageResult = computeLifespanAge(value, calendar, entry, template, currentMomentDay);
        ageSuffix = ageResult ? ageResult.suffix : null;
      }
    }
    return <div className="field-val cal-date-display">{approxStart}{startStr} → {approxEnd}{endStr}{ageSuffix && <span className="cal-date-age">{ageSuffix}</span>}</div>;
  }
  if (ftype === "name-history") {
    const items = Array.isArray(value) ? value.filter(it => it && it.name) : [];
    if (items.length === 0) return <span className="field-empty">—</span>;
    const fmt = (d) => d && d.year != null ? `${d.approximate ? "~" : ""}${formatCalendarDate(d, calendar)}` : null;
    return (
      <ul className="name-history-display">
        {items.map((it, i) => {
          const fromStr = fmt(it.from);
          const toStr = fmt(it.to);
          let dateStr = "";
          if (fromStr && toStr) dateStr = `${fromStr} – ${toStr}`;
          else if (fromStr) dateStr = `from ${fromStr}`;
          else if (toStr) dateStr = `until ${toStr}`;
          return (
            <li key={i}>
              <span className="name-history-display-name">{it.name}</span>
              {dateStr && <span className="name-history-display-date"> ({dateStr})</span>}
            </li>
          );
        })}
      </ul>
    );
  }
  if (ftype === "url") return <a className="field-link" href={value} target="_blank" rel="noopener noreferrer">{value}</a>;
  if (ftype === "color") return (
    <div className="field-color-swatch">
      <div className="field-color-swatch-box" style={{ background: value }} />
      <span style={{ fontSize: 13, color: "var(--text)" }}>{value}</span>
    </div>
  );
  if (ftype === "image") return <ImagePreview filename={value} imageFolder={imageFolder} dirHandle={dirHandle} />;
  if (ftype === "select") {
    // v1.3: handle both bare-string and {value, customText} storage shapes.
    // For otherTextField with "Other" + customText, displays customText (the
    // user's freeform choice). Entry-view stays non-combined — Type and
    // Subtype show as their own labeled fields here, since the entry-view
    // is the full detail surface. Combining lives in hover panes and md export.
    const display = formatSelectDisplay(value);
    return <div className="field-val">{display}</div>;
  }
  if (ftype === "multiselect") {
    // v1.5: array of chosen option strings, shown as static chips (the
    // tag-list look). Stale values (option later removed from the set) still
    // show, so the entry view never silently hides a recorded pick.
    const picks = Array.isArray(value)
      ? value.filter(v => v != null && String(v).trim() !== "").map(v => String(v).trim())
      : [];
    if (picks.length === 0) return <div className="field-empty">—</div>;
    return <div className="tags-display">{picks.map((p, i) => <span key={i} className="tag">{p}</span>)}</div>;
  }
  if (ftype === "tags") {
    // Accept both the canonical comma-separated string AND arrays (in case
    // imported data was constructed with arrays — the renderer shouldn't
    // crash on shape mismatches that the editor would never produce).
    let tags = [];
    if (Array.isArray(value)) {
      tags = value.filter(t => t != null && String(t).trim() !== "").map(t => String(t).trim());
    } else if (typeof value === "string") {
      tags = value.split(",").map(s => s.trim()).filter(Boolean);
    }
    return <div className="tags-display">{tags.map((t, i) => <span key={i} className="tag">{t}</span>)}</div>;
  }
  if (ftype === "entry-ref") {
    const isRelation = !!field.relationKind;
    const isSpouse = field.relationKind === SPOUSE_KIND;
    const items = isRelation
      ? getRelationValues(value, field.multi)
      : (field.multi ? (Array.isArray(value) ? value.filter(Boolean) : []) : (value ? [value] : [])).map(id => ({ id }));
    const fmt = (d) => d && d.year != null ? `${d.approximate ? "~" : ""}${formatCalendarDate(d, calendar)}` : null;
    return (
      <div className="refs-display">
        {items.map((it, i) => {
          // v1.5 r004: entry-ref values may target either state.entries or
          // state.celestialBodies (when a field's refTemplates includes
          // "Celestial Body"). Bodies retain their id from before migration,
          // so the lookup falls through naturally for legacy refs too.
          // v1.7 r003: so does any other registered record (resolveRefTarget).
          const ref = resolveRefTarget(it.id, entries, bodies, registeredNodes);
          if (!ref) return <span key={i} className="entry-ref-chip" style={{ opacity: 0.5 }}>(missing entry)</span>;
          if (!ref.open) return <span key={i} className="entry-ref-chip" style={{ cursor: "default", background: "var(--accent-glow)", color: "var(--accent)" }} title={ref.kind}>{ref.name}</span>;
          // Spouse-only narrative: status (when non-active) and marriage dates.
          let spouseMeta = null;
          if (isSpouse) {
            const statusStr = it.status && it.status !== "active" ? `[${it.status}]` : "";
            const mStr = fmt(it.marriedOn);
            const eStr = fmt(it.endedOn);
            let dateStr = "";
            if (mStr && eStr) dateStr = `married ${mStr}, ended ${eStr}`;
            else if (mStr) dateStr = `married ${mStr}`;
            else if (eStr) dateStr = `ended ${eStr}`;
            const parts = [statusStr, dateStr].filter(Boolean);
            if (parts.length > 0) spouseMeta = parts.join(" · ");
          }
          return (
            <a key={i} className="entry-ref-chip" onClick={(e) => { e.preventDefault(); onOpenEntry(it.id); }} href="#">
              <span className="entry-ref-chip-icon">→</span>{ref.place ? <><span className="entry-ref-chip-position" style={{ opacity: 0.6 }}>{ref.place.path}</span>{" "}{ref.place.name}</> : ref.name}
              {it.label && <span className="entry-ref-chip-label"> ({it.label})</span>}
              {spouseMeta && <span className="entry-ref-chip-spouse-meta"> — {spouseMeta}</span>}
            </a>
          );
        })}
      </div>
    );
  }
  if (ftype === "group") {
    const instances = Array.isArray(value) ? value : [];
    return (
      <div className="group-instances">
        {instances.map((inst, i) => (
          <div key={i} className="group-instance group-instance-readonly">
            {(field.subfields || []).map(sub => {
              // v1.3: showWhen evaluated against this instance's values
              if (!isFieldVisible(sub, inst)) return null;
              const subval = inst[sub.id];
              if (subval === "" || subval == null || (Array.isArray(subval) && subval.length === 0)) return null;
              return (
                <div key={sub.id} className="field-group" style={{ marginBottom: 12 }}>
                  <div className="field-label">{sub.label}</div>
                  <FieldValueDisplay field={sub} value={subval} entries={entries} templates={templates} bodies={bodies} registeredNodes={registeredNodes} onOpenEntry={onOpenEntry} imageFolder={imageFolder} dirHandle={dirHandle} calendar={calendar} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }
  if (ftype === "grid") {
    const g = coerceGridValue(value);
    if (gridIsEmpty(g)) return <span className="field-empty">—</span>;
    const renderCellVal = (rid, cid) => {
      const cell = g.cells[rid]?.[cid];
      if (gridCellIsEmpty(cell)) return null;
      const { type, value: cv } = cell;
      if (type === "entry-ref") {
        const ref = resolveRefTarget(cv, entries, bodies, registeredNodes);
        if (!ref) return <span className="entry-ref-chip" style={{ opacity: 0.5 }}>(missing)</span>;
        if (!ref.open) return <span className="entry-ref-chip" style={{ cursor: "default", background: "var(--accent-glow)", color: "var(--accent)" }} title={ref.kind}>{ref.name}</span>;
        return (
          <a className="entry-ref-chip" href="#" onClick={(e) => { e.preventDefault(); onOpenEntry(cv); }}>
            <span className="entry-ref-chip-icon">→</span>{ref.place ? <><span className="entry-ref-chip-position" style={{ opacity: 0.6 }}>{ref.place.path}</span>{" "}{ref.place.name}</> : ref.name}
          </a>
        );
      }
      if (type === "calendar-date") {
        return cv && cv.year != null ? `${cv.approximate ? "~" : ""}${formatCalendarDate(cv, calendar)}` : null;
      }
      if (type === "calendar-date-range") {
        const s = cv.start && cv.start.year != null ? `${cv.start.approximate ? "~" : ""}${formatCalendarDate(cv.start, calendar)}` : "?";
        const e2 = cv.end && cv.end.year != null ? `${cv.end.approximate ? "~" : ""}${formatCalendarDate(cv.end, calendar)}` : "ongoing";
        return `${s} → ${e2}`;
      }
      return String(cv);
    };
    const cellTd = { border: "1px solid var(--border)", padding: "4px 8px", verticalAlign: "top" };
    const hdrTh = { ...cellTd, background: "var(--surf2)", fontWeight: 600, textAlign: "left" };
    return (
      <div className="field-val grid-field-display" style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...hdrTh, color: "var(--text-dim)", fontSize: "0.85em" }}>
                {g.colAxisLabel && <div>{g.colAxisLabel} →</div>}
                {g.rowAxisLabel && <div>↓ {g.rowAxisLabel}</div>}
              </th>
              {g.cols.map(c => <th key={c.id} style={hdrTh}>{c.label || "—"}</th>)}
            </tr>
          </thead>
          <tbody>
            {g.rows.map(r => (
              <tr key={r.id}>
                <th style={hdrTh}>{r.label || "—"}</th>
                {g.cols.map(c => <td key={c.id} style={cellTd}>{renderCellVal(r.id, c.id)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return <div className="field-val">{String(value)}</div>;
}

function ImagePreview({ filename, imageFolder, dirHandle }) {
  const [src, setSrc] = useState(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
    setSrc(null);
    if (!filename) return;

    // Inline data URL (base64 fallback from no-FSAA worlds) — use directly.
    // Must be checked before FSAA path or we'd attempt to look up a giant
    // data URL string as if it were a filename.
    if (filename.startsWith("data:")) {
      setSrc(filename);
      return;
    }

    // FSAA path
    if (dirHandle) {
      let objectUrl = null;
      (async () => {
        try {
          const fh = await dirHandle.getFileHandle(filename);
          const file = await fh.getFile();
          objectUrl = URL.createObjectURL(file);
          setSrc(objectUrl);
        } catch (e) {
          setErrored(true);
        }
      })();
      return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }

    // Fallback: try static path next to HTML
    setSrc(`${imageFolder || "world-images"}/${filename}`);
  }, [filename, imageFolder, dirHandle]);

  if (!filename) return null;
  if (errored) return <div className="field-image-missing">Image not found: <code>{filename}</code></div>;
  if (!src) return null;
  return <img className="field-image-preview" src={src} alt={filename.startsWith("data:") ? "inline image" : filename} onError={() => setErrored(true)} />;
}
