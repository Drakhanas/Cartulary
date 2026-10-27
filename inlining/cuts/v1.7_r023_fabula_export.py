"""v1.7 r023: Fabula's export, in HTML and in Markdown.

Drak's three calls at r023's plan (2026-10-27), recorded in
docs/fabula-spec.md section 9 before this cut (a8e0ddc): two cuts, then the
site, so r023 is the export alone; the bible reads in the story page's
order and takes everything the tabs show, the Story's fields and its
panels, People, Plot, Outline with its beats, Meaning, and Notes; and
references to the world's entries become names, while the Plot Thread and
Theme / Motif entries the story lists come with their fields, as Fabula's
own. Claude's defaults for the rest are in the same section.

- 28_fabula, a section of its own after the timeline: a story's bible, the
  lists each tab shows in the tab's order (fabulaBible); the renderers'
  context with every registered record named as the story's pages name it,
  the entries, and the ids of what the file holds (fabulaBibleContext); the
  Markdown file, the story's or the corpus's with its stories in reading
  order (fabulaBibleMarkdown, buildFabulaMarkdownExport); the HTML file on
  the world export's stylesheet and page, the bible's rules added, with a
  table of contents of the sections and the scenes (fabulaBibleHtml,
  fabulaBibleTocHtml, buildFabulaHtmlExport); the download; and the modal
  the Export button opens, with the format and the include-secrets choice
  (FabulaExportModal). The story page takes onExport and hands it to its
  EntryView as the Export button's action on every tab.
- 08_export-layer: the article renderer's field listing becomes
  renderEntryFieldsHtml, which the article renderer calls, so a bible's
  record renders its fields inside an article of its own; the world's HTML
  export comes out byte for byte as before. refLinkHtml and the textarea's
  wiki links take a context's articleIds: a reference to something the file
  holds links to it, and any other reference is its name.
- 07_temporal: resolveWikiLinksForHtml takes articleIds, under the same
  rule; without it, nothing changes.
- 13_form-engine-display: EntryView's Export button takes exportTitle for
  its hover, since the bible's export offers both formats in its modal.
- 12_trunk: the fabulaExport state ({ kind, id }), the story page's and the
  corpus page's Export buttons, and the modal beside HtmlExportModal, whose
  Export builds the file, downloads it, and flashes.

Declared scope: 28_fabula, 08_export-layer, 07_temporal,
13_form-engine-display, 12_trunk. Declarations added, sixteen:
FABULA_EXPORT_TITLE, fabulaBible, fabulaBibleContext, fabulaBibleTitle,
fabulaBibleHeadings, fabulaBibleHeadingName, fabulaBibleFileName,
fabulaBibleMarkdown, buildFabulaMarkdownExport, FABULA_BIBLE_CSS,
fabulaBibleHtml, fabulaBibleTocHtml, buildFabulaHtmlExport,
fabulaExportDownload, FabulaExportModal, and renderEntryFieldsHtml. One
header, 28_fabula's export section.

String-anchored edits; every anchor must occur exactly once. The export
section is appended to 28_fabula, which ends without a newline and still
does. Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r023_fabula_export.py
"""
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())
MOD = ROOT / "cartulary-src" / "modules"
FAB = MOD / "28_fabula.jsx"
EXPORT = MOD / "08_export-layer.jsx"
TEMPORAL = MOD / "07_temporal.jsx"
DISPLAY = MOD / "13_form-engine-display.jsx"
TRUNK = MOD / "12_trunk.jsx"


def edit(path, pairs):
    text = path.read_text(encoding="utf-8")
    for old, new in pairs:
        n = text.count(old)
        assert n == 1, f"{path.name}: {n} occurrences of {old[:80]!r}"
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")


# ─── 28_fabula: the story page's Export button ─────────────────────────────────

