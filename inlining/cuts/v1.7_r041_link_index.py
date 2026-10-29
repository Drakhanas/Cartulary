"""
v1.7 r041: the link index and the Referenced by lists, Pipes' third cut.

docs/pipes-spec.md, section 4, with the four details Drak settled at the cut
(2026-10-29, one per message: a, a, a, a):

1. The pages that already list what uses them. A Plot Thread's page and a
   Theme's keep their Stories list, and a scene's its Research, and the
   Referenced by list under them leaves out the links those lists show, so
   nothing shows twice: a story's, a scene's, a plot point's, or a promise's
   Threads on a thread's page, a story's Themes or a scene's Motifs on a
   theme's, a research note's Used In on a scene's (REFERENCED_BY_LISTED).
2. The world description as a source. Its [[links]] show, as a row named
   World description in a group of its own after the others, which opens
   the Project page, where the description is drawn.
3. What's kept between edits. Each record's links are read once and kept
   until the record, or the schema it's read through, changes, and the
   index is put together again from what's kept when anything changes:
   about 200 ms for the first page after a load and 45 ms after an edit on
   a generated 10,000-entry world with every field filled (45 MB, 230,000
   links), and the probe holds it to a second and a quarter second there.
4. How a long list shows. A group past ten rows shows ten, its heading
   counting them all, and a Show all button for the rest, until the page is
   left.

With them, Claude's defaults, said before the first call and not stopped:
the index and the name resolver in 22_trunk, the list in
13_form-engine-display, and a body's page drawing it after its Narrative;
what the index reads is the spec's list and a map's Scope / Region, Short
Text that the map's page draws links in; a corpus's reading order counts as
its links to its stories, as Concordance draws them; a record's link to
itself doesn't count, and a scene's belonging to its story isn't a link;
names resolve by the entry view's rules (the primary name, the first stored
winning a tie, then the template's Name History, then bodies), so until r043
a [[link]] to a map, a stemma, or a Fabula record isn't found, though a
Tabula note draws one as found; a row per source, naming it and every field
it links through (a pin by its label, a stemma's link as linked node, card,
or note), groups in the templates' order, then Fabula's kinds in Fabula's
order, then maps, stemmas, bodies, and ConLangs, rows A to Z but acts,
chapters, and scenes by their place in the outline; a ConLang's row opens
nothing, as its chips don't; a secret field's links show only while secrets
are shown, and a page nothing links to shows no list; the list is built only
when a page that shows one needs it, so typing on a Tabula board or editing
a map never waits on it. And the roadmap's approximate single date rides
along, the entry view drawing the "~" the other displays draw.

- 22_trunk: a section of its own, Link index: LINK_SOURCE_WORLD,
  LINK_INDEX_MEMO, wikiNameResolver, linkWikiNames, linkFieldWalk,
  linkRecordLinks, linkKindFields, linkIndexOf, linksTo.
- 13_form-engine-display: a section of its own, Referenced by:
  REFERENCED_BY_SHOWN, REFERENCED_BY_LISTED, referencedByGroups,
  ReferencedBy; and the single date's "~".
- 12_trunk: the entry, map, and corpus pages draw the list; the world
  description's row opens the Project page (openEntryFromAnywhere); the
  Ephemeris view is told whether secrets show.
- 28_fabula/02_story: the Story tab draws the list.
- 28_fabula/03_people: a Fabula record's page draws it, a scene's leaving
  out its Research.
- 24_ephemeris/01_shell and 02_asbo: a body's page draws it, told whether
  secrets show.

Declared scope: 12_trunk, 13_form-engine-display, 22_trunk,
24_ephemeris/01_shell, 24_ephemeris/02_asbo, 28_fabula/02_story,
28_fabula/03_people. No shell change.
Declarations added: the thirteen above. None removed. Two headers added:
`Link index (v1.7 r041)` and `Referenced by (v1.7 r041)`.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given), and nothing is written unless every anchor in
every file holds. Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r041_link_index.py
"""
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())
MODULES = ROOT / "cartulary-src" / "modules"

PLAN = []


def B(s):
    """A block written with its opening newline, which isn't part of it."""
    return s[1:] if s.startswith("\n") else s


def edit(path, pairs):
    PLAN.append((path, pairs))


