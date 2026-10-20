
// ─── Reference grammar / dictionary export (v1.5 r113) ──────────────────────
// Walks one language's Glossopoeia records and emits a readable document:
// phonology, morphology, pronouns, syntax, complex structures, orthography, the
// lexicon as a dictionary, and the corpus as aligned interlinears. Produces a
// format-agnostic block list once, rendered to Markdown or self-contained HTML.
// Empty fields are skipped, grids become tables, refs resolve to names.
// Light defaults, overridden at export time by the live theme via
// extractThemeVars(), so the grammar matches whatever theme the app is in,
// like the entry/world HTML export. Print flips to ink-friendly light.
const GLOSS_GRAMMAR_THEME_DEFAULT = "--bg:#faf8f3;--surf2:#f3efe6;--surf3:#ebe6da;--text:#2a2a2a;--text-bright:#1a1a1a;--text-dim:#6a6a6a;--border:#d8d2c4;--border2:#c0b9a8;--accent:#7a5c3a;--accent-dim:#a08766;--warn:#c0820a;";
const GLOSS_GRAMMAR_CSS = `
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:Georgia,'Iowan Old Style','Palatino Linotype',serif;font-size:17px;line-height:1.6;color:var(--text);background:var(--bg);max-width:780px;margin:0 auto;padding:40px 28px 80px}
h1{font-size:2rem;color:var(--text-bright);border-bottom:2px solid var(--accent-dim);padding-bottom:.3rem;margin:0 0 1rem}
h2{font-size:1.5rem;color:var(--accent);border-bottom:1px solid var(--border);padding-bottom:.2rem;margin:2.4rem 0 .8rem}
h3{font-size:1.18rem;color:var(--text-bright);margin:1.5rem 0 .5rem}
p{margin:.5rem 0}
.fields{margin:.4rem 0 1.1rem}
.fields .row{display:flex;gap:.6rem;margin:.12rem 0}
.fields .k{font-weight:600;min-width:11rem;flex:0 0 auto;color:var(--text-dim)}
.fields .v{flex:1}
table{border-collapse:collapse;margin:.6rem 0 1.3rem;font-size:.92rem;background:var(--surf2)}
th,td{border:1px solid var(--border);padding:.3rem .6rem;text-align:left;vertical-align:top}
th{background:var(--surf3);color:var(--text-bright);font-weight:600}
.entry{margin:.6rem 0;padding-bottom:.5rem;border-bottom:1px solid var(--border)}
.entry .head{font-size:1.05rem}
.entry .hw{font-weight:700;color:var(--text-bright);font-size:1.08rem}
.entry .pron{color:var(--accent)}
.entry .pos{font-style:italic;color:var(--text-dim)}
.entry ol{margin:.25rem 0 .25rem 1.3rem;padding:0}
.entry .meta{font-size:.88rem;color:var(--text-dim);margin:.15rem 0}
.note .lbl{font-weight:600;color:var(--text-dim);margin:.5rem 0 .15rem}
.ipa{font-family:'Charis SIL','Doulos SIL','Gentium Plus',Georgia,serif}
a{color:var(--accent)}
@media print{body{background:#fff;color:#000;max-width:none;padding:0}h1,h2,h3{color:#000}th{background:#eee;color:#000}table,.entry{page-break-inside:avoid}h2{page-break-after:avoid}}
`;

