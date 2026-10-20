
// ─── Syllabifier (v1.5 r109, sonority onset r112) ───────────────────────────
// Splits a Lexeme into syllables by maximal onset, refined so the onset keeps
// only the longest run of consonants whose sonority rises toward the vowel; the
// rest fall into the previous syllable's coda. So ran.fir (a nasal can't sit in
// an onset before the less-sonorous f), res.to (a fricative can't precede a
// stop in an onset), and a.tra (a stop does rise to a liquid, so it stays a
// cluster). A consonant still never crosses a Word-Piece seam, so nu-rawt-el
// stays nu.rawt.el. A word with no Word Pieces uses its Pronunciation with no
// internal boundaries. Sounds are tokenized longest-first against the inventory
// so a multi-symbol sound (aɪ, t͡ʃ) counts as one. Vowels and diphthongs are
// syllable centers; syllabic consonants count too if the structure allows them.
// Sonority comes from each phoneme's Manner; this is a general principle, not
// the language's exact cluster list, so a sonority-legal cluster the language
// happens to forbid (and the rare inside-a-root break with no seam) is what the
// per-word override is for. Returns null when there's nothing to read.
const GLOSS_SONORITY = { "Plosive": 1, "Affricate": 1, "Fricative": 2, "Lateral Fricative": 2, "Nasal": 3, "Trill": 4, "Tap/Flap": 4, "Lateral Approximant": 4, "Approximant": 5 };
function glossSyllabify(rec, g) {
  if (!rec) return null;
  const selOnly = (v) => (v && typeof v === "object") ? (v.value || "") : (v || "");
  const langId = rec.langId;
  const phonemes = (g && Array.isArray(g.phonemes) ? g.phonemes : []).filter(p => p && p.langId === langId && p.name);
  const symInfo = {};
  phonemes.forEach(p => { symInfo[p.name] = { cls: selOnly(p.fields && p.fields.class), syllabic: selOnly(p.fields && p.fields.syllabicity) === "Syllabic", manner: selOnly(p.fields && p.fields.manner) }; });
  const ss = (g && Array.isArray(g.syllableStructures) ? g.syllableStructures : []).filter(s => s && s.langId === langId)[0] || null;
  const maxOnsetRaw = ss && ss.fields ? parseInt(ss.fields.maxOnset, 10) : NaN;
  const cap = (Number.isFinite(maxOnsetRaw) && maxOnsetRaw > 0) ? maxOnsetRaw : Infinity;
  const nucTypes = (ss && ss.fields && Array.isArray(ss.fields.nucleusTypes)) ? ss.fields.nucleusTypes : [];
  const syllabicAllowed = nucTypes.includes("Syllabic Consonant");
  const FALLBACK_VOWELS = new Set("aeiouyɑɐɒæɛɜɞəɘɵɤɪɔœøʉʊɯʏ".split(""));
  const inv = phonemes.map(p => p.name).sort((a, b) => b.length - a.length);
  const tokenize = (str) => {
    const toks = []; const s = str || ""; let i = 0;
    while (i < s.length) {
      let m = null;
      for (let k = 0; k < inv.length; k++) { const sym = inv[k]; if (sym && s.startsWith(sym, i)) { m = sym; break; } }
      if (m) { toks.push(m); i += m.length; } else { toks.push(s[i]); i += 1; }
    }
    return toks;
  };
  let tokens = [];
  const boundaryAfter = new Set();
  const pieces = (rec.fields && Array.isArray(rec.fields.wordPieces)) ? rec.fields.wordPieces.filter(pc => pc && (pc.sounds || "").trim()) : [];
  if (pieces.length > 0) {
    pieces.forEach((pc, pi) => {
      tokens = tokens.concat(tokenize((pc.sounds || "").trim()));
      if (pi < pieces.length - 1) boundaryAfter.add(tokens.length - 1);
    });
  } else {
    const pron = ((rec.fields && rec.fields.pronunciation) || "").trim();
    if (!pron) return null;
    tokens = tokenize(pron);
  }
  if (tokens.length === 0) return null;
  const isNucleus = (sym) => {
    const info = symInfo[sym];
    if (info) {
      if (info.cls === "Vowel" || info.cls === "Diphthong") return true;
      if (info.cls === "Consonant" && info.syllabic && syllabicAllowed) return true;
      return false;
    }
    return [...sym].some(ch => FALLBACK_VOWELS.has(ch));
  };
  // Sonority from Manner; a nucleus is most sonorous, an unmarked consonant gets
  // a neutral middle value so it doesn't over-pull into an onset.
  const sonority = (sym) => {
    const info = symInfo[sym];
    if (!info) return 2;
    if (info.cls === "Vowel" || info.cls === "Diphthong") return 6;
    if (info.syllabic) return 5;
    return (GLOSS_SONORITY[info.manner] != null) ? GLOSS_SONORITY[info.manner] : 2;
  };
  const nucIdx = [];
  tokens.forEach((t, i) => { if (isNucleus(t)) nucIdx.push(i); });
  if (nucIdx.length === 0) return { syllables: [tokens.join("")], joined: tokens.join("") };
  const starts = [];
  for (let k = 0; k < nucIdx.length; k++) {
    if (k === 0) { starts.push(0); continue; }
    const n = nucIdx[k]; const prev = nucIdx[k - 1];
    let onsetStart = n; let count = 0; let j = n - 1; let rightSon = Infinity;
    while (j > prev && count < cap) {
      if (boundaryAfter.has(j)) break;
      const sj = sonority(tokens[j]);
      if (count > 0 && sj >= rightSon) break;   // onset must rise in sonority toward the nucleus
      onsetStart = j; count++; rightSon = sj; j--;
    }
    starts.push(onsetStart);
  }
  const syllables = [];
  for (let k = 0; k < starts.length; k++) {
    const s = starts[k];
    const e = (k < starts.length - 1) ? starts[k + 1] - 1 : tokens.length - 1;
    syllables.push(tokens.slice(s, e + 1).join(""));
  }
  return { syllables, joined: syllables.join(".") };
}