# ---------------------------------------------------------------- 22: the index
INDEX = B(r'''

// ─── Link index (v1.7 r041) ────────────────────────────────────────────────────
// docs/pipes-spec.md, section 4, with Drak's calls at the cut: every link in
// the world, each with the record it's in (its source), the record it points
// at (its target), the field it runs through, and whether that field is
// secret. Stored links: entries' reference fields at any depth (group
// subfields, grid cells, parent and spouse declarations), Fabula records'
// through each kind's schema and a corpus's reading order, bodies' and
// ConLangs' reference fields, map pins, a rota's linked nodes, and a tabula's
// linked cards. [[links]]: in the Short Text and Long Text of entries and
// Fabula records at any depth, a map's three fields, a body's six narrative
// fields, a tabula's notes, and the world description, read by the entry
// view's rules (wikiNameResolver) until r043 makes one resolver for every
// place a link is read. A record's links are read once and kept until the
// record, or the schema it's read through, changes (Drak's call 3), and the
// index is put together again from what's kept when anything changes, when a
// page first asks for it (linksTo). A record's link to itself doesn't count,
// and a scene's belonging to its story isn't a link.

// The world description as a source: its row in Referenced by opens the
// Project page, where the description is drawn (Drak's call 2).
const LINK_SOURCE_WORLD = "__world_description__";

// What the index keeps between builds: the last build and the slices it was
// built from, the name resolver and its inputs, each record's links (by the
// record, with what they were read through), and the fields read for
// Fabula's kinds and ConLangs while the world keeps no schema of its own.
const LINK_INDEX_MEMO = { keys: null, index: null, names: null, records: new WeakMap(), schemas: new Map(), mapFields: null };

// The entry view's [[name]] rules (MarkdownDisplay, InlineWikiLinkText),
// lifted: an entry's primary name first, the first stored winning a tie, then
// its template's Name History, then a body's name and other names. Takes a
// trimmed, lowercased name; gives an id or null.
const wikiNameResolver = (entries, templates, bodies) => {
  const kept = LINK_INDEX_MEMO.names;
  if (kept && kept.entries === entries && kept.templates === templates && kept.bodies === bodies) return kept.resolve;
  const primary = new Map(), history = new Map(), bodyNames = new Map();
  const ents = Array.isArray(entries) ? entries : [];
  ents.forEach(e => {
    if (!e || !e.id || typeof e.name !== "string") return;
    const k = e.name.trim().toLowerCase();
    if (k && !primary.has(k)) primary.set(k, e.id);
  });
  const tplById = new Map((Array.isArray(templates) ? templates : []).filter(t => t && t.id).map(t => [t.id, t]));
  ents.forEach(e => {
    if (!e || !e.id) return;
    getEntryNameHistory(e, tplById.get(e.templateId)).forEach(n => {
      const k = n.trim().toLowerCase();
      if (k && !primary.has(k) && !history.has(k)) history.set(k, e.id);
    });
  });
  (Array.isArray(bodies) ? bodies : []).forEach(b => {
    if (!b || !b.id || typeof b.name !== "string") return;
    const add = (n) => {
      const k = n.trim().toLowerCase();
      if (k && !primary.has(k) && !history.has(k) && !bodyNames.has(k)) bodyNames.set(k, b.id);
    };
    add(b.name);
    if (typeof b.otherNames === "string") b.otherNames.split(",").forEach(add);
  });
  const resolve = (k) => primary.get(k) || history.get(k) || bodyNames.get(k) || null;
  LINK_INDEX_MEMO.names = { entries, templates, bodies, resolve };
  return resolve;
};

// The [[links]] in a text, each by its target's name, trimmed and lowercased,
// pushed onto x.wiki as [name, field, label, secret]; [[target|shown]] by its
// target, as the entry view reads it.
const linkWikiNames = (text, fid, label, secret, x) => {
  if (typeof text !== "string" || text.indexOf("[[") < 0) return;
  const re = /\[\[([^\]\n]+)\]\]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const inner = m[1].trim();
    const pipe = inner.indexOf("|");
    const name = (pipe >= 0 ? inner.substring(0, pipe) : inner).trim().toLowerCase();
    if (name) x.wiki.push(name, fid, label, secret);
  }
};

// A record's links through a template's fields: a reference's ids onto
// x.stored and the [[links]] in Short Text and Long Text onto x.wiki, each as
// [what, field, label, secret], down through groups (a subfield labeled under
// its group, and secret when either is) and a grid's reference cells. field
// is the top-level field's id, which a page's own list is matched by.
const linkFieldWalk = (fields, values, x, up) => {
  if (!values || typeof values !== "object") return;
  (Array.isArray(fields) ? fields : []).forEach(f => {
    if (!f || !f.id) return;
    const v = values[f.id];
    if (v == null || v === "") return;
    const fid = up ? up.fid : f.id;
    const label = up ? `${up.label} › ${f.label || ""}` : (f.label || "");
    const secret = (up ? up.secret : false) || !!f.secret;
    if (f.type === "entry-ref") {
      (Array.isArray(v) ? v : [v]).forEach(it => {
        const id = typeof it === "string" ? it : (it && typeof it === "object" ? it.id : null);
        if (typeof id === "string" && id) x.stored.push(id, fid, label, secret);
      });
    } else if (f.type === "text" || f.type === "textarea") {
      linkWikiNames(v, fid, label, secret, x);
    } else if (f.type === "group" && Array.isArray(v)) {
      v.forEach(inst => linkFieldWalk(f.subfields, inst, x, { fid, label, secret }));
    } else if (f.type === "grid") {
      forEachGridRefCell(coerceGridValue(v), (rid, cid, cell) => {
        if (typeof cell.value === "string" && cell.value) x.stored.push(cell.value, fid, label, secret);
      });
    }
  });
};

// One record's links, read by read(x) into x.src, x.stored, and x.wiki, or
// kept from an earlier build when the record and what it was read through
// (deps) are the same objects.
const linkRecordLinks = (rec, deps, read) => {
  const hit = LINK_INDEX_MEMO.records.get(rec);
  if (hit && hit.deps === deps) return hit;
  const x = { deps, src: null, stored: [], wiki: [] };
  read(x);
  LINK_INDEX_MEMO.records.set(rec, x);
  return x;
};

// The fields a Fabula kind's records are read through, the kind's stored
// schema or the seed's while the world has none, and for "conlang" the
// ConLang schema's reference fields; built ones are kept while the
// templates they're built from are the same.
const linkKindFields = (state, kind) => {
  const stored = kind !== "conlang" && state.fabula && state.fabula.schemas ? state.fabula.schemas[kind] : null;
  if (stored && Array.isArray(stored.fields)) return stored.fields;
  const kept = LINK_INDEX_MEMO.schemas.get(kind);
  if (kept && kept.templates === state.templates) return kept.fields;
  const fields = kind === "conlang"
    ? glossopoeiaConlangSchema(state).fields.filter(f => f && f.type === "entry-ref")
    : fabulaKindFields(state, kind);
  LINK_INDEX_MEMO.schemas.set(kind, { templates: state.templates, fields });
  return fields;
};

// The index, { byTarget }: each target's links as { src, field, label,
// secret, kind }, kind "ref" or "wiki", and src the source as { id, kind,
// group, name, storyId }, its kind entry, fabula, map, stemma, body, conlang,
// or world, and its group its template, its Fabula kind, or its kind again.
// Put together again only when a slice it reads has changed.
const linkIndexOf = (state) => {
  const st = state || {};
  const fab = st.fabula || {};
  const glo = st.glossopoeia || {};
  const desc = st.world && typeof st.world.description === "string" ? st.world.description : "";
  const keys = [st.entries, st.templates, st.fabula, st.cartographia, st.stemmas, st.celestialBodies, glo.conlangs, desc];
  const memo = LINK_INDEX_MEMO;
  if (memo.index && memo.keys.every((k, i) => k === keys[i])) return memo.index;
  const resolve = wikiNameResolver(st.entries, st.templates, st.celestialBodies);
  const byTarget = new Map();
  const put = (target, src, field, label, secret, kind) => {
    if (typeof target !== "string" || !target || target === src.id) return;
    let links = byTarget.get(target);
    if (!links) { links = []; byTarget.set(target, links); }
    links.push({ src, field, label, secret, kind });
  };
  const add = (x) => {
    const s = x.stored, w = x.wiki;
    for (let i = 0; i < s.length; i += 4) put(s[i], x.src, s[i + 1], s[i + 2], s[i + 3], "ref");
    for (let i = 0; i < w.length; i += 4) put(resolve(w[i]), x.src, w[i + 1], w[i + 2], w[i + 3], "wiki");
  };
  // Entries, through their templates.
  const tplById = new Map((Array.isArray(st.templates) ? st.templates : []).filter(t => t && t.id).map(t => [t.id, t]));
  (Array.isArray(st.entries) ? st.entries : []).forEach(e => {
    if (!e || !e.id) return;
    const tpl = tplById.get(e.templateId) || null;
    add(linkRecordLinks(e, tpl, (x) => {
      x.src = { id: e.id, kind: "entry", group: e.templateId, name: e.name || "", storyId: null };
      linkFieldWalk(tpl ? tpl.fields : [], e.fields, x, null);
    }));
  });
  // Fabula's records, through their kinds' schemas, and a corpus's stories.
  FABULA_KINDS.forEach(k => {
    const recs = Array.isArray(fab[k.slice]) ? fab[k.slice] : [];
    if (recs.length === 0) return;
    const fields = linkKindFields(st, k.kind);
    recs.forEach(r => {
      if (!r || !r.id) return;
      add(linkRecordLinks(r, fields, (x) => {
        x.src = { id: r.id, kind: "fabula", group: k.kind, name: r.name || "", storyId: k.kind === "corpus" || k.kind === "story" ? null : (r.storyId || null) };
        linkFieldWalk(fields, r.fields, x, null);
        if (k.kind === "corpus" && Array.isArray(r.storyIds)) {
          r.storyIds.forEach(id => { if (typeof id === "string" && id) x.stored.push(id, "storyIds", "Reading order", false); });
        }
      }));
    });
  });
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
  // Stemmas: a rota's linked nodes, a tabula's linked cards and notes.
  (Array.isArray(st.stemmas) ? st.stemmas : []).forEach(s => {
    if (!s || !s.id) return;
    add(linkRecordLinks(s, null, (x) => {
      x.src = { id: s.id, kind: "stemma", group: "stemma", name: s.name || "", storyId: null };
      if (s.layout === "tabula") {
        tabulaWalk(s.root, (it) => {
          if (it.type === "linked" && typeof it.entryId === "string" && it.entryId) x.stored.push(it.entryId, "card", "card", false);
          else if (it.type === "note") linkWikiNames(it.body, "note", "note", false, x);
        });
      } else {
        const walk = (node) => {
          if (!node) return;
          if (node.type === "linked" && typeof node.entryId === "string" && node.entryId) x.stored.push(node.entryId, "node", "linked node", false);
          (node.children || []).forEach(walk);
        };
        walk(s.root);
      }
    }));
  });
  // Bodies: their four reference lists and six narrative fields, labeled as
  // their page labels them.
  (Array.isArray(st.celestialBodies) ? st.celestialBodies : []).forEach(b => {
    if (!b || !b.id) return;
    add(linkRecordLinks(b, null, (x) => {
      x.src = { id: b.id, kind: "body", group: "body", name: b.name || "", storyId: null };
      [["visibleFrom", "Visible From"], ["notableLocations", "Notable Locations"], ["inhabitedBy", "Inhabited By"], ["sacredTo", "Sacred to"]].forEach(([k, label]) => {
        (Array.isArray(b[k]) ? b[k] : []).forEach(it => {
          const id = typeof it === "string" ? it : (it && typeof it === "object" ? it.id : null);
          if (typeof id === "string" && id) x.stored.push(id, k, label, false);
        });
      });
      [["physicalProperties", "Physical Properties"], ["climateConditions", "Climate / Conditions"], ["mythologicalSignificance", "Mythological Significance"], ["description", "Description"], ["history", "History"], ["notes", "Notes"]]
        .forEach(([k, label]) => linkWikiNames(b[k], k, label, false, x));
    }));
  });
  // ConLangs, through the ConLang schema's reference fields.
  const conlangs = Array.isArray(glo.conlangs) ? glo.conlangs : [];
  if (conlangs.length > 0) {
    const fields = linkKindFields(st, "conlang");
    conlangs.forEach(c => {
      if (!c || !c.id) return;
      add(linkRecordLinks(c, fields, (x) => {
        x.src = { id: c.id, kind: "conlang", group: "conlang", name: c.name || "", storyId: null };
        linkFieldWalk(fields, c.fields, x, null);
      }));
    });
  }
  // The world description.
  if (desc) {
    const x = { src: { id: LINK_SOURCE_WORLD, kind: "world", group: "world", name: "World description", storyId: null }, stored: [], wiki: [] };
    linkWikiNames(desc, "description", "", false, x);
    add(x);
  }
  memo.keys = keys;
  memo.index = { byTarget };
  return memo.index;
};

// What links to one record: its links in the index, or none.
const linksTo = (state, id) => (typeof id === "string" && id ? (linkIndexOf(state).byTarget.get(id) || []) : []);''')

