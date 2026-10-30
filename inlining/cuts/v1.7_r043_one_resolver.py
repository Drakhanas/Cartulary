"""
v1.7 r043: one resolver for every [[link]], Pipes' fifth cut.

docs/pipes-spec.md, section 5, with the two details Drak settled at the cut
(2026-10-29, one per message: a, a):

1. How an export writes a [[link]] to a record that isn't an entry. A map
   links to its article in the world's HTML export, which carries one; a
   body, a stemma, or a Fabula record is its name, styled and titled with
   its kind, as a reference field to one has been since r003; in Fabula's
   export a record the file holds links to its article. Markdown writes the
   name throughout.
2. [[links]] that name a Glossopoeia record. Languages only: a [[link]] to a
   language is found, labeled ConLang, and opens nothing, as a reference
   chip to one has done since r003, in the entry view and Tabula notes alike;
   Concordance draws its edge, the delete modal counts it, the exports write
   the language's name, and the autocomplete offers languages after the
   rest. Words, sounds, and Glossopoeia's other records stay out.

With them, Claude's defaults, said before the first call and not stopped:
the autocomplete offers each name once, for the record it reaches, marked
with its kind, so a second record by the same name isn't offered; Fabula's
records come in Fabula's order of kinds, each in stored order; and four
roadmap rows on files the cut edits ride along: the entry page's secret
subfield drawn while secrets are hidden (13_form-engine-display), the
Markdown export's Name History written "[object Object]" and its dates in
the primary calendar for an entry bound to another (08_export-layer, both
shown on r042's build before the cut), and Concordance's merged edge, whose
labels came in the order the index listed links by target, not their
records' order as at r041 (17_concordance). getRegisteredNameToId, which has
never had a caller, goes.

Found in the build and fixed with it: the [[ autocomplete's keyup handlers
read every key again as it came up, so an arrow key's move through the list
went back to its first line, and Esc's close opened the list again, in both
editors since they were written (shown on r042's build by r043's probe).
Each editor now marks a key its list's keydown handler took, and its keyup
handler leaves that key alone; any other key, an arrow key with the list
closed among them, is read as before.

The resolver, wikiResolverOf (22_trunk, under a header of its own): an
entry's primary name first, the first stored winning a tie; then its
template's Name History; then a body's name and other names; then maps,
stemmas, and Fabula's records by name; then languages. A name a record
claimed first is no one else's. It's kept while the entries and templates
are the same objects and no name outside them changes, so a map's drawing,
a tabula's typing, or a body's orbit keeps it. App hands it to everything it
draws (WikiResolverContext); the entry view's MarkdownDisplay and
InlineWikiLinkText, Tabula notes through MarkdownDisplay, the [[ autocomplete
in WikiLinkInput and RichTextEditor, the link index, and the exports read it.

- 22_trunk: the resolver, its memo, the context, its hook, the autocomplete's
  candidates, and a record's kind for a title; the index resolves through it
  and keeps every link in the order its record was read, with its target,
  which Concordance draws in; a delete's count asks a resolver built without
  what goes. wikiNameResolver and getRegisteredNameToId go.
- 12_trunk: App provides the resolver.
- 13_form-engine-display: MarkdownDisplay and InlineWikiLinkText resolve
  through it, a language drawn found and opening nothing; a group's secret
  subfield shows only while secrets do, marked as a secret field is.
- 14_form-engine-edit: both autocompletes offer what the resolver reaches,
  and leave the keys their keydown handlers answer to them.
- 07_temporal: the exports' two [[link]] writers take the resolver.
- 08_export-layer: the world's exports resolve through it, Short Text
  included; a Name History field in Markdown; each entry's dates in its own
  calendar in Markdown, as the HTML export's default has them.
- 28_fabula/11_export: Fabula's export resolves through it.
- 17_concordance: the links in their records' order.

Declared scope: 07_temporal, 08_export-layer, 12_trunk,
13_form-engine-display, 14_form-engine-edit, 17_concordance, 22_trunk,
28_fabula/11_export. No shell change. Declarations added: WIKI_RESOLVER_MEMO,
wikiOtherNames, wikiResolverBuild, wikiResolverOf, WikiResolverContext,
useWikiResolver, wikiLinkCandidates, wikiRecordKind, WIKI_LINK_RECORD_STYLE,
wikiLinkOptionIcon, wikiLinkOptionKind, wikiLinkOptionTitle,
WIKI_LINK_LIST_KEYS. Removed:
getRegisteredNameToId, wikiNameResolver. One header added: `The [[link]]
resolver (v1.7 r043)`.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given), and a span's start and end anchors once each,
the end after the start; nothing is written unless every anchor in every
file holds. Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r043_one_resolver.py
"""
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())
MODULES = ROOT / "cartulary-src" / "modules"

PLAN = []


def B(s):
    """A block written with its opening newline, which isn't part of it."""
    return s[1:] if s.startswith("\n") else s


def edit(path, steps):
    PLAN.append((path, steps))


def SPAN(start, end, new):
    """Replace from start through end, each occurring once, end after start."""
    return ("span", start, end, new)