PAGE_OLD = "function FabulaStoryPage({ state, story, draft, onDraftChange, tab, onSelectTab, onOpenRecord, onNewRecord, isLocked, folds, onToggleFold, outlineFolds, onToggleOutlineFold, onUpdateFabula, onCreateThread, onCreateTheme, onRestoreTemplate, showSecrets, allTags, dirHandle, flash, onOpenEntry, onSelectTag, onUpdateViewPrefs, timelinePrefs, onSetTimelinePrefs, onOpenRecordIn }) {\n  const template = fabulaTemplate(state, \"story\");\n"
PAGE_NEW = "function FabulaStoryPage({ state, story, draft, onDraftChange, tab, onSelectTab, onOpenRecord, onNewRecord, isLocked, folds, onToggleFold, outlineFolds, onToggleOutlineFold, onUpdateFabula, onCreateThread, onCreateTheme, onRestoreTemplate, showSecrets, allTags, dirHandle, flash, onOpenEntry, onSelectTag, onUpdateViewPrefs, timelinePrefs, onSetTimelinePrefs, onOpenRecordIn, onExport }) {\n  const template = fabulaTemplate(state, \"story\");\n  // v1.7 r023: the Export button on every tab opens the story's export, the\n  // bible in HTML or Markdown (FabulaExportModal).\n  const exportProps = onExport ? { onExportEntry: () => onExport(), exportTitle: FABULA_EXPORT_TITLE } : {};\n"

TAB_VIEW_OLD = "      onUpdateViewPrefs={onUpdateViewPrefs}\n      canvasSlot={<>{tabs}{content}</>}\n    />\n  );\n"
TAB_VIEW_NEW = "      onUpdateViewPrefs={onUpdateViewPrefs}\n      canvasSlot={<>{tabs}{content}</>}\n      {...exportProps}\n    />\n  );\n"

STORY_VIEW_OLD = "      registeredNodes={fabulaStoryNodes(state, story.id)}\n      canvasSlot={tabs}\n      {...panelProps}\n    />\n  );\n}\n"
STORY_VIEW_NEW = "      registeredNodes={fabulaStoryNodes(state, story.id)}\n      canvasSlot={tabs}\n      {...panelProps}\n      {...exportProps}\n    />\n  );\n}\n"

# ─── 28_fabula: the export section, appended ───────────────────────────────────

SECTION = r'''

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
  const entryByLowerName = {};
  (state.entries || []).forEach(e => { if (e && e.name) entryByLowerName[e.name.trim().toLowerCase()] = e; });
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
  return { entryById, nodeById, entryByLowerName, calendar: getCalendar(state, null), options, imageManifest: null, articleIds };
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
      if (typeof b.whatHappens === "string" && b.whatHappens.trim()) push(`   ${resolveWikiLinksForMd(b.whatHappens.trim(), ctx.entryByLowerName).replace(/\n+/g, "\n   ")}`);
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
    const items = beats.map(b => `<li><div class="beat-line">${esc((typeof b.beat === "string" && b.beat.trim()) || "(no line)")}</div>${typeof b.whatHappens === "string" && b.whatHappens.trim() ? `<div class="beat-what">${resolveWikiLinksForHtml(b.whatHappens.trim(), ctx.entryByLowerName, esc, ctx.articleIds)}</div>` : ""}</li>`).join("");
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
}'''

# ─── 08_export-layer: the field listing, and references to what a file holds ──

REF_OLD = '''// v1.7 r003: one reference value in the HTML export. An entry links to its
// article, and so does a map, whose article reuses the entry-<id> scheme; a
// body or a Glossopoeia record has no article, so it's its name, titled with
// its type; an id nothing has is the broken-link span it always was.
const refLinkHtml = (id, ctx) => {
  const ref = ctx.entryById[id];
  if (ref) return `<a class="entry-ref-link" href="#entry-${htmlEscape(ref.id)}">${htmlEscape(ref.name)}</a>`;
  const node = ctx.nodeById ? ctx.nodeById[id] : null;
  if (node && node.templateId === SYNTH_TPL_MAP) return `<a class="entry-ref-link" href="#entry-${htmlEscape(node.id)}">${htmlEscape(node.name)}</a>`;
  if (node) {
'''
REF_NEW = '''// v1.7 r003: one reference value in the HTML export. An entry links to its
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
'''

WIKI_OLD = '''      const withLinks = resolveWikiLinksForHtml(val, entryByLowerName, htmlEscape);
'''
WIKI_NEW = '''      const withLinks = resolveWikiLinksForHtml(val, entryByLowerName, htmlEscape, ctx.articleIds);
'''