edit(MODULES / "22_trunk.jsx", [
    (
        B(r'''
const getRegisteredNameToId = (state) => {
  const map = {};
  getRegisteredGraphNodes(state).forEach(n => {
    const k = (n.name || "").trim().toLowerCase();
    if (k && !(k in map)) map[k] = n.id;
  });
  return map;
};'''),
        B(r'''
const getRegisteredNameToId = (state) => {
  const map = {};
  getRegisteredGraphNodes(state).forEach(n => {
    const k = (n.name || "").trim().toLowerCase();
    if (k && !(k in map)) map[k] = n.id;
  });
  return map;
};''') + INDEX,
    ),
])


# ---------------------------------------------------------------- 13: the list
LIST = B(r'''
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

''')

edit(MODULES / "13_form-engine-display.jsx", [
    (
        B(r'''
  return <>{nodes}</>;
}

// ─── Longform + markdown display'''),
        B(r'''
  return <>{nodes}</>;
}

''') + LIST + B(r'''
// ─── Longform + markdown display'''),
    ),
    (
        B(r'''
    return <div className="field-val cal-date-display">{formatCalendarDate(value, calendar)}</div>;'''),
        B(r'''
    return <div className="field-val cal-date-display">{`${value.approximate ? "~" : ""}${formatCalendarDate(value, calendar)}`}</div>;'''),
    ),
])