# ===================================================== 22: the resolver
edit(MODULES / "22_trunk.jsx", [
    # getRegisteredNameToId, never called, makes way for the resolver.
    SPAN(
        B(r'''
// Name -> id map for registered nodes (lowercased) for wiki-link resolution
'''),
        B(r'''
    if (k && !(k in map)) map[k] = n.id;
  });
  return map;
};
'''),
        B(r'''
// ─── The [[link]] resolver (v1.7 r043) ─────────────────────────────────────────
// docs/pipes-spec.md, section 5, with Drak's calls at the cut: one function
// finds what a [[name]] names, for the entry view, Tabula notes, the link
// index (and through it Referenced by, Concordance, and the delete counts),
// the world's HTML and Markdown exports, Fabula's export, and the [[
// autocomplete. An entry's primary name first, the first stored winning a
// tie; then its template's Name History; then a body's name and other
// names; then maps, stemmas, and Fabula's records by name, Fabula's in its
// order of kinds; then languages (Drak's call 2), which a [[link]] reaches
// without opening anything, as a reference chip to one has since r003.
// Glossopoeia's other records stay out. A name a record claimed first is no
// one else's, so a [[link]] by it, and the autocomplete, reach that record.

// The last resolver built, the slices it was built from, and the names
// outside entries it read, so that an edit renaming nothing (a map's
// drawing, a tabula's typing, a body's orbit) keeps it.
const WIKI_RESOLVER_MEMO = { keys: null, others: null, resolver: null };

// Every id and name the resolver reads outside entries, as one string.
const wikiOtherNames = (st) => {
  const out = [];
  const add = (list, other) => (Array.isArray(list) ? list : []).forEach(r => {
    if (r && r.id) out.push(r.id, typeof r.name === "string" ? r.name : "", other && typeof r.otherNames === "string" ? r.otherNames : "");
  });
  const fab = st.fabula || {};
  add(st.celestialBodies, true);
  add(st.cartographia);
  add(st.stemmas);
  FABULA_KINDS.forEach(k => add(fab[k.slice]));
  add(st.glossopoeia && st.glossopoeia.conlangs);
  return JSON.stringify(out);
};

// A resolver for the world in st, leaving out the records whose ids skip
// holds (a delete's count asks where the names will lead once they're gone).
// find(name) gives the record a trimmed, lowercased name reaches, as
// { id, kind, source, name, opens }, kind entry, body, map, stemma, fabula,
// or conlang, source its template or its registry source; resolve(name) its
// id; and names every name that reaches a record, in the order above, for
// the autocomplete.
const wikiResolverBuild = (st, skip) => {
  const byKey = new Map();
  const names = [];
  const claim = (raw, rec, via) => {
    if (typeof raw !== "string") return;
    const name = raw.trim();
    const key = name.toLowerCase();
    if (!key || byKey.has(key)) return;
    byKey.set(key, rec);
    names.push({ name, key, rec, via });
  };
  const kept = (list) => (Array.isArray(list) ? list : []).filter(r => r && typeof r.id === "string" && r.id && !(skip && skip.has(r.id)));
  const record = (r, kind, source) => ({ id: r.id, kind, source, name: typeof r.name === "string" ? r.name : "", opens: kind !== "conlang" });
  const ents = kept(st.entries).map(e => [e, record(e, "entry", e.templateId)]);
  ents.forEach(([e, rec]) => claim(e.name, rec, "name"));
  const tplById = new Map((Array.isArray(st.templates) ? st.templates : []).filter(t => t && t.id).map(t => [t.id, t]));
  ents.forEach(([e, rec]) => getEntryNameHistory(e, tplById.get(e.templateId)).forEach(n => claim(n, rec, "history")));
  kept(st.celestialBodies).forEach(b => {
    if (typeof b.name !== "string" || !b.name) return;
    const rec = record(b, "body", BODY_REF_SENTINEL);
    claim(b.name, rec, "name");
    if (typeof b.otherNames === "string") b.otherNames.split(",").forEach(n => claim(n, rec, "other"));
  });
  kept(st.cartographia).forEach(m => claim(m.name, record(m, "map", SYNTH_TPL_MAP), "name"));
  kept(st.stemmas).forEach(s => claim(s.name, record(s, "stemma", SYNTH_TPL_STEMMA), "name"));
  const fab = st.fabula || {};
  FABULA_KINDS.forEach(k => kept(fab[k.slice]).forEach(r => claim(r.name, record(r, "fabula", k.id), "name")));
  kept(st.glossopoeia && st.glossopoeia.conlangs).forEach(c => claim(c.name, record(c, "conlang", SYNTH_TPL_CONLANG), "name"));
  const find = (key) => byKey.get(key) || null;
  const resolve = (key) => { const rec = byKey.get(key); return rec ? rec.id : null; };
  return { find, resolve, names };
};

// The world's resolver, built once and kept while what it reads is the same
// (WIKI_RESOLVER_MEMO).
const wikiResolverOf = (state) => {
  const st = state || {};
  const fab = st.fabula || {};
  const keys = [st.entries, st.templates, st.celestialBodies, st.cartographia, st.stemmas, ...FABULA_KINDS.map(k => fab[k.slice]), st.glossopoeia && st.glossopoeia.conlangs];
  const m = WIKI_RESOLVER_MEMO;
  if (m.resolver && m.keys.every((k, i) => k === keys[i])) return m.resolver;
  const others = wikiOtherNames(st);
  if (m.resolver && m.keys[0] === keys[0] && m.keys[1] === keys[1] && m.others === others) {
    m.keys = keys;
    return m.resolver;
  }
  m.keys = keys;
  m.others = others;
  m.resolver = wikiResolverBuild(st, null);
  return m.resolver;
};

// The resolver App draws with, for whatever below it reads a [[link]].
const WikiResolverContext = React.createContext(null);

// A component's resolver: App's, or, drawn where nothing provides one, one
// built from the entries, templates, and bodies it was given.
const useWikiResolver = (entries, templates, bodies) => {
  const given = React.useContext(WikiResolverContext);
  const own = useMemo(() => (given ? null : wikiResolverBuild({ entries, templates, celestialBodies: bodies }, null)), [given, entries, templates, bodies]);
  return given || own;
};

// What the [[ autocomplete offers for a lowercased query: up to max names
// that hold it, each once, for the record it reaches, in the resolver's
// order, shaped as the popups read them.
const wikiLinkCandidates = (wiki, query, max) => {
  const q = typeof query === "string" ? query : "";
  const names = wiki ? wiki.names : [];
  const out = [];
  for (let i = 0; i < names.length && out.length < max; i++) {
    const n = names[i];
    if (!n.key.includes(q)) continue;
    out.push({ entry: { id: n.rec.id, name: n.rec.name }, displayName: n.name, insertName: n.name, viaHistory: n.via !== "name", isBody: n.rec.kind === "body", rec: n.rec });
  }
  return out;
};

// What a record a [[link]] reaches is called beside its name: its source's
// name ("Astronomical Body", "Map", "Scene (Fabula)", "ConLang"), as a
// reference chip's title has it, or nothing for an entry.
const wikiRecordKind = (rec) => {
  const src = rec && rec.kind !== "entry" ? getRegisteredSourceById(rec.source) : null;
  return src ? src.name : "";
};
'''),
    ),
    # The index's header: [[links]] through the resolver.
    (
        B(r'''
// fields, a tabula's notes, and the world description, read by the entry
// view's rules (wikiNameResolver) until r043 makes one resolver for every
// place a link is read. A record's links are read once and kept until the
'''),
        B(r'''
// fields, a tabula's notes, and the world description, read since r043 by
// the one resolver (wikiResolverOf), and by the entry view's rules before
// it. A record's links are read once and kept until the
'''),
    ),
    (
        B(r'''
// What the index keeps between builds: the last build and the slices it was
// built from, the name resolver and its inputs, each record's links (by the
// record, with what they were read through), and the fields read for
// Fabula's kinds and ConLangs while the world keeps no schema of its own.
const LINK_INDEX_MEMO = { keys: null, index: null, names: null, records: new WeakMap(), schemas: new Map(), mapFields: null };
'''),
        B(r'''
// What the index keeps between builds: the last build and the slices it was
// built from, each record's links (by the record, with what they were read
// through), and the fields read for Fabula's kinds and ConLangs while the
// world keeps no schema of its own. The names are the resolver's own
// (WIKI_RESOLVER_MEMO) since r043.
const LINK_INDEX_MEMO = { keys: null, index: null, records: new WeakMap(), schemas: new Map(), mapFields: null };
'''),
    ),
    # wikiNameResolver goes: wikiResolverOf reads what it read and more.
    SPAN(
        B(r'''
// The entry view's [[name]] rules (MarkdownDisplay, InlineWikiLinkText),
'''),
        B(r'''
  LINK_INDEX_MEMO.names = { entries, templates, bodies, resolve };
  return resolve;
};

'''),
        "",
    ),
    (
        B(r'''
// The index, { byTarget }: each target's links as linkPush makes them, src
// the source as { id, kind, group, name, storyId }, its kind entry, fabula,
// map, stemma, body, conlang, or world, and its group its template, its
// Fabula kind, or its kind again. Put together again only when a slice it
// reads has changed.
'''),
        B(r'''
// The index, { byTarget, links, targets }: each target's links as linkPush
// makes them, src the source as { id, kind, group, name, storyId }, its kind
// entry, fabula, map, stemma, body, conlang, or world, and its group its
// template, its Fabula kind, or its kind again; and since r043 every link in
// the order its record was read (links), beside its target (targets), which
// Concordance draws in. Put together again only when a slice it reads has
// changed.
'''),
    ),
    (
        B(r'''
  const resolve = wikiNameResolver(st.entries, st.templates, st.celestialBodies);
  const byTarget = new Map();
'''),
        B(r'''
  const wiki = wikiResolverOf(st);
  const byTarget = new Map();
  const links = [], targets = [];
'''),
    ),
    (
        B(r'''
      const target = l.kind === "wiki" ? resolve(l.to) : l.to;
      if (typeof target !== "string" || !target || target === l.src.id) continue;
      let list = byTarget.get(target);
      if (!list) { list = []; byTarget.set(target, list); }
      list.push(l);
'''),
        B(r'''
      const target = l.kind === "wiki" ? wiki.resolve(l.to) : l.to;
      if (typeof target !== "string" || !target || target === l.src.id) continue;
      let list = byTarget.get(target);
      if (!list) { list = []; byTarget.set(target, list); }
      list.push(l);
      links.push(l);
      targets.push(target);
'''),
    ),
    (
        B(r'''
  memo.keys = keys;
  memo.index = { byTarget };
  return memo.index;
'''),
        B(r'''
  memo.keys = keys;
  memo.index = { byTarget, links, targets };
  return memo.index;
'''),
    ),
    (
        B(r'''
  // The names as they'll resolve after the delete, put together once, when
  // a [[link]] asks, and without taking the index's own resolver's place.
  let after = null;
  const resolvesAfter = (name) => {
    if (!after) {
      const st = state || {};
      const kept = LINK_INDEX_MEMO.names;
      after = wikiNameResolver(
        (Array.isArray(st.entries) ? st.entries : []).filter(e => !(e && outside.has(e.id))),
        st.templates,
        (Array.isArray(st.celestialBodies) ? st.celestialBodies : []).filter(b => !(b && outside.has(b.id))));
      LINK_INDEX_MEMO.names = kept;
    }
    return after(name);
  };
'''),
        B(r'''
  // The names as they'll resolve after the delete, built once, when a
  // [[link]] asks, without what goes, and apart from the world's resolver.
  let after = null;
  const resolvesAfter = (name) => {
    if (!after) after = wikiResolverBuild(state || {}, outside);
    return after.resolve(name);
  };
'''),
    ),
])

