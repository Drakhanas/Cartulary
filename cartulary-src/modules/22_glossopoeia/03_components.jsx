
// Reusable list-detail for a Glossopoeia entity slice: a per-language word/sound
// list on the left, the EntryForm editor on the right, with new/delete. Manages
// its own selection. onCreate returns the new record id so the list selects it.
// The Lexicon keeps its own hand-rolled version because of the Unassigned bucket;
// every other list workspace uses this.
function GlossEntityList({ records, schema, state, isLocked, onWrite, onCreate, onDelete, newLabel, emptyLabel, noun, focusId, subtitle, singleton }) {
  const [selId, setSelId] = useState(null);
  const [filter, setFilter] = useState("");
  // The active language's phoneme inventory, for the IPA picker on any IPA-
  // flagged field in this entity's form. Symbol = phoneme entry name.
  const ipaSymbols = useMemo(() => {
    const g = state.glossopoeia || {};
    const lid = g.ui && g.ui.activeLangId;
    return (Array.isArray(g.phonemes) ? g.phonemes : [])
      .filter(p => p && p.langId === lid && p.name)
      .map(p => ({ sym: p.name, rom: (p.fields && p.fields.romanization) || "" }));
  }, [state.glossopoeia]);
  // A display workspace (Noun Number / Verbs) can ask this list to open a
  // specific record by passing focusId. Ignored when null or not in this list.
  useEffect(() => { if (focusId) setSelId(focusId); }, [focusId]);
  // Reset the filter when switching languages so a stale query doesn't hide the
  // new language's records.
  useEffect(() => { setFilter(""); }, [state.glossopoeia && state.glossopoeia.ui && state.glossopoeia.ui.activeLangId]);
  const sel = records.find(r => r && r.id === selId) || null;
  const n = noun || "item";
  const plural = /([sxz]|ch|sh)$/i.test(n) ? n + "es" : n + "s";
  const article = /^[aeiou]/i.test(n) ? "an" : "a";
  // Duplicate the selected record: deep clone, fresh id (keeping the slice's id
  // prefix), "(copy)" name, written via the upserting onWrite, then selected.
  const duplicate = () => {
    if (!sel) return;
    const clone = JSON.parse(JSON.stringify(sel));
    const prefix = String(sel.id || "dup").split("-")[0] || "dup";
    clone.id = `${prefix}-${genId()}`;
    clone.name = (sel.name && sel.name.trim()) ? `${sel.name} (copy)` : "(copy)";
    onWrite(clone);
    setSelId(clone.id);
  };
  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0, width: "100%" }}>
      <div style={{ flex: "0 0 220px", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: "0.8em", color: "var(--text-dim)" }}>{records.length} {records.length === 1 ? n : plural}</span>
          {!isLocked && !(singleton && records.length > 0) && <button className="btn btn-accent btn-small" onClick={() => { const id = onCreate(); if (id) setSelId(id); }}>{newLabel || "+ New"}</button>}
        </div>
        {records.length > 6 && (
          <div style={{ padding: "6px 8px", borderBottom: "1px solid var(--border)" }}>
            <input className="input" style={{ fontSize: "0.85em", padding: "4px 8px" }} placeholder={`Filter ${plural}...`} value={filter} onChange={e => setFilter(e.target.value)} />
          </div>
        )}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {(() => {
            if (records.length === 0) return <div style={{ padding: 16, color: "var(--text-dim)", fontSize: "0.9em" }}>{emptyLabel || "Nothing yet."}</div>;
            const q = filter.trim().toLowerCase();
            const shown = [...records]
              .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
              .filter(r => !q || (r.name || "").toLowerCase().includes(q));
            if (shown.length === 0) return <div style={{ padding: 16, color: "var(--text-dim)", fontSize: "0.9em" }}>No {plural} match.</div>;
            return shown.map(r => {
              const sub = subtitle ? subtitle(r) : "";
              return (
                <button key={r.id} onClick={() => setSelId(r.id)}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 12px", background: selId === r.id ? "var(--accent-dim)" : "transparent", color: selId === r.id ? "var(--text-bright)" : "var(--text)", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", fontSize: "0.92em" }}>
                  {r.name || "(unnamed)"}
                  {sub ? <span style={{ display: "block", fontSize: "0.82em", color: "var(--text-dim)", marginTop: 1 }}>{sub}</span> : null}
                </button>
              );
            });
          })()}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "16px 20px" }}>
        {sel ? (
          <>
            {!isLocked && (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginBottom: 8 }}>
                <button className="btn btn-ghost btn-small" onClick={duplicate}>Duplicate</button>
                <button className="btn btn-danger btn-small" onClick={() => { if (confirm(`Delete "${sel.name || ("this " + n)}"?`)) { onDelete(sel.id); setSelId(null); } }}>Delete</button>
              </div>
            )}
            <EntryForm draft={sel} template={schema} entries={state.entries} templates={state.templates} bodies={state.celestialBodies} registeredNodes={getRegisteredGraphNodes(state)} onChange={onWrite} showSecrets={true} imageFolder={state.world.imageFolder} allTags={[]} dirHandle={null} calendar={state.world.calendar} primaryCalendar={state.world.calendar} additionalCalendars={[]} selfEntryId={sel.id} flash={null} previewMode={false} ipaSymbols={ipaSymbols} />
          </>
        ) : (
          <div style={{ color: "var(--text-dim)", padding: 20 }}>{records.length ? ("Select " + article + " " + n + " to edit.") : (emptyLabel || "Nothing yet.")}</div>
        )}
      </div>
    </div>
  );
}