// Tests one Lexeme against the active language's Syllable Structure (consonants
// before/after the vowel, onset-required) and its Prohibited Phonotactic
// Constraints. A prohibited constraint reads its Phonemes link as a set: none of
// those sounds may sit at the constraint's Position, and "Applies When = Only in
// a cluster" narrows that to onsets/codas of two or more consonants. A
// constraint with no link but a literal run of sounds in its Pattern box is
// matched as a contiguous sequence at the position (the fallback). Anything that
// reads as neither is reported as uncheckable. Permitted constraints are
// documentary and never warn. Runs against the manual override split when
// present, else the auto syllabification. Warn-only: it never blocks a save and
// never edits the word. Returns null when there's nothing to test; otherwise
// { issues:[{text}], uncheckable:[label] }. The tokenizer mirrors
// glossSyllabify's longest-first scan; kept local so the verified syllabifier is
// left untouched.
function glossPhonotacticCheck(rec, g) {
  if (!rec) return null;
  const langId = rec.langId;
  const selOnly = (v) => (v && typeof v === "object") ? (v.value || "") : (v || "");
  const phonemes = (g && Array.isArray(g.phonemes) ? g.phonemes : []).filter(p => p && p.langId === langId && p.name);
  if (phonemes.length === 0) return null;
  const phonByName = {};
  phonemes.forEach(p => { phonByName[p.name] = { cls: selOnly(p.fields && p.fields.class), syllabic: selOnly(p.fields && p.fields.syllabicity) === "Syllabic" }; });
  const invSet = new Set(phonemes.map(p => p.name));
  const inv = phonemes.map(p => p.name).sort((a, b) => b.length - a.length);
  const FALLBACK_VOWELS = new Set("aeiouy\u0251\u0250\u0252\u00e6\u025b\u025c\u025e\u0259\u0258\u0275\u0264\u026a\u0254\u0153\u00f8\u0289\u028a\u026f\u028f".split(""));
  const tokenize = (str) => {
    const toks = []; const s = (str || "").trim(); let i = 0;
    while (i < s.length) {
      let m = null;
      for (let k = 0; k < inv.length; k++) { const sym = inv[k]; if (sym && s.startsWith(sym, i)) { m = sym; break; } }
      if (m) { toks.push(m); i += m.length; } else { toks.push(s[i]); i += 1; }
    }
    return toks;
  };
  const ss = (g && Array.isArray(g.syllableStructures) ? g.syllableStructures : []).filter(s => s && s.langId === langId)[0] || null;
  const ssf = ss && ss.fields ? ss.fields : null;
  const maxOnset = ssf ? parseInt(ssf.maxOnset, 10) : NaN;
  const maxCoda = ssf ? parseInt(ssf.maxCoda, 10) : NaN;
  const onsetReq = ssf ? ssf.onsetRequirement : null;
  const nucTypes = (ssf && Array.isArray(ssf.nucleusTypes)) ? ssf.nucleusTypes : [];
  const syllabicAllowed = nucTypes.includes("Syllabic Consonant");
  const isNucleus = (sym) => {
    const info = phonByName[sym];
    if (info) {
      if (info.cls === "Vowel" || info.cls === "Diphthong") return true;
      if (info.cls === "Consonant" && info.syllabic && syllabicAllowed) return true;
      return false;
    }
    return [...sym].some(ch => FALLBACK_VOWELS.has(ch));
  };

  // Effective split: the manual override (dot-separated) when present, else the
  // auto syllabification. Matches what the readout above shows.
  const ovr = ((rec.fields && rec.fields.syllableOverride) || "").trim();
  let syllableStrings;
  if (ovr) {
    syllableStrings = ovr.split(".").map(s => s.trim()).filter(Boolean);
  } else {
    const auto = glossSyllabify(rec, g);
    syllableStrings = (auto && Array.isArray(auto.syllables)) ? auto.syllables : [];
  }
  if (syllableStrings.length === 0) return null;

  // Per-syllable onset / nucleus / coda, and the whole-word token sequence.
  const parsed = syllableStrings.map(str => {
    const toks = tokenize(str);
    let nucAt = -1;
    for (let i = 0; i < toks.length; i++) { if (isNucleus(toks[i])) { nucAt = i; break; } }
    if (nucAt < 0) return { onset: toks.slice(), nucleus: "", coda: [], toks };
    return { onset: toks.slice(0, nucAt), nucleus: toks[nucAt], coda: toks.slice(nucAt + 1), toks };
  });
  const allToks = parsed.reduce((acc, p) => acc.concat(p.toks), []);
  const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const issues = [];

  // Syllable-shape checks against the Syllable Structure spec.
  if (ssf) {
    parsed.forEach((p, i) => {
      const where = parsed.length === 1 ? "the syllable" : `syllable ${i + 1} (${syllableStrings[i]})`;
      if (Number.isFinite(maxOnset) && maxOnset >= 0 && p.onset.length > maxOnset) {
        issues.push({ text: `${cap1(where)} has ${p.onset.length} consonant${p.onset.length === 1 ? "" : "s"} before the vowel; the limit is ${maxOnset}.` });
      }
      if (Number.isFinite(maxCoda) && maxCoda >= 0 && p.coda.length > maxCoda) {
        issues.push({ text: `${cap1(where)} has ${p.coda.length} consonant${p.coda.length === 1 ? "" : "s"} after the vowel; the limit is ${maxCoda}.` });
      }
      if (onsetReq === "Required" && p.nucleus && p.onset.length === 0) {
        issues.push({ text: `${cap1(where)} has no consonant before the vowel, but this language requires one.` });
      }
    });
  }

  // Prohibited-constraint checks. Permitted records are documentary (skipped).
  const containsSeq = (hay, n) => {
    if (!n.length || n.length > hay.length) return false;
    for (let i = 0; i + n.length <= hay.length; i++) { let ok = true; for (let j = 0; j < n.length; j++) if (hay[i + j] !== n[j]) { ok = false; break; } if (ok) return true; }
    return false;
  };
  const startsSeq = (hay, n) => n.length > 0 && n.length <= hay.length && n.every((t, j) => hay[j] === t);
  const endsSeq = (hay, n) => { const o = hay.length - n.length; return n.length > 0 && o >= 0 && n.every((t, j) => hay[o + j] === t); };
  const internalSeq = (hay, n) => {
    if (!n.length) return false;
    for (let i = 1; i <= hay.length - n.length - 1; i++) { let ok = true; for (let j = 0; j < n.length; j++) if (hay[i + j] !== n[j]) { ok = false; break; } if (ok) return true; }
    return false;
  };
  const hits = (needle, pos) => {
    if (pos === "Onset") return parsed.some(p => containsSeq(p.onset, needle));
    if (pos === "Coda") return parsed.some(p => containsSeq(p.coda, needle));
    if (pos === "Nucleus") return parsed.some(p => p.nucleus && containsSeq([p.nucleus], needle));
    if (pos === "Word-initial") return startsSeq(allToks, needle);
    if (pos === "Word-final") return endsSeq(allToks, needle);
    if (pos === "Word-medial") return internalSeq(allToks, needle);
    return containsSeq(allToks, needle);
  };
  const posPhrase = { Onset: "consonants before the vowel", Coda: "consonants after the vowel", Nucleus: "vowel", "Word-initial": "start of the word", "Word-final": "end of the word", "Word-medial": "middle of the word" };
  // Membership phrasing (a single sound at a position) and a scanner that
  // returns the offending sounds. Cluster-only narrows Onset/Coda to positions
  // holding two or more consonants.
  const posAt = { Onset: "before the vowel", Coda: "after the vowel", Nucleus: "as the vowel", "Word-initial": "at the start of the word", "Word-final": "at the end of the word", "Word-medial": "in the middle of the word", Any: "" };
  const memberOffenders = (memberSet, pos, clusterOnly) => {
    const out = new Set();
    const scanGroup = (arr) => { if (clusterOnly && arr.length < 2) return; arr.forEach(t => { if (memberSet.has(t)) out.add(t); }); };
    if (pos === "Onset") parsed.forEach(p => scanGroup(p.onset));
    else if (pos === "Coda") parsed.forEach(p => scanGroup(p.coda));
    else if (pos === "Nucleus") parsed.forEach(p => { if (p.nucleus && memberSet.has(p.nucleus)) out.add(p.nucleus); });
    else if (pos === "Word-initial") { if (allToks.length && memberSet.has(allToks[0])) out.add(allToks[0]); }
    else if (pos === "Word-final") { if (allToks.length && memberSet.has(allToks[allToks.length - 1])) out.add(allToks[allToks.length - 1]); }
    else if (pos === "Word-medial") { for (let i = 1; i < allToks.length - 1; i++) if (memberSet.has(allToks[i])) out.add(allToks[i]); }
    else allToks.forEach(t => { if (memberSet.has(t)) out.add(t); });
    return [...out];
  };

  // Phoneme id -> symbol, for resolving each constraint's Phonemes link.
  const nameById = {};
  (g && Array.isArray(g.phonemes) ? g.phonemes : []).forEach(p => { if (p && p.id) nameById[p.id] = p.name; });

  const uncheckable = [];
  const constraints = (g && Array.isArray(g.phonotacticConstraints) ? g.phonotacticConstraints : []).filter(c => c && c.langId === langId);
  constraints.forEach(c => {
    const f = c.fields || {};
    if (f.polarity !== "Prohibited") return;
    const name = (c.name && c.name.trim()) ? c.name.trim() : "";
    const pos = f.position || "Any";
    const clusterOnly = f.appliesWhen === "Only in a cluster";
    // The Phonemes link is the machine-readable set: none of these sounds may
    // sit at this position (optionally only when clustered).
    const refIds = Array.isArray(f.phonemes) ? f.phonemes : [];
    const memberNames = refIds.map(id => nameById[id]).filter(Boolean);
    if (memberNames.length > 0) {
      const off = memberOffenders(new Set(memberNames), pos, clusterOnly);
      if (off.length > 0) {
        const where = [clusterOnly ? "in a cluster" : "", posAt[pos] || ""].filter(Boolean).join(" ");
        const lab = name || `/${memberNames.join(", ")}/`;
        issues.push({ text: `${lab}: ${off.join(", ")} not allowed${where ? " " + where : ""}.` });
      }
      return;
    }
    // Fallback: a literal run of sounds typed into the Pattern box, found as a
    // contiguous sequence at the position (the only readable form of free text).
    const patRaw = (f.pattern && typeof f.pattern === "object" ? (f.pattern.value || "") : (f.pattern || "")).trim();
    if (!patRaw) return;
    const patToks = tokenize(patRaw);
    const readable = patToks.length > 0 && patToks.every(t => invSet.has(t));
    if (!readable) { uncheckable.push(name || patRaw); return; }
    if (hits(patToks, pos)) {
      const tail = (pos && pos !== "Any" && posPhrase[pos]) ? ` in the ${posPhrase[pos]}` : "";
      const lab = name || `/${patToks.join("")}/`;
      issues.push({ text: `${lab}: the word has the forbidden sound sequence ${patToks.join("")}${tail}.` });
    }
  });

  return { issues, uncheckable };
}

