
function HomeView({ state, onOpenEntry, dirHandle }) {
  // Resolve current section from URL hash, or default to first
  const resolveFromHash = () => {
    const hash = (typeof window !== "undefined" && window.location.hash) || "";
    const m = hash.match(/^#section=([\w-]+)$/);
    if (m) {
      const found = HOME_SECTIONS.find(s => s.id === m[1]);
      if (found) return found.id;
    }
    return HOME_SECTIONS[0].id;
  };

  const [currentId, setCurrentId] = useState(resolveFromHash);
  const [tocOpen, setTocOpen] = useState(false); // mobile drawer state
  const contentRef = useRef(null);

  // Listen for browser back/forward
  useEffect(() => {
    const onPop = () => setCurrentId(resolveFromHash());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Navigate to a section: update URL hash, reset scroll, close mobile drawer
  const goTo = (id) => {
    if (id === currentId) {
      setTocOpen(false);
      return;
    }
    if (HOME_SECTIONS.find(s => s.id === id)) {
      window.history.pushState(null, "", `#section=${id}`);
      setCurrentId(id);
      setTocOpen(false);
      if (contentRef.current) contentRef.current.scrollTop = 0;
    }
  };

  const currentIdx = Math.max(0, HOME_SECTIONS.findIndex(s => s.id === currentId));
  const current = HOME_SECTIONS[currentIdx];
  const prev = currentIdx > 0 ? HOME_SECTIONS[currentIdx - 1] : null;
  const next = currentIdx < HOME_SECTIONS.length - 1 ? HOME_SECTIONS[currentIdx + 1] : null;

  const renderPrevNext = () => (
    <div className="home-prevnext">
      <button
        type="button"
        className="home-prevnext-btn home-prevnext-prev"
        onClick={() => prev && goTo(prev.id)}
        disabled={!prev}
        aria-label={prev ? `Previous: ${prev.title}` : "No previous section"}
      >
        <span className="home-prevnext-label">← Previous</span>
        {prev && <span className="home-prevnext-title">{prev.title}</span>}
      </button>
      <button
        type="button"
        className="home-prevnext-btn home-prevnext-next"
        onClick={() => next && goTo(next.id)}
        disabled={!next}
        aria-label={next ? `Next: ${next.title}` : "No next section"}
      >
        <span className="home-prevnext-label">Next →</span>
        {next && <span className="home-prevnext-title">{next.title}</span>}
      </button>
    </div>
  );

  return (
    <div className={`home-view${tocOpen ? " home-view-toc-open" : ""}`}>
      <button
        type="button"
        className="home-toc-toggle"
        onClick={() => setTocOpen(o => !o)}
        aria-expanded={tocOpen}
        aria-label={tocOpen ? "Close table of contents" : "Open table of contents"}
      >
        {tocOpen ? "✕ Close" : "☰ Contents"}
      </button>
      <aside className="home-toc">
        {HOME_SECTIONS.map(s => (
          <React.Fragment key={s.id}>
            {s.band && <div className="home-toc-band">{s.band}</div>}
            <button
              type="button"
              className={`home-toc-item ${currentId === s.id ? "active" : ""}`}
              onClick={() => goTo(s.id)}
            >
              {s.title}
            </button>
          </React.Fragment>
        ))}
      </aside>
      <div className="home-content" ref={contentRef}>
        <h1 className="home-title">Cartulary</h1>
        {current.id === "intro" && (
          <div className="home-callout">
            <div className="home-callout-hdr">First time here?</div>
            Click your world's name (<strong>{state?.world?.name || "Untitled World"}</strong>) at the top-left of the sidebar to set its name, description, calendar, and other settings. Then pick any template from the sidebar and click <strong>+ New Entry</strong> to create your first entry.
          </div>
        )}
        {renderPrevNext()}
        <section className="home-section">
          <h2 className="home-section-title">{current.title}</h2>
          <div className="md-content">
            <MarkdownDisplay markdown={current.content} entries={state?.entries || []} templates={state?.templates || []} bodies={state?.celestialBodies || []} onOpenEntry={onOpenEntry} dirHandle={dirHandle} />
          </div>
        </section>
        {renderPrevNext()}
      </div>
    </div>
  );
}

// ─── Project view (current world landing) ──────────────────────────────────────

function ProjectView({ state, onOpenEntry, dirHandle, onSelectTemplate, onChangeView, onOpenHtmlExportModal }) {
  const world = state.world;
  const entries = state.entries;
  const templates = state.templates;

  const stats = useMemo(() => {
    const tplCounts = {};
    templates.forEach(t => { tplCounts[t.id] = 0; });
    entries.forEach(e => { tplCounts[e.templateId] = (tplCounts[e.templateId] || 0) + 1; });
    const allTags = new Set();
    entries.forEach(e => (e.tags || []).forEach(t => allTags.add(t)));
    const monthsCount = world.calendar?.months?.length || 0;
    const erasCount = world.calendar?.eras?.length || 0;
    return {
      totalEntries: entries.length,
      totalTemplates: templates.length,
      totalTags: allTags.size,
      monthsCount, erasCount,
      perTemplate: templates.map(t => ({ tpl: t, count: tplCounts[t.id] || 0 })).sort((a, b) => b.count - a.count),
    };
  }, [state]);

  // Recently updated entries
  const recent = useMemo(() => {
    return [...entries]
      .filter(e => e.updatedAt)
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
      .slice(0, 6);
  }, [entries]);

  const tplById = Object.fromEntries(templates.map(t => [t.id, t]));

  return (
    <div className="landing-view">
      <div className="landing-hdr">{world.name || "Untitled World"}</div>
      <div className="landing-sub">
        Created {fmtDate(world.createdAt) || "—"}
        {world.updatedAt && ` · Last updated ${fmtDate(world.updatedAt)}`}
      </div>

      {world.description && (
        <div className="md-content" style={{ marginBottom: 28 }}>
          <MarkdownDisplay markdown={world.description} entries={entries} templates={templates} bodies={state.celestialBodies || []} onOpenEntry={onOpenEntry} dirHandle={dirHandle} />
        </div>
      )}

      {entries.length === 0 && (Array.isArray(state.cartographia) ? state.cartographia : []).length === 0 ? (
        <div className="landing-empty-cta">
          <div className="landing-empty-cta-hdr">Your world is empty.</div>
          <div className="landing-empty-cta-body">
            Pick a template from the sidebar — Character, Location, Faction, or any other — and click <strong>+ New Entry</strong> to create your first entry. You can also edit existing templates or build new ones to match your world's needs.
            <br /><br />
            Need help? Click <strong>◐ Home</strong> in the sidebar for the full usage guide.
          </div>
        </div>
      ) : (
        <>
          <div className="landing-section">
            <div className="landing-section-hdr">Overview</div>
            <div className="landing-stats">
              <div className="landing-stat">
                <div className="landing-stat-num">{stats.totalEntries}</div>
                <div className="landing-stat-label">Entries</div>
              </div>
              <div className="landing-stat">
                <div className="landing-stat-num">{stats.totalTemplates}</div>
                <div className="landing-stat-label">Templates</div>
              </div>
              <div className="landing-stat">
                <div className="landing-stat-num">{stats.totalTags}</div>
                <div className="landing-stat-label">Unique Tags</div>
              </div>
              <div className="landing-stat">
                <div className="landing-stat-num">{stats.monthsCount}</div>
                <div className="landing-stat-label">Calendar Months</div>
              </div>
              {stats.erasCount > 0 && (
                <div className="landing-stat">
                  <div className="landing-stat-num">{stats.erasCount}</div>
                  <div className="landing-stat-label">Eras</div>
                </div>
              )}
            </div>
          </div>

          <div className="landing-section">
            <div className="landing-section-hdr">Entries by Template</div>
            <div className="landing-tpl-grid">
              {stats.perTemplate.map(({ tpl, count }) => (
                <div key={tpl.id} className="landing-tpl-row" onClick={() => onSelectTemplate(tpl.id)}>
                  <span className="landing-tpl-icon" style={{ color: tpl.color }}>{tpl.icon}</span>
                  <span className="landing-tpl-name">{tpl.name}</span>
                  <span className="landing-tpl-count">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {recent.length > 0 && (
            <div className="landing-section">
              <div className="landing-section-hdr">Recently Updated</div>
              <div className="landing-recent">
                {recent.map(e => {
                  const tpl = tplById[e.templateId];
                  return (
                    <div key={e.id} className="landing-recent-row" onClick={() => onOpenEntry(e.id)}>
                      <span className="landing-recent-icon" style={{ color: tpl?.color }}>{tpl?.icon || "·"}</span>
                      <span className="landing-recent-name">{e.name || "(unnamed)"}</span>
                      <span className="landing-recent-tpl">{tpl?.name || ""} · {fmtDate(e.updatedAt)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="landing-section">
            <div className="landing-section-hdr">Export</div>
            <div className="landing-export-block">
              <div className="landing-export-desc">
                Generate a shareable HTML file of this world. Single self-contained file that opens in any browser; cross-references between entries become anchor links and dates render through your calendar system. Read-only — for sharing with people who don't have Cartulary. (JSON and Markdown exports still live in Settings.)
              </div>
              <button className="btn btn-accent" onClick={onOpenHtmlExportModal}>
                Export as HTML
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}