# ============================================================ 12: App
edit(MODULES / "12_trunk.jsx", [
    (
        B(r'''
  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="root">
      <Sidebar
'''),
        B(r'''
  // ── Render ───────────────────────────────────────────────────────────────────

  // v1.7 r043: the [[link]] resolver, for everything drawn below that reads a
  // [[link]], kept while no name it reads changes (wikiResolverOf).
  const wikiResolver = wikiResolverOf(state);

  return (
    <WikiResolverContext.Provider value={wikiResolver}>
    <div className="root">
      <Sidebar
'''),
    ),
    (
        B(r'''
      )}
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────
'''),
        B(r'''
      )}
    </div>
    </WikiResolverContext.Provider>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────
'''),
    ),
])

# ============================================== 13: the entry view's links
edit(MODULES / "13_form-engine-display.jsx", [
    (
        "calendar={calendar} entry={entry} template={template} currentMomentDay={currentMomentDay} />",
        "calendar={calendar} entry={entry} template={template} currentMomentDay={currentMomentDay} showSecrets={showSecrets} />",
        3,
    ),
    SPAN(
        B(r'''
// Resolution mirrors MarkdownDisplay's logic: primary entry name beats name-history
'''),
        B(r'''
    return { primaryByLower: primary, historyByLower: history, bodiesByLower: bodiesMap };
  }, [entries, templates, bodies]);
'''),
        B(r'''
// Since v1.7's r043 a [[link]] resolves through the world's one resolver
// (useWikiResolver), as MarkdownDisplay's do; a language is drawn found and
// opens nothing, and a broken link keeps the .wiki-link-broken affordance.
//
// Reuses the broadened .wiki-link CSS so visual treatment matches markdown rendering.
function InlineWikiLinkText({ value, entries, templates, bodies, onOpenEntry }) {
  const wiki = useWikiResolver(entries, templates, bodies);
'''),
    ),
    (
        B(r'''
    const lookup = target.toLowerCase();
    const found = primaryByLower.get(lookup) || historyByLower.get(lookup) || bodiesByLower.get(lookup);
    if (found) {
      const id = found.id;
'''),
        B(r'''
    const found = wiki.find(target.toLowerCase());
    if (found && !found.opens) {
      nodes.push(
        <span key={`wl-${key++}`} className="wiki-link wiki-link-found wiki-link-record" style={WIKI_LINK_RECORD_STYLE} title={wikiRecordKind(found)}>{display}</span>
      );
    } else if (found) {
      const id = found.id;
'''),
    ),
    (
        B(r'''
// ─── Referenced by (v1.7 r041) ─────────────────────────────────────────────────
'''),
        B(r'''
// A [[link]] to a record that opens nothing (since v1.7's r043, a language,
// Drak's call 2): drawn found, and still on hover, as a reference chip to one.
const WIKI_LINK_RECORD_STYLE = { cursor: "default", background: "var(--accent-glow)", color: "var(--accent)" };

// ─── Referenced by (v1.7 r041) ─────────────────────────────────────────────────
'''),
    ),
    SPAN(
        B(r'''
function MarkdownDisplay({ markdown, entries, templates, bodies, onOpenEntry, dirHandle }) {
'''),
        B(r'''
    return tmp.innerHTML;
  }, [markdown, entries, templates, bodies]);
'''),
        B(r'''
function MarkdownDisplay({ markdown, entries, templates, bodies, onOpenEntry, dirHandle }) {
  const containerRef = useRef(null);
  const wiki = useWikiResolver(entries, templates, bodies);

  const html = useMemo(() => {
    if (!markdown) return "";
    let h;
    try { h = marked.parse(markdown); }
    catch (e) { console.error("md parse failed", e); return `<p>${markdown}</p>`; }

    // Post-process wiki-links. Since v1.7's r043 each resolves through the
    // world's one resolver (wikiResolverOf, 22_trunk): an entry by its
    // primary name or its Name History, a body by its name or another name,
    // a map, a stemma, or a Fabula record by its name, all of which open, and
    // a language, which is drawn found and opens nothing (Drak's call 2).
    const tmp = document.createElement("div");
    tmp.innerHTML = h;
    tmp.querySelectorAll(".wiki-link").forEach(link => {
      const name = (link.dataset.name || "").trim().toLowerCase();
      const found = wiki.find(name);
      if (found && !found.opens) {
        const span = document.createElement("span");
        span.className = "wiki-link wiki-link-found wiki-link-record";
        span.title = wikiRecordKind(found);
        Object.assign(span.style, WIKI_LINK_RECORD_STYLE);
        span.textContent = link.textContent;
        link.replaceWith(span);
      } else if (found) {
        link.dataset.entryId = found.id;
        link.classList.add("wiki-link-found");
      } else {
        link.classList.add("wiki-link-broken");
        link.title = "No entry with that name";
      }
    });
    return tmp.innerHTML;
  }, [markdown, wiki]);
'''),
    ),
    (
        "function FieldValueDisplay({ field, value, entries, templates, bodies, registeredNodes, onOpenEntry, imageFolder, dirHandle, calendar, entry, template, currentMomentDay }) {",
        "function FieldValueDisplay({ field, value, entries, templates, bodies, registeredNodes, onOpenEntry, imageFolder, dirHandle, calendar, entry, template, currentMomentDay, showSecrets }) {",
    ),
    (
        B(r'''
              if (!isFieldVisible(sub, inst)) return null;
              const subval = inst[sub.id];
              if (subval === "" || subval == null || (Array.isArray(subval) && subval.length === 0)) return null;
              return (
                <div key={sub.id} className="field-group" style={{ marginBottom: 12 }}>
                  <div className="field-label">{sub.label}</div>
                  <FieldValueDisplay field={sub} value={subval} entries={entries} templates={templates} bodies={bodies} registeredNodes={registeredNodes} onOpenEntry={onOpenEntry} imageFolder={imageFolder} dirHandle={dirHandle} calendar={calendar} />
'''),
        B(r'''
              if (!isFieldVisible(sub, inst)) return null;
              // v1.7 r043: a secret subfield shows only while secrets do, as
              // both exports have it, and is marked as a secret field is.
              if (sub.secret && !showSecrets) return null;
              const subval = inst[sub.id];
              if (subval === "" || subval == null || (Array.isArray(subval) && subval.length === 0)) return null;
              return (
                <div key={sub.id} className={`field-group ${sub.secret ? "secret" : ""}`} style={{ marginBottom: 12 }}>
                  <div className="field-label">{sub.label}{sub.secret && <span className="secret-tag">SECRET</span>}</div>
                  <FieldValueDisplay field={sub} value={subval} entries={entries} templates={templates} bodies={bodies} registeredNodes={registeredNodes} onOpenEntry={onOpenEntry} imageFolder={imageFolder} dirHandle={dirHandle} calendar={calendar} showSecrets={showSecrets} />
'''),
    ),
])