// Builds candidate words for a language that pass glossPhonotacticCheck (the
// generator is the check run backward: assemble a word, test it, keep it only if
// it comes back clean and isn't already in the lexicon). Sounds, onset shapes,
// and coda shapes are weighted by how often they appear in this language's
// existing words (learned from the lexicon via the verified syllabifier), with a
// generic fallback when the lexicon is too thin to learn from. Syllable count is
// drawn from the caller's range. Names are a best-effort romanization (each
// sound's romanization field, first alternate of an "x / y"). Pure; returns
// [{ name, pronunciation }].
function glossGenerateWords(g, langId, opts) {
  opts = opts || {};
  const count = Math.max(1, Math.min(100, parseInt(opts.count, 10) || 10));
  const minS = Math.max(1, Math.min(8, parseInt(opts.minSyll, 10) || 1));
  const maxS = Math.max(minS, Math.min(8, parseInt(opts.maxSyll, 10) || minS));
  const selOnly = (v) => (v && typeof v === "object") ? (v.value || "") : (v || "");
  const phonemes = (g && Array.isArray(g.phonemes) ? g.phonemes : []).filter(p => p && p.langId === langId && p.name);
  if (phonemes.length === 0) return [];
  const info = {};
  phonemes.forEach(p => { info[p.name] = { cls: selOnly(p.fields && p.fields.class), syllabic: selOnly(p.fields && p.fields.syllabicity) === "Syllabic", rom: (p.fields && p.fields.romanization) || "" }; });
  const inv = phonemes.map(p => p.name).sort((a, b) => b.length - a.length);
  const ss = (g && Array.isArray(g.syllableStructures) ? g.syllableStructures : []).filter(s => s && s.langId === langId)[0] || null;
  const ssf = ss && ss.fields ? ss.fields : null;
  const nucTypes = (ssf && Array.isArray(ssf.nucleusTypes)) ? ssf.nucleusTypes : [];
  const syllabicAllowed = nucTypes.includes("Syllabic Consonant");
  const onsetReq = ssf ? ssf.onsetRequirement : null;

  const isNuc = (sym) => { const i = info[sym]; if (!i) return false; if (i.cls === "Vowel" || i.cls === "Diphthong") return true; if (i.cls === "Consonant" && i.syllabic && syllabicAllowed) return true; return false; };
  const nuclei = inv.filter(isNuc);
  const consonants = inv.filter(sym => { const i = info[sym]; return i && i.cls === "Consonant"; });
  if (nuclei.length === 0) return [];

  const tokenize = (str) => {
    const toks = []; const s = (str || "").trim(); let i = 0;
    while (i < s.length) { let m = null; for (let k = 0; k < inv.length; k++) { const sym = inv[k]; if (sym && s.startsWith(sym, i)) { m = sym; break; } } if (m) { toks.push(m); i += m.length; } else { toks.push(s[i]); i += 1; } }
    return toks;
  };

  // Learn from the existing lexicon: phoneme frequency, and the onset / coda
  // shapes the language actually uses (taken from the real syllabification so
  // they match how the tool splits words).
  const freq = {}; const onsetCounts = {}; const codaCounts = {};
  const existingProns = new Set();
  (g && Array.isArray(g.lexemes) ? g.lexemes : []).filter(l => l && l.langId === langId).forEach(l => {
    const pron = ((l.fields && l.fields.pronunciation) || "").trim();
    if (!pron) return;
    existingProns.add(pron);
    tokenize(pron).forEach(t => { freq[t] = (freq[t] || 0) + 1; });
    const syl = glossSyllabify(l, g);
    const sylls = (syl && Array.isArray(syl.syllables)) ? syl.syllables : [];
    sylls.forEach(str => {
      const toks = tokenize(str);
      let nucAt = -1;
      for (let i = 0; i < toks.length; i++) { if (isNuc(toks[i])) { nucAt = i; break; } }
      if (nucAt < 0) return;
      const onset = toks.slice(0, nucAt).join("");
      const coda = toks.slice(nucAt + 1).join("");
      onsetCounts[onset] = (onsetCounts[onset] || 0) + 1;
      codaCounts[coda] = (codaCounts[coda] || 0) + 1;
    });
  });

  const pickWeighted = (counts) => {
    const keys = Object.keys(counts);
    if (keys.length === 0) return null;
    let total = 0; keys.forEach(k => total += counts[k]);
    let r = Math.random() * total;
    for (const k of keys) { r -= counts[k]; if (r <= 0) return k; }
    return keys[keys.length - 1];
  };
  const pickUniform = (arr) => arr.length ? arr[Math.floor(Math.random() * arr.length)] : "";
  // The onset and coda shapes the language actually uses. With a real lexicon
  // these are the de-facto legal shapes: any onset cluster or coda the language
  // never shows (so any the permitted rules forbid) is rejected, even though the
  // validator treats those permitted rules as documentary. Re-syllabification can
  // jam a coda and the next onset into a cluster that was never attested, and
  // this is what catches it. Skipped when the lexicon is too thin to learn from.
  const attestedOnset = new Set(Object.keys(onsetCounts));
  const attestedCoda = new Set(Object.keys(codaCounts));

  // Nucleus weights restricted to the nuclei; onset/coda fallbacks for a thin
  // lexicon (no learned shapes yet).
  const nucCounts = {}; nuclei.forEach(n => { if (freq[n]) nucCounts[n] = freq[n]; });
  const haveOnsetData = Object.keys(onsetCounts).length > 0;
  const haveCodaData = Object.keys(codaCounts).length > 0;
  const fallbackOnset = () => { if (onsetReq === "Required") return pickUniform(consonants); return Math.random() < 0.5 ? "" : pickUniform(consonants); };
  const fallbackCoda = () => Math.random() < 0.35 ? pickUniform(consonants) : "";

  const built = []; const seen = new Set();
  const maxTries = count * 50 + 80;
  let tries = 0;
  while (built.length < count && tries < maxTries) {
    tries++;
    const nS = minS + Math.floor(Math.random() * (maxS - minS + 1));
    let pron = "";
    for (let s = 0; s < nS; s++) {
      let onset = haveOnsetData ? pickWeighted(onsetCounts) : fallbackOnset();
      if (onset == null) onset = "";
      if (onsetReq === "Required" && onset === "") onset = pickUniform(consonants);
      const nuc = (Object.keys(nucCounts).length ? pickWeighted(nucCounts) : pickUniform(nuclei)) || "";
      let coda = haveCodaData ? pickWeighted(codaCounts) : fallbackCoda();
      if (coda == null) coda = "";
      pron += onset + nuc + coda;
    }
    if (!pron) continue;
    if (existingProns.has(pron) || seen.has(pron)) continue;
    const probe = { id: "gen", langId, name: pron, fields: { pronunciation: pron } };
    const chk = glossPhonotacticCheck(probe, g);
    if (chk && chk.issues && chk.issues.length > 0) continue;
    // Reject shapes the language never uses (catches illegal clusters that the
    // permitted-rule whitelists forbid but the validator doesn't enforce).
    if (haveOnsetData) {
      const syl = glossSyllabify(probe, g);
      const sylls = (syl && Array.isArray(syl.syllables)) ? syl.syllables : [];
      let okShapes = sylls.length > 0;
      for (const str of sylls) {
        const toks = tokenize(str);
        let nucAt = -1;
        for (let i = 0; i < toks.length; i++) { if (isNuc(toks[i])) { nucAt = i; break; } }
        if (nucAt < 0) { okShapes = false; break; }
        if (!attestedOnset.has(toks.slice(0, nucAt).join("")) || !attestedCoda.has(toks.slice(nucAt + 1).join(""))) { okShapes = false; break; }
      }
      if (!okShapes) continue;
    }
    seen.add(pron);
    const rom = tokenize(pron).map(t => (info[t] && info[t].rom ? String(info[t].rom).split("/")[0].trim() : t)).join("");
    built.push({ name: rom || pron, pronunciation: pron });
  }
  return built;
}