// A per-workspace longform note (romanization / pronunciation key, etc.),
// stored outside the entity schemas in glossopoeia.workspaceNotes[langId][wsId].
// Rich textarea (wiki-links + images), collapsed unless it already has content
// so it doesn't crowd the list. Key it by langId at the call site so the open
// state and editor re-init when the language changes. Reused by any workspace
// wanting a free-text header (Inventory now, Orthography later).
function GlossWorkspaceNote({ state, value, onChange, isLocked, label }) {
  const [open, setOpen] = useState(!!(value && value.trim()));
  return (
    <div style={{ borderBottom: "1px solid var(--border)", padding: "6px 12px", flex: "0 0 auto" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.74em", textTransform: "uppercase", letterSpacing: "0.05em", padding: "2px 0" }}>
        <span style={{ fontSize: "0.95em" }}>{open ? "\u25be" : "\u25b8"}</span>{label}
      </button>
      {open && (
        <div style={{ marginTop: 6 }}>
          <RichTextEditor value={value || ""} onChange={onChange} entries={state.entries} templates={state.templates} bodies={state.celestialBodies} dirHandle={null} placeholder={label} flash={null} />
        </div>
      )}
    </div>
  );
}

// Read-only digest for the display workspaces (Noun Number, Verbs). Owns no
// data: it filters and lays out Morphology-toolbox records that live in the
// slice, grouped into sections. Each card jumps to that record in the Morphology
// workspace. valueById resolves Grammatical Value ids (e.g. an affix's Marks) to
// names. Sections: [{ label, kind, records }]; kind matches the toolbox type.
function GlossToolboxDigest({ sections, valueById, onJump }) {
  const summarize = (kind, rec) => {
    const f = rec.fields || {};
    if (kind === "grammatical-value") {
      return [f.shortTag, f.function].filter(Boolean).join(" \u00b7 ");
    }
    if (kind === "affix") {
      const parts = [];
      const pos = selectValueOnly(f.position);
      if (pos) parts.push(pos);
      const marks = (Array.isArray(f.marks) ? f.marks : []).map(id => (valueById.get(id) || {}).name).filter(Boolean);
      if (marks.length) parts.push("marks " + marks.join(", "));
      else if (f.addsMeaning) parts.push("adds: " + f.addsMeaning);
      return parts.join(" \u00b7 ");
    }
    if (kind === "inflection-class") {
      const ap = Array.isArray(f.appliesTo) ? f.appliesTo.join(", ") : "";
      return [ap && ("applies to " + ap), f.example].filter(Boolean).join(" \u00b7 ");
    }
    if (kind === "word-building") {
      return [selectValueOnly(f.method), f.example].filter(Boolean).join(" \u00b7 ");
    }
    return "";
  };
  return (
    <div style={{ maxWidth: 720 }}>
      {sections.map(sec => (
        <div key={sec.kind + ":" + sec.label} style={{ marginBottom: 22 }}>
          <div style={{ fontSize: "0.78em", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-dim)", marginBottom: 8 }}>{sec.label} ({sec.records.length})</div>
          {sec.records.length === 0
            ? <div style={{ color: "var(--text-dim)", fontSize: "0.9em", fontStyle: "italic" }}>None.</div>
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {sec.records.map(rec => {
                  const sub = summarize(sec.kind, rec);
                  const grid = sec.kind === "inflection-class" ? coerceGridValue((rec.fields || {}).endings) : null;
                  const showGrid = grid && !gridIsEmpty(grid);
                  const cellText = (rid, cid) => { const c = grid.cells[rid] && grid.cells[rid][cid]; if (gridCellIsEmpty(c)) return ""; if (c.type === "entry-ref") return (valueById.get(c.value) || {}).name || String(c.value || ""); return c.value == null ? "" : String(c.value); };
                  const cth = { border: "1px solid var(--border)", padding: "2px 7px", fontSize: "0.82em", textAlign: "left", color: "var(--text-dim)" };
                  const ctd = { border: "1px solid var(--border)", padding: "2px 7px", fontSize: "0.85em", color: "var(--text)", fontFamily: "'Charis SIL','Doulos SIL','Gentium Plus',serif" };
                  return (
                    <div key={rec.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <button onClick={() => onJump(sec.kind, rec.id)} title="Edit in Morphology"
                        style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 2, padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", background: "transparent", cursor: "pointer", color: "var(--text)" }}>
                        <span style={{ color: "var(--text-bright)", fontWeight: 600 }}>{rec.name || "Unnamed"}</span>
                        {sub && <span style={{ color: "var(--text-dim)", fontSize: "0.85em" }}>{sub}</span>}
                      </button>
                      {showGrid && (
                        <div style={{ overflowX: "auto", paddingLeft: 4 }}>
                          <table style={{ borderCollapse: "collapse" }}>
                            <thead><tr>
                              <th style={cth}>{[grid.rowAxisLabel, grid.colAxisLabel].filter(Boolean).join(" / ")}</th>
                              {grid.cols.map(c => <th key={c.id} style={cth}>{c.label}</th>)}
                            </tr></thead>
                            <tbody>
                              {grid.rows.map(r => (
                                <tr key={r.id}>
                                  <th style={{ ...cth, color: "var(--text-bright)", fontWeight: 600 }}>{r.label}</th>
                                  {grid.cols.map(c => <td key={c.id} style={ctd}>{cellText(r.id, c.id)}</td>)}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      ))}
    </div>
  );
}

// The Generate panel at the top of the Lexicon. Inputs (syllable range + count),
// a Generate button that calls glossGenerateWords, and an editable review list:
// each candidate has a keep checkbox plus an editable name and pronunciation, so
// nothing commits until you accept it and you can fix an ugly auto-romanization
// first. "Add" turns the kept candidates into real Lexicon words.
function GlossWordGenerator({ g, langId, onAdd }) {
  const [open, setOpen] = useState(false);
  const [minS, setMinS] = useState(1);
  const [maxS, setMaxS] = useState(3);
  const [count, setCount] = useState(12);
  const [cands, setCands] = useState([]);
  const [ran, setRan] = useState(false);
  useEffect(() => { setCands([]); setRan(false); }, [langId]);
  const run = () => {
    const lo = Math.max(1, Math.min(8, parseInt(minS, 10) || 1));
    const hi = Math.max(lo, Math.min(8, parseInt(maxS, 10) || lo));
    const out = glossGenerateWords(g, langId, { count: parseInt(count, 10) || 12, minSyll: lo, maxSyll: hi });
    setCands(out.map(c => ({ ...c, keep: true })));
    setRan(true);
  };
  const setField = (i, k, v) => setCands(cs => cs.map((c, j) => j === i ? { ...c, [k]: v } : c));
  const setAll = (v) => setCands(cs => cs.map(c => ({ ...c, keep: v })));
  const kept = cands.filter(c => c.keep && (c.pronunciation || "").trim());
  const add = () => { if (kept.length === 0) return; onAdd(kept.map(c => ({ name: c.name, pronunciation: c.pronunciation }))); setCands([]); setRan(false); };
  const numStyle = { width: 52, fontSize: "0.85em", padding: "3px 6px" };
  return (
    <div style={{ borderBottom: "1px solid var(--border)", background: "var(--surf2)" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", textAlign: "left", background: "transparent", border: "none", color: "var(--text)", cursor: "pointer", padding: "8px 14px", fontSize: "0.86em", letterSpacing: "0.02em" }}>
        <span style={{ color: "var(--text-dim)" }}>{open ? "\u25be" : "\u25b8"}</span> Generate words
      </button>
      {open && (
        <div style={{ padding: "0 14px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
            <label style={{ fontSize: "0.8em", color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 6 }}>
              Syllables
              <input className="input" type="number" min="1" max="8" style={numStyle} value={minS} onChange={e => setMinS(e.target.value)} />
              to
              <input className="input" type="number" min="1" max="8" style={numStyle} value={maxS} onChange={e => setMaxS(e.target.value)} />
            </label>
            <label style={{ fontSize: "0.8em", color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 6 }}>
              Count
              <input className="input" type="number" min="1" max="100" style={numStyle} value={count} onChange={e => setCount(e.target.value)} />
            </label>
            <button className="btn btn-accent btn-small" onClick={run}>Generate</button>
          </div>
          {ran && cands.length === 0 && (
            <div style={{ fontSize: "0.8em", color: "var(--text-dim)" }}>
              Nothing came back that fits. Check the language has phonemes and a syllable structure, widen the syllable range, or loosen a constraint.
            </div>
          )}
          {cands.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.8em" }}>
                <span style={{ color: "var(--text-dim)" }}>{cands.length} candidate{cands.length === 1 ? "" : "s"}</span>
                <button className="btn btn-ghost btn-small" onClick={() => setAll(true)}>All</button>
                <button className="btn btn-ghost btn-small" onClick={() => setAll(false)}>None</button>
                <span style={{ flex: 1 }} />
                <button className="btn btn-accent btn-small" onClick={add} disabled={kept.length === 0}>Add {kept.length || ""} word{kept.length === 1 ? "" : "s"}</button>
                <button className="btn btn-ghost btn-small" onClick={() => { setCands([]); setRan(false); }}>Clear</button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {cands.map((c, i) => (
                  <div key={i} style={{ flex: "0 0 200px", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "6px 8px", background: c.keep ? "var(--surf)" : "transparent", opacity: c.keep ? 1 : 0.55 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input type="checkbox" checked={c.keep} onChange={e => setField(i, "keep", e.target.checked)} />
                      <input className="input" style={{ fontSize: "0.9em", padding: "2px 6px", flex: 1, minWidth: 0 }} value={c.name} onChange={e => setField(i, "name", e.target.value)} />
                    </div>
                    <input className="input" style={{ fontSize: "0.85em", padding: "2px 6px", marginTop: 4, width: "100%", fontFamily: "'Charis SIL','Doulos SIL','Gentium Plus','Times New Roman',serif", color: "var(--text-dim)" }} value={c.pronunciation} onChange={e => setField(i, "pronunciation", e.target.value)} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// The surface-form readout in the Lexicon: shows the phonetic result of running
// the language's sound rules on a word, with a toggle to see which rules fired.
// Renders nothing when the language has no rules or none change the word.
function GlossSurfaceLine({ rec, g }) {
  const [open, setOpen] = useState(false);
  const res = glossApplyRules(rec, g);
  if (!res || !res.changed) return null;
  return (
    <div style={{ background: "var(--surf2)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "8px 12px", marginBottom: 12 }}>
      <div style={{ fontSize: "0.72em", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-dim)" }}>Surface form (after sound rules)</div>
      <div style={{ marginTop: 2 }}>
        <span style={{ fontFamily: "'Charis SIL','Doulos SIL','Gentium Plus','Times New Roman',serif", fontSize: "1.15em", color: "var(--text-bright)" }}>[{res.surface}]</span>
      </div>
      {res.fired.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <button onClick={() => setOpen(o => !o)} style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.76em", padding: 0 }}>
            {open ? "\u25be" : "\u25b8"} {res.fired.length} rule{res.fired.length === 1 ? "" : "s"} fired
          </button>
          {open && (
            <div style={{ marginTop: 4 }}>
              {res.fired.map((f, i) => (
                <div key={i} style={{ fontSize: "0.78em", color: "var(--text-dim)", fontFamily: "'Charis SIL','Doulos SIL','Gentium Plus',serif" }}>
                  {f.name ? f.name + ": " : ""}{f.from} \u2192 {f.to}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// The generated-paradigm table on a word in the Lexicon. Auto cells are the
// stem plus the class ending; override cells (from Irregular Forms) show in the
// accent color; stem-change cells show the dim instruction. Nothing renders when
// the word has no inflection class.
function GlossParadigm({ rec, g }) {
  const p = glossBuildParadigm(rec, g);
  if (!p) return null;
  const th = { border: "1px solid var(--border)", padding: "2px 8px", fontSize: "0.8em", textAlign: "left", color: "var(--text-dim)" };
  const tdBase = { border: "1px solid var(--border)", padding: "2px 8px", fontSize: "0.92em", fontFamily: "'Charis SIL','Doulos SIL','Gentium Plus',serif" };
  const anyOverride = p.cells.some(row => row.some(c => c.kind === "override"));
  const anyStemChange = p.cells.some(row => row.some(c => c.kind === "stem-change"));
  return (
    <div style={{ background: "var(--surf2)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "8px 12px", marginBottom: 12 }}>
      <div style={{ fontSize: "0.72em", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-dim)" }}>Paradigm{p.className ? " \u00b7 " + p.className : ""}</div>
      <div style={{ overflowX: "auto", marginTop: 4 }}>
        <table style={{ borderCollapse: "collapse" }}>
          <thead><tr>
            <th style={th}>{[p.rowAxisLabel, p.colAxisLabel].filter(Boolean).join(" / ")}</th>
            {p.cols.map((cl, ci) => <th key={ci} style={th}>{cl}</th>)}
          </tr></thead>
          <tbody>
            {p.rows.map((rl, ri) => (
              <tr key={ri}>
                <th style={{ ...th, color: "var(--text-bright)", fontWeight: 600 }}>{rl}</th>
                {p.cols.map((cl, ci) => {
                  const cell = p.cells[ri][ci];
                  const style = cell.kind === "override" ? { ...tdBase, color: "var(--accent)" }
                    : cell.kind === "stem-change" ? { ...tdBase, color: "var(--text-dim)", fontStyle: "italic" }
                    : cell.kind === "empty" ? { ...tdBase, color: "var(--text-dim)" }
                    : { ...tdBase, color: "var(--text-bright)" };
                  return <td key={ci} style={style}>{cell.form || "\u00b7"}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(anyOverride || anyStemChange) && (
        <div style={{ fontSize: "0.72em", color: "var(--text-dim)", marginTop: 4 }}>
          {anyOverride && <span style={{ color: "var(--accent)" }}>accent = irregular override</span>}
          {anyOverride && anyStemChange && "  \u00b7  "}
          {anyStemChange && <span style={{ fontStyle: "italic" }}>italic = stem change, fill by hand or override</span>}
        </div>
      )}
    </div>
  );
}

// The "Gloss a sentence" panel atop the Corpus workspace. Paste a sentence,
// gloss it, and it creates a new Example with the Word / Parts / Gloss
// interlinear pre-filled for you to correct.
function GlossSentenceGloss({ g, langId, onAdd }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  useEffect(() => { setText(""); }, [langId]);
  const gloss = () => {
    const res = glossGlossSentence(text, g, langId);
    if (!res.words.length) return;
    const wr = genId(), pr = genId(), gr = genId();
    const cols = res.words.map(() => ({ id: genId(), label: "" }));
    const cells = { [wr]: {}, [pr]: {}, [gr]: {} };
    res.words.forEach((w, i) => { const cid = cols[i].id; cells[wr][cid] = { type: "text", value: w.word }; cells[pr][cid] = { type: "text", value: w.parts }; cells[gr][cid] = { type: "text", value: w.gloss }; });
    const grid = { rowAxisLabel: "", colAxisLabel: "", rows: [{ id: wr, label: "Word" }, { id: pr, label: "Parts" }, { id: gr, label: "Gloss" }], cols, cells };
    onAdd(grid, text.trim());
    setText("");
  };
  return (
    <div style={{ borderBottom: "1px solid var(--border)", background: "var(--surf2)" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", textAlign: "left", background: "transparent", border: "none", color: "var(--text)", cursor: "pointer", padding: "8px 14px", fontSize: "0.86em", letterSpacing: "0.02em" }}>
        <span style={{ color: "var(--text-dim)" }}>{open ? "\u25be" : "\u25b8"}</span> Gloss a sentence
      </button>
      {open && (
        <div style={{ padding: "0 14px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea className="input" rows={2} placeholder="Paste a sentence in this language..." value={text} onChange={e => setText(e.target.value)}
            style={{ fontFamily: "'Charis SIL','Doulos SIL','Gentium Plus','Times New Roman',serif", resize: "vertical" }} />
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn btn-accent btn-small" onClick={gloss} disabled={!text.trim()}>Gloss \u2192 new Example</button>
            <span style={{ fontSize: "0.76em", color: "var(--text-dim)" }}>Builds the interlinear from your lexicon and prior glosses; fix what it missed in the new Example.</span>
          </div>
        </div>
      )}
    </div>
  );
}