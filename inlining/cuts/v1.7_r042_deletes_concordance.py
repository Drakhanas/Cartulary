"""
v1.7 r042: the delete warnings and Concordance drawn from the link index,
Pipes' fourth cut.

docs/pipes-spec.md, section 4, with the two details Drak settled at the cut
(2026-10-29, one per message: a, a):

1. What each delete clears and what it leaves. Every delete clears the
   stored links it counts: entries', Fabula records', bodies', and ConLangs'
   references and a corpus's reading order. A map pin linked to the record
   loses the link and keeps its label, taking the record's name if it had
   none. Stemma nodes and Tabula cards linked to it turn orphan, as Stemma
   v2 designed. [[links]] to it stay as typed and show as broken, counted on
   a line of their own. That closes the backlog's rows on a Glossopoeia
   delete leaving entries' references and a deleted language leaving its
   children's Descended From.
2. How Concordance finds a [[link]]'s target once it reads the index: by
   the index's rules, the entry page's, so Name History and a body's other
   names draw edges, a name two entries share goes to the first, and a
   [[link]] to a map, a stemma, or a Fabula or Glossopoeia record draws none
   until r043 gives the one resolver those records. The spec's acceptance
   line takes that exception.

With them, Claude's defaults, said before the first call and not stopped:
one delete modal for every record delete, an entry, a template, a body, a
map, a stemma, a story, a corpus, a Fabula record, or a Glossopoeia
language, word, or other record, in place of each one's confirm or inline
prompt; an act or a chapter that holds anything keeps its Move up / Delete
everything choice, its counts from the index. The counts come from the
index; a template, a story, or a language counts what goes with it, and a
link between two records that go together isn't counted. A link through a
secret field counts while secrets are hidden, since the delete clears it
either way; the modal gives a number, not the field. The five callers of
countInboundEntryRefs move onto the index and the function goes. Concordance
takes its links from the index and gains what the spec's check found
missing (a story's Brainstorm, Narrators, Places, and Rules in Play, a cast
record's First Appears and Belief Systems, a chapter's POV, a scene's
Walk-ons, Fabula's group subfields, a ConLang's Spoken By and Region, a
body's four lists, and the [[links]] outside entries); its toggles, its
secrets rule, its focus mode, and its edge labels stay.

Settled in the build, from reading it before staging, and said to Drak
with it: a [[link]] that another record will answer to once the record is
gone (a name two entries share, a Name History, a body's other name) is
counted on a line of its own, as leading there, since "show as broken"
would be false of it; a pin without a label is said to take the name, not
to keep a label it hasn't got; and clearLinksTo and scrubFabulaRefs, which
every delete now runs, keep the identity of what they don't change, so
what's kept from the index's last build stays kept.

And one found by r041's probe, rerun on the build: the index used to keep a
record's stored links ahead of its [[links]], so a Referenced by row named
"Ally / Mentor, Title, Description" and a map's "Pin: ..., Description";
one list per record in its record's order put Title first and the pin last.
The row sorts them as r041 did (stored first, each kind in its record's
order), which keeps the record's own order for Concordance, whose labels
then read as r041's; and a map gives its pins before its fields, so a pin's
label leads its edge's in Concordance, as when the registry drew it.

- 22_trunk: the index keeps each link as an object made once with its
  record (linkPush), carrying a parent or spouse declaration's relation, the
  field's own label, and the link's own words, which Concordance draws;
  linkDeleteCounts and clearLinksTo, which keeps the identity of what it
  doesn't change; the map's, the stemma's, and Fabula's registry edges go,
  since Concordance reads those links from the index.
- 29_modals: a section of its own, Record delete: RECORD_DELETE,
  askRecordDelete, recordDeleteLines, RecordDeleteModal.
- 12_trunk: App draws the modal; the entry, template, map, corpus, story,
  and Fabula record deletes ask through it and clear through clearLinksTo,
  as the stemma's does.
- 13_form-engine-display: a Referenced by row names its stored links'
  fields before its [[links]]'s, as at r041.
- 17_concordance: the links from the index.
- 05_field-system: countInboundEntryRefs goes.
- 18_cartographia/04_index, 21_stemma/03_index, 28_fabula/01_index: the
  index rows ask through the modal; mapDeleteMessage and
  fabulaCorpusDeleteMessage go, and fabulaRegistryEdges.
- 21_stemma/00_helpers-canvas: stemmaLinkedTargets and stemmaDeleteMessage
  go.
- 23_glossopoeia/01_substrate, 03_components, 04_view: glossLangRecordIds;
  every delete asks through the modal and clears through clearLinksTo.
- 24_ephemeris/01_shell, 02_asbo: a body's delete clears through
  clearLinksTo and asks through the modal, in place of its inline prompt.
- 28_fabula/03_people: fabulaStoryRecordIds and fabulaStoryGoes in place of
  fabulaInboundCounts, fabulaRecordDeleteMessage, and
  fabulaStoryDeleteMessage; scrubFabulaRefs keeps the identity of what it
  doesn't change. 28_fabula/04_outline: the holding modal counts from the
  index, and fabulaInboundCountsAll goes. 28_fabula/09_templates:
  fabulaSeedIds goes with fabulaRegistryEdges, its one caller.

Declared scope: 05_field-system, 12_trunk, 13_form-engine-display,
17_concordance, 18_cartographia/04_index, 21_stemma/00_helpers-canvas,
21_stemma/03_index, 22_trunk, 23_glossopoeia/01_substrate,
23_glossopoeia/03_components, 23_glossopoeia/04_view, 24_ephemeris/01_shell,
24_ephemeris/02_asbo, 28_fabula/01_index, 28_fabula/03_people,
28_fabula/04_outline, 28_fabula/09_templates, 29_modals. No shell change.
Declarations added: linkPush, linkDeleteCounts, clearLinksTo, RECORD_DELETE,
askRecordDelete, recordDeleteLines, RecordDeleteModal, glossLangRecordIds,
fabulaStoryRecordIds, fabulaStoryGoes. Removed: countInboundEntryRefs,
mapDeleteMessage, stemmaLinkedTargets, stemmaDeleteMessage,
fabulaRegistryEdges, fabulaCorpusDeleteMessage, fabulaInboundCounts,
fabulaRecordDeleteMessage, fabulaStoryDeleteMessage, fabulaInboundCountsAll,
fabulaSeedIds. One header added: `Record delete (v1.7 r042)`.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given), and a span's start and end anchors once each,
the end after the start; nothing is written unless every anchor in every
file holds. Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r042_deletes_concordance.py
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


# ======================================================== 22: the link index
edit(MODULES / "22_trunk.jsx", [
    # the registry's map source: its pins are links the index reads
    SPAN(
        B(r'''
    getColor: () => "#7ec8c8",
    // Outbound pin edges: for each pin with a target entry, map -> entry, with
'''),
        B(r'''
          }
        });
      });
      return edges;
    },
  },
  // v1.7 r027: stemmas, both layouts (docs/stemma-v2-spec.md, section 5).
'''),
        B(r'''
    getColor: () => "#7ec8c8",
    // Its pins are links the link index reads (v1.7 r041), and Concordance
    // draws them from there since r042, as it does a field's link to a map.
  },
  // v1.7 r027: stemmas, both layouts (docs/stemma-v2-spec.md, section 5).
'''),
    ),
    (
        B(r'''
  // The kind is the document's layout. The edges run from the document to
  // every record its linked nodes point at, one per target: Concordance
  // draws them, and Pipes' backlinks will read them as the stemma's mentions.
'''),
        B(r'''
  // The kind is the document's layout. Its linked nodes, cards, and notes are
  // links the link index reads (v1.7 r041), and Concordance draws them from
  // there since r042.
'''),
    ),
    SPAN(
        B(r'''
    getColor: () => "#c8a96e",
    getEdges: (state) => {
'''),
        B(r'''
          if (target !== s.id) edges.push({ source: s.id, target, label: "links", kind: "directed" });
        });
      });
      return edges;
    },
'''),
        B(r'''
    getColor: () => "#c8a96e",
'''),
    ),
    (
        B(r'''
  // Concordance's filter, named by groupName. Their records and edges are read
  // beside Fabula's view (fabulaRegistryInstances, fabulaRegistryEdges).
'''),
        B(r'''
  // Concordance's filter, named by groupName. Their records are read beside
  // Fabula's view (fabulaRegistryInstances), and their links by the link
  // index, which Concordance draws from since v1.7's r042.
'''),
    ),
    (
        B(r'''
    getColor: () => k.color,
    getEdges: (state) => fabulaRegistryEdges(state, k),
  })),
'''),
        B(r'''
    getColor: () => k.color,
  })),
'''),
    ),
    # the index's own section
    (
        B(r'''
// page first asks for it (linksTo). A record's link to itself doesn't count,
// and a scene's belonging to its story isn't a link.
'''),
        B(r'''
// page first asks for it (linksTo). A record's link to itself doesn't count,
// and a scene's belonging to its story isn't a link. Since r042 a link also
// carries a parent or spouse declaration's relation, its field's own label,
// and its own words, for Concordance, which draws from the index too, and a
// delete counts and clears through it (linkDeleteCounts, clearLinksTo).
'''),
    ),
    SPAN(
        B(r'''
// The [[links]] in a text, each by its target's name, trimmed and lowercased,
'''),
        B(r'''
  LINK_INDEX_MEMO.records.set(rec, x);
  return x;
};
'''),
        B(r'''
// A link as the index keeps it, made once when its record is read (r042): the
// record it's in (src); what it points at (to), a stored link's id or a
// [[link]]'s name, trimmed and lowercased, for the name resolver; its kind,
// "ref" or "wiki"; the field it runs through, by the top-level field's id,
// which a page's own list is matched by (field), and by label, a group's
// subfield under its group (label) and alone (leaf); whether that field is
// secret; a parent or spouse declaration's relation (rel); and the link's own
// words (text): a declaration's label, a [[link|shown]]'s shown part, or a
// pin's label. The index hands these out as they are.
const linkPush = (x, to, kind, field, label, leaf, secret, rel, text) => {
  x.links.push({ src: x.src, to, kind, field, label, leaf, secret, rel: rel || null, text: text || null });
};

// The [[links]] in a text, each by its target's name, trimmed and lowercased,
// [[target|shown]] by its target, as the entry view reads it.
const linkWikiNames = (text, fid, label, leaf, secret, x) => {
  if (typeof text !== "string" || text.indexOf("[[") < 0) return;
  const re = /\[\[([^\]\n]+)\]\]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const inner = m[1].trim();
    const pipe = inner.indexOf("|");
    const name = (pipe >= 0 ? inner.substring(0, pipe) : inner).trim().toLowerCase();
    if (name) linkPush(x, name, "wiki", fid, label, leaf, secret, null, pipe >= 0 ? inner.substring(pipe + 1).trim() : null);
  }
};

// A record's links through a template's fields: a reference's ids and the
// [[links]] in Short Text and Long Text, down through groups (a subfield
// labeled under its group, and secret when either is) and a grid's reference
// cells. A parent or spouse declaration keeps its relation and its label.
const linkFieldWalk = (fields, values, x, up) => {
  if (!values || typeof values !== "object") return;
  (Array.isArray(fields) ? fields : []).forEach(f => {
    if (!f || !f.id) return;
    const v = values[f.id];
    if (v == null || v === "") return;
    const fid = up ? up.fid : f.id;
    const leaf = f.label || "";
    const label = up ? `${up.label} › ${leaf}` : leaf;
    const secret = (up ? up.secret : false) || !!f.secret;
    if (f.type === "entry-ref") {
      const rel = f.relationKind === "parent" || f.relationKind === "spouse" ? f.relationKind : null;
      (Array.isArray(v) ? v : [v]).forEach(it => {
        const id = typeof it === "string" ? it : (it && typeof it === "object" ? it.id : null);
        if (typeof id !== "string" || !id) return;
        const said = rel && it && typeof it === "object" && typeof it.label === "string" ? it.label.trim() : null;
        linkPush(x, id, "ref", fid, label, leaf, secret, rel, said);
      });
    } else if (f.type === "text" || f.type === "textarea") {
      linkWikiNames(v, fid, label, leaf, secret, x);
    } else if (f.type === "group" && Array.isArray(v)) {
      v.forEach(inst => linkFieldWalk(f.subfields, inst, x, { fid, label, secret }));
    } else if (f.type === "grid") {
      forEachGridRefCell(coerceGridValue(v), (rid, cid, cell) => {
        if (typeof cell.value === "string" && cell.value) linkPush(x, cell.value, "ref", fid, label, leaf, secret, null, null);
      });
    }
  });
};

// One record's links, read by read(x) into x.src and x.links, or kept from
// an earlier build when the record and what it was read through (deps) are
// the same objects.
const linkRecordLinks = (rec, deps, read) => {
  const hit = LINK_INDEX_MEMO.records.get(rec);
  if (hit && hit.deps === deps) return hit;
  const x = { deps, src: null, links: [] };
  read(x);
  LINK_INDEX_MEMO.records.set(rec, x);
  return x;
};
'''),
    ),
    (
        B(r'''
// The index, { byTarget }: each target's links as { src, field, label,
// secret, kind }, kind "ref" or "wiki", and src the source as { id, kind,
// group, name, storyId }, its kind entry, fabula, map, stemma, body, conlang,
// or world, and its group its template, its Fabula kind, or its kind again.
// Put together again only when a slice it reads has changed.
'''),
        B(r'''
// The index, { byTarget }: each target's links as linkPush makes them, src
// the source as { id, kind, group, name, storyId }, its kind entry, fabula,
// map, stemma, body, conlang, or world, and its group its template, its
// Fabula kind, or its kind again. Put together again only when a slice it
// reads has changed.
'''),
    ),
    SPAN(
        B(r'''
  const put = (target, src, field, label, secret, kind) => {
'''),
        B(r'''
    for (let i = 0; i < w.length; i += 4) put(resolve(w[i]), x.src, w[i + 1], w[i + 2], w[i + 3], "wiki");
  };
'''),
        B(r'''
  // A kept link goes into its target's list as it is; a [[link]]'s target is
  // found by name at every build, since names change without the link.
  const add = (x) => {
    const ls = x.links;
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i];
      const target = l.kind === "wiki" ? resolve(l.to) : l.to;
      if (typeof target !== "string" || !target || target === l.src.id) continue;
      let list = byTarget.get(target);
      if (!list) { list = []; byTarget.set(target, list); }
      list.push(l);
    }
  };
'''),
    ),
    (
        B(r'''
          r.storyIds.forEach(id => { if (typeof id === "string" && id) x.stored.push(id, "storyIds", "Reading order", false); });
'''),
        B(r'''
          r.storyIds.forEach(id => { if (typeof id === "string" && id) linkPush(x, id, "ref", "storyIds", "Reading order", "Reading order", false, null, null); });
'''),
    ),
    (
        B(r'''
  // Maps: their three fields and their pins.
  if (!memo.mapFields) memo.mapFields = cartographiaMapSchema().fields;
  (Array.isArray(st.cartographia) ? st.cartographia : []).forEach(m => {
    if (!m || !m.id) return;
    add(linkRecordLinks(m, memo.mapFields, (x) => {
      x.src = { id: m.id, kind: "map", group: "map", name: m.name || "", storyId: null };
      linkFieldWalk(memo.mapFields, m.fields, x, null);
      const pins = m.mapData && Array.isArray(m.mapData.pins) ? m.mapData.pins : [];
      pins.forEach(pin => {
        if (!pin || typeof pin.entryId !== "string" || !pin.entryId) return;
        const named = typeof pin.label === "string" ? pin.label.trim() : "";
        x.stored.push(pin.entryId, "pins", named ? `Pin: ${named}` : "Pin", false);
      });
    }));
  });
'''),
        B(r'''
  // Maps: their pins, then their three fields, so in Concordance a pin's
  // label leads its edge's, as when the registry drew the pins alone (r042).
  if (!memo.mapFields) memo.mapFields = cartographiaMapSchema().fields;
  (Array.isArray(st.cartographia) ? st.cartographia : []).forEach(m => {
    if (!m || !m.id) return;
    add(linkRecordLinks(m, memo.mapFields, (x) => {
      x.src = { id: m.id, kind: "map", group: "map", name: m.name || "", storyId: null };
      const pins = m.mapData && Array.isArray(m.mapData.pins) ? m.mapData.pins : [];
      pins.forEach(pin => {
        if (!pin || typeof pin.entryId !== "string" || !pin.entryId) return;
        const named = typeof pin.label === "string" ? pin.label.trim() : "";
        linkPush(x, pin.entryId, "ref", "pins", named ? `Pin: ${named}` : "Pin", "Pin", false, null, named);
      });
      linkFieldWalk(memo.mapFields, m.fields, x, null);
    }));
  });
'''),
    ),
    (
        B(r'''
          if (it.type === "linked" && typeof it.entryId === "string" && it.entryId) x.stored.push(it.entryId, "card", "card", false);
          else if (it.type === "note") linkWikiNames(it.body, "note", "note", false, x);
'''),
        B(r'''
          if (it.type === "linked" && typeof it.entryId === "string" && it.entryId) linkPush(x, it.entryId, "ref", "card", "card", "card", false, null, null);
          else if (it.type === "note") linkWikiNames(it.body, "note", "note", "note", false, x);
'''),
    ),
    (
        B(r'''
          if (node.type === "linked" && typeof node.entryId === "string" && node.entryId) x.stored.push(node.entryId, "node", "linked node", false);
'''),
        B(r'''
          if (node.type === "linked" && typeof node.entryId === "string" && node.entryId) linkPush(x, node.entryId, "ref", "node", "linked node", "linked node", false, null, null);
'''),
    ),
    (
        B(r'''
          if (typeof id === "string" && id) x.stored.push(id, k, label, false);
'''),
        B(r'''
          if (typeof id === "string" && id) linkPush(x, id, "ref", k, label, label, false, null, null);
'''),
    ),
    (
        B(r'''
        .forEach(([k, label]) => linkWikiNames(b[k], k, label, false, x));
'''),
        B(r'''
        .forEach(([k, label]) => linkWikiNames(b[k], k, label, label, false, x));
'''),
    ),
    (
        B(r'''
    const x = { src: { id: LINK_SOURCE_WORLD, kind: "world", group: "world", name: "World description", storyId: null }, stored: [], wiki: [] };
    linkWikiNames(desc, "description", "", false, x);
'''),
        B(r'''
    const x = { src: { id: LINK_SOURCE_WORLD, kind: "world", group: "world", name: "World description", storyId: null }, links: [] };
    linkWikiNames(desc, "description", "", "", false, x);
'''),
    ),
    (
        B(r'''
// What links to one record: its links in the index, or none.
const linksTo = (state, id) => (typeof id === "string" && id ? (linkIndexOf(state).byTarget.get(id) || []) : []);
''').rstrip("\n"),
        B(r'''
// What links to one record: its links in the index, or none.
const linksTo = (state, id) => (typeof id === "string" && id ? (linkIndexOf(state).byTarget.get(id) || []) : []);

// What a delete of the records in ids reaches, from the index (r042, Drak's
// call 1 at the cut), counting only links from records outside going (ids,
// unless a delete counts part of what goes, as the holding modal does): the
// records whose stored links to them it clears, by kind (refs: entry,
// fabula:<kind>, body, or conlang, each a set of source ids); the map pins it
// unlinks, those with a label (pins) and those without (pinsBare); the stemma
// nodes and cards it leaves orphaned and the stemmas they're in; and the
// places whose [[links]] to them stay as typed, broken (wiki) or, where
// another record answers to the name once what goes is gone, leading there
// (wikiMoved). A link through a secret field counts, since the delete clears
// it either way.
const linkDeleteCounts = (state, ids, going) => {
  const out = { refs: new Map(), pins: 0, pinsBare: 0, nodes: 0, cards: 0, stemmas: new Set(), wiki: new Set(), wikiMoved: new Set() };
  const list = Array.isArray(ids) ? ids : [...(ids || [])];
  const outside = going instanceof Set ? going : new Set(list);
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
  list.forEach(id => linksTo(state, id).forEach(l => {
    if (outside.has(l.src.id)) return;
    if (l.kind === "wiki") { (resolvesAfter(l.to) ? out.wikiMoved : out.wiki).add(l.src.id); return; }
    if (l.src.kind === "stemma") { out.stemmas.add(l.src.id); if (l.field === "card") out.cards += 1; else out.nodes += 1; return; }
    if (l.src.kind === "map") { if (l.text) out.pins += 1; else out.pinsBare += 1; return; }
    const key = l.src.kind === "fabula" ? `fabula:${l.src.group}` : l.src.kind;
    if (!out.refs.has(key)) out.refs.set(key, new Set());
    out.refs.get(key).add(l.src.id);
  }));
  return out;
};

// The world without the stored links into ids, as every delete leaves it
// (r042, Drak's call 1 at the cut): entries', Fabula records', bodies', and
// ConLangs' references cleared, a cast record whose character goes kept and
// marked (scrubFabulaRefs), and a corpus's reading order without them; a map
// pin unlinked, keeping its label or taking the record's name if it had
// none; a stemma's nodes and cards left orphaned, as Stemma v2 has them; and
// [[links]] left as typed. A slice or a record it doesn't change keeps its
// identity, so what's kept from the last build of the index stays kept. The
// records themselves are the caller's to remove, after this, so their names
// are still there to read.
const clearLinksTo = (state, ids) => {
  const going = ids instanceof Set ? ids : new Set(ids || []);
  if (!state || going.size === 0) return state;
  const keep = (was, now) => (now.length === was.length && now.every((x, i) => x === was[i]) ? was : now);
  const names = new Map();
  (Array.isArray(state.entries) ? state.entries : []).forEach(e => { if (e && going.has(e.id)) names.set(e.id, e.name || ""); });
  if (names.size < going.size) getRegisteredGraphNodes(state).forEach(n => { if (going.has(n.id) && !names.has(n.id)) names.set(n.id, n.name || ""); });
  const now = isoNow();
  const ents = Array.isArray(state.entries) ? state.entries : [];
  const next = { ...state, entries: keep(ents, scrubEntryRefs(ents, Array.isArray(state.templates) ? state.templates : [], going)) };
  let fab = scrubFabulaRefs(state, going, names);
  if (fab && Array.isArray(fab.corpora) && fab.corpora.some(c => c && Array.isArray(c.storyIds) && c.storyIds.some(id => going.has(id)))) {
    fab = { ...fab, corpora: fab.corpora.map(c => (c && Array.isArray(c.storyIds) && c.storyIds.some(id => going.has(id)) ? { ...c, storyIds: c.storyIds.filter(id => !going.has(id)), updatedAt: now } : c)) };
  }
  next.fabula = fab;
  const refId = (it) => (typeof it === "string" ? it : (it && typeof it === "object" ? it.id : null));
  if (Array.isArray(state.celestialBodies)) {
    next.celestialBodies = keep(state.celestialBodies, state.celestialBodies.map(b => {
      if (!b) return b;
      let out = b;
      ["visibleFrom", "notableLocations", "inhabitedBy", "sacredTo"].forEach(k => {
        if (Array.isArray(b[k]) && b[k].some(it => going.has(refId(it)))) out = { ...out, [k]: b[k].filter(it => !going.has(refId(it))) };
      });
      return out;
    }));
  }
  const glo = state.glossopoeia;
  if (glo && Array.isArray(glo.conlangs) && glo.conlangs.length > 0) {
    const tpl = { id: SYNTH_TPL_CONLANG, fields: linkKindFields(state, "conlang") };
    const tagged = glo.conlangs.map(c => (c && typeof c === "object" ? { ...c, templateId: tpl.id } : { templateId: null }));
    const scrubbed = scrubEntryRefs(tagged, [tpl], going);
    if (scrubbed.some((c, i) => c !== tagged[i])) {
      next.glossopoeia = { ...glo, conlangs: scrubbed.map((c, i) => {
        if (c === tagged[i]) return glo.conlangs[i];
        const { templateId, ...rest } = c;
        return rest;
      }) };
    }
  }
  if (Array.isArray(state.cartographia)) {
    next.cartographia = keep(state.cartographia, state.cartographia.map(m => {
      const pins = m && m.mapData && Array.isArray(m.mapData.pins) ? m.mapData.pins : null;
      if (!pins || !pins.some(p => p && going.has(p.entryId))) return m;
      return { ...m, mapData: { ...m.mapData, pins: pins.map(p => (p && going.has(p.entryId)
        ? { ...p, entryId: null, label: (typeof p.label === "string" && p.label.trim()) ? p.label : (names.get(p.entryId) || "") }
        : p)) }, updatedAt: now };
    }));
  }
  return next;
};
''').rstrip("\n"),
    ),
])


# ============================================================== 29: the modal
RECORD_DELETE_SECTION = B(r'''


// ─── Record delete (v1.7 r042) ─────────────────────────────────────────────────
// docs/pipes-spec.md, section 4, with Drak's calls at the cut: one modal for
// every record a link can point at, an entry, a template with its entries, a
// body, a map, a stemma, a story, a corpus, a Fabula record, or a Glossopoeia
// record, where a confirm or an inline prompt asked before. It says what goes
// with the record, if anything, and what the delete does to what links to
// it, counted from the link index (linkDeleteCounts): the stored links it
// clears, by the kind of record they're in, the map pins it unlinks, the
// stemma nodes and cards it leaves orphaned, and the [[links]] that stay as
// typed. Anything can ask (askRecordDelete); App draws it once.

const RECORD_DELETE = { open: null };

// ask: { state, ids, title, goes, onConfirm }, ids what goes, goes a line for
// what goes with the record, or null.
const askRecordDelete = (ask) => {
  if (RECORD_DELETE.open) { RECORD_DELETE.open(ask); return; }
  if (window.confirm(ask.title)) ask.onConfirm();
};

// What a delete of the records in ids does to what links to them, one
// sentence a line, "it" or "them" by how many go; going as linkDeleteCounts
// takes it.
const recordDeleteLines = (state, ids, going) => {
  const list = Array.isArray(ids) ? ids : [...(ids || [])];
  const c = linkDeleteCounts(state, list, going);
  const it = list.length > 1 ? "them" : "it";
  const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const kinds = [["entry", "entry", "entries"], ...FABULA_KINDS.map(k => [`fabula:${k.kind}`, FABULA_NOUNS[k.kind].one, FABULA_NOUNS[k.kind].many]), ["body", "body", "bodies"], ["conlang", "language", "languages"]];
  const lines = [];
  const from = kinds.filter(([key]) => c.refs.has(key)).map(([key, one, many]) => [c.refs.get(key).size, one, many]);
  const holders = from.reduce((n, [k]) => n + k, 0);
  if (from.length > 0) lines.push(`Removes ${it} from ${fabulaJoin(from.map(([n, one, many]) => count(n, one, many)))}, which ${holders === 1 ? "stays" : "stay"}.`);
  if (c.pins > 0) lines.push(c.pins === 1 ? "A map pin loses its link and keeps its label." : `${c.pins} map pins lose their links and keep their labels.`);
  if (c.pinsBare > 0) lines.push(c.pinsBare === 1 ? "A map pin without a label loses its link and takes the name it pointed at." : `${c.pinsBare} map pins without labels lose their links and take the names they pointed at.`);
  const held = c.nodes + c.cards;
  if (held > 0) lines.push(`${fabulaJoin([c.nodes ? count(c.nodes, "linked node", "linked nodes") : null, c.cards ? count(c.cards, "card", "cards") : null].filter(Boolean))} in ${count(c.stemmas.size, "stemma", "stemmas")} ${held === 1 ? "stays" : "stay"}, unlinked.`);
  if (c.wiki.size > 0) lines.push(`[[Links]] to ${it} in ${count(c.wiki.size, "place", "places")} stay as typed and show as broken.`);
  if (c.wikiMoved.size > 0) lines.push(`[[Links]] to ${it} in ${count(c.wikiMoved.size, "place", "places")} stay as typed and will lead to ${list.length > 1 ? "other records by the same names" : "another record by the same name"}.`);
  return lines;
};

// The modal, drawn once by App; askRecordDelete opens it. Esc and a click
// outside cancel, as Cancel does.
function RecordDeleteModal() {
  const [ask, setAsk] = useState(null);
  useEffect(() => {
    RECORD_DELETE.open = setAsk;
    return () => { if (RECORD_DELETE.open === setAsk) RECORD_DELETE.open = null; };
  }, []);
  useEffect(() => {
    if (!ask) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setAsk(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [ask]);
  const lines = useMemo(() => (ask ? [...(ask.goes ? [ask.goes] : []), ...recordDeleteLines(ask.state, ask.ids)] : []), [ask]);
  if (!ask) return null;
  const doDelete = () => { setAsk(null); ask.onConfirm(); };
  return (
    <div className="modal-backdrop" onClick={() => setAsk(null)}>
      <div className="modal record-delete" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">{ask.title}</div>
        {lines.length > 0 && (
          <div className="modal-body">
            {lines.map((line, i) => <p key={i} className="record-delete-line" style={{ margin: i === 0 ? 0 : "8px 0 0" }}>{line}</p>)}
          </div>
        )}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setAsk(null)}>Cancel</button>
          <button className="btn btn-danger record-delete-confirm" onClick={doDelete} autoFocus>Delete</button>
        </div>
      </div>
    </div>
  );
}''')

edit(MODULES / "29_modals.jsx", [
    (
        B(r'''
            Restore {selected.size === 0 ? "" : `(${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}'''),
        B(r'''
            Restore {selected.size === 0 ? "" : `(${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}''') + RECORD_DELETE_SECTION,
    ),
])


# ================================================================ 12: App
edit(MODULES / "12_trunk.jsx", [
    (
        B(r'''
    // v1.7 r003: maps are reference targets, so the delete clears references
    // to this one from every entry's fields, groups and grids included, as a
    // body's delete does; both confirmations count them first
    // (mapDeleteMessage). Any lingering concordance position keyed by this id
    // is dropped on next load by migrate's position validation; live, it
    // simply stops rendering.
    updateState(s => ({
      ...s,
      cartographia: (s.cartographia || []).filter(m => m.id !== id),
      entries: scrubEntryRefs(s.entries, s.templates, new Set([id])),
    }));
'''),
        B(r'''
    // v1.7 r003: maps are reference targets, so the delete clears references
    // to this one, and since r042 every link the index reads (clearLinksTo),
    // which the delete modal counts first. Any lingering concordance position
    // keyed by this id is dropped on next load by migrate's position
    // validation; live, it simply stops rendering.
    updateState(s => {
      const cleared = clearLinksTo(s, new Set([id]));
      return { ...cleared, cartographia: (cleared.cartographia || []).filter(m => m.id !== id) };
    });
'''),
    ),
    (
        B(r'''
  const deleteCorpus = (id) => {
    if (isLocked) return;
    updateFabula(fab => ({ ...fab, corpora: fabArr(fab, "corpora").filter(c => c.id !== id) }));
'''),
        B(r'''
  const deleteCorpus = (id) => {
    if (isLocked) return;
    // v1.7 r042: what links to it, a stemma's card, is left orphaned
    updateState(s => {
      const cleared = clearLinksTo(s, new Set([id]));
      const fab = cleared.fabula || {};
      return { ...cleared, fabula: { ...fab, corpora: fabArr(fab, "corpora").filter(c => c.id !== id) } };
    });
'''),
    ),
    (
        B(r'''
  const deleteStory = (id) => {
    if (isLocked) return;
    updateFabula(fab => ({
      ...fab,
      ...fabulaDropStoryRecords(fab, id),
      stories: fabArr(fab, "stories").filter(st => st.id !== id),
      corpora: fabArr(fab, "corpora").map(c => (c.storyIds || []).includes(id) ? { ...c, storyIds: c.storyIds.filter(x => x !== id) } : c),
    }));
  };
'''),
        B(r'''
  const deleteStory = (id) => {
    if (isLocked) return;
    // v1.7 r042: the links into it and its records go first, everywhere the
    // index reads, its corpus's reading order among them (clearLinksTo)
    updateState(s => {
      const cleared = clearLinksTo(s, new Set([id, ...fabulaStoryRecordIds(s, id)]));
      const fab = cleared.fabula || {};
      return { ...cleared, fabula: { ...fab, ...fabulaDropStoryRecords(fab, id), stories: fabArr(fab, "stories").filter(st => st.id !== id) } };
    });
  };
'''),
    ),
    (
        B(r'''
    if (!rec || isLocked) return;
    if (!confirm(fabulaStoryDeleteMessage(state, rec))) return;
    deleteStory(rec.id);
    setStoryDraft(null); initialStoryDraftRef.current = null;
    setActiveStoryId(null);
  };
'''),
        B(r'''
    if (!rec || isLocked) return;
    askRecordDelete({
      state, ids: [rec.id, ...fabulaStoryRecordIds(state, rec.id)],
      title: `Delete the story "${rec.name || "untitled story"}"?`, goes: fabulaStoryGoes(state, rec),
      onConfirm: () => {
        deleteStory(rec.id);
        setStoryDraft(null); initialStoryDraftRef.current = null;
        setActiveStoryId(null);
      },
    });
  };
'''),
    ),
    (
        B(r'''
    if (fabulaOutlineHolding(state, activeRecord.kind, rec).length > 0) { setFabulaHoldsAsk({ kind: activeRecord.kind, id: rec.id }); return; }
    if (!confirm(fabulaRecordDeleteMessage(state, activeRecord.kind, rec))) return;
    finishFabulaDelete(activeRecord.kind, rec, false);
  };

  const finishFabulaDelete = (kind, rec, lift) => {
    if (isLocked) return;
    updateState(s => {
      const { fab, gone } = fabulaOutlineDelete(s.fabula || {}, kind, rec, lift);
      return { ...s, fabula: scrubFabulaRefs({ ...s, fabula: fab }, gone) };
    });
'''),
        B(r'''
    if (fabulaOutlineHolding(state, activeRecord.kind, rec).length > 0) { setFabulaHoldsAsk({ kind: activeRecord.kind, id: rec.id }); return; }
    const kind = activeRecord.kind;
    askRecordDelete({
      state, ids: [rec.id], title: `Delete the ${FABULA_NOUNS[kind].one} "${rec.name || "untitled"}"?`,
      onConfirm: () => finishFabulaDelete(kind, rec, false),
    });
  };

  // v1.7 r042: what went is cleared everywhere the index reads; Fabula's
  // records are gone by then, which costs nothing, since a pin's name comes
  // from an entry or a body.
  const finishFabulaDelete = (kind, rec, lift) => {
    if (isLocked) return;
    updateState(s => {
      const { fab, gone } = fabulaOutlineDelete(s.fabula || {}, kind, rec, lift);
      return clearLinksTo({ ...s, fabula: fab }, gone);
    });
'''),
    ),
    (
        B(r'''
  const deleteEntry = () => {
    if (!activeEntryId) return;
    if (!confirm(`Delete "${activeEntry?.name}"?`)) return;
    updateState(s => {
      const deletedIds = new Set([activeEntryId]);
      const remaining = s.entries.filter(e => e.id !== activeEntryId);
      // v1.7 r009: Fabula's references to it go too, and a cast record whose
      // character it was stays, marked (spec, section 9).
      const names = new Map([[activeEntryId, activeEntry ? activeEntry.name : ""]]);
      return { ...s, entries: scrubEntryRefs(remaining, s.templates, deletedIds), fabula: scrubFabulaRefs(s, deletedIds, names) };
    });
    setActiveEntryId(null); clearDraftAndStorage(); setView("list");
    flash("Deleted");
  };
'''),
        B(r'''
  // v1.7 r042: the delete modal asks, counting what links to the entry, in
  // place of the bare prompt, and the delete clears those links everywhere
  // the index reads (clearLinksTo); a cast record whose character it was
  // stays, marked (v1.7 r009).
  const deleteEntry = () => {
    if (!activeEntryId) return;
    const id = activeEntryId;
    askRecordDelete({
      state, ids: [id], title: `Delete "${activeEntry?.name}"?`,
      onConfirm: () => {
        updateState(s => {
          const cleared = clearLinksTo(s, new Set([id]));
          return { ...cleared, entries: cleared.entries.filter(e => e.id !== id) };
        });
        setActiveEntryId(null); clearDraftAndStorage(); setView("list");
        flash("Deleted");
      },
    });
  };
'''),
    ),
    (
        B(r'''
    if (!confirm(msg)) return;
    updateState(s => {
      const deletedEntryIds = new Set(
        s.entries.filter(e => e.templateId === activeTemplateId).map(e => e.id)
      );
      const remainingTemplates = s.templates.filter(t => t.id !== activeTemplateId);
      const remainingEntries = s.entries.filter(e => e.templateId !== activeTemplateId);
      // v1.7 r009: Fabula's references to its entries go too (spec, section 9).
      const names = new Map(s.entries.filter(e => deletedEntryIds.has(e.id)).map(e => [e.id, e.name]));
      return {
        ...s,
        templates: remainingTemplates,
        entries: scrubEntryRefs(remainingEntries, remainingTemplates, deletedEntryIds),
        fabula: scrubFabulaRefs(s, deletedEntryIds, names),
      };
    });
    setActiveTemplateId(null); clearDraftAndStorage();
    // v1.7 r016: Plot Thread or Theme / Motif deleted lands on its section of
    // Fabula's index, which then offers Restore.
    if (fabRole) landOnFabulaSection(fabRole); else setView("home");
    flash("Template deleted");
  };
'''),
        B(r'''
    // v1.7 r042: the delete modal asks, counting what links to its entries,
    // and the delete clears those links everywhere the index reads.
    const tid = activeTemplateId;
    askRecordDelete({
      state, ids: state.entries.filter(e => e.templateId === tid).map(e => e.id), title: msg,
      onConfirm: () => {
        updateState(s => {
          const cleared = clearLinksTo(s, new Set(s.entries.filter(e => e.templateId === tid).map(e => e.id)));
          return { ...cleared, templates: cleared.templates.filter(t => t.id !== tid), entries: cleared.entries.filter(e => e.templateId !== tid) };
        });
        setActiveTemplateId(null); clearDraftAndStorage();
        // v1.7 r016: Plot Thread or Theme / Motif deleted lands on its section
        // of Fabula's index, which then offers Restore.
        if (fabRole) landOnFabulaSection(fabRole); else setView("home");
        flash("Template deleted");
      },
    });
  };
'''),
    ),
    (
        B(r'''
    // v1.7 r027: a stemma is a reference target, so its delete clears the
    // references to it from every entry's fields and from Fabula's records,
    // as a map's and a body's do; the index's confirmation counts them first
    // (stemmaDeleteMessage). Linked nodes in other stemmas orphan.
    updateState(s => ({
      ...s,
      stemmas: (s.stemmas || []).filter(st => st.id !== stemmaId),
      entries: scrubEntryRefs(s.entries, s.templates, new Set([stemmaId])),
      fabula: scrubFabulaRefs(s, new Set([stemmaId])),
    }));
'''),
        B(r'''
    // v1.7 r027: a stemma is a reference target, so its delete clears the
    // references to it, and since r042 every stored link the index reads
    // (clearLinksTo), which the delete modal counts first. Linked nodes in
    // other stemmas orphan.
    updateState(s => {
      const cleared = clearLinksTo(s, new Set([stemmaId]));
      return { ...cleared, stemmas: (cleared.stemmas || []).filter(st => st.id !== stemmaId) };
    });
'''),
    ),
    (
        B(r'''
                  const rec = (state.cartographia || []).find(m => m.id === activeMapId);
                  if (rec && confirm(mapDeleteMessage(rec, state))) deleteMap(activeMapId);
'''),
        B(r'''
                  const rec = (state.cartographia || []).find(m => m.id === activeMapId);
                  if (rec) askRecordDelete({ state, ids: [rec.id], title: `Delete map "${rec.name}"?`, onConfirm: () => deleteMap(rec.id) });
'''),
    ),
    (
        B(r'''
                  const rec = ((state.fabula && state.fabula.corpora) || []).find(c => c.id === activeCorpusId);
                  if (rec && confirm(fabulaCorpusDeleteMessage(rec))) deleteCorpus(activeCorpusId);
'''),
        B(r'''
                  const rec = ((state.fabula && state.fabula.corpora) || []).find(c => c.id === activeCorpusId);
                  const n = rec && Array.isArray(rec.storyIds) ? rec.storyIds.length : 0;
                  if (rec) askRecordDelete({
                    state, ids: [rec.id], title: `Delete the corpus "${rec.name || "this corpus"}"?`,
                    goes: n === 0 ? null : `Its ${n === 1 ? "story stays" : `${n} stories stay`} in Fabula, in no corpus.`,
                    onConfirm: () => deleteCorpus(rec.id),
                  });
'''),
    ),
    (
        B(r'''
      {destructiveOp && (
        <DestructiveOpModal
'''),
        B(r'''
      <RecordDeleteModal />

      {destructiveOp && (
        <DestructiveOpModal
'''),
    ),
])


# ================================================ 13: the Referenced by rows
edit(MODULES / "13_form-engine-display.jsx", [
    (
        B(r'''
  const rows = new Map();
  linksTo(state, targetId).forEach(l => {
    if (l.secret && !showSecrets) return;
    if (exclude && l.src.kind === "fabula" && exclude.some(([kind, field]) => kind === l.src.group && field === l.field)) return;
    let r = rows.get(l.src.id);
    if (!r) { r = { src: l.src, labels: [] }; rows.set(l.src.id, r); }
    if (l.label && !r.labels.includes(l.label)) r.labels.push(l.label);
  });
'''),
        B(r'''
  const rows = new Map();
  const shown = linksTo(state, targetId).filter(l => !(l.secret && !showSecrets)
    && !(exclude && l.src.kind === "fabula" && exclude.some(([kind, field]) => kind === l.src.group && field === l.field)));
  shown.forEach(l => { if (!rows.has(l.src.id)) rows.set(l.src.id, { src: l.src, labels: [] }); });
  // A row names the fields of its stored links first, then those of its
  // [[links]], each in its record's order, as at r041; since r042 the index
  // keeps a record's links in one list in its record's order, for
  // Concordance's labels.
  [false, true].forEach(wiki => shown.forEach(l => {
    if ((l.kind === "wiki") !== wiki) return;
    const r = rows.get(l.src.id);
    if (l.label && !r.labels.includes(l.label)) r.labels.push(l.label);
  }));
'''),
    ),
])


# ======================================================== 17: Concordance
edit(MODULES / "17_concordance.jsx", [
    (
        B(r'''
    // Name → id lookup for resolving wiki-links (lowercase, exact-match).
    // Entries first, then registered nodes (first writer wins on collision).
    const nameToId = {};
    ents.forEach(e => { nameToId[e.name.trim().toLowerCase()] = e.id; });
    regNodes.forEach(n => { const k = (n.name || "").trim().toLowerCase(); if (k && !(k in nameToId)) nameToId[k] = n.id; });

'''),
        "",
    ),
    SPAN(
        B(r'''
    const wikiRe = /\[\[([^\]\n]+)\]\]/g;

    ents.forEach(e => {
'''),
        B(r'''
    getRegisteredGraphEdges(state).forEach(ed => addLink(ed.source, ed.target, ed.label, ed.kind || "directed"));
'''),
        B(r'''
    // v1.7 r042: every link from the index (docs/pipes-spec.md, section 4,
    // with Drak's calls at the cut). Entries' links as the scan here drew
    // them, a parent declaration parent to child and a spouse's both ways,
    // each by its field's own label or its own words, and the links the scan
    // never read: Fabula's fields at any depth, bodies' and ConLangs'
    // reference fields, and the [[links]] outside entries. [[links]] resolve
    // by the entry view's rules, as the index reads them (Drak's call 2), so
    // until r043 one to a map, a stemma, or a Fabula or Glossopoeia record
    // draws no edge, and a name two entries share goes to the first. The
    // labels stay Concordance's own: a pin's 📍, a stemma's "links", and a
    // corpus's "includes". A ConLang's Variety Of and Descended From stay the
    // registry's edges, parent to child.
    linkIndexOf(state).byTarget.forEach((list, target) => {
      if (!idSet.has(target)) return;
      list.forEach(l => {
        const src = l.src;
        if (!idSet.has(src.id)) return;
        if (l.secret && !showSecrets) return;
        if (src.kind === "conlang" && (l.field === "varietyOf" || l.field === "descendedFrom")) return;
        const own = l.text || l.leaf;
        if (l.rel === "parent") { addLink(target, src.id, own, "directed"); return; }
        if (l.rel === "spouse") { addLink(src.id, target, own, "spouse"); return; }
        let label = own;
        if (src.kind === "stemma") label = "links";
        else if (src.kind === "map" && l.field === "pins") label = l.text ? `📍 ${l.text}` : "📍 pin";
        else if (src.kind === "fabula" && l.field === "storyIds") label = "includes";
        addLink(src.id, target, label, "directed");
      });
    });

    // v1.5 r076: registered intra-source edges, the relations that aren't
    // links the index reads: a body's orbit (star -> planet -> moon), a
    // language's dialects and descent, and Glossopoeia's words, sounds, and
    // grammar. Fed through addLink so they dedup and respect the
    // body-inclusive idSet: orbits edges only draw when the body source is
    // toggled on, since toggled-off bodies aren't in idSet.
    getRegisteredGraphEdges(state).forEach(ed => addLink(ed.source, ed.target, ed.label, ed.kind || "directed"));
'''),
    ),
    (
        B(r'''
  }, [state.entries, state.templates, state.celestialBodies, enabledTemplates, showSecrets, focusEntryId, focusDepth]);
'''),
        B(r'''
  }, [state.entries, state.templates, state.celestialBodies, state.fabula, state.cartographia, state.stemmas, state.glossopoeia, enabledTemplates, showSecrets, focusEntryId, focusDepth]);
'''),
    ),
])


# ================================================= 05: the inbound count goes
edit(MODULES / "05_field-system.jsx", [
    SPAN(
        B(r'''
// v1.5 r080: count entries holding at least one entry-ref (incl. grid cells
'''),
        B(r'''
    if (tpl && e.fields && refsTarget(tpl.fields, e.fields)) count++;
  });
  return count;
};

'''),
        "",
    ),
])


# ====================================================== 18: the map index
edit(MODULES / "18_cartographia/04_index.jsx", [
    SPAN(
        B(r'''
// v1.7 r003: a map's delete confirmation, counting the entries that reference
'''),
        B(r'''
  return `Delete map "${rec.name}"?${refs} This cannot be undone.`;
};

'''),
        "",
    ),
    (
        B(r'''
                        if (confirm(mapDeleteMessage(rec, state))) {
                          onDelete(rec.id);
                        }
'''),
        B(r'''
                        askRecordDelete({ state, ids: [rec.id], title: `Delete map "${rec.name}"?`, onConfirm: () => onDelete(rec.id) });
'''),
    ),
])


# ================================================== 21: the stemma helpers
edit(MODULES / "21_stemma/00_helpers-canvas.jsx", [
    SPAN(
        B(r'''
// The ids every linked node of a document points at, each once (v1.7 r027).
'''),
        B(r'''
  else walk(stemma && stemma.root);
  return out;
};

'''),
        "",
    ),
    SPAN(
        B(r'''
// The index's delete confirmation (v1.7 r027), the map's pattern: it counts
'''),
        B(r'''
  return `Delete stemma "${stemma.name}"?${refs} This cannot be undone.`;
};

'''),
        "",
    ),
])

edit(MODULES / "21_stemma/03_index.jsx", [
    (
        B(r'''
                        if (confirm(stemmaDeleteMessage(s, state))) {
                          onDelete(s.id);
                        }
'''),
        B(r'''
                        askRecordDelete({ state, ids: [s.id], title: `Delete stemma "${s.name}"?`, onConfirm: () => onDelete(s.id) });
'''),
    ),
])


# ======================================================== 23: Glossopoeia
edit(MODULES / "23_glossopoeia/01_substrate.jsx", [
    (
        B(r'''
function exportConlangFile(state, langId, flash) {
'''),
        B(r'''
// A language's id and the ids of every record it holds (v1.7 r042), what
// its delete takes with it, for the delete modal's count and clearLinksTo.
const glossLangRecordIds = (state, langId) => {
  const g = (state && state.glossopoeia) || {};
  const ids = new Set([langId]);
  GLOSS_LANG_ARRAYS.forEach(key => (Array.isArray(g[key]) ? g[key] : []).forEach(r => { if (r && r.langId === langId && r.id) ids.add(r.id); }));
  return ids;
};

function exportConlangFile(state, langId, flash) {
'''),
    ),
])

edit(MODULES / "23_glossopoeia/04_view.jsx", [
    (
        B(r'''
  const deleteConlang = (id) => {
    if (isLocked) return;
    updateState(s => {
      const gg = s.glossopoeia || makeDefaultGlossopoeiaState();
'''),
        B(r'''
  // v1.7 r042: each delete clears what links to what goes, everywhere the
  // link index reads, before the records go (clearLinksTo).
  const deleteConlang = (id) => {
    if (isLocked) return;
    updateState(s0 => {
      const s = clearLinksTo(s0, glossLangRecordIds(s0, id));
      const gg = s.glossopoeia || makeDefaultGlossopoeiaState();
'''),
    ),
    (
        B(r'''
  const deleteLexeme = (id) => {
    if (isLocked) return;
    updateState(s => {
      const gg = s.glossopoeia || makeDefaultGlossopoeiaState();
'''),
        B(r'''
  const deleteLexeme = (id) => {
    if (isLocked) return;
    updateState(s0 => {
      const s = clearLinksTo(s0, new Set([id]));
      const gg = s.glossopoeia || makeDefaultGlossopoeiaState();
'''),
    ),
    (
        B(r'''
  const deletePhoneme = (id) => {
    if (isLocked) return;
    updateState(s => {
      const gg = s.glossopoeia || makeDefaultGlossopoeiaState();
'''),
        B(r'''
  const deletePhoneme = (id) => {
    if (isLocked) return;
    updateState(s0 => {
      const s = clearLinksTo(s0, new Set([id]));
      const gg = s.glossopoeia || makeDefaultGlossopoeiaState();
'''),
    ),
    (
        B(r'''
    del: (id) => {
      if (isLocked) return;
      updateState(s => {
        const gg = s.glossopoeia || makeDefaultGlossopoeiaState();
'''),
        B(r'''
    del: (id) => {
      if (isLocked) return;
      updateState(s0 => {
        const s = clearLinksTo(s0, new Set([id]));
        const gg = s.glossopoeia || makeDefaultGlossopoeiaState();
'''),
    ),
    (
        B(r'''
            onClick={() => { if (confirm(`Delete "${activeLang.name || "this language"}"? This removes the language and its Glossopoeia data.`)) deleteConlang(activeLang.id); }}
'''),
        B(r'''
            onClick={() => {
              const lang = activeLang;
              const words = ((state.glossopoeia && state.glossopoeia.lexemes) || []).filter(x => x && x.langId === lang.id).length;
              askRecordDelete({
                state, ids: [...glossLangRecordIds(state, lang.id)], title: `Delete "${lang.name || "this language"}"?`,
                goes: words > 0 ? `Its ${words === 1 ? "word" : `${words} words`} and the rest of its Glossopoeia data go with it.` : "Its Glossopoeia data goes with it.",
                onConfirm: () => deleteConlang(lang.id),
              });
            }}
'''),
    ),
    (
        B(r'''
<button className="btn btn-danger btn-small" onClick={() => { if (confirm(`Delete "${selectedLexeme.name || "this word"}"?`)) deleteLexeme(selectedLexeme.id); }}>Delete word</button>
'''),
        B(r'''
<button className="btn btn-danger btn-small" onClick={() => { const lx = selectedLexeme; askRecordDelete({ state, ids: [lx.id], title: `Delete "${lx.name || "this word"}"?`, onConfirm: () => deleteLexeme(lx.id) }); }}>Delete word</button>
'''),
    ),
])

edit(MODULES / "23_glossopoeia/03_components.jsx", [
    (
        B(r'''
<button className="btn btn-danger btn-small" onClick={() => { if (confirm(`Delete "${sel.name || ("this " + n)}"?`)) { onDelete(sel.id); setSelId(null); } }}>Delete</button>
'''),
        B(r'''
<button className="btn btn-danger btn-small" onClick={() => { const rec = sel; askRecordDelete({ state, ids: [rec.id], title: `Delete "${rec.name || ("this " + n)}"?`, onConfirm: () => { onDelete(rec.id); setSelId(null); } }); }}>Delete</button>
'''),
    ),
])


# ========================================================= 24: Ephemeris
edit(MODULES / "24_ephemeris/01_shell.jsx", [
    (
        B(r'''
  const deleteBody = (bodyId) => {
    if (isLocked) return;
    updateState(s => {
      const cur = s.ephemeris || makeDefaultEphemerisState();
'''),
        B(r'''
  const deleteBody = (bodyId) => {
    if (isLocked) return;
    updateState(s0 => {
      // v1.7 r042: every link the index reads into the body goes first,
      // entries' and Fabula's references among them, as v1.5's r080 and
      // v1.7's r009 cleared them here (clearLinksTo).
      const s = clearLinksTo(s0, new Set([bodyId]));
      const cur = s.ephemeris || makeDefaultEphemerisState();
'''),
    ),
    (
        B(r'''
      return {
        ...s,
        // v1.5 r080: silently scrub inbound entry refs to the deleted body.
        // Body ids are stored as ref values; scrubEntryRefs is id-agnostic, so
        // it strips them from entry-ref / grid / group fields the same way it
        // does for a deleted entry. Intentional deletion is not data loss, so
        // no dead label — the reference just clears.
        entries: scrubEntryRefs(s.entries, s.templates, new Set([bodyId])),
        // v1.7 r009: and Fabula's references to it, the same way.
        fabula: scrubFabulaRefs(s, new Set([bodyId])),
        celestialBodies: remaining,
'''),
        B(r'''
      return {
        ...s,
        celestialBodies: remaining,
'''),
    ),
])

edit(MODULES / "24_ephemeris/02_asbo.jsx", [
    (
        B(r'''
  const [draft, setDraft] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Reset edit + confirm state when the selection changes. Switching bodies
  // mid-edit discards the draft — same pattern as entry editing elsewhere
  // in Cartulary. No unsaved-changes warning in r007; that's r008 polish.
  useEffect(() => {
    setDraft(null);
    setConfirmingDelete(false);
  }, [selectedBodyId]);
'''),
        B(r'''
  const [draft, setDraft] = useState(null);

  // Reset edit state when the selection changes. Switching bodies
  // mid-edit discards the draft — same pattern as entry editing elsewhere
  // in Cartulary. No unsaved-changes warning in r007; that's r008 polish.
  useEffect(() => {
    setDraft(null);
  }, [selectedBodyId]);
'''),
    ),
    (
        B(r'''
            <button
              onClick={() => { if (confirmingDelete) { onDeleteBody(body.id); } else { setConfirmingDelete(true); } }}
              style={{ padding: "6px 14px", background: confirmingDelete ? "#a04848" : "transparent", color: confirmingDelete ? "#fff" : "var(--text-dim)", border: "1px solid var(--border)", borderRadius: 3, fontSize: 12, cursor: "pointer" }}
              title={confirmingDelete ? "Click again to confirm delete" : "Delete this body"}
            >
              {confirmingDelete ? "Confirm delete" : "Delete"}
            </button>
            {confirmingDelete && (
              <button onClick={() => setConfirmingDelete(false)} style={{ padding: "6px 10px", background: "transparent", color: "var(--text-dim)", border: "1px solid var(--border)", borderRadius: 3, fontSize: 12, cursor: "pointer" }}>Cancel</button>
            )}
          </div>
        )}
      </div>
      {confirmingDelete && (() => {
        // v1.5 r080: show the blast radius before a body delete commits. The
        // delete silently scrubs inbound entry refs (deleteBody → scrubEntryRefs);
        // this surfaces how many links will go first, mirroring the calendar
        // destructive-op warning. The entries themselves are untouched.
        const refCount = countInboundEntryRefs(state.entries, state.templates, body.id);
        if (refCount === 0) return null;
        return (
          <div style={{ fontSize: 12, color: "#d08a8a", marginBottom: 12, padding: "6px 10px", border: "1px solid #a04848", borderRadius: 3, background: "rgba(160,72,72,0.08)" }}>
            Referenced by {refCount} {refCount === 1 ? "entry" : "entries"}. Deleting this body removes {refCount === 1 ? "that reference" : "those references"}; the {refCount === 1 ? "entry stays" : "entries stay"} intact.
          </div>
        );
      })()}
'''),
        B(r'''
            {/* v1.7 r042: the delete modal asks, counting what links to the
                body, where a second click and a line here asked before. */}
            <button
              onClick={() => askRecordDelete({ state, ids: [body.id], title: `Delete "${body.name || "this body"}"?`, onConfirm: () => onDeleteBody(body.id) })}
              style={{ padding: "6px 14px", background: "transparent", color: "var(--text-dim)", border: "1px solid var(--border)", borderRadius: 3, fontSize: 12, cursor: "pointer" }}
              title="Delete this body"
            >
              Delete
            </button>
          </div>
        )}
      </div>
'''),
    ),
])


# ============================================================ 28: Fabula
edit(MODULES / "28_fabula/01_index.jsx", [
    (
        B(r'''
// does for maps, and passes them down. What the node-source registry reads
// for Fabula's kinds lives here too: a kind's records as nodes, and each
// corpus's stories as its edges, so Concordance draws a corpus to its
// stories. Links inside a record's fields aren't edges yet.
'''),
        B(r'''
// does for maps, and passes them down. What the node-source registry reads
// for Fabula's kinds lives here too, a kind's records as nodes; their links,
// a corpus's stories among them, Concordance draws from the link index since
// v1.7's r042.
'''),
    ),
    SPAN(
        B(r'''
const fabulaRegistryEdges = (state, k) => {
'''),
        B(r'''
      (Array.isArray(v) ? v : [v]).forEach(t => { if (typeof t === "string" && t) edges.push({ source: r.id, target: t, label: f ? f.label : fid, kind: "directed" }); });
    });
  });
  return edges;
};

'''),
        "",
    ),
    SPAN(
        B(r'''
const fabulaCorpusDeleteMessage = (corpus) => {
'''),
        B(r'''
    : `Delete the corpus "${name}"? Its ${n === 1 ? "story stays" : `${n} stories stay`} in Fabula, in no corpus.`;
};

'''),
        "",
    ),
    (
        B(r'''
          if (confirm(fabulaStoryDeleteMessage(state, st))) onDeleteStory(st.id);
'''),
        B(r'''
          askRecordDelete({
            state, ids: [st.id, ...fabulaStoryRecordIds(state, st.id)],
            title: `Delete the story "${st.name || "untitled story"}"?`, goes: fabulaStoryGoes(state, st),
            onConfirm: () => onDeleteStory(st.id),
          });
'''),
    ),
])

edit(MODULES / "28_fabula/03_people.jsx", [
    (
        B(r'''
// that record stays, its Character cleared and marked characterDeleted.
const scrubFabulaRefs = (state, deletedIds, names) => {
  const fab = state && state.fabula;
  if (!fab || !deletedIds || deletedIds.size === 0) return fab;
  const next = { ...fab };
  FABULA_KINDS.forEach(k => {
    const arr = Array.isArray(fab[k.slice]) ? fab[k.slice] : null;
    if (!arr || arr.length === 0) return;
    const tpl = { id: k.id, fields: fabulaKindFields(state, k.kind) };
    const marked = k.kind !== "cast" ? arr : arr.map(r => {
      const c = r && r.fields && r.fields.character;
      return typeof c === "string" && deletedIds.has(c) ? { ...r, characterDeleted: { name: (names && names.get(c)) || "" } } : r;
    });
    next[k.slice] = scrubEntryRefs(marked.map(r => ({ ...r, templateId: k.id })), [tpl], deletedIds).map(({ templateId, ...r }) => r);
  });
  return next;
};
'''),
        B(r'''
// that record stays, its Character cleared and marked characterDeleted.
// Since v1.7's r042, which runs it on every delete, a record it doesn't
// change keeps its identity, as scrubEntryRefs keeps an entry's, and so does
// a kind's list, and Fabula itself, when nothing in them changes.
const scrubFabulaRefs = (state, deletedIds, names) => {
  const fab = state && state.fabula;
  if (!fab || !deletedIds || deletedIds.size === 0) return fab;
  let next = fab;
  FABULA_KINDS.forEach(k => {
    const arr = Array.isArray(fab[k.slice]) ? fab[k.slice] : null;
    if (!arr || arr.length === 0) return;
    const tpl = { id: k.id, fields: fabulaKindFields(state, k.kind) };
    const marked = k.kind !== "cast" ? arr : arr.map(r => {
      const c = r && r.fields && r.fields.character;
      return typeof c === "string" && deletedIds.has(c) ? { ...r, characterDeleted: { name: (names && names.get(c)) || "" } } : r;
    });
    const tagged = marked.map(r => ({ ...r, templateId: k.id }));
    const scrubbed = scrubEntryRefs(tagged, [tpl], deletedIds);
    if (marked.every((r, i) => r === arr[i]) && scrubbed.every((r, i) => r === tagged[i])) return;
    if (next === fab) next = { ...fab };
    next[k.slice] = scrubbed.map((r, i) => {
      if (r === tagged[i]) return marked[i];
      const { templateId, ...rest } = r;
      return rest;
    });
  });
  return next;
};
'''),
    ),
    SPAN(
        B(r'''
// How many of each kind's records point at id: [[kind, n]], for a delete's
'''),
        B(r'''
  return `${head} Its ${fabulaJoin(counts.map(([kk, n]) => fabulaCount(kk, n)))} ${one ? "goes" : "go"} with it.`;
};
'''),
        B(r'''
// The ids of a story's own records, which its delete takes with it (v1.7
// r042), for the delete modal's count and clearLinksTo.
const fabulaStoryRecordIds = (state, storyId) => {
  const fab = (state && state.fabula) || {};
  return FABULA_KINDS.filter(k => k.kind !== "corpus" && k.kind !== "story")
    .flatMap(k => (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).filter(r => r && r.storyId === storyId).map(r => r.id));
};

// What deleting a story takes with it, its own records by kind, as the
// delete modal's line, or null when it holds none.
const fabulaStoryGoes = (state, story) => {
  const fab = (state && state.fabula) || {};
  const counts = FABULA_KINDS.filter(k => k.kind !== "corpus" && k.kind !== "story")
    .map(k => [k.kind, (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).filter(r => r && r.storyId === story.id).length])
    .filter(([, n]) => n > 0);
  if (counts.length === 0) return null;
  const one = counts.length === 1 && counts[0][1] === 1;
  return `Its ${fabulaJoin(counts.map(([kk, n]) => fabulaCount(kk, n)))} ${one ? "goes" : "go"} with it.`;
};
'''),
    ),
])

edit(MODULES / "28_fabula/04_outline.jsx", [
    SPAN(
        B(r'''
// How many of each kind's records, outside what goes, point at any of the
'''),
        B(r'''
    return [k.kind, arr.filter(r => ids.some(id => countInboundEntryRefs([{ ...r, templateId: k.id }], [tpl], id) > 0)).length];
  }).filter(([, n]) => n > 0);
};

'''),
        "",
    ),
    (
        B(r'''
  // What points at what it holds stays when everything goes, without the
  // reference, and says so, as Delete does for the record itself.
  const pointing = fabulaInboundCountsAll(state, held.map(n => n.id), new Set([record.id, ...held.map(n => n.id)]));
  const total = pointing.reduce((a, [, n]) => a + n, 0);
  const said = fabulaJoin(pointing.map(([kk, n]) => (kk === "story" ? "the story" : fabulaCount(kk, n))));
'''),
        B(r'''
  // v1.7 r042: what the delete does to what links to the record, and to what
  // it holds if everything goes, counted from the link index, as the delete
  // modal counts.
  const own = recordDeleteLines(state, [record.id]);
  const heldIds = held.map(n => n.id);
  const ifAll = recordDeleteLines(state, heldIds, new Set([record.id, ...heldIds]));
'''),
    ),
    (
        B(r'''
  const warn = total ? ` ${said.charAt(0).toUpperCase()}${said.slice(1)} ${total === 1 ? "points" : "point"} at what it holds; if everything goes, ${total === 1 ? "it stays, without the reference" : "they stay, without the references"}.` : "";
'''),
        "",
    ),
    (
        B(r'''
        <div className="modal-hdr">Delete the {FABULA_NOUNS[kind].one}</div>
        <div className="modal-body">
          <p style={{ margin: "0 0 10px" }}>{fabulaRecordDeleteMessage(state, kind, record)}</p>
          <p style={{ margin: 0 }}>It holds {holds}. Move up puts what it holds in its place, {where}; Delete everything deletes it all.{warn}</p>
        </div>
'''),
        B(r'''
        <div className="modal-hdr">Delete the {FABULA_NOUNS[kind].one} "{record.name || "untitled"}"?</div>
        <div className="modal-body">
          {own.map((line, i) => <p key={i} style={{ margin: "0 0 10px" }}>{line}</p>)}
          <p style={{ margin: 0 }}>It holds {holds}. Move up puts what it holds in its place, {where}; Delete everything deletes it all.</p>
          {ifAll.length > 0 && <p style={{ margin: "10px 0 0" }}>If everything goes: {ifAll.join(" ")}</p>}
        </div>
'''),
    ),
])

edit(MODULES / "28_fabula/09_templates.jsx", [
    SPAN(
        B(r'''
// The ids a kind's seed uses at its top level, which a field of the user's
'''),
        B(r'''
    return cache[kind] || new Set();
  };
})();

'''),
        "",
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
    print(f"r042 applied to {len(staged)} files")


if __name__ == "__main__":
    main()