// Core sound-rule runner. Takes an explicit pronunciation string, an array of
// rule records (each with .fields Input/Output/Environment/Order), and an array
// of phoneme records (the inventory used to tokenize and to classify V/C). Used
// two ways: the synchronic readout (glossApplyRules below, the live allophony of
// one language) and the diachronic fork (a parent's words run through a child's
// historical changes, parent inventory as the tokenizer set). Each rule is
// Input -> Output / Environment in slot notation: "_" marks where the changing
// sound sits, "#" a word edge, "V"/"C" any vowel/consonant, literal IPA a
// specific sound, and an empty Output (or "∅") a deletion. Rules are sorted by
// Order here and feed each other. Insertion (empty Input) is not run. Pure;
// returns { surface, phonemic, changed, fired:[{name,from,to}] }, or null when
// the pronunciation is empty. An empty rule list returns the word unchanged.
function glossRunRules(pron, rules, phonemes) {
  const selOnly = (v) => (v && typeof v === "object") ? (v.value || "") : (v || "");
  const phs = (Array.isArray(phonemes) ? phonemes : []).filter(p => p && p.name);
  const symCls = {};
  phs.forEach(p => { symCls[p.name] = selOnly(p.fields && p.fields.class); });
  const inv = phs.map(p => p.name).sort((a, b) => b.length - a.length);
  const FALLBACK_VOWELS = new Set("aeiouy\u0251\u0250\u0252\u00e6\u025b\u025c\u025e\u0259\u0258\u0275\u0264\u026a\u0254\u0153\u00f8\u0289\u028a\u026f\u028f".split(""));
  const isVowel = (sym) => { const c = symCls[sym]; if (c) return c === "Vowel" || c === "Diphthong"; return [...sym].some(ch => FALLBACK_VOWELS.has(ch)); };
  const isCons = (sym) => { const c = symCls[sym]; if (c) return c === "Consonant"; return !isVowel(sym); };
  const tokenize = (str) => { const t = []; const s = (str || "").trim(); let i = 0; while (i < s.length) { let m = null; for (const sym of inv) { if (sym && s.startsWith(sym, i)) { m = sym; break; } } if (m) { t.push(m); i += m.length; } else { t.push(s[i]); i += 1; } } return t; };

  const p = (pron || "").trim();
  if (!p) return null;
  const rs = (Array.isArray(rules) ? rules : []).slice().sort((a, b) => { const oa = parseFloat((a.fields || {}).order), ob = parseFloat((b.fields || {}).order); return (Number.isFinite(oa) ? oa : 9999) - (Number.isFinite(ob) ? ob : 9999); });

  const DELETE = new Set(["", "\u2205", "\u00d8", "0", "-"]);
  const ctxTokens = (str) => (str || "").trim().split(/\s+/).filter(Boolean).reduce((acc, piece) => acc.concat((piece === "#" || piece === "V" || piece === "C") ? [piece] : tokenize(piece)), []);
  const tokMatches = (tok, ctok) => ctok === "V" ? isVowel(tok) : ctok === "C" ? isCons(tok) : tok === ctok;
  const parseRule = (r) => {
    const f = r.fields || {};
    const inRaw = (selOnly(f.input) || "").trim();
    if (!inRaw) return null;
    const outRaw = (selOnly(f.output) || "").trim();
    const envRaw = (selOnly(f.environment) || "").trim();
    const inClass = (inRaw === "V" || inRaw === "C") ? inRaw : null;
    const inTokens = inClass ? null : tokenize(inRaw);
    const del = DELETE.has(outRaw);
    let left = [], right = [], hasEnv = false;
    if (envRaw && envRaw.includes("_")) { const parts = envRaw.split("_"); left = ctxTokens(parts[0]); right = ctxTokens(parts.slice(1).join("_")); hasEnv = true; }
    return { name: r.name || "", inTokens, inClass, outTokens: del ? [] : tokenize(outRaw), left, right, hasEnv };
  };
  const matchLeft = (tokens, pos, left) => { let j = pos - 1; for (let i = left.length - 1; i >= 0; i--) { const ct = left[i]; if (ct === "#") { if (j !== -1) return false; continue; } if (j < 0 || !tokMatches(tokens[j], ct)) return false; j--; } return true; };
  const matchRight = (tokens, endPos, right) => { let j = endPos; for (let i = 0; i < right.length; i++) { const ct = right[i]; if (ct === "#") { if (j !== tokens.length) return false; continue; } if (j >= tokens.length || !tokMatches(tokens[j], ct)) return false; j++; } return true; };

  let tokens = tokenize(p);
  const phonemic = tokens.join("");
  const fired = [];
  rs.forEach(r => {
    const pr = parseRule(r);
    if (!pr || (!pr.inClass && (!pr.inTokens || pr.inTokens.length === 0))) return;
    let firedThis = false;
    const next = [];
    let pos = 0;
    while (pos < tokens.length) {
      let matched = false, inLen = 0;
      if (pr.inClass) { if (tokMatches(tokens[pos], pr.inClass)) { matched = true; inLen = 1; } }
      else if (pos + pr.inTokens.length <= tokens.length && pr.inTokens.every((t, k) => tokens[pos + k] === t)) { matched = true; inLen = pr.inTokens.length; }
      if (matched && pr.hasEnv && !(matchLeft(tokens, pos, pr.left) && matchRight(tokens, pos + inLen, pr.right))) matched = false;
      if (matched) { pr.outTokens.forEach(t => next.push(t)); firedThis = true; pos += inLen; }
      else { next.push(tokens[pos]); pos += 1; }
    }
    if (firedThis) { const before = tokens.join(""); tokens = next; fired.push({ name: pr.name, from: before, to: tokens.join("") }); }
  });
  const surface = tokens.join("");
  return { surface, phonemic, changed: surface !== phonemic, fired };
}

// The synchronic surface-form readout: runs a language's LIVING sound rules
// (allophony) on one of its words. Diachronic rules (Diachronic = "Diachronic")
// are historical changes a fork ran to derive this language; they are filtered
// out here so they never read as a sound the language still makes. Thin wrapper
// over glossRunRules. Returns null when there is no pronunciation or no
// synchronic rule (so the readout shows nothing in those cases, as before).
function glossApplyRules(rec, g) {
  if (!rec) return null;
  const langId = rec.langId;
  const selOnly = (v) => (v && typeof v === "object") ? (v.value || "") : (v || "");
  const pron = ((rec.fields && rec.fields.pronunciation) || "").trim();
  if (!pron) return null;
  const phonemes = (g && Array.isArray(g.phonemes) ? g.phonemes : []).filter(p => p && p.langId === langId && p.name);
  const rules = (g && Array.isArray(g.phonologicalRules) ? g.phonologicalRules : []).filter(r => r && r.langId === langId && selOnly(r.fields && r.fields.diachronic) !== "Diachronic");
  if (rules.length === 0) return null;
  return glossRunRules(pron, rules, phonemes);
}