# =========================================== 14: the [[ autocomplete
POPUP_OLD = B(r'''
              title={
                c.isBody
                  ? (c.viaHistory ? `Other name for body "${c.entry.name}"` : "Celestial body")
                  : (c.viaHistory ? `Former name of "${c.entry.name}"` : null)
              }
            >
              <span className="wikilink-opt-icon">{c.isBody ? "◉" : "◈"}</span>
              <span>{c.displayName}</span>
              {c.viaHistory && (
                <span className="wikilink-opt-history-hint"> → {c.entry.name}</span>
              )}
              {c.isBody && !c.viaHistory && (
                <span className="wikilink-opt-tmpl">body</span>
              )}
''')
POPUP_NEW = B(r'''
              title={wikiLinkOptionTitle(c)}
            >
              <span className="wikilink-opt-icon">{wikiLinkOptionIcon(c)}</span>
              <span>{c.displayName}</span>
              {c.viaHistory && (
                <span className="wikilink-opt-history-hint"> → {c.entry.name}</span>
              )}
              {!c.viaHistory && wikiLinkOptionKind(c) && (
                <span className="wikilink-opt-tmpl">{wikiLinkOptionKind(c)}</span>
              )}
''')

edit(MODULES / "14_form-engine-edit.jsx", [
    (
        B(r'''
// When the user types `[[`, the popup lists matching entries. Pressing Enter
'''),
        B(r'''
// When the user types `[[`, the popup lists matching names (since v1.7's
// r043, what the world's one resolver reaches, wikiLinkCandidates). Pressing Enter
'''),
    ),
    (
        B(r'''
// Single-line text input with wiki-link autocomplete. Edit-side parallel to
'''),
        B(r'''
// A [[ suggestion's marks (v1.7 r043): an entry's ◈ and a body's ◉, as
// before, and any other record its source's icon; beside a record's own
// name, what it is, if it isn't an entry; and on hover, the record a former
// or other name stands for, or the record's kind.
const wikiLinkOptionIcon = (c) => (c.rec.kind === "entry" ? "◈" : c.rec.kind === "body" ? "◉" : ((getRegisteredSourceById(c.rec.source) || {}).icon || "◈"));
const wikiLinkOptionKind = (c) => {
  if (c.rec.kind === "entry") return "";
  if (c.rec.kind === "body") return "body";
  if (c.rec.kind === "conlang") return "ConLang";
  const src = getRegisteredSourceById(c.rec.source);
  return src ? (src.label || src.name).toLowerCase() : "";
};
const wikiLinkOptionTitle = (c) => {
  if (c.isBody) return c.viaHistory ? `Other name for body "${c.entry.name}"` : "Celestial body";
  if (c.viaHistory) return `Former name of "${c.entry.name}"`;
  return wikiRecordKind(c.rec) || null;
};

// The keys the list answers while it's open (v1.7 r043). Each editor marks
// one its keydown handler took, and its keyup handler leaves that key alone:
// read again on the way up, an arrow key put the highlight back on the
// first line and Esc opened the list again.
const WIKI_LINK_LIST_KEYS = new Set(["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"]);

// Single-line text input with wiki-link autocomplete. Edit-side parallel to
'''),
    ),
    (
        B(r'''
  const handleKeyUp = (e) => {
    const inp = inputRef.current;
    if (!inp) return;
'''),
        B(r'''
  const handleKeyUp = (e) => {
    if (listKeyRef.current === e.key) { listKeyRef.current = null; return; }
    const inp = inputRef.current;
    if (!inp) return;
'''),
    ),
    (
        B(r'''
  const handleKeyUp = (e) => {
    const ta = taRef.current;
    if (!ta) return;
'''),
        B(r'''
  const handleKeyUp = (e) => {
    if (listKeyRef.current === e.key) { listKeyRef.current = null; return; }
    const ta = taRef.current;
    if (!ta) return;
'''),
    ),
    (
        B(r'''
function WikiLinkInput({ value, onChange, entries, templates, bodies, placeholder }) {
  const inputRef = useRef(null);
'''),
        B(r'''
function WikiLinkInput({ value, onChange, entries, templates, bodies, placeholder }) {
  const inputRef = useRef(null);
  const wiki = useWikiResolver(entries, templates, bodies);
  const listKeyRef = useRef(null);
'''),
    ),
    (
        B(r'''
  const handleKeyDown = (e) => {
    if (!wikiPopup) return;
    if (e.key === "ArrowDown") {
'''),
        B(r'''
  const handleKeyDown = (e) => {
    if (!wikiPopup) return;
    if (WIKI_LINK_LIST_KEYS.has(e.key)) listKeyRef.current = e.key;
    if (e.key === "ArrowDown") {
'''),
    ),
    SPAN(
        B(r'''
      const seen = new Set();
      const candidates = [];
      (entries || []).forEach(en => {
'''),
        B(r'''
      const sliced = candidates.slice(0, 8);
'''),
        B(r'''
      const sliced = wikiLinkCandidates(wiki, query, 8);
'''),
    ),
    (
        B(r'''
function RichTextEditor({ value, onChange, entries, templates, bodies, dirHandle, onRequestFolderSetup, placeholder, onOpenEntry, flash }) {
  const taRef = useRef(null);
'''),
        B(r'''
function RichTextEditor({ value, onChange, entries, templates, bodies, dirHandle, onRequestFolderSetup, placeholder, onOpenEntry, flash }) {
  const taRef = useRef(null);
  const wiki = useWikiResolver(entries, templates, bodies);
  const listKeyRef = useRef(null);
'''),
    ),
    (
        B(r'''
    // Wiki popup nav
    if (wikiPopup) {
      if (e.key === "ArrowDown") {
'''),
        B(r'''
    // Wiki popup nav
    if (wikiPopup) {
      if (WIKI_LINK_LIST_KEYS.has(e.key)) listKeyRef.current = e.key;
      if (e.key === "ArrowDown") {
'''),
    ),
    SPAN(
        B(r'''
      // Build candidates: primary-name matches first, then name-history matches.
'''),
        B(r'''
      const slicedCandidates = candidates.slice(0, 8);
'''),
        B(r'''
      // v1.7 r043: what the world's one resolver reaches, each name once, in
      // its order: entries' primary names, then former names, then bodies'
      // names and other names, then maps, stemmas, Fabula's records, and
      // languages. A former name inserts itself, so [[New Amsterdam]] keeps
      // the name the writer picked and still reaches its entry.
      const slicedCandidates = wikiLinkCandidates(wiki, query, 8);
'''),
    ),
    (POPUP_OLD, POPUP_NEW, 2),
])