ARTICLE_OLD = '''// Render one entry as a full <article> block. Walks fields in template order,
// respecting secret/showWhen/cascade rules. Separates short inline fields
// (rendered as a <dl> definition list) from block-level fields (textareas,
// groups, name-history, multi-line content rendered as <section> blocks below
// the <dl>).
const renderEntryArticleHtml = (entry, tpl, state, ctx, options, canvasHtml) => {
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

  // Tags chips (renders only when present, before fields)
'''
ARTICLE_NEW = '''// v1.7 r023: an entry's fields as its article holds them, the short ones as
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
  return `${inlineHtml}\\n    ${blockHtml}`;
};

// Render one entry as a full <article> block: its title and badge, the
// obituary line, the tags, a map's canvas, and its fields
// (renderEntryFieldsHtml).
const renderEntryArticleHtml = (entry, tpl, state, ctx, options, canvasHtml) => {
  const fieldsHtml = renderEntryFieldsHtml(entry, tpl, state, ctx, options);

  // The entry's calendar, for the obituary line
  const entryCal = getCalendar(state, entry.calendarId);

  // Tags chips (renders only when present, before fields)
'''

ARTICLE_TAIL_OLD = '''  const inlineHtml = inlineRows.length > 0 ? `<dl class="entry-fields">${inlineRows.join("")}</dl>` : "";
  const blockHtml = blockSections.map(b =>
    `<section class="entry-block"><h3>${htmlEscape(b.label)}${b.marker}</h3><div class="entry-block-content">${b.content}</div></section>`
  ).join("");

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
    ${inlineHtml}
    ${blockHtml}
  </article>`;
};
'''
ARTICLE_TAIL_NEW = '''  // Canvas slot: for map records, the caller passes the pre-rendered map block
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
'''

# ─── 07_temporal: wiki links to what a file holds ──────────────────────────────

RESOLVE_OLD = '''// The `escape` callback HTML-escapes the inner text — passed in to avoid
// circular dependency on the escape helper that lives in buildHtmlExport.
const resolveWikiLinksForHtml = (text, entryByLowerName, escape) => {
'''
RESOLVE_NEW = '''// The `escape` callback HTML-escapes the inner text — passed in to avoid
// circular dependency on the escape helper that lives in buildHtmlExport.
// v1.7 r023: given articleIds, the ids of what the file holds (a Fabula
// bible's), a link to an entry the file doesn't hold is the entry's name in
// an entry-ref-record span instead of an anchor.
const resolveWikiLinksForHtml = (text, entryByLowerName, escape, articleIds) => {
'''
RESOLVE_LINK_OLD = '''    const entry = entryByLowerName[target.toLowerCase()];
    if (entry) {
      parts.push(`<a class="wiki-link" href="#entry-${escape(entry.id)}">${escape(display)}</a>`);
    } else {
      parts.push(`<span class="broken-link" title="No entry named '${escape(target)}'">${escape(display)}</span>`);
    }
    cursor = m.index + m[0].length;
'''
RESOLVE_LINK_NEW = '''    const entry = entryByLowerName[target.toLowerCase()];
    if (entry && articleIds && !articleIds.has(entry.id)) {
      parts.push(`<span class="entry-ref-record" title="World entry">${escape(display)}</span>`);
    } else if (entry) {
      parts.push(`<a class="wiki-link" href="#entry-${escape(entry.id)}">${escape(display)}</a>`);
    } else {
      parts.push(`<span class="broken-link" title="No entry named '${escape(target)}'">${escape(display)}</span>`);
    }
    cursor = m.index + m[0].length;
'''

# ─── 13_form-engine-display: the Export button's hover ─────────────────────────

VIEW_SIG_OLD = "function EntryView({ entry, template, templates, entries, onOpenEntry, onSelectTag, showSecrets, imageFolder, dirHandle, calendar, onExportEntry, state, onUpdateViewPrefs, canvasSlot, panels, foldedPanels, onTogglePanel, registeredNodes: nodesGiven, badgeExtra, footSlot, wide }) {\n"
VIEW_SIG_NEW = "function EntryView({ entry, template, templates, entries, onOpenEntry, onSelectTag, showSecrets, imageFolder, dirHandle, calendar, onExportEntry, exportTitle, state, onUpdateViewPrefs, canvasSlot, panels, foldedPanels, onTogglePanel, registeredNodes: nodesGiven, badgeExtra, footSlot, wide }) {\n"
VIEW_TITLE_OLD = '''            title={showSecrets ? "Download this entry as Markdown (.md). Secret fields included." : "Download this entry as Markdown (.md). Secret fields excluded."}\n'''
VIEW_TITLE_NEW = '''            title={exportTitle || (showSecrets ? "Download this entry as Markdown (.md). Secret fields included." : "Download this entry as Markdown (.md). Secret fields excluded.")}\n'''