// Generates a word's full paradigm from its inflection class. The stem is the
// headword; each class-grid cell becomes a form: plain text or a leading "-"
// appends (suffix), a trailing "-" prepends (prefix), "(base)"/"="/blank-as-base
// is the bare stem, a blank or em-dash cell is a gap, and a parenthetical other
// than "(base)" is a stem-alternation instruction shown verbatim (not run). The
// word's Irregular Forms grid overrides matching cells by row/column label.
// Pure; returns { className, rowAxisLabel, colAxisLabel, rows, cols, cells } or
// null when the word has no inflection class or the class has no grid.
function glossBuildParadigm(rec, g) {
  if (!rec) return null;
  const stem = (rec.name || "").trim();
  if (!stem) return null;
  const rawRef = rec.fields && rec.fields.inflectionClass;
  const classRefId = (typeof rawRef === "string") ? rawRef : ((rawRef && rawRef.value) || "");
  if (!classRefId) return null;
  const cls = (g && Array.isArray(g.inflectionClasses) ? g.inflectionClasses : []).find(c => c && c.id === classRefId);
  if (!cls) return null;
  const grid = coerceGridValue(cls.fields && cls.fields.endings);
  if (gridIsEmpty(grid)) return null;

  const norm = (s) => String(s || "").trim().toLowerCase();
  const overrides = {};
  const irr = coerceGridValue(rec.fields && rec.fields.irregularForms);
  if (!gridIsEmpty(irr)) {
    irr.rows.forEach(r => irr.cols.forEach(c => {
      const cell = irr.cells[r.id] && irr.cells[r.id][c.id];
      if (cell && !gridCellIsEmpty(cell) && cell.type !== "entry-ref") overrides[norm(r.label) + "|" + norm(c.label)] = String(cell.value);
    }));
  }

  const formFor = (raw) => {
    const t = (raw || "").trim();
    if (t === "") return { form: "", kind: "empty" };
    if (t === "(base)" || t === "base" || t === "=") return { form: stem, kind: "base" };
    if (t === "\u2014" || t === "-") return { form: "", kind: "empty" };
    if (t.startsWith("(") && t.endsWith(")")) return { form: t, kind: "stem-change" };
    if (t.endsWith("-")) return { form: t.slice(0, -1) + stem, kind: "auto" };
    if (t.startsWith("-")) return { form: stem + t.slice(1), kind: "auto" };
    return { form: stem + t, kind: "auto" };
  };

  const cells = grid.rows.map(r => grid.cols.map(c => {
    const key = norm(r.label) + "|" + norm(c.label);
    if (overrides[key] != null) return { form: overrides[key], kind: "override" };
    const cell = grid.cells[r.id] && grid.cells[r.id][c.id];
    return formFor((cell && !gridCellIsEmpty(cell)) ? String(cell.value) : "");
  }));

  return { className: cls.name || "", rowAxisLabel: grid.rowAxisLabel, colAxisLabel: grid.colAxisLabel, rows: grid.rows.map(r => r.label || ""), cols: grid.cols.map(c => c.label || ""), cells };
}

