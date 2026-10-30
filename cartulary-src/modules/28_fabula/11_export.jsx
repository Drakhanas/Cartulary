
// ─── Fabula: the export (v1.7 r023) ────────────────────────────────────────────
// The story bible (docs/fabula-spec.md, section 9, Drak's calls of
// 2026-10-27): a story, or a corpus with each of its stories in reading
// order, written as one HTML file or one Markdown file in the story page's
// order, the Story's own fields and its panels, then People, Plot, Outline
// with its beats, Meaning, and Notes, with the include-secrets choice the
// other exports offer. Every record renders through 08_export-layer's
// renderers with its kind's schema as its template. A reference to one of
// the world's entries is the entry's name, while the Plot Thread and Theme /
// Motif entries the story lists come with their fields, as Fabula's own; in
// HTML a reference to a record the file holds is a link to it. The timeline
// isn't exported. The export starts from the Export button on the story's
// page and on the corpus's, which opens FabulaExportModal.

// The Export button's hover on a story's page and a corpus's.
const FABULA_EXPORT_TITLE = "Download the story bible, as HTML or as Markdown";

// What a story's bible holds, section by section, each list in the order
// its tab shows it.
const fabulaBible = (state, story) => {
  const fab = state.fabula || {};
  const mine = (slice) => fabulaArr(fab, slice).filter(r => r && r.id && r.storyId === story.id);
  const byName = (a, b) => ((a && a.name) || "").localeCompare((b && b.name) || "", undefined, { sensitivity: "base" });
  const entryById = new Map((state.entries || []).filter(e => e && e.id).map(e => [e.id, e]));
  const rank = (c) => { const i = FABULA_IMPORTANCE.indexOf(formatSelectDisplay((c.fields || {}).importance)); return i === -1 ? FABULA_IMPORTANCE.length : i; };
  // People, as the tab lists them: the cast by Importance and then name,
  // arcs and relationships by name.
  const cast = mine("cast").slice().sort((a, b) => rank(a) - rank(b) || byName(a, b));
  const arcs = mine("arcs").slice().sort(byName);
  const relationships = mine("relationships").slice().sort(byName);
  // Plot: the Story's threads in its order, then the threads its records use
  // that it doesn't list, by name, marked as the Plot tab marks them; the
  // plot points under the Plot tab's headings; the promises in the outline's
  // order of their setup.
  const own = fabulaStoryThreads(story).filter(id => entryById.has(id));
  const ownSet = new Set(own);
  const used = [...fabulaThreadUse(state, story.id).keys()].filter(id => !ownSet.has(id) && entryById.has(id)).sort((a, b) => byName(entryById.get(a), entryById.get(b)));
  const threads = [...own.map(id => ({ entry: entryById.get(id), marked: false })), ...used.map(id => ({ entry: entryById.get(id), marked: true }))];
  const headings = fabulaPlotHeadings(state, story);
  const promises = fabulaPromisesInOrder(state, story).map(rec => ({ rec, unpaid: fabulaUnpaid(rec) }));
  // The outline: the tree, each node with its record and its position.
  const places = fabulaOutlinePlaces(state, story.id);
  const recById = new Map([...mine("parts"), ...mine("chapters"), ...mine("scenes")].map(r => [r.id, r]));
  const outline = (nodes) => nodes.map(n => ({ kind: n.kind, record: recById.get(n.id), path: (places.get(n.id) || {}).path || "", children: outline(n.children) })).filter(n => n.record);
  const tree = outline(fabulaOutlineTree(state, story));
  // Meaning: the themes by Type as the tab groups them, the Story's own
  // first in each group and the marked after, each with the scenes that
  // carry it in the outline's order.
  const carried = fabulaThemeScenes(state, story.id);
  const ownThemes = fabulaStoryThemes(story).filter(id => entryById.has(id));
  const ownThemeSet = new Set(ownThemes);
  const markedThemes = [...carried.keys()].filter(id => !ownThemeSet.has(id) && entryById.has(id));
  const groups = new Map();
  const place = (id, marked) => {
    const type = fabulaThemeType(state, entryById.get(id));
    const known = FABULA_THEME_TYPES.findIndex(([t]) => t.toLowerCase() === type.toLowerCase());
    const key = known >= 0 ? FABULA_THEME_TYPES[known][0] : type;
    if (!groups.has(key)) groups.set(key, { key, label: known >= 0 ? FABULA_THEME_TYPES[known][1] : (type || "No type"), rank: known >= 0 ? known : type ? 100 : 200, themes: [] });
    groups.get(key).themes.push({ entry: entryById.get(id), marked, scenes: (carried.get(id) || []).map(sid => recById.get(sid)).filter(Boolean) });
  };
  ownThemes.forEach(id => place(id, false));
  markedThemes.forEach(id => place(id, true));
  const themeGroups = [...groups.values()].sort((a, b) => (a.rank - b.rank) || a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  themeGroups.forEach(g => g.themes.sort((a, b) => (a.marked - b.marked) || byName(a.entry, b.entry)));
  // Notes, by topic.
  const notes = fabulaNotesOf(state, story.id, null).map(rec => ({ rec, open: fabulaNoteOpen(rec) }));
  return { story, places, cast, arcs, relationships, threads, headings, promises, tree, themeGroups, notes };
};

// The renderers' context for the bibles in one file: the world's entries,
// every registered record named as the stories' pages name it, the placed
// ones by their position (fabulaStoryNodes), and the ids of what the file
// holds, so a reference to one of them links in HTML and any other
// reference is a name. The calendar is set per record as it renders: a
// Fabula record's dates are in the primary, a thread's in the calendar its
// entry is bound to.
const fabulaBibleContext = (state, bibles, options) => {
  const entryById = Object.fromEntries((state.entries || []).filter(e => e && e.id).map(e => [e.id, e]));
  const nodeById = {};
  const articleIds = new Set();
  const walk = (nodes) => nodes.forEach(n => { articleIds.add(n.record.id); walk(n.children); });
  bibles.forEach(b => {
    fabulaStoryNodes(state, b.story.id).forEach(n => { nodeById[n.id] = n; });
    [...b.cast, ...b.arcs, ...b.relationships, ...b.promises.map(p => p.rec), ...b.notes.map(n => n.rec)].forEach(r => articleIds.add(r.id));
    b.headings.forEach(h => h.points.forEach(r => articleIds.add(r.id)));
    walk(b.tree);
    b.threads.forEach(t => articleIds.add(t.entry.id));
    b.themeGroups.forEach(g => g.themes.forEach(t => articleIds.add(t.entry.id)));
  });
  // v1.7 r043: [[links]] through the world's one resolver.
  return { entryById, nodeById, wiki: wikiResolverOf(state), calendar: getCalendar(state, null), options, imageManifest: null, articleIds };
};

// A record's title in the bible: its position and its name.
const fabulaBibleTitle = (path, name) => `${path ? path + " " : ""}${name || "(untitled)"}`;

// The bible's sections, with what each holds for the table of contents.
const fabulaBibleHeadings = (bible) => {
  const count = (nodes, kind) => nodes.reduce((n, x) => n + (x.kind === kind ? 1 : 0) + count(x.children, kind), 0);
  const points = bible.headings.reduce((n, h) => n + h.points.length, 0);
  const themes = bible.themeGroups.reduce((n, g) => n + g.themes.length, 0);
  return [
    { id: "story", title: "Story" },
    { id: "people", title: "People", note: `${fabulaCount("cast", bible.cast.length)}, ${fabulaCount("arc", bible.arcs.length)}, ${fabulaCount("relationship", bible.relationships.length)}` },
    { id: "plot", title: "Plot", note: `${bible.threads.length} ${bible.threads.length === 1 ? "thread" : "threads"}, ${fabulaCount("plotPoint", points)}, ${fabulaCount("promise", bible.promises.length)}` },
    { id: "outline", title: "Outline", note: `${fabulaCount("part", count(bible.tree, "part"))}, ${fabulaCount("chapter", count(bible.tree, "chapter"))}, ${fabulaCount("scene", count(bible.tree, "scene"))}` },
    { id: "meaning", title: "Meaning", note: `${themes} ${themes === 1 ? "theme or motif" : "themes and motifs"}` },
    { id: "notes", title: "Notes", note: fabulaCount("research", bible.notes.length) },
  ];
};

// A plot heading as the Plot tab labels it: its name, or No slot, and the
// tab's note on a turn of the writer's own, a slot not in this structure,
// or no slot set.
const fabulaBibleHeadingName = (h) => {
  const label = h.kind === "none" ? "No slot" : h.name;
  const note = h.kind === "turn" ? "your own turn" : h.kind === "other" ? "not part of this structure" : h.kind === "none" ? "no slot set" : null;
  return { label, note };
};

// A file's name: the record's slug, then .story or .corpus, then the format.
const fabulaBibleFileName = (rec, kind, format) => `${slugify(rec.name) || kind}.${kind}.${format === "html" ? "html" : "md"}`;

// The Markdown side. A story's bible, its headings depth levels down (0 for
// a file of its own, 1 inside a corpus's): the sections at ##, their groups
// at ###, their records at ####, and the outline's records nested by depth,
// each heading carrying the record's position, since a nested list can't
// hold a scene's block fields and its beats cleanly.
const fabulaBibleMarkdown = (state, bible, ctx, options, depth) => {
  const h = (n) => "#".repeat(Math.min(6, n + depth));
  const out = [];
  const push = (...lines) => out.push(...lines);
  const blank = () => { if (out[out.length - 1] !== "") push(""); };
  const body = (rec, template) => renderEntryBodyMarkdown(rec, template, { ...ctx, calendar: getCalendar(state, rec.calendarId) }, options);
  const record = (level, rec, template, title, note) => {
    push(`${h(level)} ${title}${note ? ` *(${note})*` : ""}`, "");
    push(...body(rec, template));
    blank();
  };
  const entryRecord = (level, entry, note) => {
    const t = (state.templates || []).find(x => x && x.id === entry.templateId);
    if (t) record(level, entry, t, entry.name || "(unnamed)", note);
  };
  const empty = (text) => push(`*${text}*`, "");
  const tplOf = (kind) => fabulaTemplate(state, kind);
  const sections = fabulaBibleHeadings(bible);
  const section = (id) => push(`${h(2)} ${sections.find(x => x.id === id).title}`, "");

  // Story: its own fields, then each panel under its heading.
  section("story");
  const storyTpl = tplOf("story");
  let any = false;
  fieldPanelSegments(storyTpl.fields, FABULA_STORY_PANELS).forEach(seg => {
    const lines = body(bible.story, { ...storyTpl, fields: seg.fields });
    if (!lines.length) return;
    any = true;
    if (seg.panel) push(`${h(3)} ${seg.panel.label}`, "");
    push(...lines);
    blank();
  });
  if (!any) empty("Nothing filled in yet.");

  // People.
  section("people");
  const group = (title, kind, list, nothing) => {
    push(`${h(3)} ${title} (${list.length})`, "");
    if (!list.length) { empty(nothing); return; }
    list.forEach(rec => record(4, rec, tplOf(kind), rec.name || "(untitled)", kind === "cast" && rec.characterDeleted ? "character deleted" : null));
  };
  group("Cast", "cast", bible.cast, "No cast yet.");
  group("Arcs", "arc", bible.arcs, "No arcs yet.");
  group("Relationships", "relationship", bible.relationships, "No relationships yet.");

  // Plot.
  section("plot");
  push(`${h(3)} Threads (${bible.threads.length})`, "");
  if (!bible.threads.length) empty("No threads yet.");
  bible.threads.forEach(t => entryRecord(4, t.entry, t.marked ? "not in the Story's Threads" : null));
  const points = bible.headings.reduce((n, x) => n + x.points.length, 0);
  push(`${h(3)} Plot Points (${points})`, "");
  if (!bible.headings.length) empty("No plot points yet.");
  bible.headings.forEach(hd => {
    const { label, note } = fabulaBibleHeadingName(hd);
    push(`${h(4)} ${label}${note ? ` *(${note})*` : ""}`, "");
    if (!hd.points.length) empty("empty");
    hd.points.forEach(rec => record(5, rec, tplOf("plotPoint"), rec.name || "(untitled)", null));
  });
  const unpaid = bible.promises.filter(p => p.unpaid).length;
  push(`${h(3)} Promises & Payoffs (${bible.promises.length}${unpaid ? `, ${unpaid} unpaid` : ""})`, "");
  if (!bible.promises.length) empty("No promises yet.");
  bible.promises.forEach(p => record(4, p.rec, tplOf("promise"), p.rec.name || "(untitled)", p.unpaid ? "unpaid" : null));

  // Outline: acts, chapters, and scenes as nested headings, each with its
  // fields, a scene's beats after its fields, each beat's line with its
  // What Happens under it.
  section("outline");
  if (!bible.tree.length) empty("No acts, chapters, or scenes yet.");
  const sceneTpl = tplOf("scene");
  const beatsField = (sceneTpl.fields || []).find(f => f && f.id === "beats");
  const sceneFields = { ...sceneTpl, fields: (sceneTpl.fields || []).filter(f => !(f && f.id === "beats")) };
  const beatsOf = (scene) => (beatsField && !(beatsField.secret && !options.includeSecrets)
    ? fabulaBeats(scene).filter(b => b && ((typeof b.beat === "string" && b.beat.trim()) || (typeof b.whatHappens === "string" && b.whatHappens.trim())))
    : []);
  const node = (n, level) => {
    const kindLabel = n.kind === "part" ? "Part / Act" : n.kind === "chapter" ? "Chapter" : "Scene";
    record(level, n.record, n.kind === "scene" ? sceneFields : tplOf(n.kind), fabulaBibleTitle(n.path, n.record.name), kindLabel);
    if (n.kind !== "scene") { n.children.forEach(c => node(c, level + 1)); return; }
    const beats = beatsOf(n.record);
    if (!beats.length) return;
    push(`**${beatsField.label || "Beats"}${beatsField.secret ? " [SECRET]" : ""}:**`, "");
    beats.forEach((b, i) => {
      push(`${i + 1}. ${(typeof b.beat === "string" && b.beat.trim()) || "(no line)"}`);
      if (typeof b.whatHappens === "string" && b.whatHappens.trim()) push(`   ${resolveWikiLinksForMd(b.whatHappens.trim(), ctx.wiki).replace(/\n+/g, "\n   ")}`);
    });
    push("");
  };
  bible.tree.forEach(n => node(n, 3));

  // Meaning: the themes by type, each with the scenes that carry it.
  section("meaning");
  if (!bible.themeGroups.length) empty("No themes yet.");
  bible.themeGroups.forEach(g => {
    push(`${h(3)} ${g.label} (${g.themes.length})`, "");
    g.themes.forEach(t => {
      entryRecord(4, t.entry, t.marked ? "not in the Story's Themes" : null);
      push(`**Carried by:** ${t.scenes.length ? t.scenes.map(s => fabulaBibleTitle((bible.places.get(s.id) || {}).path, s.name)).join("; ") : "no scenes yet"}`, "");
    });
  });

  // Notes.
  section("notes");
  const open = bible.notes.filter(n => n.open).length;
  push(`${h(3)} Research Notes (${bible.notes.length}${open ? `, ${open} open` : ""})`, "");
  if (!bible.notes.length) empty("No research notes yet.");
  bible.notes.forEach(n => record(4, n.rec, tplOf("research"), n.rec.name || "(untitled)", n.open ? "open questions" : null));
  return out;
};

// The Markdown file for a story, or for a corpus with its stories in reading
// order after its own fields.
const buildFabulaMarkdownExport = (state, target, options) => {
  const fab = state.fabula || {};
  const date = new Date().toISOString().slice(0, 10);
  const world = state.world.name || "Untitled World";
  const secretsLine = options.includeSecrets ? "*Secret-marked fields included.*" : "*Secret-marked fields excluded from this export.*";
  const out = [];
  if (target.kind === "corpus") {
    const corpus = fabulaArr(fab, "corpora").find(c => c && c.id === target.id);
    if (!corpus) return null;
    const stories = (Array.isArray(corpus.storyIds) ? corpus.storyIds : []).map(id => fabulaStoryOf(fab, id)).filter(Boolean);
    const bibles = stories.map(st => fabulaBible(state, st));
    const ctx = fabulaBibleContext(state, bibles, options);
    out.push(`# ${corpus.name || "(untitled)"}`, "", `*Corpus bible from ${world}, exported ${date} as Markdown.*  `, `*${stories.length} ${stories.length === 1 ? "story" : "stories"} in reading order.*  `, secretsLine, "");
    const corpusLines = renderEntryBodyMarkdown(corpus, fabulaTemplate(state, "corpus"), ctx, options);
    out.push("## Corpus", "", ...(corpusLines.length ? corpusLines : ["*Nothing filled in yet.*", ""]));
    if (out[out.length - 1] !== "") out.push("");
    out.push("## Stories", "");
    if (!stories.length) out.push("*No stories in this corpus yet.*");
    stories.forEach((st, i) => out.push(`${i + 1}. ${st.name || "(untitled)"}`));
    out.push("");
    bibles.forEach(b => { out.push(`## ${b.story.name || "(untitled)"}`, ""); out.push(...fabulaBibleMarkdown(state, b, ctx, options, 1)); });
    return { text: out.join("\n"), name: fabulaBibleFileName(corpus, "corpus", "md") };
  }
  const story = fabulaStoryOf(fab, target.id);
  if (!story) return null;
  const bible = fabulaBible(state, story);
  const ctx = fabulaBibleContext(state, [bible], options);
  out.push(`# ${story.name || "(untitled)"}`, "", `*Story bible from ${world}, exported ${date} as Markdown.*  `, secretsLine, "");
  out.push(...fabulaBibleMarkdown(state, bible, ctx, options, 0));
  return { text: out.join("\n"), name: fabulaBibleFileName(story, "story", "md") };
};

// The HTML side. The rules the bible adds to the world export's stylesheet:
// the sections and their groups, the records' titles by depth, the notes
// beside a title, the nested outline, the beats, and a reference that
// isn't a link.
const FABULA_BIBLE_CSS = `
body.bible .entry-ref-record { border-bottom: 1px dotted var(--border2); }
.bible-section { margin: 0 0 56px; }
.bible-story { margin: 0 0 72px; }
.bible-story > h2.bible-heading { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 40px; font-weight: 400; color: var(--text-bright); margin: 0 0 28px; padding-bottom: 10px; border-bottom: 1px solid var(--border2); }
.bible-section > .bible-heading { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 34px; font-weight: 400; color: var(--text-bright); margin: 0 0 18px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
.bible-story .bible-section > .bible-heading { font-size: 30px; }
.bible-group > .bible-heading { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 24px; font-weight: 500; color: var(--text-bright); margin: 28px 0 12px; }
.bible-slot > .bible-heading { font-family: Georgia, serif; font-size: 13px; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: var(--text); margin: 22px 0 10px; }
.bible-slot[data-kind="other"] > .bible-heading, .bible-slot[data-kind="none"] > .bible-heading { color: var(--text-dim); }
.bible-note { font-family: Georgia, serif; font-size: 13px; font-weight: 400; letter-spacing: 0; text-transform: none; color: var(--text-dim); font-style: italic; margin-left: 10px; }
.bible-slot[data-kind="other"] > .bible-heading .bible-note, .bible-slot[data-kind="none"] > .bible-heading .bible-note { color: var(--warn); }
article.entry.bible-record { margin: 0 0 26px; padding: 0 0 0 16px; border-left: 2px solid var(--border); }
article.entry.bible-record[data-marked] { border-left: 2px dashed var(--warn); }
.bible-note.bible-marked, .bible-note.bible-flag { color: var(--warn); }
article.entry.bible-record > .entry-title { font-size: 25px; }
.bible-children { margin: 10px 0 0 6px; }
.bible-children article.entry.bible-record > .entry-title { font-size: 22px; }
.bible-children .bible-children article.entry.bible-record > .entry-title { font-size: 20px; }
article.entry.bible-record .entry-badge { margin-bottom: 10px; }
article.entry.bible-record:target > .entry-title { color: var(--accent); }
ol.beat-list { margin: 6px 0 0; padding-left: 24px; }
ol.beat-list li { margin: 0 0 8px; }
ol.beat-list .beat-what { color: var(--text-dim); font-size: 15px; margin-top: 2px; white-space: pre-wrap; }
.bible-carried { font-size: 15px; color: var(--text-dim); margin: 4px 0 0; }
.bible-empty { color: var(--text-dim); font-style: italic; margin: 0 0 20px; }
ol.bible-stories { padding-left: 24px; }
nav.toc .bible-toc-note { color: var(--text-dim); font-size: 13px; margin-left: 8px; }
@media (max-width: 600px) {
  .bible-story > h2.bible-heading { font-size: 30px; }
  .bible-section > .bible-heading { font-size: 26px; }
  article.entry.bible-record > .entry-title { font-size: 22px; }
}
`;

// A story's bible in HTML, its headings depth levels down, the way the
// Markdown has them: the sections, their groups, and their records as
// articles, an act's and a chapter's children nested inside their article.
const fabulaBibleHtml = (state, bible, ctx, options, depth) => {
  const esc = htmlEscape;
  const H = (n) => `h${Math.min(6, n + depth)}`;
  const parts = [];
  const push = (s) => parts.push(s);
  const tplOf = (kind) => fabulaTemplate(state, kind);
  const fields = (rec, template) => renderEntryFieldsHtml(rec, template, state, { ...ctx, displayCalendar: getCalendar(state, rec.calendarId) }, options);
  // A title's note: the tab's mark on a record not in the Story's lists
  // (marked, with the dashed rule), or a flag such as unpaid or open
  // questions (flag), or a plain note.
  const note = (text, cls) => (text ? ` <span class="bible-note${cls ? " " + cls : ""}">${esc(text)}</span>` : "");
  const article = (level, rec, template, title, noteText, mark, extra, children) =>
    `<article id="entry-${esc(rec.id)}" class="entry bible-record" data-kind="${esc(template.kind || "")}"${mark === "marked" ? ' data-marked="true"' : ""}${mark === "flag" ? ' data-flag="true"' : ""}>` +
    `<${H(level)} class="entry-title">${esc(title)}${note(noteText, mark === "marked" ? "bible-marked" : mark === "flag" ? "bible-flag" : "")}</${H(level)}>` +
    `<div class="entry-badge"><span class="entry-badge-icon" style="color:${esc(template.color || "")}">${esc(template.icon || "")}</span> ${esc(template.name)}</div>` +
    `${fields(rec, template)}${extra || ""}${children ? `<div class="bible-children">${children}</div>` : ""}</article>`;
  const entryArticle = (level, entry, noteText, mark, extra) => {
    const t = (state.templates || []).find(x => x && x.id === entry.templateId);
    return t ? article(level, entry, { ...t, kind: "entry" }, entry.name || "(unnamed)", noteText, mark, extra) : "";
  };
  const empty = (text) => `<div class="bible-empty">${esc(text)}</div>`;
  const sections = fabulaBibleHeadings(bible);
  const open = (id) => push(`<section class="bible-section" id="bible-${esc(bible.story.id)}-${id}" data-section="${id}"><${H(2)} class="bible-heading">${esc(sections.find(x => x.id === id).title)}</${H(2)}>`);
  const close = () => push(`</section>`);
  const heading = (level, title, noteText) => `<${H(level)} class="bible-heading">${esc(title)}${note(noteText)}</${H(level)}>`;

  // Story.
  open("story");
  const storyTpl = tplOf("story");
  let any = false;
  fieldPanelSegments(storyTpl.fields, FABULA_STORY_PANELS).forEach(seg => {
    const html = fields(bible.story, { ...storyTpl, fields: seg.fields });
    if (!html.trim()) return;
    any = true;
    push(`<div class="bible-group" data-panel="${seg.panel ? esc(seg.panel.id) : ""}">${seg.panel ? heading(3, seg.panel.label) : ""}${html}</div>`);
  });
  if (!any) push(empty("Nothing filled in yet."));
  close();

  // People.
  open("people");
  const group = (title, kind, list, nothing) => {
    push(`<div class="bible-group" data-group="${esc(kind)}">${heading(3, `${title} (${list.length})`)}`);
    if (!list.length) push(empty(nothing));
    list.forEach(rec => push(article(4, rec, tplOf(kind), rec.name || "(untitled)", kind === "cast" && rec.characterDeleted ? "character deleted" : null)));
    push(`</div>`);
  };
  group("Cast", "cast", bible.cast, "No cast yet.");
  group("Arcs", "arc", bible.arcs, "No arcs yet.");
  group("Relationships", "relationship", bible.relationships, "No relationships yet.");
  close();

  // Plot.
  open("plot");
  push(`<div class="bible-group" data-group="thread">${heading(3, `Threads (${bible.threads.length})`)}`);
  if (!bible.threads.length) push(empty("No threads yet."));
  bible.threads.forEach(t => push(entryArticle(4, t.entry, t.marked ? "not in the Story's Threads" : null, t.marked ? "marked" : null)));
  push(`</div>`);
  const points = bible.headings.reduce((n, x) => n + x.points.length, 0);
  push(`<div class="bible-group" data-group="plotPoint">${heading(3, `Plot Points (${points})`)}`);
  if (!bible.headings.length) push(empty("No plot points yet."));
  bible.headings.forEach(hd => {
    const { label, note: noteText } = fabulaBibleHeadingName(hd);
    push(`<div class="bible-slot" data-slot="${esc(hd.name)}" data-kind="${hd.kind}">${heading(4, label, noteText)}`);
    if (!hd.points.length) push(empty("empty"));
    hd.points.forEach(rec => push(article(5, rec, tplOf("plotPoint"), rec.name || "(untitled)", null)));
    push(`</div>`);
  });
  push(`</div>`);
  const unpaid = bible.promises.filter(p => p.unpaid).length;
  push(`<div class="bible-group" data-group="promise">${heading(3, `Promises & Payoffs (${bible.promises.length})`, unpaid ? `${unpaid} unpaid` : null)}`);
  if (!bible.promises.length) push(empty("No promises yet."));
  bible.promises.forEach(p => push(article(4, p.rec, tplOf("promise"), p.rec.name || "(untitled)", p.unpaid ? "unpaid" : null, p.unpaid ? "flag" : null)));
  push(`</div>`);
  close();

  // Outline: acts, chapters, and scenes nested, each with its fields, a
  // scene's beats after them.
  open("outline");
  if (!bible.tree.length) push(empty("No acts, chapters, or scenes yet."));
  const sceneTpl = tplOf("scene");
  const beatsField = (sceneTpl.fields || []).find(f => f && f.id === "beats");
  const sceneFields = { ...sceneTpl, fields: (sceneTpl.fields || []).filter(f => !(f && f.id === "beats")) };
  const beatsHtml = (scene) => {
    if (!beatsField || (beatsField.secret && !options.includeSecrets)) return "";
    const beats = fabulaBeats(scene).filter(b => b && ((typeof b.beat === "string" && b.beat.trim()) || (typeof b.whatHappens === "string" && b.whatHappens.trim())));
    if (!beats.length) return "";
    const items = beats.map(b => `<li><div class="beat-line">${esc((typeof b.beat === "string" && b.beat.trim()) || "(no line)")}</div>${typeof b.whatHappens === "string" && b.whatHappens.trim() ? `<div class="beat-what">${resolveWikiLinksForHtml(b.whatHappens.trim(), ctx.wiki, esc, ctx.articleIds)}</div>` : ""}</li>`).join("");
    return `<section class="entry-block beats"><h3>${esc(beatsField.label || "Beats")}${beatsField.secret ? ' <span class="secret-marker">[SECRET]</span>' : ""}</h3><ol class="beat-list">${items}</ol></section>`;
  };
  const node = (n, level) => {
    if (n.kind !== "scene") return article(level, n.record, tplOf(n.kind), fabulaBibleTitle(n.path, n.record.name), null, false, "", n.children.map(c => node(c, level + 1)).join(""));
    return article(level, n.record, sceneFields, fabulaBibleTitle(n.path, n.record.name), null, false, beatsHtml(n.record));
  };
  bible.tree.forEach(n => push(node(n, 3)));
  close();

  // Meaning.
  open("meaning");
  if (!bible.themeGroups.length) push(empty("No themes yet."));
  bible.themeGroups.forEach(g => {
    push(`<div class="bible-group" data-group="theme" data-type="${esc(g.key)}">${heading(3, `${g.label} (${g.themes.length})`)}`);
    g.themes.forEach(t => {
      const carried = `<div class="bible-carried"><strong>Carried by:</strong> ${t.scenes.length ? t.scenes.map(s => `<a class="entry-ref-link" href="#entry-${esc(s.id)}">${esc(fabulaBibleTitle((bible.places.get(s.id) || {}).path, s.name))}</a>`).join("; ") : "no scenes yet"}</div>`;
      push(entryArticle(4, t.entry, t.marked ? "not in the Story's Themes" : null, t.marked ? "marked" : null, carried));
    });
    push(`</div>`);
  });
  close();

  // Notes.
  open("notes");
  const open_ = bible.notes.filter(n => n.open).length;
  push(`<div class="bible-group" data-group="research">${heading(3, `Research Notes (${bible.notes.length})`, open_ ? `${open_} open` : null)}`);
  if (!bible.notes.length) push(empty("No research notes yet."));
  bible.notes.forEach(n => push(article(4, n.rec, tplOf("research"), n.rec.name || "(untitled)", n.open ? "open questions" : null, n.open ? "flag" : null)));
  push(`</div>`);
  close();
  return parts.join("\n");
};

// A bible's table of contents: its sections with what they hold, and its
// scenes by position.
const fabulaBibleTocHtml = (bible, depth) => {
  const esc = htmlEscape;
  const scenes = [];
  const walk = (nodes) => nodes.forEach(n => { if (n.kind === "scene") scenes.push(n); walk(n.children); });
  walk(bible.tree);
  const items = fabulaBibleHeadings(bible).map(s => `<li><a href="#bible-${esc(bible.story.id)}-${s.id}">${esc(s.title)}</a>${s.note ? `<span class="bible-toc-note">${esc(s.note)}</span>` : ""}</li>`).join("");
  const sceneItems = scenes.map(n => `<li><a href="#entry-${esc(n.record.id)}">${esc(fabulaBibleTitle(n.path, n.record.name))}</a></li>`).join("");
  return `<section class="toc-template-group bible-toc-sections">
      <h3>${depth ? `<a href="#bible-story-${esc(bible.story.id)}">${esc(bible.story.name || "(untitled)")}</a>` : "Sections"}</h3>
      <ul style="columns:1">${items}</ul>
    </section>${scenes.length ? `<section class="toc-template-group bible-toc-scenes">
      <h3>Scenes<span class="toc-template-count">${scenes.length}</span></h3>
      <ul>${sceneItems}</ul>
    </section>` : ""}`;
};

// The HTML file for a story, or for a corpus with its stories in reading
// order after its own fields: the world export's stylesheet and page, the
// bible's rules added.
const buildFabulaHtmlExport = (state, target, options) => {
  const esc = htmlEscape;
  const fab = state.fabula || {};
  const date = new Date().toISOString().slice(0, 10);
  const world = esc(state.world.name || "Untitled World");
  const secretsNote = options.includeSecrets ? "secrets included" : "secrets excluded";
  const css = buildHtmlExportStyles(extractThemeVars()) + FABULA_BIBLE_CSS;
  const top = `<div class="back-to-top"><a href="#top">&uarr; Back to top</a></div>`;
  let title, metaLine, tocHtml, mainHtml, name;
  if (target.kind === "corpus") {
    const corpus = fabulaArr(fab, "corpora").find(c => c && c.id === target.id);
    if (!corpus) return null;
    const stories = (Array.isArray(corpus.storyIds) ? corpus.storyIds : []).map(id => fabulaStoryOf(fab, id)).filter(Boolean);
    const bibles = stories.map(st => fabulaBible(state, st));
    const ctx = fabulaBibleContext(state, bibles, options);
    title = esc(corpus.name || "(untitled)");
    metaLine = `Corpus bible &middot; ${stories.length} ${stories.length === 1 ? "story" : "stories"} in reading order &middot; from ${world} &middot; exported ${date} &middot; ${secretsNote}`;
    const corpusTpl = fabulaTemplate(state, "corpus");
    const corpusFields = renderEntryFieldsHtml(corpus, corpusTpl, state, { ...ctx, displayCalendar: getCalendar(state, null) }, options);
    const storyLinks = stories.map(st => `<li><a href="#bible-story-${esc(st.id)}">${esc(st.name || "(untitled)")}</a></li>`).join("");
    tocHtml = `<nav class="toc" aria-label="Table of contents"><h2 id="toc">Contents</h2><section class="toc-template-group bible-toc-stories"><h3>Stories<span class="toc-template-count">${stories.length}</span></h3><ul style="columns:1">${storyLinks}</ul></section>${bibles.map(b => fabulaBibleTocHtml(b, 1)).join("")}</nav>`;
    mainHtml = `<main id="main">
<section class="bible-section bible-corpus" data-section="corpus"><h2 class="bible-heading">Corpus</h2><div class="entry-badge"><span class="entry-badge-icon" style="color:${esc(corpusTpl.color || "")}">${esc(corpusTpl.icon || "")}</span> ${esc(corpusTpl.name)}</div>${corpusFields.trim() ? corpusFields : `<div class="bible-empty">Nothing filled in yet.</div>`}</section>
<section class="bible-section bible-stories" data-section="stories"><h2 class="bible-heading">Stories</h2>${stories.length ? `<ol class="bible-stories">${storyLinks}</ol>` : `<div class="bible-empty">No stories in this corpus yet.</div>`}</section>
${bibles.map(b => `<section class="bible-story" id="bible-story-${esc(b.story.id)}" data-story="${esc(b.story.id)}"><h2 class="bible-heading">${esc(b.story.name || "(untitled)")}</h2>\n${fabulaBibleHtml(state, b, ctx, options, 1)}\n</section>`).join("\n")}
${top}
</main>`;
    name = fabulaBibleFileName(corpus, "corpus", "html");
  } else {
    const story = fabulaStoryOf(fab, target.id);
    if (!story) return null;
    const bible = fabulaBible(state, story);
    const ctx = fabulaBibleContext(state, [bible], options);
    title = esc(story.name || "(untitled)");
    metaLine = `Story bible &middot; from ${world} &middot; exported ${date} &middot; ${secretsNote}`;
    tocHtml = `<nav class="toc" aria-label="Table of contents"><h2 id="toc">Contents</h2>${fabulaBibleTocHtml(bible, 0)}</nav>`;
    mainHtml = `<main id="main" data-story="${esc(story.id)}">\n${fabulaBibleHtml(state, bible, ctx, options, 0)}\n${top}\n</main>`;
    name = fabulaBibleFileName(story, "story", "html");
  }
  const text = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="generator" content="Cartulary v1.7">
<title>${title}</title>
<style>${css}</style>
</head>
<body id="top" class="bible">
<a class="skip-to-content" href="#main">Skip to content</a>
<header class="world-hdr">
<h1>${title}</h1>
<div class="export-meta">${metaLine}</div>
</header>
${tocHtml}
${mainHtml}
<footer class="export-footer">
Generated by Cartulary v1.7 &middot; <a href="https://drakhanas.itch.io/cartulary">drakhanas.itch.io/cartulary</a>
</footer>
</body>
</html>`;
  return { text, name };
};

// The download, through a blob as the other exports go; the file's name
// back, or null when the record is gone.
const fabulaExportDownload = (state, target, options) => {
  const built = options.format === "html" ? buildFabulaHtmlExport(state, target, options) : buildFabulaMarkdownExport(state, target, options);
  if (!built) return null;
  const blob = new Blob([built.text], { type: options.format === "html" ? "text/html;charset=utf-8" : "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = built.name;
  a.click();
  URL.revokeObjectURL(url);
  return built.name;
};

// The modal the Export button opens on a story's page or a corpus's: the
// format, HTML or Markdown, and the include-secrets choice.
function FabulaExportModal({ state, target, onCancel, onConfirm }) {
  const [format, setFormat] = useState("html");
  const [includeSecrets, setIncludeSecrets] = useState(false);
  const fab = state.fabula || {};
  const corpus = target.kind === "corpus";
  const rec = corpus ? fabulaArr(fab, "corpora").find(c => c && c.id === target.id) : fabulaStoryOf(fab, target.id);
  const name = rec ? (rec.name || "(untitled)") : (corpus ? "the corpus" : "the story");
  const count = corpus && rec && Array.isArray(rec.storyIds) ? rec.storyIds.length : 0;
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal fabula-export-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">Export {corpus ? "corpus" : "story"}</div>
        <div className="modal-body">
          <div style={{ marginBottom: 16, color: "var(--text-dim)", fontSize: "calc(13px * var(--font-scale))" }}>
            {corpus
              ? `One file for ${name}: its own fields, then ${count === 1 ? "its story" : `each of its ${count} stories`} in reading order, each with its Story fields and panels, People, Plot, Outline with its beats, Meaning, and Notes.`
              : `One file for ${name}: its Story fields and panels, then People, Plot, Outline with its beats, Meaning, and Notes, in the page's order.`}
            {" "}References to the world's entries are written as names; the story's threads and themes come with their fields. The timeline isn't exported.
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", marginBottom: 6, color: "var(--text-dim)", fontSize: "calc(13px * var(--font-scale))" }}>Format</label>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className={`btn btn-small ${format === "html" ? "btn-accent" : "btn-ghost"} fabula-export-format`} data-format="html" aria-pressed={format === "html"} title="One self-contained HTML file, styled as the world's HTML export is" onClick={() => setFormat("html")}>HTML</button>
              <button type="button" className={`btn btn-small ${format === "md" ? "btn-accent" : "btn-ghost"} fabula-export-format`} data-format="md" aria-pressed={format === "md"} title="One Markdown file, the story bible as text" onClick={() => setFormat("md")}>Markdown</button>
            </div>
          </div>
          <div style={{ marginBottom: 6 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" className="fabula-export-secrets" checked={includeSecrets} onChange={e => setIncludeSecrets(e.target.checked)} />
              Include secret-marked fields
            </label>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-accent fabula-export-go" onClick={() => onConfirm({ format, includeSecrets })}>Export</button>
        </div>
      </div>
    </div>
  );
}