# ---------------------------------------------------------------- 12: App
edit(MODULES / "12_trunk.jsx", [
    (
        B(r'''
  const openEntryFromAnywhere = (id) => {
    if (!confirmDiscardDraft()) return;
'''),
        B(r'''
  const openEntryFromAnywhere = (id) => {
    if (!confirmDiscardDraft()) return;
    // v1.7 r041: the world description's row in a Referenced by list opens
    // the Project page, where the description is drawn.
    if (id === LINK_SOURCE_WORLD) { setActiveTagFilter(null); setView("project"); return; }
'''),
    ),
    (
        B(r'''
                    onUpdateViewPrefs={updateViewPrefs}
                  />
                }
              />
            );
          })()}
          {view === "ephemeris" && (
            <EphemerisView state={state} updateState={updateState} isLocked={isLocked} onOpenEntry={openEntryFromAnywhere} onPromoteEvent={promoteComputedEventToEntry} />'''),
        B(r'''
                    onUpdateViewPrefs={updateViewPrefs}
                  />
                }
                footSlot={<ReferencedBy key={rec.id} state={state} targetId={rec.id} showSecrets={showSecrets} onOpenEntry={openEntryFromAnywhere} />}
              />
            );
          })()}
          {view === "ephemeris" && (
            <EphemerisView state={state} updateState={updateState} isLocked={isLocked} onOpenEntry={openEntryFromAnywhere} onPromoteEvent={promoteComputedEventToEntry} showSecrets={showSecrets} />'''),
    ),
    (
        B(r'''
                    onRenameStory={renameStory}
                    onOpenStory={openStory}
                  />
                }
              />'''),
        B(r'''
                    onRenameStory={renameStory}
                    onOpenStory={openStory}
                  />
                }
                footSlot={<ReferencedBy key={rec.id} state={state} targetId={rec.id} showSecrets={showSecrets} onOpenEntry={openEntryFromAnywhere} />}
              />'''),
    ),
    (
        B(r'''
              footSlot={pageTemplate && pageTemplate.fabulaRole ? <FabulaEntryStories state={state} entry={activeEntry} role={pageTemplate.fabulaRole} onOpenEntry={openEntryFromAnywhere} onOpenStory={openStoryFromEntry} /> : undefined}'''),
        B(r'''
              footSlot={<>
                {pageTemplate && pageTemplate.fabulaRole ? <FabulaEntryStories state={state} entry={activeEntry} role={pageTemplate.fabulaRole} onOpenEntry={openEntryFromAnywhere} onOpenStory={openStoryFromEntry} /> : null}
                <ReferencedBy key={activeEntry.id} state={state} targetId={activeEntry.id} showSecrets={showSecrets} onOpenEntry={openEntryFromAnywhere} exclude={pageTemplate && pageTemplate.fabulaRole ? (REFERENCED_BY_LISTED[pageTemplate.fabulaRole] || null) : null} />
              </>}'''),
    ),
])