// Glosses a pasted sentence word by word, in order of trust: a gloss already
// given for that exact word in another Example (the corpus is its own memory),
// then a whole-word lexicon match (first sense), then a best-effort stem +
// ending (longest lexeme-headword prefix, remainder matched against affixes then
// inflection-class endings), then blank. The stem-plus-ending guess is wrong
// often on fusional words; the value is that you fix each word once. Pure;
// returns { words: [{ word, parts, gloss, source }] }.
function glossGlossSentence(sentence, g, langId) {
  const norm = (s) => String(s || "").trim().toLowerCase();
  const stripEdges = (w) => w.replace(/^[.,!?;:"'()\u00bf\u00a1\u00ab\u00bb]+|[.,!?;:"'()\u00bf\u00a1\u00ab\u00bb]+$/g, "");
  const words = String(sentence || "").trim().split(/\s+/).map(stripEdges).filter(Boolean);
  if (words.length === 0) return { words: [] };

  const lexemes = (g.lexemes || []).filter(l => l && l.langId === langId && l.name);
  const affixes = (g.affixes || []).filter(a => a && a.langId === langId && a.name);
  const classes = (g.inflectionClasses || []).filter(c => c && c.langId === langId);
  const corpus = (g.corpusEntries || []).filter(c => c && c.langId === langId);
  const gv = {}; (g.grammaticalValues || []).filter(v => v && v.langId === langId).forEach(v => { gv[v.id] = (v.fields && v.fields.shortTag) || v.name; });

  // Memory: word(lower) -> gloss, read from existing interlinear grids.
  const memory = {};
  corpus.forEach(ex => {
    const grid = coerceGridValue(ex.fields && ex.fields.interlinear);
    if (gridIsEmpty(grid)) return;
    const rowBy = (re) => grid.rows.find(r => re.test(r.label || ""));
    const wordRow = rowBy(/form|word|object|text|surface/i) || grid.rows[0];
    const glossRow = rowBy(/gloss|meaning/i) || grid.rows[grid.rows.length - 1];
    if (!wordRow || !glossRow || wordRow.id === glossRow.id) return;
    grid.cols.forEach(c => {
      const wc = grid.cells[wordRow.id] && grid.cells[wordRow.id][c.id];
      const gc = grid.cells[glossRow.id] && grid.cells[glossRow.id][c.id];
      const wv = (wc && !gridCellIsEmpty(wc)) ? String(wc.value) : "";
      const gx = (gc && !gridCellIsEmpty(gc)) ? String(gc.value) : "";
      if (wv && gx && memory[norm(wv)] == null) memory[norm(wv)] = gx;
    });
  });

  const ABBR = { nominative: "NOM", genitive: "GEN", oblique: "OBL", vocative: "VOC", accusative: "ACC", dative: "DAT", singular: "SG", plural: "PL", dual: "DU", "1st": "1", "2nd": "2", "3rd": "3", perfective: "PFV", imperfective: "IPFV", prospective: "PROSP", past: "PST", present: "PRS", future: "FUT" };
  const abbr = (s) => ABBR[norm(s)] || String(s || "").trim().toUpperCase();

  const lexByName = {}; lexemes.forEach(l => { const k = norm(l.name); if (lexByName[k] == null) lexByName[k] = l; });
  const senseGloss = (l) => { const ss = (l.fields && Array.isArray(l.fields.senses)) ? l.fields.senses : []; const first = ss.find(s => s && (s.gloss || "").trim()); return first ? first.gloss.trim() : (l.name || ""); };
  const affByForm = {}; affixes.forEach(a => { const k = norm(String(a.name).replace(/^-|-$/g, "")); if (affByForm[k] == null) affByForm[k] = a; });
  const affGloss = (a) => { const f = a.fields || {}; const marks = (f.marks || []).map(m => gv[m]).filter(Boolean); if (marks.length) return marks.join("."); if (f.addsMeaning) return String(f.addsMeaning).split(/[:,]/)[0].trim().toUpperCase(); return String(a.name).replace(/^-|-$/g, ""); };
  const endingGloss = (rem) => {
    for (const c of classes) {
      const grid = coerceGridValue(c.fields && c.fields.endings);
      if (gridIsEmpty(grid)) continue;
      for (const r of grid.rows) for (const col of grid.cols) {
        const cell = grid.cells[r.id] && grid.cells[r.id][col.id];
        if (!cell || gridCellIsEmpty(cell)) continue;
        const end = String(cell.value).trim().replace(/^-/, "");
        if (end && end === rem) return [abbr(r.label), abbr(col.label)].filter(Boolean).join(".");
      }
    }
    return null;
  };

  const glossWord = (w) => {
    const lw = norm(w);
    if (memory[lw] != null) return { word: w, parts: w, gloss: memory[lw], source: "memory" };
    if (lexByName[lw]) return { word: w, parts: w, gloss: senseGloss(lexByName[lw]), source: "lexicon" };
    let best = null;
    lexemes.forEach(l => { const n = norm(l.name); if (n.length < lw.length && lw.startsWith(n) && (!best || n.length > norm(best.name).length)) best = l; });
    if (best) {
      const rem = w.slice(best.name.length);
      const remN = norm(rem);
      const eg = affByForm[remN] ? affGloss(affByForm[remN]) : endingGloss(remN);
      return { word: w, parts: best.name + "-" + rem, gloss: senseGloss(best) + "-" + (eg || "?"), source: "guess" };
    }
    return { word: w, parts: w, gloss: "", source: "none" };
  };

  return { words: words.map(glossWord) };
}

// ─── Glossopoeia per-language import / export (v1.5) ─────────────────────────
// A language exports as a whole: the ConLang container plus every slice-array
// record carrying its langId, plus that language's workspaceNotes. Internal refs
// (within the language) export by id and are remapped to fresh ids on import via
// a deep walk that also catches grid-cell refs. Cross-boundary refs that can't
// travel in a single-language file (Cognates / Source Word to another language,
// a dialect's Variety Of parent, a ConLang's Spoken By / Region pointing at
// world entries) export as name pointers and re-link by name on import, dropping
// silently if no match exists. Cross-boundary refs sitting inside a grid cell
// are the one thing not relinked; they dangle.
const GLOSS_LANG_ARRAYS = ["lexemes","phonemes","syllableStructures","stressPatterns","phonotacticConstraints","phonologicalRules","grammaticalValues","affixes","wordBuildingProcesses","inflectionClasses","pronounSets","phraseOrders","sentenceMarkings","constructions","relativizations","clauseLinkings","writingSystems","graphemes","spellingRules","corpusEntries"];
const GLOSS_IMPORT_PREFIX = { conlangs:"lng", lexemes:"lex", phonemes:"phon", syllableStructures:"syl", stressPatterns:"str", phonotacticConstraints:"pcon", phonologicalRules:"prul", grammaticalValues:"gval", affixes:"afx", wordBuildingProcesses:"wbp", inflectionClasses:"infl", pronounSets:"pron", phraseOrders:"phro", sentenceMarkings:"snm", constructions:"con", relativizations:"rel", clauseLinkings:"cln", writingSystems:"wsy", graphemes:"grf", spellingRules:"spr", corpusEntries:"cor" };

function exportConlangFile(state, langId, flash) {
  const g = state.glossopoeia || {};
  const conlang = (g.conlangs || []).find(c => c && c.id === langId);
  if (!conlang) { if (flash) flash("No language selected to export.", "error"); return; }

  const conlangNameById = {};
  (g.conlangs || []).forEach(c => { if (c && c.id) conlangNameById[c.id] = c.name || ""; });
  const glossIndex = {};
  GLOSS_LANG_ARRAYS.forEach(k => (g[k] || []).forEach(r => { if (r && r.id) glossIndex[r.id] = { arrayKey: k, name: r.name || "", langId: r.langId || null }; }));
  (g.conlangs || []).forEach(c => { if (c && c.id) glossIndex[c.id] = { arrayKey: "conlangs", name: c.name || "", langId: null }; });
  const entryIndex = {};
  (state.entries || []).forEach(e => { if (e && e.id) entryIndex[e.id] = { name: e.name || "", templateId: e.templateId }; });
  const tplNameById = {};
  (state.templates || []).forEach(t => { if (t && t.id) tplNameById[t.id] = t.name || ""; });

  const exportedIds = new Set([conlang.id]);
  const records = {};
  GLOSS_LANG_ARRAYS.forEach(k => {
    const recs = (g[k] || []).filter(r => r && r.langId === langId);
    recs.forEach(r => exportedIds.add(r.id));
    records[k] = recs;
  });

  // "internal" | name-pointer object | null (not a ref, or already dangling).
  const classify = (id) => {
    if (typeof id !== "string" || !id) return null;
    if (exportedIds.has(id)) return "internal";
    const gi = glossIndex[id];
    if (gi) {
      if (gi.arrayKey === "conlangs") return { kind: "conlang", name: gi.name };
      return { kind: "gloss", arrayKey: gi.arrayKey, name: gi.name, lang: conlangNameById[gi.langId] || "" };
    }
    const ei = entryIndex[id];
    if (ei) return { kind: "entry", name: ei.name, template: tplNameById[ei.templateId] || "" };
    return null;
  };

  const externalRefs = [];
  const cleanRecord = (rec) => {
    const fields = JSON.parse(JSON.stringify(rec.fields || {}));
    Object.keys(fields).forEach(fid => {
      const v = fields[fid];
      if (typeof v === "string") {
        const c = classify(v);
        if (c && typeof c === "object") { externalRefs.push({ recordId: rec.id, fieldId: fid, multi: false, targets: [c] }); fields[fid] = ""; }
      } else if (Array.isArray(v)) {
        const ext = [];
        const kept = v.filter(item => {
          const c = classify(item);
          if (c && typeof c === "object") { ext.push(c); return false; }
          return true; // internal ref id, or a non-ref string (e.g. multi-select option)
        });
        if (ext.length) { externalRefs.push({ recordId: rec.id, fieldId: fid, multi: true, targets: ext }); fields[fid] = kept; }
      }
      // objects (grids, sense groups) export verbatim
    });
    return { ...rec, fields };
  };

  const outConlang = cleanRecord(conlang);
  const outRecords = {};
  GLOSS_LANG_ARRAYS.forEach(k => { outRecords[k] = records[k].map(cleanRecord); });

  const payload = {
    cartulary_conlang_export: 1,
    exported_at: new Date().toISOString(),
    conlang: outConlang,
    records: outRecords,
    workspaceNotes: (g.workspaceNotes && g.workspaceNotes[langId]) ? g.workspaceNotes[langId] : {},
    externalRefs,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(conlang.name) || "language"}.conlang.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if (flash) flash(`Exported language "${conlang.name || "Unnamed"}".`);
}

const glossDeepRemap = (val, remap) => {
  if (typeof val === "string") return remap[val] || val;
  if (Array.isArray(val)) return val.map(x => glossDeepRemap(x, remap));
  if (val && typeof val === "object") { const o = {}; Object.keys(val).forEach(k => { o[k] = glossDeepRemap(val[k], remap); }); return o; }
  return val;
};

function importConlangPayload(state, updateState, payload, flash) {
  if (!payload || payload.cartulary_conlang_export !== 1 || !payload.conlang || !payload.records || typeof payload.records !== "object") {
    if (flash) flash("That doesn't look like a Cartulary language export.", "error");
    return;
  }
  const g = state.glossopoeia || {};
  const newLangId = `${GLOSS_IMPORT_PREFIX.conlangs}-${genId()}`;

  const remap = {};
  remap[payload.conlang.id] = newLangId;
  GLOSS_LANG_ARRAYS.forEach(k => (payload.records[k] || []).forEach(r => {
    if (r && r.id) remap[r.id] = `${GLOSS_IMPORT_PREFIX[k] || "gx"}-${genId()}`;
  }));

  const newConlang = { ...payload.conlang, id: newLangId, fields: glossDeepRemap(payload.conlang.fields || {}, remap) };
  delete newConlang.langId;
  const newArrays = {};
  GLOSS_LANG_ARRAYS.forEach(k => {
    newArrays[k] = (payload.records[k] || []).filter(r => r && r.id).map(r => ({
      ...r, id: remap[r.id], langId: newLangId, fields: glossDeepRemap(r.fields || {}, remap),
    }));
  });

  const conlangByName = {};
  (g.conlangs || []).forEach(c => { const n = (c.name || "").trim().toLowerCase(); if (n && !(n in conlangByName)) conlangByName[n] = c.id; });
  const findGloss = (arrayKey, langName, name) => {
    const lid = conlangByName[(langName || "").trim().toLowerCase()];
    if (!lid) return null;
    const nm = (name || "").trim().toLowerCase();
    const hit = (g[arrayKey] || []).find(r => r && r.langId === lid && (r.name || "").trim().toLowerCase() === nm);
    return hit ? hit.id : null;
  };
  const findEntry = (name, templateName) => {
    const nm = (name || "").trim().toLowerCase();
    const cands = (state.entries || []).filter(e => e && (e.name || "").trim().toLowerCase() === nm);
    if (!cands.length) return null;
    if (templateName) {
      const t = (state.templates || []).find(tp => (tp.name || "").trim().toLowerCase() === templateName.trim().toLowerCase());
      if (t) { const m = cands.find(e => e.templateId === t.id); if (m) return m.id; }
    }
    return cands[0].id;
  };
  const resolveTarget = (t) => {
    if (!t) return null;
    if (t.kind === "conlang") return conlangByName[(t.name || "").trim().toLowerCase()] || null;
    if (t.kind === "gloss") return findGloss(t.arrayKey, t.lang, t.name);
    if (t.kind === "entry") return findEntry(t.name, t.template);
    return null;
  };
  const findNewRecord = (newRecId) => {
    if (newRecId === newLangId) return newConlang;
    for (const k of GLOSS_LANG_ARRAYS) { const m = newArrays[k].find(r => r.id === newRecId); if (m) return m; }
    return null;
  };

  let dropped = 0;
  (Array.isArray(payload.externalRefs) ? payload.externalRefs : []).forEach(er => {
    if (!er || !er.recordId || !er.fieldId) return;
    const newId = remap[er.recordId];
    if (!newId) return;
    const rec = findNewRecord(newId);
    if (!rec) return;
    const resolved = [];
    (Array.isArray(er.targets) ? er.targets : []).forEach(t => { const id = resolveTarget(t); if (id) resolved.push(id); else dropped++; });
    if (!resolved.length) return;
    if (er.multi) {
      const cur = Array.isArray(rec.fields[er.fieldId]) ? rec.fields[er.fieldId] : [];
      rec.fields[er.fieldId] = [...cur, ...resolved];
    } else {
      rec.fields[er.fieldId] = resolved[0];
    }
  });

  const notes = (payload.workspaceNotes && typeof payload.workspaceNotes === "object") ? payload.workspaceNotes : {};

  updateState(s => {
    const gg = s.glossopoeia || makeDefaultGlossopoeiaState();
    const next = { ...gg };
    next.conlangs = [...(Array.isArray(gg.conlangs) ? gg.conlangs : []), newConlang];
    GLOSS_LANG_ARRAYS.forEach(k => { next[k] = [...(Array.isArray(gg[k]) ? gg[k] : []), ...newArrays[k]]; });
    const wn = (gg.workspaceNotes && typeof gg.workspaceNotes === "object") ? gg.workspaceNotes : {};
    next.workspaceNotes = { ...wn, [newLangId]: notes };
    next.ui = { ...(gg.ui || {}), activeLangId: newLangId, workspace: "overview" };
    return { ...s, glossopoeia: next };
  });
  if (flash) {
    const total = GLOSS_LANG_ARRAYS.reduce((n, k) => n + newArrays[k].length, 0);
    flash(`Imported "${newConlang.name || "language"}" (${total} record${total === 1 ? "" : "s"}${dropped ? `, ${dropped} cross-language link${dropped === 1 ? "" : "s"} dropped` : ""}).`);
  }
}

// Forks a parent language into a descendant (the diachronics apex, clone half).
// Per the locked design it copies LEXICON + INVENTORY only: a new ConLang in the
// same world, with the parent's phonemes and lexemes copied at fresh ids, the
// child's Descended From pointing at the parent and each child word's Descended
// From pointing at its parent etymon. Grammar / syntax / orthography are left
// empty for the user to build. The child starts phonetically identical to the
// parent; the later run step rewrites the daughter pronunciations. Word-to-word
// links inside the lexicon (Derived From, Name Elements) remap to the child
// copies via glossDeepRemap; cross-language links to a third language (Cognates,
// Source Word) pass through unchanged because their ids aren't in the remap.
// Morphology annotations on copied words (Inflection Class, Features, Built By)
// are dropped, since the child has no morphology yet and they would otherwise
// dangle into the parent's toolbox and drive cross-language paradigm output.
function glossForkLanguage(state, updateState, parentLangId, childName, flash) {
  const g = state.glossopoeia || {};
  const parent = (Array.isArray(g.conlangs) ? g.conlangs : []).find(c => c && c.id === parentLangId);
  if (!parent) { if (flash) flash("Couldn't find the language to fork.", "error"); return; }
  const childLangId = `lang-${genId()}`;
  const parentPhonemes = (Array.isArray(g.phonemes) ? g.phonemes : []).filter(p => p && p.langId === parentLangId);
  const parentLexemes = (Array.isArray(g.lexemes) ? g.lexemes : []).filter(x => x && x.langId === parentLangId);

  const remap = {};
  remap[parentLangId] = childLangId;
  parentPhonemes.forEach(p => { if (p.id) remap[p.id] = `phon-${genId()}`; });
  parentLexemes.forEach(x => { if (x.id) remap[x.id] = `lex-${genId()}`; });

  // Child container: carry the parent's scalar facts as an editable starting
  // point, then clear the parent-specific fields and set the descent link.
  const childConlang = { ...parent, id: childLangId, name: childName, tags: Array.isArray(parent.tags) ? [...parent.tags] : [], fields: glossDeepRemap(parent.fields || {}, remap) };
  delete childConlang.langId;
  childConlang.fields = { ...childConlang.fields, varietyOf: "", spokenBy: [], region: [], overview: "", descendedFrom: parentLangId };

  const childPhonemes = parentPhonemes.filter(p => p.id).map(p => ({
    ...p, id: remap[p.id], langId: childLangId, fields: glossDeepRemap(p.fields || {}, remap),
  }));

  const childLexemes = parentLexemes.filter(x => x.id).map(x => {
    const f = glossDeepRemap(x.fields || {}, remap);
    f.inflectionClass = "";
    f.features = [];
    f.builtBy = "";
    f.descendedFrom = [x.id]; // the parent etymon; set after remap so it points at the parent word
    return { ...x, id: remap[x.id], langId: childLangId, fields: f };
  });

  updateState(s => {
    const gg = s.glossopoeia || makeDefaultGlossopoeiaState();
    const next = { ...gg };
    next.conlangs = [...(Array.isArray(gg.conlangs) ? gg.conlangs : []), childConlang];
    next.phonemes = [...(Array.isArray(gg.phonemes) ? gg.phonemes : []), ...childPhonemes];
    next.lexemes = [...(Array.isArray(gg.lexemes) ? gg.lexemes : []), ...childLexemes];
    next.ui = { ...(gg.ui || {}), activeLangId: childLangId, workspace: "overview" };
    return { ...s, glossopoeia: next };
  });
  if (flash) flash(`Forked "${parent.name || "language"}" into "${childName}": ${childLexemes.length} word${childLexemes.length === 1 ? "" : "s"} and ${childPhonemes.length} sound${childPhonemes.length === 1 ? "" : "s"} copied. It's identical to the parent until you add Diachronic sound rules and run them.`);
}

// Drops a set of phoneme ids out of every record that points at them by id:
// a Phonotactic Constraint's Phonemes link and a Phonological Rule's Affected
// Phonemes. Removes only the dead pointer, never the constraint or rule itself.
// Shared by manual phoneme delete and the unused-sound prune so neither leaves
// a reference hanging at an id that no longer exists.
function glossScrubPhonemeRefs(gg, idSet) {
  const scrubField = (arr, fieldId) => (Array.isArray(arr) ? arr : []).map(rec => {
    const cur = rec && rec.fields && rec.fields[fieldId];
    if (!Array.isArray(cur)) return rec;
    const next = cur.filter(v => !idSet.has(typeof v === "string" ? v : (v && v.id)));
    return next.length === cur.length ? rec : { ...rec, fields: { ...rec.fields, [fieldId]: next } };
  });
  return {
    phonotacticConstraints: scrubField(gg.phonotacticConstraints, "phonemes"),
    phonologicalRules: scrubField(gg.phonologicalRules, "affectedPhonemes"),
  };
}

// Finds phonemes in a language that nothing uses, so a fork's leftover sounds
// (θ after θ→t, say) can be cleared. "Used" = the symbol shows up in any word's
// Pronunciation or Word Pieces. "Needed" = named by a Phonotactic Constraint or
// a non-Diachronic rule. A sound named only by the Diachronic rule that
// eliminated it counts as prunable (that ref gets scrubbed on removal).
// pronOverride lets the caller test a not-yet-saved state: { [lexId]: pron }.
function glossUnusedPhonemes(state, langId, pronOverride) {
  const g = state.glossopoeia || {};
  const selOnly = (v) => (v && typeof v === "object") ? (v.value || "") : (v || "");
  const phonemes = (g.phonemes || []).filter(p => p && p.langId === langId && p.name);
  if (!phonemes.length) return [];
  const inv = phonemes.map(p => p.name).sort((a, b) => b.length - a.length);
  const used = new Set();
  const eat = (str) => {
    const s = (str || "").trim();
    let i = 0;
    while (i < s.length) {
      let m = null;
      for (const sym of inv) { if (sym && s.startsWith(sym, i)) { m = sym; break; } }
      if (m) { used.add(m); i += m.length; } else { i++; }
    }
  };
  (g.lexemes || []).filter(x => x && x.langId === langId).forEach(x => {
    const pron = (pronOverride && pronOverride[x.id] != null) ? pronOverride[x.id] : ((x.fields && x.fields.pronunciation) || "");
    eat(pron);
  });
  const needed = new Set();
  const refIds = (v) => Array.isArray(v) ? v.map(it => (typeof it === "string" ? it : (it && it.id))).filter(Boolean) : [];
  (g.phonotacticConstraints || []).filter(c => c && c.langId === langId).forEach(c => refIds(c.fields && c.fields.phonemes).forEach(id => needed.add(id)));
  (g.phonologicalRules || []).filter(r => r && r.langId === langId && selOnly(r.fields && r.fields.diachronic) !== "Diachronic").forEach(r => refIds(r.fields && r.fields.affectedPhonemes).forEach(id => needed.add(id)));
  return phonemes.filter(p => !used.has(p.name) && !needed.has(p.id));
}

// Deletes phonemes by id and scrubs their now-dead references in one pass.
function glossRemovePhonemes(updateState, ids, flash) {
  const idSet = new Set(ids);
  if (idSet.size === 0) return;
  let n = 0;
  updateState(s => {
    const gg = s.glossopoeia || makeDefaultGlossopoeiaState();
    const phonemes = (Array.isArray(gg.phonemes) ? gg.phonemes : []).filter(p => { const drop = p && idSet.has(p.id); if (drop) n++; return !drop; });
    return { ...s, glossopoeia: { ...gg, phonemes, ...glossScrubPhonemeRefs(gg, idSet) } };
  });
  if (flash) flash(`Removed ${n} unused sound${n === 1 ? "" : "s"}.`);
}

// Romanizes an IPA string by mapping each phoneme to its Romanization field,
// tokenizing longest-first against the inventory (same trick the word generator
// uses for candidate names). A phoneme with no romanization set falls back to
// its own symbol. A sound that isn't a defined phoneme at all (e.g. a chain
// shift produced something the inventory never had) passes through as raw IPA
// and sets `missing`, so the caller can flag the headword for a manual look.
function glossRomanize(ipaStr, phonemes) {
  const phs = (Array.isArray(phonemes) ? phonemes : []).filter(p => p && p.name);
  const inv = phs.map(p => p.name).sort((a, b) => b.length - a.length);
  const romOf = {};
  phs.forEach(p => { const r = p.fields && p.fields.romanization; romOf[p.name] = (((r && typeof r === "object") ? (r.value || "") : (r || "")) || "").trim(); });
  const s = (ipaStr || "").trim();
  let out = "", i = 0, missing = false;
  while (i < s.length) {
    let m = null;
    for (const sym of inv) { if (sym && s.startsWith(sym, i)) { m = sym; break; } }
    if (m) { out += (romOf[m] || m); i += m.length; }
    else { out += s[i]; missing = true; i += 1; }
  }
  return { roman: out, missing };
}

// Derives the daughter forms for a forked language (the diachronics apex, run
// half). For each word in the child it finds the parent word it descended from,
// runs the child's Diachronic sound rules over the PARENT's pronunciation via
// glossRunRules (parent inventory as the input phonology), and romanizes the
// result into a daughter headword. Always derives from the stored parent form,
// so it's re-runnable: a fixed rule set re-run gives a clean result, never
// compounding. Pure; returns a diff descriptor for the review modal:
//   { error, parentName, childName, ruleCount, skipped[], noEtymon[], rows[], changedCount }
// Rules that can't run automatically (blank Input — insertion, or a change
// authored as a prose note) are listed in `skipped` and left out of the run.
// Words with zero or multiple parent words (a hand-set merger) are listed in
// `noEtymon` and not derived.
function glossDeriveDaughters(state, childLangId) {
  const g = state.glossopoeia || {};
  const child = (Array.isArray(g.conlangs) ? g.conlangs : []).find(c => c && c.id === childLangId);
  if (!child) return { error: "no-child" };
  const dfRaw = child.fields && child.fields.descendedFrom;
  const parentLangId = (typeof dfRaw === "string") ? dfRaw : (dfRaw && dfRaw.id ? dfRaw.id : null);
  if (!parentLangId) return { error: "no-parent-link" };
  const parent = (g.conlangs || []).find(c => c && c.id === parentLangId);
  if (!parent) return { error: "parent-missing" };
  const selOnly = (v) => (v && typeof v === "object") ? (v.value || "") : (v || "");
  const parentPhonemes = (g.phonemes || []).filter(p => p && p.langId === parentLangId);
  const childPhonemes = (g.phonemes || []).filter(p => p && p.langId === childLangId);
  const romPhonemes = childPhonemes.length ? childPhonemes : parentPhonemes;
  const diaRules = (g.phonologicalRules || []).filter(r => r && r.langId === childLangId && selOnly(r.fields && r.fields.diachronic) === "Diachronic");
  const isBlankInput = (r) => (selOnly(r.fields && r.fields.input) || "").trim() === "";
  const runnable = diaRules.filter(r => !isBlankInput(r));
  const skipped = diaRules.filter(isBlankInput).map(r => r.name || "(unnamed rule)");
  const lexById = {}; (g.lexemes || []).forEach(x => { if (x && x.id) lexById[x.id] = x; });
  const refIds = (v) => Array.isArray(v) ? v.map(it => (typeof it === "string" ? it : (it && it.id))).filter(Boolean) : (v ? [typeof v === "string" ? v : (v && v.id)].filter(Boolean) : []);

  const rows = []; const noEtymon = [];
  (g.lexemes || []).filter(x => x && x.langId === childLangId).forEach(x => {
    const df = refIds(x.fields && x.fields.descendedFrom);
    if (df.length !== 1) { noEtymon.push({ name: x.name || "(unnamed)", reason: df.length === 0 ? "no parent word" : ("merged from " + df.length) }); return; }
    const parentLex = lexById[df[0]];
    if (!parentLex || parentLex.langId !== parentLangId) { noEtymon.push({ name: x.name || "(unnamed)", reason: "parent word missing" }); return; }
    const parentPron = ((parentLex.fields && parentLex.fields.pronunciation) || "").trim();
    const run = glossRunRules(parentPron, runnable, parentPhonemes);
    const daughterPron = run ? run.surface : parentPron;
    const rom = glossRomanize(daughterPron, romPhonemes);
    rows.push({
      lexId: x.id,
      parentName: parentLex.name || "",
      parentPron,
      daughterPron,
      daughterRoman: rom.roman,
      missingRoman: rom.missing,
      changed: daughterPron !== parentPron,
    });
  });
  return { error: null, parentName: parent.name || "", childName: child.name || "", ruleCount: runnable.length, skipped, noEtymon, rows, changedCount: rows.filter(r => r.changed).length };
}

// Commits a derived diff: rewrites each derivable child word's pronunciation and
// headword to its daughter form. Re-running re-derives from the parent, so this
// overwrites prior derived forms (and any manual edits to them) by design — the
// workflow is to fix the RULES and re-run, not to hand-tune individual words.
function glossApplyDaughters(updateState, childLangId, rows, flash) {
  const byId = {}; (Array.isArray(rows) ? rows : []).forEach(r => { if (r && r.lexId) byId[r.lexId] = r; });
  let n = 0;
  updateState(s => {
    const gg = s.glossopoeia || makeDefaultGlossopoeiaState();
    const lexemes = (Array.isArray(gg.lexemes) ? gg.lexemes : []).map(x => {
      if (!x || x.langId !== childLangId) return x;
      const row = byId[x.id];
      if (!row) return x;
      n++;
      return { ...x, name: row.daughterRoman || x.name, fields: { ...(x.fields || {}), pronunciation: row.daughterPron } };
    });
    return { ...s, glossopoeia: { ...gg, lexemes } };
  });
  if (flash) flash(`Applied sound changes to ${n} word${n === 1 ? "" : "s"}.`);
}