# ======================================= 07: the exports' [[link]] writers
edit(MODULES / "07_temporal.jsx", [
    SPAN(
        B(r'''
const resolveWikiLinksForMd = (text, entryByLowerName) => {
'''),
        B(r'''
    if (display && display.toLowerCase() !== target.toLowerCase()) {
      return `${display} (referring to ${entry.name})`;
    }
    return entry.name;
  });
};
'''),
        B(r'''
// v1.7 r043: through the world's one resolver (wikiResolverOf), so a former
// name, a body, a map, a stemma, a Fabula record, and a language write their
// names too. A link whose words aren't its record's name says which record
// it means.
const resolveWikiLinksForMd = (text, wiki) => {
  if (!text || typeof text !== "string") return text || "";
  return text.replace(/\[\[([^\]\n]+)\]\]/g, (match, inner) => {
    const pipe = inner.indexOf("|");
    const target = pipe >= 0 ? inner.substring(0, pipe).trim() : inner.trim();
    const display = pipe >= 0 ? inner.substring(pipe + 1).trim() : null;
    const rec = wiki ? wiki.find(target.toLowerCase()) : null;
    if (!rec) return match;
    const shown = display || target;
    if (shown.toLowerCase() !== rec.name.trim().toLowerCase()) {
      return `${shown} (referring to ${rec.name})`;
    }
    return rec.name;
  });
};
'''),
    ),
    (
        B(r'''
// v1.7 r023: given articleIds, the ids of what the file holds (a Fabula
// bible's), a link to an entry the file doesn't hold is the entry's name in
// an entry-ref-record span instead of an anchor.
const resolveWikiLinksForHtml = (text, entryByLowerName, escape, articleIds) => {
'''),
        B(r'''
// v1.7 r023: given articleIds, the ids of what the file holds (a Fabula
// bible's), a link to an entry the file doesn't hold is the entry's name in
// an entry-ref-record span instead of an anchor.
// v1.7 r043: through the world's one resolver (wikiResolverOf), by Drak's
// call 1 at the cut: an entry, or a map, whose article the world's export
// carries, is a link to its article; a body, a stemma, a Fabula record, or a
// language is its name in an entry-ref-record span titled with its kind, as
// a reference to one is (refLinkHtml); and given articleIds, whatever the
// file holds links to its article, and anything else is its name.
const resolveWikiLinksForHtml = (text, wiki, escape, articleIds) => {
'''),
    ),
    (
        B(r'''
    const entry = entryByLowerName[target.toLowerCase()];
    if (entry && articleIds && !articleIds.has(entry.id)) {
      parts.push(`<span class="entry-ref-record" title="World entry">${escape(display)}</span>`);
    } else if (entry) {
      parts.push(`<a class="wiki-link" href="#entry-${escape(entry.id)}">${escape(display)}</a>`);
    } else {
'''),
        B(r'''
    const rec = wiki ? wiki.find(target.toLowerCase()) : null;
    const linked = rec && (articleIds ? articleIds.has(rec.id) : (rec.kind === "entry" || rec.kind === "map"));
    if (linked) {
      parts.push(`<a class="wiki-link" href="#entry-${escape(rec.id)}">${escape(display)}</a>`);
    } else if (rec) {
      parts.push(`<span class="entry-ref-record" title="${escape(rec.kind === "entry" ? "World entry" : wikiRecordKind(rec))}">${escape(display)}</span>`);
    } else {
'''),
    ),
])