# ---------------------------------------------------------------- 28: Fabula's pages
edit(MODULES / "28_fabula" / "02_story.jsx", [
    (
        B(r'''
      registeredNodes={fabulaStoryNodes(state, story.id)}
      canvasSlot={tabs}
      {...panelProps}
      {...exportProps}
    />'''),
        B(r'''
      registeredNodes={fabulaStoryNodes(state, story.id)}
      canvasSlot={tabs}
      footSlot={<ReferencedBy key={story.id} state={state} targetId={story.id} showSecrets={showSecrets} onOpenEntry={onOpenEntry} />}
      {...panelProps}
      {...exportProps}
    />'''),
    ),
])

edit(MODULES / "28_fabula" / "03_people.jsx", [
    (
        B(r'''
      footSlot={research}
      registeredNodes={nodes}'''),
        B(r'''
      footSlot={<>{research}<ReferencedBy key={record.id} state={state} targetId={record.id} showSecrets={showSecrets} onOpenEntry={onOpenEntry} exclude={kind === "scene" ? REFERENCED_BY_LISTED.scene : null} /></>}
      registeredNodes={nodes}'''),
    ),
])


# ---------------------------------------------------------------- 24: a body's page
edit(MODULES / "24_ephemeris" / "01_shell.jsx", [
    (
        "function EphemerisView({ state, updateState, isLocked, onOpenEntry, onPromoteEvent }) {",
        "function EphemerisView({ state, updateState, isLocked, onOpenEntry, onPromoteEvent, showSecrets }) {",
    ),
    (
        B(r'''
            <AsBoModeContent
              state={state}
'''),
        B(r'''
            <AsBoModeContent
              state={state}
              showSecrets={showSecrets}
'''),
    ),
])

