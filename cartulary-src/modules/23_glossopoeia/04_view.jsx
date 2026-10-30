
function GlossopoeiaView({ state, updateState, isLocked, onOpenEntry, flash }) {
  const g = state.glossopoeia || makeDefaultGlossopoeiaState();
  const conlangs = Array.isArray(g.conlangs) ? g.conlangs : [];
  const ui = g.ui || { activeLangId: null, workspace: "overview" };
  const activeLang = conlangs.find(c => c && c.id === ui.activeLangId) || null;
  const workspace = ui.workspace || "overview";
  const [collapsed, setCollapsed] = useState({});
  const [phonoTab, setPhonoTab] = useState("syllable");
  const [morphTab, setMorphTab] = useState("value");
  const [morphFocus, setMorphFocus] = useState(null);
  const [syntaxTab, setSyntaxTab] = useState("phrase");
  const [complexTab, setComplexTab] = useState("relativization");
  const [orthoTab, setOrthoTab] = useState("system");
  const conlangFileRef = useRef(null);
  const onConlangFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    // Parity with the template/calendar importer: bail before reading so a
    // locked world can't trigger an import. Unreachable today (Import is hidden
    // when locked), defensive only.
    if (isLocked) return;
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try { parsed = JSON.parse(reader.result); }
      catch (err) { if (flash) flash("Couldn't parse that file as JSON.", "error"); return; }
      importConlangPayload(state, updateState, parsed, flash);
    };
    reader.onerror = () => { if (flash) flash("Couldn't read that file.", "error"); };
    reader.readAsText(file);
  };
  const conlangSchema = useMemo(() => glossopoeiaConlangSchema(state), [state.templates]);

  const patchUI = (patch) => updateState(s => {
    const gg = s.glossopoeia || makeDefaultGlossopoeiaState();
    return { ...s, glossopoeia: { ...gg, ui: { ...(gg.ui || {}), ...patch } } };
  });
  // v1.7 r044 (Drak's call 3 at the cut): a language's name is written as
  // it's typed, so its rename asks when the name field is left, against the
  // world with the old name in it; Cancel puts the old name back.
  const renameLanguage = (id, was, now) => {
    if (isLocked || !(now || "").trim()) return;
    const before = renameRecordIn(state, id, was, null);
    renameAsk({
      state: before, id, oldName: was, newName: now,
      write: (choice) => {
        updateState(s => renameSettle(s, id, was, now, choice.update));
        if (choice.update && flash) flash(renameUpdatedLine(choice.places, "Renamed"));
      },
      cancel: () => updateState(s => renameRecordIn(s, id, was, null)),
    });
  };
  const writeConlang = (rec) => {
    if (isLocked) return;
    updateState(s => {
      const gg = s.glossopoeia || makeDefaultGlossopoeiaState();
      const list = Array.isArray(gg.conlangs) ? gg.conlangs : [];
      const idx = list.findIndex(c => c && c.id === rec.id);
      const next = idx >= 0 ? list.map(c => (c && c.id === rec.id ? rec : c)) : [...list, rec];
      return { ...s, glossopoeia: { ...gg, conlangs: next } };
    });
  };
  const createConlang = () => {
    if (isLocked) return;
    const id = `lang-${genId()}`;
    updateState(s => {
      const gg = s.glossopoeia || makeDefaultGlossopoeiaState();
      const list = Array.isArray(gg.conlangs) ? gg.conlangs : [];
      const rec = { id, name: "New language", tags: [], fields: {} };
      return { ...s, glossopoeia: { ...gg, conlangs: [...list, rec], ui: { ...(gg.ui || {}), activeLangId: id, workspace: "overview" } } };
    });
  };
  // v1.7 r042: each delete clears what links to what goes, everywhere the
  // link index reads, before the records go (clearLinksTo).
  const deleteConlang = (id) => {
    if (isLocked) return;
    updateState(s0 => {
      const s = clearLinksTo(s0, glossLangRecordIds(s0, id));
      const gg = s.glossopoeia || makeDefaultGlossopoeiaState();
      const list = (Array.isArray(gg.conlangs) ? gg.conlangs : []).filter(c => c && c.id !== id);
      const next = { ...gg, conlangs: list };
      // Remove every record belonging to this language across all slice arrays,
      // so its words/sounds/rules don't strand as "Unassigned" after the delete.
      GLOSS_LANG_ARRAYS.forEach(key => {
        if (Array.isArray(gg[key])) next[key] = gg[key].filter(r => !(r && r.langId === id));
      });
      // Clear any reference a surviving language held to a deleted sound.
      const deadPhonemes = new Set((Array.isArray(gg.phonemes) ? gg.phonemes : []).filter(p => p && p.langId === id).map(p => p.id));
      if (deadPhonemes.size) {
        const scrubbed = glossScrubPhonemeRefs(next, deadPhonemes);
        next.phonotacticConstraints = scrubbed.phonotacticConstraints;
        next.phonologicalRules = scrubbed.phonologicalRules;
      }
      const wasActive = gg.ui && gg.ui.activeLangId === id;
      const nextActive = wasActive ? (list[0] ? list[0].id : null) : (gg.ui ? gg.ui.activeLangId : null);
      next.ui = { ...(gg.ui || {}), activeLangId: nextActive };
      return { ...s, glossopoeia: next };
    });
  };

  // Lexicon (the dictionary). Lexemes carry a langId to their parent ConLang;
  // the Lexicon lists the active language's words. The Unassigned bucket (for
  // langId-less words the migration produces) lands with the supersede.
  const lexemeSchema = useMemo(() => glossopoeiaLexemeSchema(state), [state.templates]);
  const allLexemes = Array.isArray(g.lexemes) ? g.lexemes : [];
  const [selectedLexemeId, setSelectedLexemeId] = useState(null);
  const [forkRun, setForkRun] = useState(null);
  const [pruneList, setPruneList] = useState(null);
  const [pruneAfterRun, setPruneAfterRun] = useState(false);
  const [lexFilter, setLexFilter] = useState("");
  useEffect(() => { setLexFilter(""); }, [activeLang && activeLang.id]);
  const langLexemes = activeLang ? allLexemes.filter(x => x && x.langId === activeLang.id) : [];
  // Unassigned: words with no parent language, or whose langId points at a
  // language that no longer exists. The migration produces these for multi- and
  // zero-language worlds; the bucket lets the user re-home them.
  const orphanLexemes = allLexemes.filter(x => x && (x.langId == null || !conlangs.some(c => c && c.id === x.langId)));
  const isUnassigned = ui.activeLangId === "__unassigned__";
  const displayLexemes = isUnassigned ? orphanLexemes : langLexemes;
  const selectedLexeme = displayLexemes.find(x => x && x.id === selectedLexemeId) || null;
  // Workspaces that fill the pane edge-to-edge with their own list-detail layout
  // (no outer padding/scroll). Extended as each list workspace lands.
  const fullBleed = isUnassigned || workspace === "lexicon" || workspace === "inventory" || workspace === "phonotactics" || workspace === "morphology" || workspace === "pronouns" || workspace === "syntax" || workspace === "complexStructures" || workspace === "orthography" || workspace === "corpus";

  const writeLexeme = (rec) => {
    if (isLocked) return;
    updateState(s => {
      const gg = s.glossopoeia || makeDefaultGlossopoeiaState();
      const list = Array.isArray(gg.lexemes) ? gg.lexemes : [];
      const idx = list.findIndex(x => x && x.id === rec.id);
      const next = idx >= 0 ? list.map(x => (x && x.id === rec.id ? rec : x)) : [...list, rec];
      return { ...s, glossopoeia: { ...gg, lexemes: next } };
    });
  };
  const createLexeme = () => {
    if (isLocked || !activeLang) return;
    const id = `lex-${genId()}`;
    const rec = { id, langId: activeLang.id, name: "", tags: [], fields: {} };
    updateState(s => {
      const gg = s.glossopoeia || makeDefaultGlossopoeiaState();
      const list = Array.isArray(gg.lexemes) ? gg.lexemes : [];
      return { ...s, glossopoeia: { ...gg, lexemes: [...list, rec] } };
    });
    setSelectedLexemeId(id);
  };
  const deleteLexeme = (id) => {
    if (isLocked) return;
    updateState(s0 => {
      const s = clearLinksTo(s0, new Set([id]));
      const gg = s.glossopoeia || makeDefaultGlossopoeiaState();
      const list = (Array.isArray(gg.lexemes) ? gg.lexemes : []).filter(x => x && x.id !== id);
      return { ...s, glossopoeia: { ...gg, lexemes: list } };
    });
    if (selectedLexemeId === id) setSelectedLexemeId(null);
  };
  const dupLexeme = () => {
    if (isLocked || !selectedLexeme) return;
    const clone = JSON.parse(JSON.stringify(selectedLexeme));
    clone.id = `lex-${genId()}`;
    clone.name = (selectedLexeme.name && selectedLexeme.name.trim()) ? `${selectedLexeme.name} (copy)` : "(copy)";
    writeLexeme(clone);
    setSelectedLexemeId(clone.id);
  };
  // Commit a batch of generated candidates as real words in one state update.
  const addGeneratedLexemes = (list) => {
    if (isLocked || !activeLang || !Array.isArray(list) || list.length === 0) return;
    const recs = list.map(c => ({ id: `lex-${genId()}`, langId: activeLang.id, name: (c.name || "").trim(), tags: [], fields: { pronunciation: (c.pronunciation || "").trim() } }));
    updateState(s => {
      const gg = s.glossopoeia || makeDefaultGlossopoeiaState();
      const cur = Array.isArray(gg.lexemes) ? gg.lexemes : [];
      return { ...s, glossopoeia: { ...gg, lexemes: [...cur, ...recs] } };
    });
    if (recs.length) setSelectedLexemeId(recs[recs.length - 1].id);
  };

  const phonemeSchema = useMemo(() => glossopoeiaPhonemeSchema(), []);
  const allPhonemes = Array.isArray(g.phonemes) ? g.phonemes : [];
  const langPhonemes = activeLang ? allPhonemes.filter(p => p && p.langId === activeLang.id) : [];
  // Inventory for the IPA picker on the Lexeme's IPA fields (the Lexicon is the
  // one workspace that doesn't go through GlossEntityList).
  const ipaSymbols = langPhonemes.filter(p => p && p.name).map(p => ({ sym: p.name, rom: (p.fields && p.fields.romanization) || "" }));
  const writePhoneme = (rec) => {
    if (isLocked) return;
    updateState(s => {
      const gg = s.glossopoeia || makeDefaultGlossopoeiaState();
      const list = Array.isArray(gg.phonemes) ? gg.phonemes : [];
      const idx = list.findIndex(p => p && p.id === rec.id);
      const next = idx >= 0 ? list.map(p => (p && p.id === rec.id ? rec : p)) : [...list, rec];
      return { ...s, glossopoeia: { ...gg, phonemes: next } };
    });
  };
  const createPhoneme = () => {
    if (isLocked || !activeLang) return null;
    const id = `phon-${genId()}`;
    const rec = { id, langId: activeLang.id, name: "", tags: [], fields: {} };
    updateState(s => {
      const gg = s.glossopoeia || makeDefaultGlossopoeiaState();
      const list = Array.isArray(gg.phonemes) ? gg.phonemes : [];
      return { ...s, glossopoeia: { ...gg, phonemes: [...list, rec] } };
    });
    return id;
  };
  const deletePhoneme = (id) => {
    if (isLocked) return;
    updateState(s0 => {
      const s = clearLinksTo(s0, new Set([id]));
      const gg = s.glossopoeia || makeDefaultGlossopoeiaState();
      const list = (Array.isArray(gg.phonemes) ? gg.phonemes : []).filter(p => p && p.id !== id);
      return { ...s, glossopoeia: { ...gg, phonemes: list, ...glossScrubPhonemeRefs(gg, new Set([id])) } };
    });
  };

  // --- Phonotactics. Four slice arrays, each rendered through GlossEntityList.
  // The per-entity write/create/delete boilerplate (see writeConlang/Phoneme
  // above) is now factored into one helper, since the slice has outgrown
  // hand-writing each triple. create() returns the new id (GlossEntityList
  // selects it). All three no-op while locked; create also no-ops without an
  // active language (every record carries a langId to its parent ConLang). ---
  const sliceWriters = (arrayKey, idPrefix) => ({
    write: (rec) => {
      if (isLocked) return;
      updateState(s => {
        const gg = s.glossopoeia || makeDefaultGlossopoeiaState();
        const list = Array.isArray(gg[arrayKey]) ? gg[arrayKey] : [];
        const idx = list.findIndex(x => x && x.id === rec.id);
        const next = idx >= 0 ? list.map(x => (x && x.id === rec.id ? rec : x)) : [...list, rec];
        return { ...s, glossopoeia: { ...gg, [arrayKey]: next } };
      });
    },
    create: (defaultName) => {
      if (isLocked || !activeLang) return null;
      const id = `${idPrefix}-${genId()}`;
      const rec = { id, langId: activeLang.id, name: defaultName || "", tags: [], fields: {} };
      updateState(s => {
        const gg = s.glossopoeia || makeDefaultGlossopoeiaState();
        const list = Array.isArray(gg[arrayKey]) ? gg[arrayKey] : [];
        return { ...s, glossopoeia: { ...gg, [arrayKey]: [...list, rec] } };
      });
      return id;
    },
    del: (id) => {
      if (isLocked) return;
      updateState(s0 => {
        const s = clearLinksTo(s0, new Set([id]));
        const gg = s.glossopoeia || makeDefaultGlossopoeiaState();
        const list = (Array.isArray(gg[arrayKey]) ? gg[arrayKey] : []).filter(x => x && x.id !== id);
        return { ...s, glossopoeia: { ...gg, [arrayKey]: list } };
      });
    },
  });
  const syllableW = sliceWriters("syllableStructures", "syl");
  const stressW = sliceWriters("stressPatterns", "str");
  const constraintW = sliceWriters("phonotacticConstraints", "pcon");
  const ruleW = sliceWriters("phonologicalRules", "prul");

  const syllableSchema = useMemo(() => glossopoeiaSyllableStructureSchema(), []);
  const stressSchema = useMemo(() => glossopoeiaStressSchema(), []);
  const constraintSchema = useMemo(() => glossopoeiaConstraintSchema(), []);
  const ruleSchema = useMemo(() => glossopoeiaRuleSchema(), []);
  const ofLang = (key) => {
    const all = Array.isArray(g[key]) ? g[key] : [];
    return activeLang ? all.filter(x => x && x.langId === activeLang.id) : [];
  };
  const langSyllables = ofLang("syllableStructures");
  const langStress = ofLang("stressPatterns");
  const langConstraints = ofLang("phonotacticConstraints");
  const langRules = ofLang("phonologicalRules");

  // --- Morphology toolbox. Four slice arrays, same factory + GlossEntityList
  // pattern as Phonotactics. All four register as node types. ---
  const valueW = sliceWriters("grammaticalValues", "gval");
  const affixW = sliceWriters("affixes", "afx");
  const wbpW = sliceWriters("wordBuildingProcesses", "wbp");
  const inflW = sliceWriters("inflectionClasses", "infl");
  const valueSchema = useMemo(() => glossopoeiaGrammaticalValueSchema(), []);
  const affixSchema = useMemo(() => glossopoeiaAffixSchema(), []);
  const wbpSchema = useMemo(() => glossopoeiaWordBuildingSchema(), []);
  const inflSchema = useMemo(() => glossopoeiaInflectionClassSchema(), []);
  const langValues = ofLang("grammaticalValues");
  const langAffixes = ofLang("affixes");
  const langWbp = ofLang("wordBuildingProcesses");
  const langInfl = ofLang("inflectionClasses");

  // Display workspaces (Noun Number, Verbs) read the toolbox above. valueById
  // resolves an affix's Marks ids to value names; jumpToMorph sends a digest
  // card to its record in the Morphology workspace.
  const valueById = useMemo(() => {
    const m = new Map();
    langValues.forEach(v => { if (v && v.id) m.set(v.id, v); });
    return m;
  }, [langValues]);
  const tabForKind = (k) => k === "grammatical-value" ? "value" : k === "affix" ? "affix" : k === "word-building" ? "wbp" : "infl";
  const jumpToMorph = (kind, id) => { setMorphTab(tabForKind(kind)); setMorphFocus(id); patchUI({ workspace: "morphology" }); };
  const hasMulti = (arr, val) => Array.isArray(arr) && arr.map(String).includes(val);

  // Pronouns (chunk 3d). Single-entity workspace, one list.
  const pronounW = sliceWriters("pronounSets", "pron");
  const pronounSchema = useMemo(() => glossopoeiaPronounSetSchema(), []);
  const langPronouns = ofLang("pronounSets");

  // Grammatica: Syntax + Complex Structures (chunk 3e). Per-language cards plus
  // lists, same factory + GlossEntityList pattern. None register.
  const phraseOrderW = sliceWriters("phraseOrders", "pho");
  const sentMarkW = sliceWriters("sentenceMarkings", "snm");
  const constructionW = sliceWriters("constructions", "con");
  const relativizationW = sliceWriters("relativizations", "rel");
  const clauseLinkingW = sliceWriters("clauseLinkings", "cln");
  const phraseOrderSchema = useMemo(() => glossopoeiaPhraseOrderSchema(), []);
  const sentMarkSchema = useMemo(() => glossopoeiaSentenceMarkingSchema(), []);
  const constructionSchema = useMemo(() => glossopoeiaConstructionSchema(), []);
  const relativizationSchema = useMemo(() => glossopoeiaRelativizationSchema(), []);
  const clauseLinkingSchema = useMemo(() => glossopoeiaClauseLinkingSchema(), []);
  const langPhraseOrders = ofLang("phraseOrders");
  const langSentMarks = ofLang("sentenceMarkings");
  const langConstructions = ofLang("constructions");
  const langRelativizations = ofLang("relativizations");
  const langClauseLinkings = ofLang("clauseLinkings");

  // Orthography + Corpus (chunk 3f). Writing System registers; the rest are
  // view-internal. Corpus is a single list.
  const writingSystemW = sliceWriters("writingSystems", "wsy");
  const graphemeW = sliceWriters("graphemes", "grf");
  const spellingRuleW = sliceWriters("spellingRules", "spr");
  const corpusW = sliceWriters("corpusEntries", "cor");
  const [focusCorpusId, setFocusCorpusId] = useState(null);
  // Create a new Example from a glossed sentence and select it for correction.
  const addGlossedExample = (grid, name) => {
    if (isLocked || !activeLang) return;
    const id = `cor-${genId()}`;
    corpusW.write({ id, langId: activeLang.id, name: (name || "").slice(0, 60), tags: [], fields: { interlinear: grid } });
    setFocusCorpusId(id);
  };
  const writingSystemSchema = useMemo(() => glossopoeiaWritingSystemSchema(), []);
  const graphemeSchema = useMemo(() => glossopoeiaGraphemeSchema(), []);
  const spellingRuleSchema = useMemo(() => glossopoeiaSpellingRuleSchema(), []);
  const corpusSchema = useMemo(() => glossopoeiaCorpusSchema(), []);
  const langWritingSystems = ofLang("writingSystems");
  const langGraphemes = ofLang("graphemes");
  const langSpellingRules = ofLang("spellingRules");
  const langCorpus = ofLang("corpusEntries");
  const orthographyNote = activeLang ? (g.workspaceNotes?.[activeLang.id]?.orthography || "") : "";

  // Per-workspace free-text notes (Inventory romanization key etc.). Stored at
  // glossopoeia.workspaceNotes[langId][wsId]; writes no-op while locked.
  const setWorkspaceNote = (wsId, val) => {
    if (isLocked || !activeLang) return;
    updateState(s => {
      const gg = s.glossopoeia || makeDefaultGlossopoeiaState();
      const notes = (gg.workspaceNotes && typeof gg.workspaceNotes === "object") ? gg.workspaceNotes : {};
      const langNotes = (notes[activeLang.id] && typeof notes[activeLang.id] === "object") ? notes[activeLang.id] : {};
      return { ...s, glossopoeia: { ...gg, workspaceNotes: { ...notes, [activeLang.id]: { ...langNotes, [wsId]: val } } } };
    });
  };
  const inventoryNote = activeLang ? (g.workspaceNotes?.[activeLang.id]?.inventory || "") : "";

  const navBtn = (id, label, nested) => (
    <button
      key={id}
      onClick={() => patchUI({ workspace: id })}
      style={{
        display: "block", width: "100%", textAlign: "left",
        padding: nested ? "6px 10px 6px 24px" : "6px 10px",
        background: workspace === id ? "var(--accent-dim)" : "transparent",
        color: workspace === id ? "var(--text-bright)" : "var(--text)",
        border: "none", borderRadius: "var(--r-sm)", cursor: "pointer",
        fontSize: "0.92em", marginBottom: 1,
      }}
    >{label}</button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
        <span style={{ color: "var(--text-dim)", fontSize: "0.9em" }}>Language</span>
        <select
          className="input"
          value={ui.activeLangId || ""}
          onChange={e => { const v = e.target.value || null; patchUI({ activeLangId: v, workspace: v === "__unassigned__" ? "lexicon" : "overview" }); }}
          style={{ flex: "0 1 280px", minWidth: 180 }}
        >
          <option value="">{conlangs.length ? "— Select a language —" : "— No languages yet —"}</option>
          {conlangs.map(c => <option key={c.id} value={c.id}>{c.name || "(unnamed)"}</option>)}
          {orphanLexemes.length > 0 && <option value="__unassigned__">Unassigned ({orphanLexemes.length})</option>}
        </select>
        {!isLocked && <button className="btn btn-accent btn-small" onClick={createConlang}>+ New Language</button>}
        {!isLocked && activeLang && (
          <button
            className="btn btn-danger btn-small"
            onClick={() => {
              const lang = activeLang;
              const words = ((state.glossopoeia && state.glossopoeia.lexemes) || []).filter(x => x && x.langId === lang.id).length;
              askRecordDelete({
                state, ids: [...glossLangRecordIds(state, lang.id)], title: `Delete "${lang.name || "this language"}"?`,
                goes: words > 0 ? `Its ${words === 1 ? "word" : `${words} words`} and the rest of its Glossopoeia data go with it.` : "Its Glossopoeia data goes with it.",
                onConfirm: () => deleteConlang(lang.id),
              });
            }}
          >Delete</button>
        )}
        {activeLang && (
          <button className="btn btn-small" onClick={() => exportConlangFile(state, activeLang.id, flash)} title="Export this language and all its Glossopoeia data as a single .conlang.json file">Export</button>
        )}
        {activeLang && (
          <button className="btn btn-small" onClick={() => glossExportGrammar(state, activeLang.id, "md", flash)} title="Export a readable reference grammar and dictionary as Markdown">Grammar .md</button>
        )}
        {activeLang && (
          <button className="btn btn-small" onClick={() => glossExportGrammar(state, activeLang.id, "html", flash)} title="Export a printable reference grammar and dictionary as HTML">Grammar .html</button>
        )}
        {!isLocked && activeLang && (
          <button
            className="btn btn-small"
            onClick={() => {
              const suggested = (activeLang.name || "Language") + " (descendant)";
              const name = prompt(`Fork "${activeLang.name || "this language"}" into a descendant language. The child copies this language's words and sounds; you add the sound changes after. Name the descendant:`, suggested);
              if (name == null) return;
              const trimmed = name.trim();
              if (!trimmed) { if (flash) flash("Give the descendant a name.", "error"); return; }
              glossForkLanguage(state, updateState, activeLang.id, trimmed, flash);
            }}
            title="Create a descendant language: copies this language's words and sounds into a new language you then evolve with Diachronic sound rules"
          >Fork</button>
        )}
        {!isLocked && activeLang && activeLang.fields && (typeof activeLang.fields.descendedFrom === "string" ? activeLang.fields.descendedFrom : (activeLang.fields.descendedFrom && activeLang.fields.descendedFrom.id)) && (
          <button
            className="btn btn-small"
            onClick={() => {
              const res = glossDeriveDaughters(state, activeLang.id);
              if (res.error === "parent-missing") { if (flash) flash("The parent language is gone, so daughter forms can't be derived.", "error"); return; }
              if (res.error) { if (flash) flash("Couldn't read this language's parent link.", "error"); return; }
              if (res.ruleCount === 0 && res.skipped.length === 0) { if (flash) flash("No Diachronic sound rules on this language yet. Add them in Phonology: Phonotactics, with Diachronic set to Diachronic.", "error"); return; }
              const ov = {}; (res.rows || []).forEach(r => { if (r && r.lexId) ov[r.lexId] = r.daughterPron; });
              res.pruneCands = glossUnusedPhonemes(state, activeLang.id, ov).map(p => ({ id: p.id, name: p.name }));
              setPruneAfterRun(false);
              setForkRun(res);
            }}
            title="Re-derive every word's pronunciation from its parent word by running this language's Diachronic sound rules"
          >Run sound changes</button>
        )}
        {!isLocked && (
          <button className="btn btn-small" onClick={() => conlangFileRef.current && conlangFileRef.current.click()} title="Import a language from a .conlang.json file as a new, independent language">Import</button>
        )}
        <input ref={conlangFileRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={onConlangFile} />
      </div>

      {forkRun && (
        <div className="modal-backdrop" onClick={() => setForkRun(null)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">Run sound changes: {forkRun.parentName || "parent"} → {forkRun.childName || "child"}</div>
            <div className="modal-body">
              <div style={{ marginBottom: 10, color: "var(--text-dim)", fontSize: "0.9em" }}>
                {forkRun.ruleCount} sound change{forkRun.ruleCount === 1 ? "" : "s"} over {forkRun.rows.length} word{forkRun.rows.length === 1 ? "" : "s"}; {forkRun.changedCount} would change, {forkRun.rows.length - forkRun.changedCount} unchanged.
              </div>
              {forkRun.skipped.length > 0 && (
                <div className="modal-section" style={{ color: "var(--warn)", fontSize: "0.85em" }}>
                  Can't run automatically (no Input sound, so insertion or a prose-only change): {forkRun.skipped.join(", ")}. The daughter forms below leave these out.
                </div>
              )}
              {forkRun.noEtymon.length > 0 && (
                <div className="modal-section" style={{ color: "var(--text-dim)", fontSize: "0.85em" }}>
                  {forkRun.noEtymon.length} word{forkRun.noEtymon.length === 1 ? "" : "s"} not derived (no single parent word): {forkRun.noEtymon.slice(0, 10).map(w => w.name).join(", ")}{forkRun.noEtymon.length > 10 ? "…" : ""}
                </div>
              )}
              <div style={{ maxHeight: "46vh", overflow: "auto", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
                {forkRun.rows.length === 0 && <div style={{ padding: 12, color: "var(--text-dim)" }}>No words to derive.</div>}
                {forkRun.rows.map(r => (
                  <div key={r.lexId} style={{ display: "flex", gap: 10, alignItems: "baseline", padding: "4px 10px", borderBottom: "1px solid var(--border)", opacity: r.changed ? 1 : 0.5, fontFamily: "'Charis SIL','Doulos SIL','Gentium Plus',serif" }}>
                    <span style={{ flex: "0 0 34%", color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis" }}>{r.parentName} <span style={{ opacity: 0.7 }}>[{r.parentPron}]</span></span>
                    <span style={{ flex: "0 0 16px", color: "var(--text-dim)" }}>→</span>
                    <span style={{ flex: "1 1 auto", color: "var(--text-bright)" }}>
                      {r.daughterRoman || "(\u2014)"} <span style={{ color: "var(--text-dim)" }}>[{r.daughterPron}]</span>
                      {r.missingRoman && <span style={{ color: "var(--warn)", fontSize: "0.8em" }}> · spelling needs a look</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {forkRun.pruneCands && forkRun.pruneCands.length > 0 && (
              <div style={{ padding: "8px 12px", borderTop: "1px solid var(--border)", fontSize: "0.88em" }}>
                <label style={{ display: "flex", gap: 8, alignItems: "baseline", cursor: "pointer" }}>
                  <input type="checkbox" checked={pruneAfterRun} onChange={e => setPruneAfterRun(e.target.checked)} />
                  <span>Also remove the {forkRun.pruneCands.length} sound{forkRun.pruneCands.length === 1 ? "" : "s"} this run leaves unused: {forkRun.pruneCands.map(p => p.name).join(", ")}</span>
                </label>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn" onClick={() => setForkRun(null)}>Cancel</button>
              <button className="btn btn-accent" onClick={() => { glossApplyDaughters(updateState, activeLang.id, forkRun.rows, flash); if (pruneAfterRun && forkRun.pruneCands && forkRun.pruneCands.length) glossRemovePhonemes(updateState, forkRun.pruneCands.map(p => p.id), flash); setForkRun(null); }} disabled={forkRun.rows.length === 0}>Apply to {forkRun.rows.length} word{forkRun.rows.length === 1 ? "" : "s"}</button>
            </div>
          </div>
        </div>
      )}

      {pruneList && (
        <div className="modal-backdrop" onClick={() => setPruneList(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">Remove unused sounds</div>
            <div className="modal-body">
              <div style={{ marginBottom: 10, color: "var(--text-dim)", fontSize: "0.9em" }}>
                These sounds appear in no word and aren't needed by any constraint or active rule. Removing one also clears it from any rule that named it. Untick any you want to keep.
              </div>
              <div style={{ maxHeight: "46vh", overflow: "auto", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
                {pruneList.rows.map((r, i) => (
                  <label key={r.id} style={{ display: "flex", gap: 8, alignItems: "baseline", padding: "5px 10px", borderBottom: "1px solid var(--border)", cursor: "pointer", fontFamily: "'Charis SIL','Doulos SIL','Gentium Plus',serif" }}>
                    <input type="checkbox" checked={r.checked} onChange={e => { const c = e.target.checked; setPruneList(pl => ({ rows: pl.rows.map((x, j) => j === i ? { ...x, checked: c } : x) })); }} />
                    <span style={{ color: "var(--text-bright)" }}>{r.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setPruneList(null)}>Cancel</button>
              <button className="btn btn-accent" onClick={() => { const ids = pruneList.rows.filter(r => r.checked).map(r => r.id); glossRemovePhonemes(updateState, ids, flash); setPruneList(null); }} disabled={pruneList.rows.every(r => !r.checked)}>Remove {pruneList.rows.filter(r => r.checked).length} sound{pruneList.rows.filter(r => r.checked).length === 1 ? "" : "s"}</button>
            </div>
          </div>
        </div>
      )}

      {(!activeLang && !isUnassigned) ? (
        <div style={{ padding: 40, color: "var(--text-dim)", textAlign: "center" }}>
          {conlangs.length
            ? "Select a language above to start."
            : "No languages yet. Create one to begin building its phonology, grammar, and lexicon."}
        </div>
      ) : (
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <div style={{ flex: "0 0 200px", borderRight: "1px solid var(--border)", padding: "10px 8px", overflowY: "auto", display: isUnassigned ? "none" : "block" }}>
            {GLOSSOPOEIA_NAV.map((node, i) => {
              if (node.kind === "item") return navBtn(node.id, node.label, false);
              const isCollapsed = !!collapsed[node.label];
              return (
                <div key={node.label} style={{ marginTop: i ? 8 : 0 }}>
                  <button
                    onClick={() => setCollapsed(c => ({ ...c, [node.label]: !c[node.label] }))}
                    style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", textAlign: "left", padding: "4px 10px", background: "transparent", border: "none", color: "var(--text-dim)", textTransform: "uppercase", fontSize: "0.72em", letterSpacing: "0.06em", cursor: "pointer" }}
                  >
                    <span style={{ fontSize: "0.9em" }}>{isCollapsed ? "\u25b8" : "\u25be"}</span>{node.label}
                  </button>
                  {!isCollapsed && node.items.map(it => navBtn(it.id, it.label, true))}
                </div>
              );
            })}
          </div>

          <div style={{
            flex: 1, minWidth: 0, minHeight: 0,
            display: fullBleed ? "flex" : "block",
            overflow: fullBleed ? "hidden" : "auto",
            padding: fullBleed ? 0 : "16px 20px",
          }}>
            {(workspace === "overview" && !isUnassigned) ? (
              <EntryForm
                draft={activeLang}
                template={conlangSchema}
                entries={state.entries}
                templates={state.templates}
                bodies={state.celestialBodies}
                registeredNodes={getRegisteredGraphNodes(state)}
                onChange={writeConlang}
                onNameDone={(was, now) => renameLanguage(activeLang.id, was, now)}
                showSecrets={true}
                imageFolder={state.world.imageFolder}
                allTags={[]}
                dirHandle={null}
                calendar={state.world.calendar}
                primaryCalendar={state.world.calendar}
                additionalCalendars={[]}
                selfEntryId={activeLang.id}
                flash={null}
                previewMode={false}
              />
            ) : (workspace === "lexicon" || isUnassigned) ? (
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, width: "100%" }}>
                {!isLocked && !isUnassigned && activeLang && (
                  <GlossWordGenerator g={g} langId={activeLang.id} onAdd={addGeneratedLexemes} />
                )}
                <div style={{ display: "flex", flex: 1, minHeight: 0, width: "100%" }}>
                <div style={{ flex: "0 0 220px", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", minHeight: 0 }}>
                  <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: "0.8em", color: "var(--text-dim)" }}>{displayLexemes.length} word{displayLexemes.length === 1 ? "" : "s"}</span>
                    {!isLocked && !isUnassigned && <button className="btn btn-accent btn-small" onClick={createLexeme}>+ New</button>}
                  </div>
                  {displayLexemes.length > 6 && (
                    <div style={{ padding: "6px 8px", borderBottom: "1px solid var(--border)" }}>
                      <input className="input" style={{ fontSize: "0.85em", padding: "4px 8px" }} placeholder="Filter words..." value={lexFilter} onChange={e => setLexFilter(e.target.value)} />
                    </div>
                  )}
                  <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                    {(() => {
                      if (displayLexemes.length === 0) return <div style={{ padding: 16, color: "var(--text-dim)", fontSize: "0.9em" }}>{isUnassigned ? "No unassigned words." : "No words yet."}</div>;
                      const q = lexFilter.trim().toLowerCase();
                      const shown = [...displayLexemes]
                        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                        .filter(x => !q || (x.name || "").toLowerCase().includes(q));
                      if (shown.length === 0) return <div style={{ padding: 16, color: "var(--text-dim)", fontSize: "0.9em" }}>No words match.</div>;
                      return shown.map(x => {
                        const pron = (x.fields && x.fields.pronunciation) || "";
                        return (
                          <button key={x.id} onClick={() => setSelectedLexemeId(x.id)}
                            style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 12px", background: selectedLexemeId === x.id ? "var(--accent-dim)" : "transparent", color: selectedLexemeId === x.id ? "var(--text-bright)" : "var(--text)", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", fontSize: "0.92em" }}>
                            {x.name || "(unnamed)"}
                            {pron ? <span style={{ display: "block", fontSize: "0.82em", color: "var(--text-dim)", marginTop: 1 }}>{pron}</span> : null}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "16px 20px" }}>
                  {isUnassigned && (
                    <div style={{ background: "var(--accent-dim)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "8px 12px", marginBottom: 12, fontSize: "0.85em", color: "var(--text-dim)" }}>
                      These words came in without a parent language. File each one under a language, or delete it.
                    </div>
                  )}
                  {selectedLexeme ? (
                    <>
                      {!isLocked && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                          {isUnassigned && conlangs.length > 0 ? (
                            <select className="input" style={{ flex: "0 1 240px" }} value=""
                              onChange={e => { const lid = e.target.value; if (lid) writeLexeme({ ...selectedLexeme, langId: lid }); }}>
                              <option value="">— Move to language —</option>
                              {conlangs.map(c => <option key={c.id} value={c.id}>{c.name || "(unnamed)"}</option>)}
                            </select>
                          ) : <span />}
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="btn btn-ghost btn-small" onClick={dupLexeme}>Duplicate</button>
                            <button className="btn btn-danger btn-small" onClick={() => { const lx = selectedLexeme; askRecordDelete({ state, ids: [lx.id], title: `Delete "${lx.name || "this word"}"?`, onConfirm: () => deleteLexeme(lx.id) }); }}>Delete word</button>
                          </div>
                        </div>
                      )}
                      {(() => {
                        const syl = glossSyllabify(selectedLexeme, g);
                        const ovr = (selectedLexeme.fields && selectedLexeme.fields.syllableOverride) || "";
                        const shown = ovr || (syl && syl.joined) || "";
                        return (
                          <div style={{ background: "var(--surf2)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "8px 12px", marginBottom: 12 }}>
                            <div style={{ fontSize: "0.72em", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-dim)" }}>
                              Syllables{ovr ? " · manual" : (shown ? " · auto" : "")}
                            </div>
                            <div style={{ marginTop: 2 }}>
                              {shown
                                ? <span style={{ fontFamily: "'Charis SIL','Doulos SIL','Gentium Plus','Times New Roman',serif", fontSize: "1.15em", color: "var(--text-bright)" }}>{shown}</span>
                                : <span style={{ color: "var(--text-dim)", fontSize: "0.78em", fontStyle: "italic" }}>add a pronunciation or word pieces to see the split</span>}
                            </div>
                            {!isLocked && (
                              <div style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "center" }}>
                                <span style={{ fontSize: "0.76em", color: "var(--text-dim)" }}>Override</span>
                                <input className="input" style={{ fontSize: "0.85em", padding: "3px 7px", maxWidth: 220 }}
                                  value={ovr}
                                  placeholder={(syl && syl.joined) || "manual split"}
                                  onChange={e => writeLexeme({ ...selectedLexeme, fields: { ...selectedLexeme.fields, syllableOverride: e.target.value } })} />
                                {ovr && <button className="btn btn-ghost btn-small" onClick={() => writeLexeme({ ...selectedLexeme, fields: { ...selectedLexeme.fields, syllableOverride: "" } })}>Reset</button>}
                              </div>
                            )}
                            {(() => {
                              const chk = glossPhonotacticCheck(selectedLexeme, g);
                              if (!chk || (chk.issues.length === 0 && chk.uncheckable.length === 0)) return null;
                              return (
                                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                                  {chk.issues.map((it, i) => (
                                    <div key={i} style={{ fontSize: "0.78em", color: "var(--warn)", marginTop: i ? 3 : 0 }}>{it.text}</div>
                                  ))}
                                  {chk.uncheckable.length > 0 && (
                                    <div style={{ fontSize: "0.72em", color: "var(--text-dim)", marginTop: chk.issues.length ? 6 : 0 }}>
                                      Not auto-checked: {chk.uncheckable.join(", ")}.
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })()}
                      <GlossSurfaceLine rec={selectedLexeme} g={g} />
                      <GlossParadigm rec={selectedLexeme} g={g} />
                      <EntryForm
                        draft={selectedLexeme}
                        template={lexemeSchema}
                        entries={state.entries}
                        templates={state.templates}
                        bodies={state.celestialBodies}
                        registeredNodes={getRegisteredGraphNodes(state)}
                        onChange={writeLexeme}
                        showSecrets={true}
                        imageFolder={state.world.imageFolder}
                        allTags={[]}
                        dirHandle={null}
                        calendar={state.world.calendar}
                        primaryCalendar={state.world.calendar}
                        additionalCalendars={[]}
                        selfEntryId={selectedLexeme.id}
                        flash={null}
                        previewMode={false}
                        ipaSymbols={ipaSymbols}
                      />
                    </>
                  ) : (
                    <div style={{ color: "var(--text-dim)", padding: 20 }}>
                      {displayLexemes.length ? "Select a word to edit." : (isUnassigned ? "Every word has a language now." : "No words in this language yet. Add one to start the dictionary.")}
                    </div>
                  )}
                </div>
                </div>
              </div>
            ) : workspace === "inventory" ? (
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, width: "100%" }}>
                <GlossWorkspaceNote key={activeLang ? activeLang.id : "none"} state={state} value={inventoryNote} onChange={v => setWorkspaceNote("inventory", v)} isLocked={isLocked} label="Romanization / pronunciation key" />
                {!isLocked && activeLang && langPhonemes.length > 0 && (
                  <div style={{ padding: "6px 10px" }}>
                    <button className="btn btn-small" onClick={() => {
                      const cands = glossUnusedPhonemes(state, activeLang.id);
                      if (!cands.length) { if (flash) flash("Every sound is used by a word, constraint, or active rule."); return; }
                      setPruneList({ rows: cands.map(p => ({ id: p.id, name: p.name, checked: true })) });
                    }} title="Remove sounds no word uses and no constraint or active rule needs">Remove unused sounds</button>
                  </div>
                )}
                <GlossEntityList records={langPhonemes} schema={phonemeSchema} state={state} isLocked={isLocked} onWrite={writePhoneme} onCreate={createPhoneme} onDelete={deletePhoneme} newLabel="+ New phoneme" emptyLabel="No phonemes yet." noun="phoneme" subtitle={r => (r.fields && r.fields.romanization) || ""} />
              </div>
            ) : workspace === "phonotactics" ? (
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, width: "100%" }}>
                <div style={{ display: "flex", gap: 4, padding: "8px 10px", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
                  {[
                    { id: "syllable", label: "Syllable Structure" },
                    { id: "stress", label: "Stress" },
                    { id: "constraints", label: "Constraints" },
                    { id: "rules", label: "Rules" },
                  ].map(t => (
                    <button key={t.id} onClick={() => setPhonoTab(t.id)}
                      style={{ padding: "5px 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: phonoTab === t.id ? "var(--accent-dim)" : "transparent", color: phonoTab === t.id ? "var(--text-bright)" : "var(--text)", cursor: "pointer", fontSize: "0.88em" }}>
                      {t.label}
                    </button>
                  ))}
                </div>
                {phonoTab === "syllable" ? (
                  <GlossEntityList records={langSyllables} schema={syllableSchema} state={state} isLocked={isLocked} onWrite={syllableW.write} onCreate={() => syllableW.create("New syllable structure")} onDelete={syllableW.del} newLabel="+ New" emptyLabel="No syllable structure defined yet." noun="syllable structure" singleton={true} />
                ) : phonoTab === "stress" ? (
                  <GlossEntityList records={langStress} schema={stressSchema} state={state} isLocked={isLocked} onWrite={stressW.write} onCreate={() => stressW.create("New stress pattern")} onDelete={stressW.del} newLabel="+ New" emptyLabel="No stress pattern defined yet." noun="stress pattern" singleton={true} />
                ) : phonoTab === "constraints" ? (
                  <GlossEntityList records={langConstraints} schema={constraintSchema} state={state} isLocked={isLocked} onWrite={constraintW.write} onCreate={() => constraintW.create("")} onDelete={constraintW.del} newLabel="+ New" emptyLabel="No constraints yet." noun="constraint" />
                ) : (
                  <GlossEntityList records={langRules} schema={ruleSchema} state={state} isLocked={isLocked} onWrite={ruleW.write} onCreate={() => ruleW.create("")} onDelete={ruleW.del} newLabel="+ New" emptyLabel="No rules yet." noun="rule" />
                )}
              </div>
            ) : workspace === "morphology" ? (
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, width: "100%" }}>
                <div style={{ display: "flex", gap: 4, padding: "8px 10px", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
                  {[
                    { id: "value", label: "Grammatical Value" },
                    { id: "affix", label: "Affix" },
                    { id: "wbp", label: "Word-Building" },
                    { id: "infl", label: "Inflection Class" },
                  ].map(t => (
                    <button key={t.id} onClick={() => { setMorphTab(t.id); setMorphFocus(null); }}
                      style={{ padding: "5px 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: morphTab === t.id ? "var(--accent-dim)" : "transparent", color: morphTab === t.id ? "var(--text-bright)" : "var(--text)", cursor: "pointer", fontSize: "0.88em" }}>
                      {t.label}
                    </button>
                  ))}
                </div>
                {morphTab === "value" ? (
                  <GlossEntityList records={langValues} schema={valueSchema} state={state} isLocked={isLocked} onWrite={valueW.write} onCreate={() => valueW.create("")} onDelete={valueW.del} newLabel="+ New" emptyLabel="No grammatical values yet." noun="value" focusId={morphFocus} />
                ) : morphTab === "affix" ? (
                  <GlossEntityList records={langAffixes} schema={affixSchema} state={state} isLocked={isLocked} onWrite={affixW.write} onCreate={() => affixW.create("")} onDelete={affixW.del} newLabel="+ New" emptyLabel="No affixes yet." noun="affix" focusId={morphFocus} />
                ) : morphTab === "wbp" ? (
                  <GlossEntityList records={langWbp} schema={wbpSchema} state={state} isLocked={isLocked} onWrite={wbpW.write} onCreate={() => wbpW.create("")} onDelete={wbpW.del} newLabel="+ New" emptyLabel="No word-building processes yet." noun="process" focusId={morphFocus} />
                ) : (
                  <GlossEntityList records={langInfl} schema={inflSchema} state={state} isLocked={isLocked} onWrite={inflW.write} onCreate={() => inflW.create("")} onDelete={inflW.del} newLabel="+ New" emptyLabel="No inflection classes yet." noun="class" focusId={morphFocus} />
                )}
              </div>
            ) : workspace === "orthography" ? (
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, width: "100%" }}>
                <GlossWorkspaceNote key={activeLang ? activeLang.id : "none"} state={state} value={orthographyNote} onChange={v => setWorkspaceNote("orthography", v)} isLocked={isLocked} label="Writing overview" />
                <div style={{ display: "flex", gap: 4, padding: "8px 10px", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
                  {[
                    { id: "system", label: "Writing Systems" },
                    { id: "grapheme", label: "Graphemes" },
                    { id: "spelling", label: "Spelling Rules" },
                  ].map(t => (
                    <button key={t.id} onClick={() => setOrthoTab(t.id)}
                      style={{ padding: "5px 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: orthoTab === t.id ? "var(--accent-dim)" : "transparent", color: orthoTab === t.id ? "var(--text-bright)" : "var(--text)", cursor: "pointer", fontSize: "0.88em" }}>
                      {t.label}
                    </button>
                  ))}
                </div>
                {orthoTab === "system" ? (
                  <GlossEntityList records={langWritingSystems} schema={writingSystemSchema} state={state} isLocked={isLocked} onWrite={writingSystemW.write} onCreate={() => writingSystemW.create("")} onDelete={writingSystemW.del} newLabel="+ New" emptyLabel="No writing systems yet." noun="writing system" />
                ) : orthoTab === "grapheme" ? (
                  <GlossEntityList records={langGraphemes} schema={graphemeSchema} state={state} isLocked={isLocked} onWrite={graphemeW.write} onCreate={() => graphemeW.create("")} onDelete={graphemeW.del} newLabel="+ New" emptyLabel="No graphemes yet." noun="grapheme" />
                ) : (
                  <GlossEntityList records={langSpellingRules} schema={spellingRuleSchema} state={state} isLocked={isLocked} onWrite={spellingRuleW.write} onCreate={() => spellingRuleW.create("")} onDelete={spellingRuleW.del} newLabel="+ New" emptyLabel="No spelling rules yet." noun="spelling rule" />
                )}
              </div>
            ) : workspace === "corpus" ? (
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, width: "100%" }}>
                {!isLocked && activeLang && <GlossSentenceGloss g={g} langId={activeLang.id} onAdd={addGlossedExample} />}
                <GlossEntityList records={langCorpus} schema={corpusSchema} state={state} isLocked={isLocked} onWrite={corpusW.write} onCreate={() => corpusW.create("")} onDelete={corpusW.del} newLabel="+ New example" emptyLabel="No examples yet." noun="example" focusId={focusCorpusId} />
              </div>
            ) : workspace === "syntax" ? (
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, width: "100%" }}>
                <div style={{ display: "flex", gap: 4, padding: "8px 10px", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
                  {[
                    { id: "phrase", label: "Phrase Order" },
                    { id: "marking", label: "Sentence Marking" },
                    { id: "construction", label: "Constructions" },
                  ].map(t => (
                    <button key={t.id} onClick={() => setSyntaxTab(t.id)}
                      style={{ padding: "5px 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: syntaxTab === t.id ? "var(--accent-dim)" : "transparent", color: syntaxTab === t.id ? "var(--text-bright)" : "var(--text)", cursor: "pointer", fontSize: "0.88em" }}>
                      {t.label}
                    </button>
                  ))}
                </div>
                {syntaxTab === "phrase" ? (
                  <GlossEntityList records={langPhraseOrders} schema={phraseOrderSchema} state={state} isLocked={isLocked} onWrite={phraseOrderW.write} onCreate={() => phraseOrderW.create("Phrase order")} onDelete={phraseOrderW.del} newLabel="+ New" emptyLabel="No phrase order defined yet." noun="phrase order" singleton={true} />
                ) : syntaxTab === "marking" ? (
                  <GlossEntityList records={langSentMarks} schema={sentMarkSchema} state={state} isLocked={isLocked} onWrite={sentMarkW.write} onCreate={() => sentMarkW.create("Sentence marking")} onDelete={sentMarkW.del} newLabel="+ New" emptyLabel="No sentence marking defined yet." noun="sentence marking" singleton={true} />
                ) : (
                  <GlossEntityList records={langConstructions} schema={constructionSchema} state={state} isLocked={isLocked} onWrite={constructionW.write} onCreate={() => constructionW.create("")} onDelete={constructionW.del} newLabel="+ New" emptyLabel="No constructions yet." noun="construction" />
                )}
              </div>
            ) : workspace === "complexStructures" ? (
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, width: "100%" }}>
                <div style={{ display: "flex", gap: 4, padding: "8px 10px", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
                  {[
                    { id: "relativization", label: "Relativization" },
                    { id: "clauselinking", label: "Clause Linking" },
                  ].map(t => (
                    <button key={t.id} onClick={() => setComplexTab(t.id)}
                      style={{ padding: "5px 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: complexTab === t.id ? "var(--accent-dim)" : "transparent", color: complexTab === t.id ? "var(--text-bright)" : "var(--text)", cursor: "pointer", fontSize: "0.88em" }}>
                      {t.label}
                    </button>
                  ))}
                </div>
                {complexTab === "relativization" ? (
                  <GlossEntityList records={langRelativizations} schema={relativizationSchema} state={state} isLocked={isLocked} onWrite={relativizationW.write} onCreate={() => relativizationW.create("Relativization")} onDelete={relativizationW.del} newLabel="+ New" emptyLabel="No relativization defined yet." noun="relativization" singleton={true} />
                ) : (
                  <GlossEntityList records={langClauseLinkings} schema={clauseLinkingSchema} state={state} isLocked={isLocked} onWrite={clauseLinkingW.write} onCreate={() => clauseLinkingW.create("")} onDelete={clauseLinkingW.del} newLabel="+ New" emptyLabel="No clause links yet." noun="clause link" />
                )}
              </div>
            ) : workspace === "pronouns" ? (
              <GlossEntityList records={langPronouns} schema={pronounSchema} state={state} isLocked={isLocked} onWrite={pronounW.write} onCreate={() => pronounW.create("")} onDelete={pronounW.del} newLabel="+ New set" emptyLabel="No pronoun sets yet." noun="pronoun set" />
            ) : workspace === "nounNumber" ? (() => {
              const numberValues = langValues.filter(v => selectValueOnly(v.fields && v.fields.category) === "number");
              const numberIds = new Set(numberValues.map(v => v.id));
              const numberAffixes = langAffixes.filter(a => (Array.isArray(a.fields && a.fields.marks) ? a.fields.marks : []).some(id => numberIds.has(id)));
              const nounClasses = langInfl.filter(c => hasMulti(c.fields && c.fields.appliesTo, "noun"));
              return (
                <GlossToolboxDigest valueById={valueById} onJump={jumpToMorph} sections={[
                  { kind: "grammatical-value", label: "Number values", records: numberValues },
                  { kind: "affix", label: "Affixes that mark number", records: numberAffixes },
                  { kind: "inflection-class", label: "Noun inflection classes", records: nounClasses },
                ]} />
              );
            })() : workspace === "verbs" ? (() => {
              const verbValues = langValues.filter(v => hasMulti(v.fields && v.fields.wordClass, "verb"));
              const verbAffixes = langAffixes.filter(a => hasMulti(a.fields && a.fields.attachesTo, "verb"));
              const verbClasses = langInfl.filter(c => hasMulti(c.fields && c.fields.appliesTo, "verb"));
              return (
                <GlossToolboxDigest valueById={valueById} onJump={jumpToMorph} sections={[
                  { kind: "grammatical-value", label: "Verbal values", records: verbValues },
                  { kind: "affix", label: "Verb affixes", records: verbAffixes },
                  { kind: "inflection-class", label: "Verb inflection classes", records: verbClasses },
                ]} />
              );
            })() : (
              <div style={{ color: "var(--text-dim)", maxWidth: 560 }}>
                <h3 style={{ color: "var(--text)", marginTop: 0 }}>{GLOSSOPOEIA_WORKSPACE_LABEL[workspace] || workspace}</h3>
                <p>This workspace is built in a later step. Its schema is locked; the editor lands when its build chunk does.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}