# ─── 12_trunk: the state, the buttons, and the modal ───────────────────────────

STATE_OLD = "  const [showHtmlExportModal, setShowHtmlExportModal] = useState(false);  // World-level HTML export modal\n"
STATE_NEW = "  const [showHtmlExportModal, setShowHtmlExportModal] = useState(false);  // World-level HTML export modal\n  const [fabulaExport, setFabulaExport] = useState(null);  // v1.7 r023: Fabula's export modal, { kind: \"story\" | \"corpus\", id }\n"

CORPUS_OLD = '''                calendar={getCalendar(state, null)}
                state={state}
                onUpdateViewPrefs={updateViewPrefs}
                canvasSlot={
                  <FabulaReadingOrder
'''
CORPUS_NEW = '''                calendar={getCalendar(state, null)}
                state={state}
                onUpdateViewPrefs={updateViewPrefs}
                onExportEntry={() => setFabulaExport({ kind: "corpus", id: rec.id })}
                exportTitle={FABULA_EXPORT_TITLE}
                canvasSlot={
                  <FabulaReadingOrder
'''

STORY_OLD = '''                onOpenEntry={openEntryFromAnywhere}
                onSelectTag={selectTag}
                onUpdateViewPrefs={updateViewPrefs}
              />
            );
          })()}
          {view === "glossopoeia" && (
'''
STORY_NEW = '''                onOpenEntry={openEntryFromAnywhere}
                onSelectTag={selectTag}
                onUpdateViewPrefs={updateViewPrefs}
                onExport={() => setFabulaExport({ kind: "story", id: rec.id })}
              />
            );
          })()}
          {view === "glossopoeia" && (
'''

MODAL_OLD = '''      {showHtmlExportModal && (
        <HtmlExportModal
          state={state}
          onCancel={() => setShowHtmlExportModal(false)}
          onConfirm={(options) => {
            setShowHtmlExportModal(false);
            exportHtml(options);
          }}
        />
      )}
'''
MODAL_NEW = '''      {showHtmlExportModal && (
        <HtmlExportModal
          state={state}
          onCancel={() => setShowHtmlExportModal(false)}
          onConfirm={(options) => {
            setShowHtmlExportModal(false);
            exportHtml(options);
          }}
        />
      )}

      {fabulaExport && (
        <FabulaExportModal
          state={state}
          target={fabulaExport}
          onCancel={() => setFabulaExport(null)}
          onConfirm={(options) => {
            const target = fabulaExport;
            setFabulaExport(null);
            const name = fabulaExportDownload(state, target, options);
            if (name) flash(`${target.kind === "corpus" ? "Corpus" : "Story"} exported as ${options.format === "html" ? "HTML" : "Markdown"}${options.includeSecrets ? " (includes secrets)" : ""}`);
            else flash("Nothing to export", "error");
          }}
        />
      )}
'''


def main():
    text = FAB.read_text(encoding="utf-8")
    assert not text.endswith("\n"), "28_fabula ends without a newline"
    assert "fabulaBible" not in text
    edit(FAB, [(PAGE_OLD, PAGE_NEW), (TAB_VIEW_OLD, TAB_VIEW_NEW), (STORY_VIEW_OLD, STORY_VIEW_NEW)])
    FAB.write_text(FAB.read_text(encoding="utf-8") + SECTION, encoding="utf-8")
    assert not FAB.read_text(encoding="utf-8").endswith("\n")
    edit(EXPORT, [(REF_OLD, REF_NEW), (WIKI_OLD, WIKI_NEW), (ARTICLE_OLD, ARTICLE_NEW), (ARTICLE_TAIL_OLD, ARTICLE_TAIL_NEW)])
    edit(TEMPORAL, [(RESOLVE_OLD, RESOLVE_NEW), (RESOLVE_LINK_OLD, RESOLVE_LINK_NEW)])
    edit(DISPLAY, [(VIEW_SIG_OLD, VIEW_SIG_NEW), (VIEW_TITLE_OLD, VIEW_TITLE_NEW)])
    edit(TRUNK, [(STATE_OLD, STATE_NEW), (CORPUS_OLD, CORPUS_NEW), (STORY_OLD, STORY_NEW), (MODAL_OLD, MODAL_NEW)])
    print("v1.7 r023 applied: 28_fabula, 08_export-layer, 07_temporal, 13_form-engine-display, 12_trunk")


if __name__ == "__main__":
    main()