function glossGrammarBlocks(state, langId) {
  const g = state.glossopoeia || {};
  const blocks = [];
  const push = (b) => blocks.push(b);
  const ARRAYS = ["conlangs"].concat(typeof GLOSS_LANG_ARRAYS !== "undefined" ? GLOSS_LANG_ARRAYS : []);
  const cal = state.world && state.world.calendar;

  const resolveName = (id) => {
    if (!id || typeof id !== "string") return null;
    for (const k of ARRAYS) { const arr = g[k]; if (Array.isArray(arr)) { const r = arr.find(x => x && x.id === id); if (r) return r.name || "(unnamed)"; } }
    const e = (state.entries || []).find(x => x && x.id === id); if (e) return e.name || "(unnamed)";
    const b = (state.celestialBodies || []).find(x => x && x.id === id); if (b) return b.name || "(unnamed)";
    return null;
  };
  const selText = (val) => {
    if (val == null) return "";
    if (typeof val === "object") { const v = val.value || ""; const c = val.customText || ""; if (v === "Other" || (!v && c)) return c; return v || c; }
    return String(val);
  };
  const fieldText = (field, val) => {
    if (val == null || val === "") return null;
    const t = field.type;
    if (t === "multiselect") { const a = Array.isArray(val) ? val.filter(x => x != null && x !== "") : []; return a.length ? a.join(", ") : null; }
    if (t === "entry-ref") {
      if (field.multi) { const a = Array.isArray(val) ? val : []; const names = a.map(resolveName).filter(Boolean); return names.length ? names.join(", ") : null; }
      return resolveName(val) || null;
    }
    if (t === "select") { const s = selText(val); return s || null; }
    if (typeof val === "object") return null;
    const s = String(val).trim(); return s || null;
  };
  const recordScalars = (rec, schema) => {
    const items = [];
    (schema.fields || []).forEach(f => {
      if (f.type === "group" || f.type === "grid") return;
      if (!isFieldVisible(f, rec.fields || {})) return;
      const s = fieldText(f, (rec.fields || {})[f.id]);
      if (s == null || s === "") return;
      items.push({ label: f.label, value: s });
    });
    return items;
  };
  const gridTable = (gv) => {
    const grid = coerceGridValue(gv);
    if (gridIsEmpty(grid)) return null;
    const cell = (rid, cid) => {
      const c = grid.cells[rid] && grid.cells[rid][cid];
      if (gridCellIsEmpty(c)) return "";
      const type = c.type, cv = c.value;
      if (type === "entry-ref") return resolveName(cv) || "(missing)";
      if (type === "calendar-date") return (cv && cv.year != null) ? formatCalendarDate(cv, cal) : "";
      if (type === "calendar-date-range") { const s = (cv && cv.start && cv.start.year != null) ? formatCalendarDate(cv.start, cal) : "?"; const e = (cv && cv.end && cv.end.year != null) ? formatCalendarDate(cv.end, cal) : "ongoing"; return s + " \u2192 " + e; }
      return cv == null ? "" : String(cv);
    };
    const corner = [grid.rowAxisLabel, grid.colAxisLabel].filter(Boolean).join(" / ");
    const headers = [corner].concat(grid.cols.map(c => c.label || ""));
    const rows = grid.rows.map(r => [r.label || ""].concat(grid.cols.map(c => cell(r.id, c.id))));
    return { headers, rows };
  };
  const ofLang = (key) => (Array.isArray(g[key]) ? g[key] : []).filter(r => r && r.langId === langId);
  const note = (wsId) => (g.workspaceNotes && g.workspaceNotes[langId] && g.workspaceNotes[langId][wsId]) || "";

  const lang = (g.conlangs || []).find(c => c && c.id === langId);
  if (!lang) return blocks;

  // 1. Title + container fields
  push({ t: "h1", text: lang.name || "(unnamed language)" });
  const conlangSchema = glossopoeiaConlangSchema(state);
  const cs = recordScalars(lang, conlangSchema).filter(i => i.label !== "Overview");
  if (cs.length) push({ t: "fields", items: cs });
  if ((lang.fields || {}).overview) push({ t: "note", label: "Overview", text: String(lang.fields.overview) });

  // renderer for a list of records: heading (optional) + fields + grids
  const renderList = (records, schema, opts) => {
    opts = opts || {};
    records.forEach(rec => {
      if (opts.heading !== false) push({ t: "h3", text: rec.name || schema.name });
      const sc = recordScalars(rec, schema);
      if (sc.length) push({ t: "fields", items: sc });
      (schema.fields || []).forEach(f => {
        if (f.type !== "grid") return;
        const gt = gridTable((rec.fields || {})[f.id]);
        if (gt) { push({ t: "p", text: f.label + ":" }); push({ t: "table", headers: gt.headers, rows: gt.rows }); }
      });
    });
  };
  const single = (key, schema, label) => {
    const rec = ofLang(key)[0];
    if (!rec) return;
    if (label) push({ t: "h3", text: label });
    const sc = recordScalars(rec, schema);
    if (sc.length) push({ t: "fields", items: sc });
    (schema.fields || []).forEach(f => { if (f.type === "grid") { const gt = gridTable((rec.fields || {})[f.id]); if (gt) { push({ t: "p", text: f.label + ":" }); push({ t: "table", headers: gt.headers, rows: gt.rows }); } } });
  };
  const hasAny = (...keys) => keys.some(k => ofLang(k).length > 0);

  // 2. Phonology
  if (hasAny("phonemes", "syllableStructures", "stressPatterns", "phonotacticConstraints", "phonologicalRules") || note("inventory") || note("phonotactics")) {
    push({ t: "h2", text: "Phonology" });
    const phon = ofLang("phonemes");
    if (phon.length) {
      push({ t: "h3", text: "Sound Inventory" });
      if (note("inventory")) push({ t: "note", label: "Romanization", text: String(note("inventory")) });
      const desc = (p) => {
        const f = p.fields || {};
        const parts = [];
        ["manner", "place", "voicing", "airstream", "height", "backness", "roundedness", "nasalization", "diphthongType", "toneRegister", "toneContour", "syllabicity"].forEach(k => { const v = selText(f[k]); if (v && v !== "Non-syllabic" && v !== "Pulmonic" && v !== "Oral") parts.push(v); });
        return parts.join(", ");
      };
      const rows = phon.map(p => [p.name || "", (p.fields || {}).romanization || "", selText((p.fields || {}).class), desc(p)]);
      push({ t: "table", headers: ["Symbol", "Romanization", "Class", "Description"], rows });
    }
    single("syllableStructures", glossopoeiaSyllableStructureSchema(), "Syllable Structure");
    single("stressPatterns", glossopoeiaStressSchema(), "Stress");
    const cons = ofLang("phonotacticConstraints");
    if (cons.length) { push({ t: "h3", text: "Phonotactic Constraints" }); renderList(cons, glossopoeiaConstraintSchema(), { heading: false }); }
    const rules = ofLang("phonologicalRules");
    if (rules.length) { push({ t: "h3", text: "Phonological Rules" }); renderList(rules, glossopoeiaRuleSchema(), { heading: false }); }
  }

  // 3. Morphology
  if (hasAny("grammaticalValues", "affixes", "wordBuildingProcesses", "inflectionClasses")) {
    push({ t: "h2", text: "Morphology" });
    const gv = ofLang("grammaticalValues");
    if (gv.length) { push({ t: "h3", text: "Grammatical Values" }); renderList(gv, glossopoeiaGrammaticalValueSchema(), { heading: false }); }
    const afx = ofLang("affixes");
    if (afx.length) { push({ t: "h3", text: "Affixes" }); renderList(afx, glossopoeiaAffixSchema(), { heading: false }); }
    const wbp = ofLang("wordBuildingProcesses");
    if (wbp.length) { push({ t: "h3", text: "Word-Building Processes" }); renderList(wbp, glossopoeiaWordBuildingSchema(), { heading: false }); }
    const infl = ofLang("inflectionClasses");
    if (infl.length) { push({ t: "h3", text: "Inflection Classes" }); renderList(infl, glossopoeiaInflectionClassSchema()); }
  }

  // 4. Pronouns
  const pron = ofLang("pronounSets");
  if (pron.length) { push({ t: "h2", text: "Pronouns" }); renderList(pron, glossopoeiaPronounSetSchema()); }

  // 5. Syntax
  if (hasAny("phraseOrders", "sentenceMarkings", "constructions")) {
    push({ t: "h2", text: "Syntax" });
    single("phraseOrders", glossopoeiaPhraseOrderSchema(), "Phrase Order");
    single("sentenceMarkings", glossopoeiaSentenceMarkingSchema(), "Sentence Marking");
    const con = ofLang("constructions");
    if (con.length) { push({ t: "h3", text: "Constructions" }); renderList(con, glossopoeiaConstructionSchema(), { heading: false }); }
  }

  // 6. Complex Structures
  if (hasAny("relativizations", "clauseLinkings")) {
    push({ t: "h2", text: "Complex Structures" });
    single("relativizations", glossopoeiaRelativizationSchema(), "Relativization");
    const cl = ofLang("clauseLinkings");
    if (cl.length) { push({ t: "h3", text: "Clause Linking" }); renderList(cl, glossopoeiaClauseLinkingSchema(), { heading: false }); }
  }

  // 7. Orthography
  if (hasAny("writingSystems", "graphemes", "spellingRules") || note("orthography")) {
    push({ t: "h2", text: "Orthography" });
    if (note("orthography")) push({ t: "note", label: "Notes", text: String(note("orthography")) });
    const ws = ofLang("writingSystems");
    if (ws.length) renderList(ws, glossopoeiaWritingSystemSchema());
    const gr = ofLang("graphemes");
    if (gr.length) { push({ t: "h3", text: "Graphemes" }); renderList(gr, glossopoeiaGraphemeSchema(), { heading: false }); }
    const sr = ofLang("spellingRules");
    if (sr.length) { push({ t: "h3", text: "Spelling Rules" }); renderList(sr, glossopoeiaSpellingRuleSchema(), { heading: false }); }
  }

  // 8. Dictionary
  const lexemes = ofLang("lexemes").slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  if (lexemes.length) {
    push({ t: "h2", text: "Dictionary" });
    lexemes.forEach(lx => {
      const f = lx.fields || {};
      const syl = glossSyllabify(lx, g);
      const sylStr = (syl && syl.joined && syl.joined !== (f.pronunciation || "")) ? syl.joined : "";
      const senses = (Array.isArray(f.senses) ? f.senses : []).map(s => ({
        gloss: (s.gloss || "").trim(),
        definition: (s.definition || "").trim(),
        pos: selText(s.sensePos),
        register: selText(s.register),
        example: (s.example || "").trim(),
      })).filter(s => s.gloss || s.definition || s.example);
      const etym = [];
      [["origin", "Origin"], ["derivedFrom", "Derived from"], ["sourceWord", "Source word"], ["cognates", "Cognates"], ["builtBy", "Built by"]].forEach(([id, lbl]) => {
        const fld = (glossopoeiaLexemeSchema(state).fields || []).find(x => x.id === id);
        const v = fld ? fieldText(fld, f[id]) : null;
        if (v) etym.push({ label: lbl, value: v });
      });
      if (selText(f.partOfSpeech) === "proper noun (name)") {
        [["nameType", "Name type"], ["nameMeaning", "Meaning"], ["nameElements", "Elements"]].forEach(([id, lbl]) => {
          const fld = (glossopoeiaLexemeSchema(state).fields || []).find(x => x.id === id);
          const v = fld ? fieldText(fld, f[id]) : null; if (v) etym.push({ label: lbl, value: v });
        });
      }
      const irr = gridTable(f.irregularForms);
      push({
        t: "dictentry",
        headword: lx.name || "(unnamed)",
        pron: f.pronunciation ? "/" + f.pronunciation + "/" : "",
        syllables: sylStr,
        pos: selText(f.partOfSpeech),
        unit: selText(f.unit) === "word" ? "" : selText(f.unit),
        status: selText(f.status) === "in use" ? "" : selText(f.status),
        senses, etym,
        irregular: irr,
        notes: (f.notes || "").trim(),
      });
    });
  }

  // 9. Texts (corpus)
  const corpus = ofLang("corpusEntries").slice().sort((a, b) => {
    const sa = (a.fields || {}).source || "", sb = (b.fields || {}).source || "";
    if (sa !== sb) return sa.localeCompare(sb);
    return (parseFloat((a.fields || {}).lineOrder) || 0) - (parseFloat((b.fields || {}).lineOrder) || 0);
  });
  if (corpus.length) {
    push({ t: "h2", text: "Texts" });
    let lastSource = null;
    corpus.forEach(ex => {
      const f = ex.fields || {};
      if (f.source && f.source !== lastSource) { push({ t: "h3", text: f.source }); lastSource = f.source; }
      const gt = gridTable(f.interlinear);
      if (gt) push({ t: "table", headers: gt.headers, rows: gt.rows });
      if (f.freeTranslation) push({ t: "p", text: "\u2018" + f.freeTranslation + "\u2019" });
      if (f.literalGloss) push({ t: "fields", items: [{ label: "Literal", value: f.literalGloss }] });
      if (f.notes) push({ t: "note", label: "Note", text: String(f.notes) });
    });
  }

  return blocks;
}