# ============================================= 08: the world's exports
edit(MODULES / "08_export-layer.jsx", [
    (
        B(r'''
  switch (field.type) {
    case "text":
    case "number":
    case "url":
      return String(val);
'''),
        B(r'''
  switch (field.type) {
    case "text":
      // v1.7 r043: a Short Text's [[links]] too, as the entry view reads them.
      return resolveWikiLinksForMd(String(val), ctx.wiki);

    case "number":
    case "url":
      return String(val);
'''),
    ),
    (
        B(r'''
    case "textarea":
      return resolveWikiLinksForMd(val, ctx.entryByLowerName);
'''),
        B(r'''
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
'''),
    ),
    (
        B(r'''
  const { entries, world } = state;
  const entryById = Object.fromEntries(entries.map(e => [e.id, e]));
  const entryByLowerName = {};
  entries.forEach(e => { if (e.name) entryByLowerName[e.name.trim().toLowerCase()] = e; });
  const ctx = { entryById, nodeById: registeredNodeIndex(state), entryByLowerName, calendar: world.calendar, options, imageManifest: null };
'''),
        B(r'''
  const { entries, world } = state;
  const entryById = Object.fromEntries(entries.map(e => [e.id, e]));
  // v1.7 r043: [[links]] through the world's one resolver, and the entry's
  // dates in its own calendar, as the HTML export has them by default.
  const ctx = { entryById, nodeById: registeredNodeIndex(state), wiki: wikiResolverOf(state), calendar: getCalendar(state, entry.calendarId), options, imageManifest: null };
'''),
    ),
    (
        B(r'''
  const entryById = Object.fromEntries(entries.map(e => [e.id, e]));
  const entryByLowerName = {};
  entries.forEach(e => {
    if (e.name) entryByLowerName[e.name.trim().toLowerCase()] = e;
  });
  const imageManifest = options.collectImages ? { bySource: {}, entries: [], inlineCount: 0 } : null;
  const ctx = { entryById, nodeById: registeredNodeIndex(state), entryByLowerName, calendar: world.calendar, options, imageManifest };
'''),
        B(r'''
  const entryById = Object.fromEntries(entries.map(e => [e.id, e]));
  const imageManifest = options.collectImages ? { bySource: {}, entries: [], inlineCount: 0 } : null;
  // v1.7 r043: [[links]] through the world's one resolver.
  const ctx = { entryById, nodeById: registeredNodeIndex(state), wiki: wikiResolverOf(state), calendar: world.calendar, options, imageManifest };
'''),
    ),
    (
        B(r'''
    out.push(resolveWikiLinksForMd(world.description, entryByLowerName));
'''),
        B(r'''
    out.push(resolveWikiLinksForMd(world.description, ctx.wiki));
'''),
    ),
    (
        B(r'''
    sorted.forEach(entry => {
      out.push(`### ${entry.name || "(unnamed)"}`);
      out.push("");
      out.push(...renderEntryBodyMarkdown(entry, tpl, ctx, options));
    });
'''),
        B(r'''
    sorted.forEach(entry => {
      out.push(`### ${entry.name || "(unnamed)"}`);
      out.push("");
      // v1.7 r043: each entry's dates in its own calendar, as the HTML
      // export has them by default, where every date was the primary's.
      out.push(...renderEntryBodyMarkdown(entry, tpl, { ...ctx, calendar: getCalendar(state, entry.calendarId) }, options));
    });
'''),
    ),
    (
        "  const { entryById, entryByLowerName, options } = ctx;",
        "  const { entryById, options } = ctx;",
    ),
    (
        B(r'''
  switch (field.type) {
    case "text":
    case "number":
      return htmlEscape(val);
'''),
        B(r'''
  switch (field.type) {
    case "text":
      // v1.7 r043: a Short Text's [[links]] too, as the entry view reads them.
      return resolveWikiLinksForHtml(String(val), ctx.wiki, htmlEscape, ctx.articleIds);

    case "number":
      return htmlEscape(val);
'''),
    ),
    (
        B(r'''
      const withLinks = resolveWikiLinksForHtml(val, entryByLowerName, htmlEscape, ctx.articleIds);
'''),
        B(r'''
      const withLinks = resolveWikiLinksForHtml(val, ctx.wiki, htmlEscape, ctx.articleIds);
'''),
    ),
    (
        B(r'''
  // Indexes
  const entryById = Object.fromEntries(entries.map(e => [e.id, e]));
  const entryByLowerName = {};
  entries.forEach(e => { if (e.name) entryByLowerName[e.name.trim().toLowerCase()] = e; });
'''),
        B(r'''
  // Indexes
  const entryById = Object.fromEntries(entries.map(e => [e.id, e]));
'''),
    ),
    (
        B(r'''
  const baseCtx = {
    entryById,
    nodeById: registeredNodeIndex(state),
    entryByLowerName,
    options,
'''),
        B(r'''
  const baseCtx = {
    entryById,
    nodeById: registeredNodeIndex(state),
    // v1.7 r043: [[links]] through the world's one resolver.
    wiki: wikiResolverOf(state),
    options,
'''),
    ),
    (
        "marked.parse(resolveWikiLinksForHtml(world.description, entryByLowerName, htmlEscape))",
        "marked.parse(resolveWikiLinksForHtml(world.description, baseCtx.wiki, htmlEscape))",
    ),
])