edit(MODULES / "24_ephemeris" / "02_asbo.jsx", [
    (
        B(r'''
  isLocked, startInEditMode,
}) {'''),
        B(r'''
  isLocked, startInEditMode, showSecrets,
}) {'''),
    ),
    (
        B(r'''
          {Number.isFinite(effAnchorView) && <AsBoFieldRow label="Phase anchor" value={`day ${effAnchorView}`} tooltip={FIELD_TOOLTIPS.phaseAnchorDay} />}
        </AsBoReadonlyBlock>
      )}
    </div>
  );
}'''),
        B(r'''
          {Number.isFinite(effAnchorView) && <AsBoFieldRow label="Phase anchor" value={`day ${effAnchorView}`} tooltip={FIELD_TOOLTIPS.phaseAnchorDay} />}
        </AsBoReadonlyBlock>
      )}
      {/* v1.7 r041: what links to the body, at the end of its page. */}
      <ReferencedBy key={body.id} state={state} targetId={body.id} showSecrets={showSecrets} onOpenEntry={onOpenEntry} />
    </div>
  );
}'''),
    ),
])


def main():
    staged = []
    for path, pairs in PLAN:
        text = path.read_text(encoding="utf-8")
        for pair in pairs:
            old, new = pair[0], pair[1]
            count = pair[2] if len(pair) > 2 else 1
            n = text.count(old)
            assert n == count, f"{path.name}: anchor occurs {n} times, not {count}:\n{old[:300]}"
            text = text.replace(old, new)
        staged.append((path, text))
    for path, text in staged:
        path.write_text(text, encoding="utf-8")
    print(f"r041 applied to {len(staged)} files")


if __name__ == "__main__":
    main()