function glossBlocksToMarkdown(blocks) {
  const out = [];
  const tcell = (s) => String(s == null ? "" : s).replace(/\|/g, "\\|").replace(/\n/g, " ");
  blocks.forEach(b => {
    if (b.t === "h1") out.push("# " + b.text, "");
    else if (b.t === "h2") out.push("## " + b.text, "");
    else if (b.t === "h3") out.push("### " + b.text, "");
    else if (b.t === "p") out.push(b.text, "");
    else if (b.t === "note") out.push("**" + b.label + ":**", "", b.text, "");
    else if (b.t === "fields") { b.items.forEach(i => out.push("- **" + i.label + ":** " + i.value)); out.push(""); }
    else if (b.t === "table") {
      out.push("| " + b.headers.map(tcell).join(" | ") + " |");
      out.push("| " + b.headers.map(() => "---").join(" | ") + " |");
      b.rows.forEach(r => out.push("| " + r.map(tcell).join(" | ") + " |"));
      out.push("");
    } else if (b.t === "dictentry") {
      let head = "**" + b.headword + "**";
      if (b.pron) head += " " + b.pron;
      if (b.syllables) head += " [" + b.syllables + "]";
      const tags = [b.pos, b.unit, b.status].filter(Boolean).join(", ");
      if (tags) head += " \u2014 *" + tags + "*";
      out.push(head);
      if (b.senses.length) {
        b.senses.forEach((s, i) => {
          let line = (i + 1) + ". ";
          if (s.pos && s.pos !== b.pos) line += "*" + s.pos + "* ";
          if (s.gloss) line += "**" + s.gloss + "**";
          if (s.definition) line += (s.gloss ? " \u2014 " : "") + s.definition;
          if (s.register) line += " (" + s.register + ")";
          out.push(line);
          if (s.example) out.push("   _" + s.example + "_");
        });
      }
      if (b.etym.length) out.push("   " + b.etym.map(e => e.label + ": " + e.value).join("; "));
      if (b.irregular) { out.push("   Irregular forms:"); out.push("| " + b.irregular.headers.map(tcell).join(" | ") + " |"); out.push("| " + b.irregular.headers.map(() => "---").join(" | ") + " |"); b.irregular.rows.forEach(r => out.push("| " + r.map(tcell).join(" | ") + " |")); }
      if (b.notes) out.push("   " + b.notes);
      out.push("");
    } else if (b.t === "hr") out.push("---", "");
  });
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

function glossBlocksToHtml(blocks, title) {
  const he = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const br = (s) => he(s).replace(/\n/g, "<br>");
  const tableHtml = (headers, rows) => {
    const th = headers.map(h => "<th>" + he(h) + "</th>").join("");
    const body = rows.map(r => "<tr>" + r.map(c => "<td>" + he(c) + "</td>").join("") + "</tr>").join("");
    return "<table><thead><tr>" + th + "</tr></thead><tbody>" + body + "</tbody></table>";
  };
  const parts = [];
  blocks.forEach(b => {
    if (b.t === "h1") parts.push("<h1>" + he(b.text) + "</h1>");
    else if (b.t === "h2") parts.push("<h2>" + he(b.text) + "</h2>");
    else if (b.t === "h3") parts.push("<h3>" + he(b.text) + "</h3>");
    else if (b.t === "p") parts.push("<p>" + br(b.text) + "</p>");
    else if (b.t === "note") parts.push('<div class="note"><div class="lbl">' + he(b.label) + "</div><div>" + br(b.text) + "</div></div>");
    else if (b.t === "fields") parts.push('<div class="fields">' + b.items.map(i => '<div class="row"><div class="k">' + he(i.label) + '</div><div class="v">' + br(i.value) + "</div></div>").join("") + "</div>");
    else if (b.t === "table") parts.push(tableHtml(b.headers, b.rows));
    else if (b.t === "dictentry") {
      let h = '<div class="entry"><div class="head"><span class="hw">' + he(b.headword) + "</span>";
      if (b.pron) h += ' <span class="pron ipa">' + he(b.pron) + "</span>";
      if (b.syllables) h += ' <span class="ipa">[' + he(b.syllables) + "]</span>";
      const tags = [b.pos, b.unit, b.status].filter(Boolean).join(", ");
      if (tags) h += ' <span class="pos">' + he(tags) + "</span>";
      h += "</div>";
      if (b.senses.length) {
        h += "<ol>";
        b.senses.forEach(s => {
          let li = "<li>";
          if (s.pos && s.pos !== b.pos) li += "<em>" + he(s.pos) + "</em> ";
          if (s.gloss) li += "<strong>" + he(s.gloss) + "</strong>";
          if (s.definition) li += (s.gloss ? " &mdash; " : "") + he(s.definition);
          if (s.register) li += " (" + he(s.register) + ")";
          if (s.example) li += '<br><em>' + he(s.example) + "</em>";
          li += "</li>";
          h += li;
        });
        h += "</ol>";
      }
      if (b.etym.length) h += '<div class="meta">' + b.etym.map(e => he(e.label) + ": " + he(e.value)).join("; ") + "</div>";
      if (b.irregular) h += '<div class="meta">Irregular forms:</div>' + tableHtml(b.irregular.headers, b.irregular.rows);
      if (b.notes) h += '<div class="meta">' + br(b.notes) + "</div>";
      h += "</div>";
      parts.push(h);
    } else if (b.t === "hr") parts.push("<hr>");
  });
  const themeVars = (typeof extractThemeVars === "function") ? extractThemeVars() : {};
  const rootVars = Object.entries(themeVars).map(([k, v]) => `${k}:${v};`).join("");
  const css = `:root{${GLOSS_GRAMMAR_THEME_DEFAULT}${rootVars}}` + GLOSS_GRAMMAR_CSS;
  return "<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>" + he(title) + "</title><style>" + css + "</style></head><body>\n" + parts.join("\n") + "\n</body></html>\n";
}

function glossExportGrammar(state, langId, format, flash) {
  const lang = ((state.glossopoeia || {}).conlangs || []).find(c => c && c.id === langId);
  if (!lang) return;
  const blocks = glossGrammarBlocks(state, langId);
  const slug = (lang.name || "language").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "language";
  let content, mime, ext;
  if (format === "html") { content = glossBlocksToHtml(blocks, (lang.name || "Language") + " — Reference Grammar"); mime = "text/html"; ext = "html"; }
  else { content = glossBlocksToMarkdown(blocks); mime = "text/markdown"; ext = "md"; }
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = slug + "-grammar." + ext;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if (flash) flash("Exported " + (lang.name || "language") + " grammar as " + ext.toUpperCase() + ".");
}