# ================================================== 28: Fabula's export
edit(MODULES / "28_fabula/11_export.jsx", [
    (
        B(r'''
  const entryById = Object.fromEntries((state.entries || []).filter(e => e && e.id).map(e => [e.id, e]));
  const entryByLowerName = {};
  (state.entries || []).forEach(e => { if (e && e.name) entryByLowerName[e.name.trim().toLowerCase()] = e; });
'''),
        B(r'''
  const entryById = Object.fromEntries((state.entries || []).filter(e => e && e.id).map(e => [e.id, e]));
'''),
    ),
    (
        "  return { entryById, nodeById, entryByLowerName, calendar: getCalendar(state, null), options, imageManifest: null, articleIds };",
        "  // v1.7 r043: [[links]] through the world's one resolver.\n"
        "  return { entryById, nodeById, wiki: wikiResolverOf(state), calendar: getCalendar(state, null), options, imageManifest: null, articleIds };",
    ),
    (
        "resolveWikiLinksForMd(b.whatHappens.trim(), ctx.entryByLowerName)",
        "resolveWikiLinksForMd(b.whatHappens.trim(), ctx.wiki)",
    ),
    (
        "resolveWikiLinksForHtml(b.whatHappens.trim(), ctx.entryByLowerName, esc, ctx.articleIds)",
        "resolveWikiLinksForHtml(b.whatHappens.trim(), ctx.wiki, esc, ctx.articleIds)",
    ),
])

# ===================================================== 17: Concordance
edit(MODULES / "17_concordance.jsx", [
    SPAN(
        B(r'''
    // reference fields, and the [[links]] outside entries. [[links]] resolve
'''),
        B(r'''
        else if (src.kind === "fabula" && l.field === "storyIds") label = "includes";
        addLink(src.id, target, label, "directed");
      });
    });
'''),
        B(r'''
    // reference fields, and the [[links]] outside entries. [[links]] resolve
    // through the world's one resolver since r043 (wikiResolverOf): a former
    // name, a body's other name, a map's, a stemma's, a Fabula record's, or a
    // language's name draws its edge (Drak's call 2 at r043), and a name two
    // entries share goes to the first. The labels stay Concordance's own: a
    // pin's 📍, a stemma's "links", and a corpus's "includes". A ConLang's
    // Variety Of and Descended From stay the registry's edges, parent to
    // child. Since r043 the links come in the order their records were read
    // (the index's links and targets), so an edge that merges a record's link
    // with a parent declaration at its other end takes its labels in its
    // records' order, as at r041.
    const index = linkIndexOf(state);
    for (let i = 0; i < index.links.length; i++) {
      const l = index.links[i], target = index.targets[i];
      if (!idSet.has(target)) continue;
      const src = l.src;
      if (!idSet.has(src.id)) continue;
      if (l.secret && !showSecrets) continue;
      if (src.kind === "conlang" && (l.field === "varietyOf" || l.field === "descendedFrom")) continue;
      const own = l.text || l.leaf;
      if (l.rel === "parent") { addLink(target, src.id, own, "directed"); continue; }
      if (l.rel === "spouse") { addLink(src.id, target, own, "spouse"); continue; }
      let label = own;
      if (src.kind === "stemma") label = "links";
      else if (src.kind === "map" && l.field === "pins") label = l.text ? `📍 ${l.text}` : "📍 pin";
      else if (src.kind === "fabula" && l.field === "storyIds") label = "includes";
      addLink(src.id, target, label, "directed");
    }
'''),
    ),
])


def main():
    staged = []
    for path, steps in PLAN:
        text = path.read_text(encoding="utf-8")
        for step in steps:
            if step[0] == "span":
                _, start, end, new = step
                a = text.count(start)
                assert a == 1, f"{path.name}: span start occurs {a} times:\n{start[:300]}"
                b = text.count(end)
                assert b == 1, f"{path.name}: span end occurs {b} times:\n{end[:300]}"
                i = text.index(start)
                j = text.index(end)
                assert j > i, f"{path.name}: span end before its start:\n{start[:200]}"
                text = text[:i] + new + text[j + len(end):]
                continue
            old, new = step[0], step[1]
            count = step[2] if len(step) > 2 else 1
            n = text.count(old)
            assert n == count, f"{path.name}: anchor occurs {n} times, not {count}:\n{old[:300]}"
            text = text.replace(old, new)
        staged.append((path, text))
    for path, text in staged:
        path.write_text(text, encoding="utf-8")
    print(f"r043 applied to {len(staged)} files")


if __name__ == "__main__":
    main()
