"""
v1.7 r044: the rename modal, Pipes' sixth cut.

docs/pipes-spec.md, section 5, with the three details Drak settled at the
cut (2026-10-30, one per message: a, a, a):

1. Whether adding the old name to Name History starts checked. It starts
   unticked: the old name goes among the record's former names only when the
   box is ticked.
2. Undo across the surfaces a rewrite touches. A rename that updates links
   keeps a restore point first, Before rename, in Version History, its
   newest three kept as Before import's and Before reset's are; and a
   board's Undo stops at such a rename, its history starting over. A rename
   that updates nothing undoes on its board as before.
3. Whether renaming a language opens the modal. It does, since a [[link]]
   reaches a language since r043: a language's name is written as it's
   typed, so the modal opens when the name field is left (or Enter), and
   Cancel puts the old name back.

With them, Claude's defaults, said before the first call and not stopped:
the modal opens wherever a record a [[link]] reaches is renamed (an entry's,
a map's, a corpus's, a story's, or a Fabula record's Save, a story's Rename
on Fabula's index, a body's Save in Ephemeris, a stemma's name in its bar,
and a language's name), when the name changes beyond case and a text links
by the old name to the record, a record's link to itself included; it counts
the places, says what Rename only leaves the links doing (broken, leading to
another record by the same name, or still reaching the record through its
former names when the box is ticked), and offers Rename only alone when the
new name already reaches a record ahead of this one; an update rewrites
[[Old]] to [[New]], a [[Old|shown]] keeping what it shows, in every text the
link index reads, and leaves links by a former name as they are; a body's
Other Names take the old name as an entry's Name History does; a stemma
node's or a Tabula card's copied name follows every rename, and a cast
record's while it still carries its character's old name; a template's
rename carries other templates' reference filters and target names with it,
without a modal; and one roadmap row rides along on the index the cut
touches: a word's delete left the words that name it holding its id, and
the index now reads words' reference fields (Derived From, Source Word, and
Descended From among them), so the delete counts them and clears them.

- 22_trunk: the renames under a header of their own (renamePlan, renameAsk,
  renameRewrite, renameSettle, the copied names, the restore point, the
  former names, the template targets); the link index reads words'
  reference fields (linkRefFieldsOnly), and clearLinksTo clears them.
- 29_modals: the rename modal under a header of its own, and a word in the
  delete modal's kinds.
- 12_trunk: the saves of an entry, a map, a corpus, a story, and a Fabula
  record, and a story's rename, ask through renameAsk and run again with the
  answer; a stemma's rename from its bar (renameStemma); a template's rename
  carries the targets; App draws the modal, and hands Ephemeris its flash.
- 03_persistence: Before rename is a capped kind.
- 15_template-builder: the comment on a filter's key says a rename carries
  it.
- 14_form-engine-edit: the entry form tells a caller when its name field is
  left (onNameDone), for a language.
- 18_cartographia/02_tools: the editors' history can start over (clear).
- 21_stemma/00_helpers-canvas, 21_stemma/06_tabula-canvas: the bars rename
  through App, the history starting over after an update.
- 23_glossopoeia/04_view: a language's rename asks when its name is left.
- 24_ephemeris/01_shell, 24_ephemeris/02_asbo: a body's Save asks, the edit
  staying open if the rename is cancelled.
- 17_concordance: a word's links in the index stay out of Concordance,
  which draws a word's etymology from the registry as before.

Declared scope: 03_persistence, 12_trunk, 14_form-engine-edit,
15_template-builder, 17_concordance, 18_cartographia/02_tools,
21_stemma/00_helpers-canvas, 21_stemma/06_tabula-canvas, 22_trunk,
23_glossopoeia/04_view, 24_ephemeris/01_shell, 24_ephemeris/02_asbo,
29_modals. No shell change.
Declarations added: linkRefFieldsOnly, RENAME_NONE, renameKey,
RENAME_BODY_TEXTS, renameText, renameFieldValues, tabulaMapItems,
renameRewrite, renameNameHistoryAdd, renameOtherNamesAdd, renameFormerLabel,
renameRecordIn, renameCopiedNames, renamePlan, renameAsk, renameSettle,
renameRestorePoint, renameUpdatedLine, renameTemplateTargets, RECORD_RENAME,
askRename, renameRecordNoun, renameLeavesLine, RecordRenameModal. None
removed. Two headers added: `Renames (v1.7 r044)` and `Record rename (v1.7
r044)`.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given), and a span's start and end anchors once each,
the end after the start; nothing is written unless every anchor in every
file holds. Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r044_rename_modal.py
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


RENAMES = r'''


// ─── Renames (v1.7 r044) ───────────────────────────────────────────────────────
// docs/pipes-spec.md, section 5, with Drak's calls at the cut: renaming a
// record that [[links]] by its old name reach asks first, in one modal
// (askRename, 29_modals), with the count: Rename and update links, or Rename
// only. An update rewrites each such link in every text the link index reads
// and keeps a restore point first (call 2); where the record keeps former
// names, an entry's Name History or a body's Other Names, the modal offers to
// add the old name there, unticked (call 1); and a language asks when its
// name field is left (call 3). Every rename, asked about or not, brings along
// the names copied from the record: a rota node's and a tabula card's, and a
// cast record's while it still carries its character's old name.

// The answer a rename that asks nothing gets.
const RENAME_NONE = { update: false, former: false, places: 0 };

// A name as a [[link]] is read by it: trimmed and lowercased.
const renameKey = (name) => (typeof name === "string" ? name.trim().toLowerCase() : "");

// The six narrative fields of a body the link index reads for [[links]].
const RENAME_BODY_TEXTS = ["physicalProperties", "climateConditions", "mythologicalSignificance", "description", "history", "notes"];

// A text with every [[link]] by key rewritten to name, a [[target|shown]]
// keeping what it shows; the same string when none is.
const renameText = (text, key, name) => {
  if (typeof text !== "string" || text.indexOf("[[") < 0) return text;
  let hit = false;
  const out = text.replace(/\[\[([^\]\n]+)\]\]/g, (whole, inner) => {
    const pipe = inner.indexOf("|");
    if ((pipe >= 0 ? inner.substring(0, pipe) : inner).trim().toLowerCase() !== key) return whole;
    hit = true;
    return `[[${name}${pipe >= 0 ? inner.substring(pipe) : ""}]]`;
  });
  return hit ? out : text;
};

// Values read through fields as linkFieldWalk reads them, a Short Text's
// and a Long Text's [[links]] by key rewritten, down through groups; the
// same object when nothing changes.
const renameFieldValues = (fields, values, key, name) => {
  if (!values || typeof values !== "object") return values;
  let out = values;
  (Array.isArray(fields) ? fields : []).forEach(f => {
    if (!f || !f.id) return;
    const v = values[f.id];
    if (v == null || v === "") return;
    let next = v;
    if (f.type === "text" || f.type === "textarea") next = renameText(v, key, name);
    else if (f.type === "group" && Array.isArray(v)) {
      const insts = v.map(inst => renameFieldValues(f.subfields, inst, key, name));
      if (insts.some((x, i) => x !== v[i])) next = insts;
    }
    if (next === v) return;
    if (out === values) out = { ...values };
    out[f.id] = next;
  });
  return out;
};

// A tabula board with fn applied to every item at any depth, as tabulaWalk
// visits them; the same board when nothing changes.
const tabulaMapItems = (node, fn) => {
  if (!node || !Array.isArray(node.items)) return node;
  let changed = false;
  const items = node.items.map(it => {
    if (!it) return it;
    let x = fn(it);
    if (tabulaHolds(x)) {
      const inner = tabulaMapItems(x, fn);
      if (inner !== x) x = inner;
    }
    if (x !== it) changed = true;
    return x;
  });
  return changed ? { ...node, items } : node;
};

// The world with every [[link]] by key rewritten to name in every text the
// link index reads: entries' and Fabula records' Short Text and Long Text at
// any depth, a map's three fields, a tabula's notes, a body's six narrative
// fields, and the world description, a record's link to itself included. A
// slice or a record it doesn't change keeps its identity. places counts the
// records it changes, the world description as one.
const renameRewrite = (state, key, name) => {
  const st = state || {};
  let places = 0;
  if (!key || !name) return { state: st, places };
  const now = isoNow();
  const next = { ...st };
  const each = (list, fn) => {
    if (!Array.isArray(list)) return list;
    let changed = false;
    const out = list.map(r => {
      const x = r && r.id ? fn(r) : r;
      if (x !== r) { changed = true; places += 1; }
      return x;
    });
    return changed ? out : list;
  };
  const tplById = new Map((Array.isArray(st.templates) ? st.templates : []).filter(t => t && t.id).map(t => [t.id, t]));
  next.entries = each(st.entries, e => {
    const tpl = tplById.get(e.templateId);
    const fields = tpl ? renameFieldValues(tpl.fields, e.fields, key, name) : e.fields;
    return fields === e.fields ? e : { ...e, fields, updatedAt: now };
  });
  const fab = st.fabula;
  if (fab) {
    let nf = fab;
    FABULA_KINDS.forEach(k => {
      const recs = fab[k.slice];
      if (!Array.isArray(recs) || recs.length === 0) return;
      const fields = linkKindFields(st, k.kind);
      const out = each(recs, r => {
        const fv = renameFieldValues(fields, r.fields, key, name);
        return fv === r.fields ? r : { ...r, fields: fv, updatedAt: now };
      });
      if (out === recs) return;
      if (nf === fab) nf = { ...fab };
      nf[k.slice] = out;
    });
    next.fabula = nf;
  }
  if (!LINK_INDEX_MEMO.mapFields) LINK_INDEX_MEMO.mapFields = cartographiaMapSchema().fields;
  next.cartographia = each(st.cartographia, m => {
    const fv = renameFieldValues(LINK_INDEX_MEMO.mapFields, m.fields, key, name);
    return fv === m.fields ? m : { ...m, fields: fv, updatedAt: now };
  });
  next.stemmas = each(st.stemmas, s => {
    if (s.layout !== "tabula" || !s.root) return s;
    const root = tabulaMapItems(s.root, it => {
      if (it.type !== "note") return it;
      const body = renameText(it.body, key, name);
      return body === it.body ? it : { ...it, body };
    });
    return root === s.root ? s : { ...s, root, updatedAt: now };
  });
  next.celestialBodies = each(st.celestialBodies, b => {
    let out = b;
    RENAME_BODY_TEXTS.forEach(k => {
      const t = renameText(b[k], key, name);
      if (t === b[k]) return;
      if (out === b) out = { ...b };
      out[k] = t;
    });
    return out;
  });
  const desc = st.world && typeof st.world.description === "string" ? st.world.description : null;
  if (desc) {
    const t = renameText(desc, key, name);
    if (t !== desc) { next.world = { ...st.world, description: t }; places += 1; }
  }
  return { state: places > 0 ? next : st, places };
};

// An entry's fields with name added to its template's first Name History
// field, the one a [[link]] reads (getEntryNameHistory); the same fields
// when the template has none or the field holds the name already.
const renameNameHistoryAdd = (tpl, fields, name) => {
  const hf = tpl && Array.isArray(tpl.fields) ? tpl.fields.find(f => f && f.type === "name-history") : null;
  if (!hf || !name) return fields;
  const was = fields && Array.isArray(fields[hf.id]) ? fields[hf.id] : [];
  if (was.some(h => h && renameKey(h.name) === renameKey(name))) return fields;
  return { ...(fields || {}), [hf.id]: [...was, { name, from: null, to: null }] };
};

// A body's Other Names with name added, comma-separated as the field keeps
// them; the same when they hold it already.
const renameOtherNamesAdd = (otherNames, name) => {
  const was = typeof otherNames === "string" ? otherNames.trim() : "";
  if (was.split(",").some(n => renameKey(n) === renameKey(name))) return otherNames;
  return was ? `${was}, ${name}` : name;
};

// Where a record keeps the former names a [[link]] reaches it by: the label
// of an entry's template's first Name History field, or a body's Other
// Names; null for anything else.
const renameFormerLabel = (state, id, kind) => {
  if (kind === "body") return "Other Names";
  if (kind !== "entry") return null;
  const e = (Array.isArray(state.entries) ? state.entries : []).find(x => x && x.id === id);
  const tpl = e ? (Array.isArray(state.templates) ? state.templates : []).find(t => t && t.id === e.templateId) : null;
  const hf = tpl && Array.isArray(tpl.fields) ? tpl.fields.find(f => f && f.type === "name-history") : null;
  return hf ? (hf.label || "Name History") : null;
};

// The world with record id named name, and with also, if given, among its
// former names; for working out what names will reach once a rename is
// saved, which is its caller's to do.
const renameRecordIn = (state, id, name, also) => {
  const st = state || {};
  const swap = (list, fn) => (Array.isArray(list) && list.some(r => r && r.id === id) ? list.map(r => (r && r.id === id ? fn(r) : r)) : null);
  let out = swap(st.entries, e => {
    const tpl = also ? (Array.isArray(st.templates) ? st.templates : []).find(t => t && t.id === e.templateId) : null;
    return { ...e, name, fields: also ? renameNameHistoryAdd(tpl, e.fields, also) : e.fields };
  });
  if (out) return { ...st, entries: out };
  out = swap(st.celestialBodies, b => (also ? { ...b, name, otherNames: renameOtherNamesAdd(b.otherNames, also) } : { ...b, name }));
  if (out) return { ...st, celestialBodies: out };
  out = swap(st.cartographia, m => ({ ...m, name }));
  if (out) return { ...st, cartographia: out };
  out = swap(st.stemmas, s => ({ ...s, name }));
  if (out) return { ...st, stemmas: out };
  const fab = st.fabula || {};
  for (let i = 0; i < FABULA_KINDS.length; i++) {
    const slice = FABULA_KINDS[i].slice;
    out = swap(fab[slice], r => ({ ...r, name }));
    if (out) return { ...st, fabula: { ...fab, [slice]: out } };
  }
  const glo = st.glossopoeia || {};
  out = swap(glo.conlangs, c => ({ ...c, name }));
  if (out) return { ...st, glossopoeia: { ...glo, conlangs: out } };
  return st;
};

// The world with the names copied from record id brought to name: a rota's
// linked nodes' and a tabula's linked cards', and a cast record's while it
// still carries its character's old name, the rule a cast record's name
// follows a change of character by (fabulaCastNameFill). Identity kept where
// nothing changes.
const renameCopiedNames = (state, id, oldName, name) => {
  const st = state || {};
  if (!name) return st;
  let next = st;
  if (Array.isArray(st.stemmas)) {
    const link = (n) => (n && n.type === "linked" && n.entryId === id && n._cachedName !== name ? { ...n, _cachedName: name } : n);
    const rota = (node) => {
      if (!node) return node;
      let n = link(node);
      if (Array.isArray(n.children)) {
        const kids = n.children.map(rota);
        if (kids.some((c, i) => c !== n.children[i])) n = { ...n, children: kids };
      }
      return n;
    };
    let changed = false;
    const out = st.stemmas.map(s => {
      if (!s || !s.root) return s;
      const root = s.layout === "tabula" ? tabulaMapItems(s.root, link) : rota(s.root);
      if (root === s.root) return s;
      changed = true;
      return { ...s, root };
    });
    if (changed) next = { ...next, stemmas: out };
  }
  const was = typeof oldName === "string" ? oldName.trim() : "";
  const cast = st.fabula && Array.isArray(st.fabula.cast) ? st.fabula.cast : null;
  if (cast && was) {
    let changed = false;
    const now = isoNow();
    const out = cast.map(c => {
      if (!c || !c.fields || c.fields.character !== id || (c.name || "").trim() !== was) return c;
      changed = true;
      return { ...c, name, updatedAt: now };
    });
    if (changed) next = { ...next, fabula: { ...st.fabula, cast: out } };
  }
  return next;
};

// What a rename of record id from oldName to newName would do, for the
// modal, or null when there's nothing to ask: the name is the same but for
// case, the old name doesn't reach the record, or no text links by it. state
// is the world as the save will leave it but for the name (a draft's texts
// in, the old name kept). { id, kind, oldName, newName, places, formerLabel
// (where the record keeps former names, or null), former (that label, where
// the modal offers to add the old name there, or null when the old name is
// among them already), leaves and leavesFormer (what Rename only leaves the
// links doing, without the old name added and with it: { how: "broken" |
// "kept" | "moved", to }), taken (the record [[newName]] would reach instead
// of this one, or null) }.
const renamePlan = (state, id, oldName, newName) => {
  const st = state || {};
  const was = typeof oldName === "string" ? oldName.trim() : "";
  const now = typeof newName === "string" ? newName.trim() : "";
  const key = renameKey(was);
  if (!key || !now || key === renameKey(now)) return null;
  const rec = wikiResolverBuild(st, null).find(key);
  if (!rec || rec.id !== id) return null;
  const places = renameRewrite(st, key, now).places;
  if (places === 0) return null;
  const formerLabel = renameFormerLabel(st, id, rec.kind);
  const after = (also) => wikiResolverBuild(renameCopiedNames(renameRecordIn(st, id, now, also), id, was, now), null);
  const reach = (w) => {
    const r = w.find(key);
    return !r ? { how: "broken", to: null } : r.id === id ? { how: "kept", to: null } : { how: "moved", to: r };
  };
  const plain = after(null);
  const leaves = reach(plain);
  const former = formerLabel && leaves.how !== "kept" ? formerLabel : null;
  const other = plain.find(renameKey(now));
  return {
    id, kind: rec.kind, oldName: was, newName: now, places, formerLabel, former,
    leaves, leavesFormer: former ? reach(after(was)) : null,
    taken: other && other.id !== id ? other : null,
  };
};

// A rename, asked about first when renamePlan finds something to ask, then
// written by write(choice), choice { update, former, places }: update says
// the [[links]] are to be rewritten, which keeps a restore point of before
// first, and former that the old name goes among the record's former names.
// With nothing to ask, write runs at once with neither (RENAME_NONE); cancel,
// if given, runs when the modal is cancelled. state is as renamePlan takes
// it; before, the world as it is, is state unless given.
const renameAsk = ({ state, before, id, oldName, newName, write, cancel }) => {
  const plan = renamePlan(state, id, oldName, newName);
  if (!plan) { write(RENAME_NONE); return; }
  askRename({
    plan,
    onCancel: cancel || null,
    onConfirm: (choice) => {
      if (choice.update) renameRestorePoint(before || state);
      write(choice);
    },
  });
};

// The world once a rename is saved in it: the names copied from the record
// brought to the new one, and for an update every [[link]] by the old name
// rewritten to it.
const renameSettle = (state, id, oldName, newName, update) => {
  const now = typeof newName === "string" ? newName.trim() : "";
  if (!now) return state;
  const s = renameCopiedNames(state, id, oldName, now);
  return update ? renameRewrite(s, renameKey(oldName), now).state : s;
};

// The restore point an update keeps first (call 2): Before rename, a kind
// of its own, whose newest three are kept (SNAPSHOT_CAPPED_KINDS).
const renameRestorePoint = (state) => {
  snapshotCreate({ state, trigger: "manual", pinned: true, kind: "pre-rename", label: "Before rename" })
    .catch(e => console.error("Before rename snapshot failed:", e));
};

// What a rename that updated [[links]] says, after a Save ("Saved") or
// where the name is written as it's typed (lead "Renamed").
const renameUpdatedLine = (places, lead) => `${lead || "Saved"}. [[Links]] in ${places} ${places === 1 ? "place" : "places"} now use the new name.`;

// A template's reference fields, or a Fabula kind's, at any depth, with a
// renamed template's old name brought to its new one wherever a field aims
// at it by id: its place among the field's target names, a single target's
// name, and a filter keyed by its name, so another template's filter keeps
// working (docs/pipes-spec.md, section 5). Where the field aims as well at
// another template still called the old name (twins, their ids), the old
// name stays beside the new one and the filter is copied, not moved. The
// same list when nothing changes.
const renameTemplateTargets = (fields, id, was, now, twins) => {
  if (!Array.isArray(fields) || !was || !now || was === now) return fields;
  let changed = false;
  const out = fields.map(f => {
    if (!f || typeof f !== "object") return f;
    let x = f;
    if (f.type === "group" && Array.isArray(f.subfields)) {
      const subs = renameTemplateTargets(f.subfields, id, was, now, twins);
      if (subs !== f.subfields) x = { ...x, subfields: subs };
    }
    const ids = Array.isArray(f.refTemplatesId) ? f.refTemplatesId : [];
    const aims = f.type === "entry-ref" && (ids.includes(id) || f.refTemplateId === id);
    if (aims) {
      const shared = !!twins && ids.some(t => twins.has(t));
      const names = f.refTemplates;
      if (Array.isArray(names) && names.includes(was)) {
        if (!names.includes(now)) x = { ...x, refTemplates: shared ? [...names, now] : names.map(n => (n === was ? now : n)) };
        else if (!shared) x = { ...x, refTemplates: names.filter(n => n !== was) };
      }
      if (f.refTemplate === was) x = { ...x, refTemplate: now };
      const rf = f.refFilters;
      if (rf && typeof rf === "object" && !Array.isArray(rf) && Object.prototype.hasOwnProperty.call(rf, was) && !Object.prototype.hasOwnProperty.call(rf, now)) {
        const moved = {};
        Object.keys(rf).forEach(k => {
          if (k !== was || shared) moved[k] = rf[k];
          if (k === was) moved[now] = rf[k];
        });
        x = { ...x, refFilters: moved };
      }
    }
    if (x !== f) changed = true;
    return x;
  });
  return changed ? out : fields;
};'''

# ===================================================== 22: the renames, the index
edit(MODULES / "22_trunk.jsx", [
    (
        B(r'''
// delete counts and clears through it (linkDeleteCounts, clearLinksTo).

// The world description as a source: its row in Referenced by opens the
'''),
        B(r'''
// delete counts and clears through it (linkDeleteCounts, clearLinksTo). Since
// r044 a word's reference fields are read too, for its delete's count and
// clearing, and Concordance leaves them out.

// The world description as a source: its row in Referenced by opens the
'''),
    ),
    (
        B(r'''
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
'''),
        B(r'''
// A schema's reference fields alone, a group kept with its reference
// subfields, so a word's text isn't read for [[links]] (v1.7 r044).
const linkRefFieldsOnly = (fields) => (Array.isArray(fields) ? fields : []).map(f => {
  if (!f) return null;
  if (f.type === "entry-ref") return f;
  if (f.type !== "group") return null;
  const subfields = linkRefFieldsOnly(f.subfields);
  return subfields.length > 0 ? { ...f, subfields } : null;
}).filter(Boolean);

// The fields a Fabula kind's records are read through, the kind's stored
// schema or the seed's while the world has none; for "conlang" the ConLang
// schema's reference fields, and since r044 for "lexeme" the word schema's
// (linkRefFieldsOnly); built ones are kept while the templates they're built
// from are the same.
const linkKindFields = (state, kind) => {
  const glosso = kind === "conlang" || kind === "lexeme";
  const stored = !glosso && state.fabula && state.fabula.schemas ? state.fabula.schemas[kind] : null;
  if (stored && Array.isArray(stored.fields)) return stored.fields;
  const kept = LINK_INDEX_MEMO.schemas.get(kind);
  if (kept && kept.templates === state.templates) return kept.fields;
  const fields = kind === "conlang"
    ? glossopoeiaConlangSchema(state).fields.filter(f => f && f.type === "entry-ref")
    : kind === "lexeme" ? linkRefFieldsOnly(glossopoeiaLexemeSchema(state).fields)
    : fabulaKindFields(state, kind);
'''),
    ),
    (
        "// entry, fabula, map, stemma, body, conlang, or world, and its group its\n",
        "// entry, fabula, map, stemma, body, conlang, lexeme, or world, and its group its\n",
    ),
    (
        "  const keys = [st.entries, st.templates, st.fabula, st.cartographia, st.stemmas, st.celestialBodies, glo.conlangs, desc];\n",
        "  const keys = [st.entries, st.templates, st.fabula, st.cartographia, st.stemmas, st.celestialBodies, glo.conlangs, glo.lexemes, desc];\n",
    ),
    (
        B(r'''
        x.src = { id: c.id, kind: "conlang", group: "conlang", name: c.name || "", storyId: null };
        linkFieldWalk(fields, c.fields, x, null);
      }));
    });
  }
  // The world description.
'''),
        B(r'''
        x.src = { id: c.id, kind: "conlang", group: "conlang", name: c.name || "", storyId: null };
        linkFieldWalk(fields, c.fields, x, null);
      }));
    });
  }
  // Words, through the word schema's reference fields (v1.7 r044), so a
  // word's delete counts and clears the words that name it.
  const lexemes = Array.isArray(glo.lexemes) ? glo.lexemes : [];
  if (lexemes.length > 0) {
    const fields = linkKindFields(st, "lexeme");
    lexemes.forEach(w => {
      if (!w || !w.id) return;
      add(linkRecordLinks(w, fields, (x) => {
        x.src = { id: w.id, kind: "lexeme", group: "lexeme", name: w.name || "", storyId: null };
        linkFieldWalk(fields, w.fields, x, null);
      }));
    });
  }
  // The world description.
'''),
    ),
    SPAN(
        B(r'''
  const glo = state.glossopoeia;
  if (glo && Array.isArray(glo.conlangs) && glo.conlangs.length > 0) {
'''),
        B(r'''
        const { templateId, ...rest } = c;
        return rest;
      }) };
    }
  }
'''),
        B(r'''
  // ConLangs' reference fields, and since r044 words', so a word's delete
  // takes its id out of the words that name it.
  const glo = state.glossopoeia;
  const scrubGloss = (slice, tplId, kind) => {
    const list = glo && Array.isArray(glo[slice]) ? glo[slice] : null;
    if (!list || list.length === 0) return;
    const tpl = { id: tplId, fields: linkKindFields(state, kind) };
    const tagged = list.map(c => (c && typeof c === "object" ? { ...c, templateId: tpl.id } : { templateId: null }));
    const scrubbed = scrubEntryRefs(tagged, [tpl], going);
    if (!scrubbed.some((c, i) => c !== tagged[i])) return;
    next.glossopoeia = { ...(next.glossopoeia || glo), [slice]: scrubbed.map((c, i) => {
      if (c === tagged[i]) return list[i];
      const { templateId, ...rest } = c;
      return rest;
    }) };
  };
  scrubGloss("conlangs", SYNTH_TPL_CONLANG, "conlang");
  scrubGloss("lexemes", SYNTH_TPL_LEXEME, "lexeme");
'''),
    ),
    (
        B(r'''
        : p)) }, updatedAt: now };
    }));
  }
  return next;
};'''),
        B(r'''
        : p)) }, updatedAt: now };
    }));
  }
  return next;
};''') + RENAMES,
    ),
])

# ========================================================== 29: the modal
edit(MODULES / "29_modals.jsx", [
    (
        '["body", "body", "bodies"], ["conlang", "language", "languages"]];',
        '["body", "body", "bodies"], ["conlang", "language", "languages"], ["lexeme", "word", "words"]];',
    ),
    (
        B(r'''
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setAsk(null)}>Cancel</button>
          <button className="btn btn-danger record-delete-confirm" onClick={doDelete} autoFocus>Delete</button>
        </div>
      </div>
    </div>
  );
}'''),
        B(r'''
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setAsk(null)}>Cancel</button>
          <button className="btn btn-danger record-delete-confirm" onClick={doDelete} autoFocus>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Record rename (v1.7 r044) ─────────────────────────────────────────────────
// docs/pipes-spec.md, section 5, with Drak's calls at the cut: a rename that
// [[links]] by the old name reach asks here first (renameAsk, 22_trunk), how
// many places link by it and what Rename only leaves them doing, and offers
// Rename and update links, or Rename only, alone when the new name already
// reaches a record ahead of this one. Where the record keeps former names, a
// box adds the old name there, unticked (call 1). App draws it once.

const RECORD_RENAME = { open: null };

// ask: { plan, onConfirm(choice), onCancel }, plan renamePlan's, choice
// { update, former, places }. With no modal drawn, the browser's confirm
// asks about the update.
const askRename = (ask) => {
  if (RECORD_RENAME.open) { RECORD_RENAME.open(ask); return; }
  const p = ask.plan;
  const update = !p.taken && window.confirm(`Update the [[links]] by "${p.oldName}" to "${p.newName}"?`);
  ask.onConfirm({ update, former: false, places: p.places });
};

// A record a line names, by its kind: the entry "Aria", the map "Twinmark".
const renameRecordNoun = (rec) => {
  if (!rec) return "another record";
  const fab = rec.kind === "fabula" ? FABULA_KINDS.find(k => k.id === rec.source) : null;
  const noun = rec.kind === "entry" ? "entry" : rec.kind === "body" ? "body" : rec.kind === "map" ? "map"
    : rec.kind === "stemma" ? "stemma" : rec.kind === "conlang" ? "language"
    : fab && FABULA_NOUNS[fab.kind] ? FABULA_NOUNS[fab.kind].one : "record";
  return `the ${noun} "${rec.name}"`;
};

// What Rename only leaves the links doing, with the old name added to the
// record's former names or without.
const renameLeavesLine = (plan, former) => {
  const l = former && plan.leavesFormer ? plan.leavesFormer : plan.leaves;
  if (l.how === "kept") return `With Rename only, they stay as typed and still lead to it, through its ${plan.formerLabel || "former names"}.`;
  if (l.how === "moved") return `With Rename only, they stay as typed and lead instead to ${renameRecordNoun(l.to)}.`;
  return "With Rename only, they stay as typed and show as broken.";
};

// The modal, drawn once by App; askRename opens it. Esc and a click outside
// cancel, as Cancel does. While it's open the keys are its own, so none
// reaches what's under it: a board's arrows, Enter, and Delete, or Undo.
function RecordRenameModal() {
  const [ask, setAsk] = useState(null);
  const [former, setFormer] = useState(false);
  useEffect(() => {
    const open = (a) => { setFormer(false); setAsk(a); };
    RECORD_RENAME.open = open;
    return () => { if (RECORD_RENAME.open === open) RECORD_RENAME.open = null; };
  }, []);
  const cancel = () => {
    const a = ask;
    setAsk(null);
    if (a && a.onCancel) a.onCancel();
  };
  useEffect(() => {
    if (!ask) return undefined;
    const onKey = (e) => {
      e.stopPropagation();
      if (e.key === "Escape") { e.preventDefault(); cancel(); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [ask]);
  if (!ask) return null;
  const p = ask.plan;
  const done = (update) => {
    setAsk(null);
    ask.onConfirm({ update, former: !!(p.former && former), places: p.places });
  };
  return (
    <div className="modal-backdrop" onClick={cancel}>
      <div className="modal record-rename" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">Rename "{p.oldName}" to "{p.newName}"?</div>
        <div className="modal-body">
          <p className="record-rename-line" style={{ margin: 0 }}>[[Links]] in {p.places} {p.places === 1 ? "place" : "places"} lead to it by the old name.</p>
          {p.taken && <p className="record-rename-line" style={{ margin: "8px 0 0" }}>[[{p.newName}]] already leads to {renameRecordNoun(p.taken)}, so updating the links would send them there. It can be renamed without updating them.</p>}
          {p.former && (
            <label className="record-rename-former" style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0 0", cursor: "pointer" }}>
              <input type="checkbox" checked={former} onChange={e => setFormer(e.target.checked)} />
              <span>Add "{p.oldName}" to its {p.former}</span>
            </label>
          )}
          <p className="record-rename-line" style={{ margin: "8px 0 0" }}>{renameLeavesLine(p, former)}</p>
          {!p.taken && <p className="record-rename-line" style={{ margin: "8px 0 0" }}>Updating them saves a restore point first, Before rename, in Version History.</p>}
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={cancel}>Cancel</button>
          <button className="btn record-rename-only" onClick={() => done(false)} autoFocus={!!p.taken}>Rename only</button>
          {!p.taken && <button className="btn btn-accent record-rename-update" onClick={() => done(true)} autoFocus>Rename and update links</button>}
        </div>
      </div>
    </div>
  );
}'''),
    ),
])

# ===================================================== 03: the restore point
edit(MODULES / "03_persistence.jsx", [
    (
        B(r'''
// an import or a reset no longer clears the pinned snapshots.
const SNAPSHOT_KIND_CAP = 3;
const SNAPSHOT_CAPPED_KINDS = ["pre-restore", "pre-import", "pre-reset"];
'''),
        B(r'''
// an import or a reset no longer clears the pinned snapshots. Since r044 so
// does the one a rename that updates [[links]] keeps first, Before rename.
const SNAPSHOT_KIND_CAP = 3;
const SNAPSHOT_CAPPED_KINDS = ["pre-restore", "pre-import", "pre-reset", "pre-rename"];
'''),
    ),
    (
        "//     kind: null|'pre-restore'|'pre-import'|'pre-reset', sizeBytes: number,\n",
        "//     kind: null|'pre-restore'|'pre-import'|'pre-reset'|'pre-rename', sizeBytes: number,\n",
    ),
    (
        B(r'''
    // The snapshots pinned before a restore, an import, or a reset are capped
    // per kind (SNAPSHOT_KIND_CAP), so repeated restores and imports can't
    // fill the storage the world needs; since v1.7's r039 an import or a
    // reset clears only the automatic snapshots, so these accumulate too.
'''),
        B(r'''
    // The snapshots pinned before a restore, an import, a reset, or since
    // r044 a rename that updates [[links]] are capped per kind
    // (SNAPSHOT_KIND_CAP), so repeated restores and imports can't fill the
    // storage the world needs; since v1.7's r039 an import or a reset clears
    // only the automatic snapshots, so these accumulate too.
'''),
    ),
    (
        B(r'''
// FIFO eviction for one kind of the app's pinned snapshots: Before restore,
// Before import, or Before reset. They're pinned (so snapshotEvictAuto skips
// them) but accumulate if the user restores or imports often, so each kind
// keeps its newest SNAPSHOT_KIND_CAP and older ones drop quietly. Before
// restore had the cap alone until v1.7's r039, when an import and a reset
// stopped clearing the pinned snapshots.
'''),
        B(r'''
// FIFO eviction for one kind of the app's pinned snapshots: Before restore,
// Before import, Before reset, or since v1.7's r044 Before rename. They're
// pinned (so snapshotEvictAuto skips them) but accumulate if the user
// restores or imports often, so each kind keeps its newest SNAPSHOT_KIND_CAP
// and older ones drop quietly. Before restore had the cap alone until v1.7's
// r039, when an import and a reset stopped clearing the pinned snapshots.
'''),
    ),
])

# ============================================================ 12: App
edit(MODULES / "12_trunk.jsx", [
    # A map's Save.
    (
        B(r'''
  const saveMap = () => {
    if (!mapDraft) return;
'''),
        B(r'''
  const saveMap = () => saveMapAs(null);
  // v1.7 r044: a rename asks first when [[links]] by the old name reach the
  // map (renameAsk), and the save runs again with the answer.
  const saveMapAs = (choice) => {
    if (!mapDraft) return;
'''),
    ),
    (
        B(r'''
      mapData: ensureMapData(mapDraft.mapData),
      updatedAt: isoNow(),
    };
    saveNow();
    updateState(s => {
      const arr = Array.isArray(s.cartographia) ? s.cartographia : [];
      const exists = arr.some(m => m.id === rec.id);
      return { ...s, cartographia: exists ? arr.map(m => m.id === rec.id ? rec : m) : [...arr, rec] };
    });
    setMapDraft(null); initialMapDraftRef.current = null;
    setActiveMapId(rec.id);
    flash("Saved");
  };
'''),
        B(r'''
      mapData: ensureMapData(mapDraft.mapData),
      updatedAt: isoNow(),
    };
    const old = (state.cartographia || []).find(m => m && m.id === rec.id);
    const renamed = !!old && (old.name || "") !== name;
    if (renamed && !choice) {
      renameAsk({
        state: { ...state, cartographia: state.cartographia.map(m => (m && m.id === rec.id ? { ...m, fields: rec.fields } : m)) },
        before: state, id: rec.id, oldName: old.name || "", newName: name, write: (c) => saveMapAs(c),
      });
      return;
    }
    const answer = choice || RENAME_NONE;
    saveNow();
    updateState(s => {
      const arr = Array.isArray(s.cartographia) ? s.cartographia : [];
      const exists = arr.some(m => m.id === rec.id);
      const saved = { ...s, cartographia: exists ? arr.map(m => m.id === rec.id ? rec : m) : [...arr, rec] };
      return renamed ? renameSettle(saved, rec.id, old.name || "", name, answer.update) : saved;
    });
    setMapDraft(null); initialMapDraftRef.current = null;
    setActiveMapId(rec.id);
    flash(answer.update ? renameUpdatedLine(answer.places) : "Saved");
  };
'''),
    ),
    # A corpus's Save.
    (
        B(r'''
  const saveCorpus = () => {
    if (!corpusDraft || isLocked) return;
    const name = (corpusDraft.name || "").trim();
    if (!name) return;
    const now = isoNow();
    saveNow();
'''),
        B(r'''
  const saveCorpus = () => saveCorpusAs(null);
  // v1.7 r044: a rename asks first when [[links]] by the old name reach the
  // corpus (renameAsk), and the save runs again with the answer.
  const saveCorpusAs = (choice) => {
    if (!corpusDraft || isLocked) return;
    const name = (corpusDraft.name || "").trim();
    if (!name) return;
    const was = fabArr(state.fabula || {}, "corpora").find(c => c.id === corpusDraft.id);
    const renamed = !!was && (was.name || "") !== name;
    if (renamed && !choice) {
      renameAsk({
        state: { ...state, fabula: { ...state.fabula, corpora: fabArr(state.fabula || {}, "corpora").map(c => (c.id === corpusDraft.id ? { ...c, fields: corpusDraft.fields || {} } : c)) } },
        before: state, id: corpusDraft.id, oldName: was.name || "", newName: name, write: (c) => saveCorpusAs(c),
      });
      return;
    }
    const answer = choice || RENAME_NONE;
    const now = isoNow();
    saveNow();
'''),
    ),
    (
        B(r'''
      return { ...fab, corpora: old ? arr.map(c => c.id === rec.id ? rec : c) : [...arr, rec] };
    });
    setCorpusDraft(null); initialCorpusDraftRef.current = null;
    setActiveCorpusId(corpusDraft.id);
    flash("Saved");
  };
'''),
        B(r'''
      return { ...fab, corpora: old ? arr.map(c => c.id === rec.id ? rec : c) : [...arr, rec] };
    });
    if (renamed) updateState(s => renameSettle(s, corpusDraft.id, was.name || "", name, answer.update));
    setCorpusDraft(null); initialCorpusDraftRef.current = null;
    setActiveCorpusId(corpusDraft.id);
    flash(answer.update ? renameUpdatedLine(answer.places) : "Saved");
  };
'''),
    ),
    # A story's Rename on Fabula's index.
    (
        B(r'''
  const renameStory = (id, name) => {
    const n = (name || "").trim();
    if (isLocked || !n) return;
    updateFabula(fab => ({ ...fab, stories: fabArr(fab, "stories").map(st => st.id === id ? { ...st, name: n, updatedAt: isoNow() } : st) }));
  };
'''),
        B(r'''
  // v1.7 r044: a rename asks first when [[links]] by the old name reach the
  // story (renameAsk), and runs again with the answer.
  const renameStory = (id, name, choice) => {
    const n = (name || "").trim();
    if (isLocked || !n) return;
    const was = fabArr(state.fabula || {}, "stories").find(st => st.id === id);
    const renamed = !!was && (was.name || "") !== n;
    if (renamed && !choice) {
      renameAsk({ state, id, oldName: was.name || "", newName: n, write: (c) => renameStory(id, n, c) });
      return;
    }
    const answer = choice || RENAME_NONE;
    updateFabula(fab => ({ ...fab, stories: fabArr(fab, "stories").map(st => st.id === id ? { ...st, name: n, updatedAt: isoNow() } : st) }));
    if (renamed) updateState(s => renameSettle(s, id, was.name || "", n, answer.update));
    if (answer.update) flash(renameUpdatedLine(answer.places, "Renamed"));
  };
'''),
    ),
    # A story's Save.
    (
        B(r'''
  const saveStory = () => {
    if (!storyDraft || isLocked) return;
    const name = (storyDraft.name || "").trim();
    if (!name) return;
    const now = isoNow();
    saveNow();
    updateFabula(fab => ({ ...fab, stories: fabArr(fab, "stories").map(st => st.id === storyDraft.id ? { ...st, name, fields: storyDraft.fields || {}, updatedAt: now } : st) }));
    setStoryDraft(null); initialStoryDraftRef.current = null;
    flash("Saved");
  };
'''),
        B(r'''
  const saveStory = () => saveStoryAs(null);
  // v1.7 r044: a rename asks first when [[links]] by the old name reach the
  // story (renameAsk), and the save runs again with the answer.
  const saveStoryAs = (choice) => {
    if (!storyDraft || isLocked) return;
    const name = (storyDraft.name || "").trim();
    if (!name) return;
    const was = fabArr(state.fabula || {}, "stories").find(st => st.id === storyDraft.id);
    const renamed = !!was && (was.name || "") !== name;
    if (renamed && !choice) {
      renameAsk({
        state: { ...state, fabula: { ...state.fabula, stories: fabArr(state.fabula || {}, "stories").map(st => (st.id === storyDraft.id ? { ...st, fields: storyDraft.fields || {} } : st)) } },
        before: state, id: storyDraft.id, oldName: was.name || "", newName: name, write: (c) => saveStoryAs(c),
      });
      return;
    }
    const answer = choice || RENAME_NONE;
    const now = isoNow();
    saveNow();
    updateFabula(fab => ({ ...fab, stories: fabArr(fab, "stories").map(st => st.id === storyDraft.id ? { ...st, name, fields: storyDraft.fields || {}, updatedAt: now } : st) }));
    if (renamed) updateState(s => renameSettle(s, storyDraft.id, was.name || "", name, answer.update));
    setStoryDraft(null); initialStoryDraftRef.current = null;
    flash(answer.update ? renameUpdatedLine(answer.places) : "Saved");
  };
'''),
    ),
    # A Fabula record's Save.
    (
        B(r'''
  const saveFabulaRecord = () => {
    if (!recordDraft || !activeRecord || isLocked) return;
    const name = (recordDraft.name || "").trim();
    if (!name) return;
    const requiredErrors = validateRequiredFields(fabulaTemplate(state, activeRecord.kind), recordDraft.fields || {});
    if (requiredErrors.length > 0) { flash(requiredErrors.join(" \u00b7 ")); return; }
    const slice = fabulaSliceOf(activeRecord.kind);
    const kind = activeRecord.kind;
    const now = isoNow();
    saveNow();
'''),
        B(r'''
  const saveFabulaRecord = () => saveFabulaRecordAs(null);
  // v1.7 r044: a rename asks first when [[links]] by the old name reach the
  // record (renameAsk), and the save runs again with the answer.
  const saveFabulaRecordAs = (choice) => {
    if (!recordDraft || !activeRecord || isLocked) return;
    const name = (recordDraft.name || "").trim();
    if (!name) return;
    const requiredErrors = validateRequiredFields(fabulaTemplate(state, activeRecord.kind), recordDraft.fields || {});
    if (requiredErrors.length > 0) { flash(requiredErrors.join(" \u00b7 ")); return; }
    const slice = fabulaSliceOf(activeRecord.kind);
    const kind = activeRecord.kind;
    const was = fabArr(state.fabula || {}, slice).find(r => r.id === recordDraft.id);
    const renamed = !!was && (was.name || "") !== name;
    if (renamed && !choice) {
      renameAsk({
        state: { ...state, fabula: { ...state.fabula, [slice]: fabArr(state.fabula || {}, slice).map(r => (r.id === recordDraft.id ? { ...r, fields: recordDraft.fields || {} } : r)) } },
        before: state, id: recordDraft.id, oldName: was.name || "", newName: name, write: (c) => saveFabulaRecordAs(c),
      });
      return;
    }
    const answer = choice || RENAME_NONE;
    const now = isoNow();
    saveNow();
'''),
    ),
    (
        B(r'''
      if (kind === "cast" && rec.fields.character) delete rec.characterDeleted;
      return { ...fab, [slice]: old ? arr.map(r => r.id === rec.id ? rec : r) : [...arr, rec] };
    });
    setRecordDraft(null); initialRecordDraftRef.current = null;
    flash("Saved");
  };
'''),
        B(r'''
      if (kind === "cast" && rec.fields.character) delete rec.characterDeleted;
      return { ...fab, [slice]: old ? arr.map(r => r.id === rec.id ? rec : r) : [...arr, rec] };
    });
    if (renamed) updateState(s => renameSettle(s, recordDraft.id, was.name || "", name, answer.update));
    setRecordDraft(null); initialRecordDraftRef.current = null;
    flash(answer.update ? renameUpdatedLine(answer.places) : "Saved");
  };
'''),
    ),
    # An entry's Save.
    (
        B(r'''
  const saveEntry = () => {
    if (!entryDraft?.name?.trim()) return;
'''),
        B(r'''
  const saveEntry = () => saveEntryAs(null);
  // v1.7 r044: renaming an entry that [[links]] by its old name reach asks
  // first (renameAsk, Drak's calls at the cut), and the save runs again with
  // the answer, the old name added to its Name History if that was ticked.
  const saveEntryAs = (choice) => {
    if (!entryDraft?.name?.trim()) return;
'''),
    ),
    (
        B(r'''
    const dupCount = state.entries.filter(e => e.id !== activeEntryId && (e.name || "").toLowerCase() === lname).length;

    saveNow();
'''),
        B(r'''
    const dupCount = state.entries.filter(e => e.id !== activeEntryId && (e.name || "").toLowerCase() === lname).length;

    const oldName = view === "entry-new" ? null : (activeEntry?.name || "");
    const renamed = oldName !== null && oldName !== draftBase.name;
    if (renamed && !choice) {
      renameAsk({
        state: { ...state, entries: state.entries.map(e => (e.id === activeEntryId ? { ...e, fields: draftBase.fields } : e)) },
        before: state, id: activeEntryId, oldName, newName: draftBase.name, write: (c) => saveEntryAs(c),
      });
      return;
    }
    const answer = choice || RENAME_NONE;
    if (renamed && answer.former) draftBase.fields = renameNameHistoryAdd(tpl, draftBase.fields, oldName.trim());

    saveNow();
'''),
    ),
    (
        B(r'''
      updateState(s => ({
        ...s,
        entries: s.entries.map(e => {
          if (e.id === activeEntryId) return { ...e, ...draftBase, updatedAt: isoNow() };
          if (reciprocal.has(e.id)) return { ...e, fields: reciprocal.get(e.id), updatedAt: isoNow() };
          return e;
        }),
      }));
    }
    setActiveEntryId(newId); clearDraftAndStorage(true); setView("entry");
    if (dupCount > 0) {
'''),
        B(r'''
      updateState(s => {
        const saved = {
          ...s,
          entries: s.entries.map(e => {
            if (e.id === activeEntryId) return { ...e, ...draftBase, updatedAt: isoNow() };
            if (reciprocal.has(e.id)) return { ...e, fields: reciprocal.get(e.id), updatedAt: isoNow() };
            return e;
          }),
        };
        return renamed ? renameSettle(saved, activeEntryId, oldName, draftBase.name, answer.update) : saved;
      });
    }
    setActiveEntryId(newId); clearDraftAndStorage(true); setView("entry");
    if (answer.update) {
      flash(renameUpdatedLine(answer.places));
    } else if (dupCount > 0) {
'''),
    ),
    # A template's rename carries its targets.
    (
        B(r'''
      ensureIds(cleaned.fields);
      syncRefTargetNames(state.templates.map(t => t.id === activeTemplateId ? cleaned : t), [cleaned]);
      updateState(s => ({ ...s, templates: s.templates.map(t => t.id === activeTemplateId ? cleaned : t) }));
    }
'''),
        B(r'''
      ensureIds(cleaned.fields);
      // v1.7 r044: a rename carries the template's targets along, in its own
      // fields first, then in every other template's and Fabula kind's
      // (renameTemplateTargets), so their filters and target names keep it.
      const was = (state.templates.find(t => t.id === activeTemplateId) || {}).name || "";
      const twins = new Set(state.templates.filter(t => t && t.id !== activeTemplateId && t.name === was).map(t => t.id));
      const carry = (fields) => renameTemplateTargets(fields, activeTemplateId, was, cleaned.name, twins);
      cleaned.fields = carry(cleaned.fields);
      syncRefTargetNames(state.templates.map(t => t.id === activeTemplateId ? cleaned : t), [cleaned]);
      updateState(s => {
        const templates = s.templates.map(t => {
          if (t.id === activeTemplateId) return cleaned;
          const fields = carry(t.fields);
          return fields === t.fields ? t : { ...t, fields };
        });
        const schemas = s.fabula && s.fabula.schemas ? s.fabula.schemas : null;
        let moved = null;
        if (schemas) Object.keys(schemas).forEach(k => {
          const sc = schemas[k];
          const fields = sc && Array.isArray(sc.fields) ? carry(sc.fields) : null;
          if (!fields || fields === sc.fields) return;
          if (!moved) moved = { ...schemas };
          moved[k] = { ...sc, fields };
        });
        return { ...s, templates, fabula: moved ? { ...s.fabula, schemas: moved } : s.fabula };
      });
    }
'''),
    ),
    # A stemma's rename from its bar.
    (
        B(r'''
  const replaceStemma = (stemmaId, next) => {
    if (isLocked || !next) return;
    updateState(s => ({ ...s, stemmas: (s.stemmas || []).map(st => (st.id === stemmaId ? next : st)) }));
  };
'''),
        B(r'''
  const replaceStemma = (stemmaId, next) => {
    if (isLocked || !next) return;
    updateState(s => ({ ...s, stemmas: (s.stemmas || []).map(st => (st.id === stemmaId ? next : st)) }));
  };

  // v1.7 r044: a stemma renamed in its bar asks first when [[links]] by the
  // old name reach it (renameAsk). done(true) when it went in with its links
  // updated, written here, so the board's history starts over (Drak's call
  // 2); done(false) when the board's own step is to rename it, an undoable
  // one, the names copied from it brought along here.
  const renameStemma = (stemmaId, name, done) => {
    const stem = (state.stemmas || []).find(st => st && st.id === stemmaId);
    if (isLocked || !stem) return;
    const was = stem.name || "";
    renameAsk({
      state, id: stemmaId, oldName: was, newName: name,
      write: (choice) => {
        if (choice.update) {
          updateState(s => renameSettle({ ...s, stemmas: (s.stemmas || []).map(st => (st.id === stemmaId ? stemmaRename(st, name) : st)) }, stemmaId, was, name, true));
          done(true);
          flash(renameUpdatedLine(choice.places, "Renamed"));
          return;
        }
        done(false);
        updateState(s => renameSettle(s, stemmaId, was, name, false));
      },
    });
  };
'''),
    ),
    (
        B(r'''
                  onBackToIndex={closeStemmaToIndex}
                  onReplace={(next) => replaceStemma(stem.id, next)}
'''),
        B(r'''
                  onBackToIndex={closeStemmaToIndex}
                  onReplace={(next) => replaceStemma(stem.id, next)}
                  onRename={(name, done) => renameStemma(stem.id, name, done)}
'''),
    ),
    (
        B(r'''
                onBackToIndex={closeStemmaToIndex}
                onReplace={(next) => replaceStemma(stem.id, next)}
'''),
        B(r'''
                onBackToIndex={closeStemmaToIndex}
                onReplace={(next) => replaceStemma(stem.id, next)}
                onRename={(name, done) => renameStemma(stem.id, name, done)}
'''),
    ),
    (
        "      <RecordDeleteModal />\n",
        "      <RecordDeleteModal />\n      <RecordRenameModal />\n",
    ),
    # Ephemeris says what a body's rename updated.
    (
        "onPromoteEvent={promoteComputedEventToEntry} showSecrets={showSecrets} />\n",
        "onPromoteEvent={promoteComputedEventToEntry} showSecrets={showSecrets} flash={flash} />\n",
    ),
])

# ================================================= 14: the form's name field
edit(MODULES / "14_form-engine-edit.jsx", [
    (
        "onTogglePanel, onRestoreTemplate, footSlot }) {\n  const updateField = (fid, val) => onChange({ ...draft, fields: { ...draft.fields, [fid]: val } });\n",
        B(r'''
onTogglePanel, onRestoreTemplate, footSlot, onNameDone }) {
  const updateField = (fid, val) => onChange({ ...draft, fields: { ...draft.fields, [fid]: val } });
  // v1.7 r044: a form whose name is written as it's typed (a language's on
  // Glossopoeia's overview) hears when the name field is left, with the name
  // it held when it was entered, so a rename can ask then; Enter leaves it.
  // Until the field is first entered, the name is the one the form opened
  // with, since the field takes the focus as it's drawn.
  const nameAtFocusRef = useRef(draft.name);
  const nameDoneProps = onNameDone ? {
    onFocus: () => { nameAtFocusRef.current = draft.name; },
    onBlur: () => {
      const was = nameAtFocusRef.current;
      nameAtFocusRef.current = null;
      if (was !== null && was !== draft.name) onNameDone(was, draft.name);
    },
    onKeyDown: (e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } },
  } : {};
'''),
    ),
    (
        "value={draft.name} onChange={e => onChange({ ...draft, name: e.target.value })} autoFocus />\n",
        "value={draft.name} onChange={e => onChange({ ...draft, name: e.target.value })} {...nameDoneProps} autoFocus />\n",
    ),
])

# ================================================= 18: the editors' history
edit(MODULES / "18_cartographia" / "02_tools.jsx", [
    (
        B(r'''
  return { commit, undo, redo, canUndo: pastRef.current.length > 0, canRedo: futureRef.current.length > 0 };
}
'''),
        B(r'''
  // v1.7 r044: the history starts over, nothing to undo or redo, after a
  // change made outside it that it can't take back alone (a stemma's rename
  // that updated [[links]] elsewhere).
  const clear = () => {
    pastRef.current = [];
    futureRef.current = [];
    keyRef.current = null;
    bump(n => n + 1);
  };
  return { commit, undo, redo, clear, canUndo: pastRef.current.length > 0, canRedo: futureRef.current.length > 0 };
}
'''),
    ),
])

# ===================================================== 21: the boards' bars
edit(MODULES / "21_stemma" / "00_helpers-canvas.jsx", [
    (
        "function StemmaCanvasView({ stemma, focalNodeId, entries, templates, isLocked, flash, onFocalChange, onBackToIndex, onReplace, onOpenEntry, onExport, onExportMarkdown }) {\n",
        "function StemmaCanvasView({ stemma, focalNodeId, entries, templates, isLocked, flash, onFocalChange, onBackToIndex, onReplace, onOpenEntry, onExport, onExportMarkdown, onRename }) {\n",
    ),
    (
        B(r'''
  const history = useMapHistory(stemma, onReplace);
  const apply = (next, opts) => {
    if (isLocked || !next || next === stemma) return;
    history.commit(next, opts);
  };
'''),
        B(r'''
  const history = useMapHistory(stemma, onReplace);
  const apply = (next, opts) => {
    if (isLocked || !next || next === stemma) return;
    history.commit(next, opts);
  };
  // v1.7 r044: a rename from the bar asks App first (onRename); one that
  // updated [[links]] elsewhere went in there and can't be undone here, so
  // the history starts over, and one that didn't is a step of its own.
  const renameDoc = (name) => {
    if (!onRename) { apply(stemmaRename(stemma, name)); return; }
    onRename(name, (rewrote) => { if (rewrote) history.clear(); else apply(stemmaRename(stemma, name)); });
  };
'''),
    ),
    (
        "              if (trimmed && trimmed !== stemma.name) apply(stemmaRename(stemma, trimmed));\n",
        "              if (trimmed && trimmed !== stemma.name) renameDoc(trimmed);\n",
    ),
])
edit(MODULES / "21_stemma" / "06_tabula-canvas.jsx", [
    (
        "function TabulaCanvasView({ stemma, boardId, entries, templates, isLocked, flash, onFocalChange, onBackToIndex, onReplace, onOpenEntry, onExport, onExportMarkdown, viewPref, onViewPref, dirHandle, imageFolder }) {\n",
        "function TabulaCanvasView({ stemma, boardId, entries, templates, isLocked, flash, onFocalChange, onBackToIndex, onReplace, onOpenEntry, onExport, onExportMarkdown, viewPref, onViewPref, dirHandle, imageFolder, onRename }) {\n",
    ),
    (
        B(r'''
  const history = useMapHistory(stemma, onReplace);
  const apply = (next, opts) => {
    if (isLocked || !next || next === stemma) return;
    history.commit(next, opts);
  };
'''),
        B(r'''
  const history = useMapHistory(stemma, onReplace);
  const apply = (next, opts) => {
    if (isLocked || !next || next === stemma) return;
    history.commit(next, opts);
  };
  // v1.7 r044: a rename from the bar asks App first (onRename); one that
  // updated [[links]] elsewhere went in there and can't be undone here, so
  // the history starts over, and one that didn't is a step of its own.
  const renameDoc = (name) => {
    if (!onRename) { apply(stemmaRename(stemma, name)); return; }
    onRename(name, (rewrote) => { if (rewrote) history.clear(); else apply(stemmaRename(stemma, name)); });
  };
'''),
    ),
    (
        "onBlur={() => { const trimmed = nameDraft.trim(); if (trimmed && trimmed !== stemma.name) apply(stemmaRename(stemma, trimmed)); setEditingName(false); }}\n",
        "onBlur={() => { const trimmed = nameDraft.trim(); if (trimmed && trimmed !== stemma.name) renameDoc(trimmed); setEditingName(false); }}\n",
    ),
])

# ================================================ 23: a language's rename
edit(MODULES / "23_glossopoeia" / "04_view.jsx", [
    (
        B(r'''
  const writeConlang = (rec) => {
    if (isLocked) return;
'''),
        B(r'''
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
'''),
    ),
    (
        B(r'''
                onChange={writeConlang}
                showSecrets={true}
'''),
        B(r'''
                onChange={writeConlang}
                onNameDone={(was, now) => renameLanguage(activeLang.id, was, now)}
                showSecrets={true}
'''),
    ),
])

# ===================================================== 24: a body's Save
edit(MODULES / "24_ephemeris" / "01_shell.jsx", [
    (
        B(r'''
  // v1.5 r007: in-place body update. Replaces the targeted body's fields
  // with the merged version. Doesn't clear selection. Used by the AsBo
  // edit-mode Save button.
  const updateBody = (bodyId, patch) => {
    if (isLocked) return;
    updateState(s => ({
      ...s,
      celestialBodies: (s.celestialBodies || []).map(b =>
        b && b.id === bodyId ? { ...b, ...patch } : b
      ),
      ephemeris: {
        ...(s.ephemeris || makeDefaultEphemerisState()),
        asbo: {
          ...((s.ephemeris && s.ephemeris.asbo) || {}),
          editingNewBody: false,
        },
      },
    }));
  };
'''),
        B(r'''
  // v1.5 r007: in-place body update. Replaces the targeted body's fields
  // with the merged version. Doesn't clear selection. Used by the AsBo
  // edit-mode Save button. Since v1.7's r044 a rename asks first when
  // [[links]] by the old name reach the body (renameAsk), the old name going
  // into its Other Names if that's ticked, and done runs once the save is
  // written, so a cancelled rename leaves the edit open.
  const updateBody = (bodyId, patch, done, choice) => {
    if (isLocked) return;
    const body = (state.celestialBodies || []).find(b => b && b.id === bodyId);
    const was = body && typeof body.name === "string" ? body.name : "";
    const renamed = !!body && !!patch && typeof patch.name === "string" && patch.name !== was;
    if (renamed && !choice) {
      renameAsk({
        state: { ...state, celestialBodies: state.celestialBodies.map(b => (b && b.id === bodyId ? { ...b, ...patch, name: was } : b)) },
        before: state, id: bodyId, oldName: was, newName: patch.name, write: (c) => updateBody(bodyId, patch, done, c),
      });
      return;
    }
    const answer = choice || RENAME_NONE;
    const next = renamed && answer.former ? { ...patch, otherNames: renameOtherNamesAdd(patch.otherNames !== undefined ? patch.otherNames : body.otherNames, was.trim()) } : patch;
    updateState(s => {
      const saved = {
        ...s,
        celestialBodies: (s.celestialBodies || []).map(b =>
          b && b.id === bodyId ? { ...b, ...next } : b
        ),
        ephemeris: {
          ...(s.ephemeris || makeDefaultEphemerisState()),
          asbo: {
            ...((s.ephemeris && s.ephemeris.asbo) || {}),
            editingNewBody: false,
          },
        },
      };
      return renamed ? renameSettle(saved, bodyId, was, patch.name, answer.update) : saved;
    });
    if (done) done();
    if (answer.update && flash) flash(renameUpdatedLine(answer.places));
  };
'''),
    ),
    (
        "function EphemerisView({ state, updateState, isLocked, onOpenEntry, onPromoteEvent, showSecrets }) {\n",
        "function EphemerisView({ state, updateState, isLocked, onOpenEntry, onPromoteEvent, showSecrets, flash }) {\n",
    ),
])
edit(MODULES / "24_ephemeris" / "02_asbo.jsx", [
    (
        "        onSave={() => { onSaveBody(body.id, draft); setDraft(null); }}\n",
        "        onSave={() => onSaveBody(body.id, draft, () => setDraft(null))}\n",
    ),
])

# ============================================= 15: the builder's filter note
edit(MODULES / "15_template-builder.jsx", [
    (
        # The old comment's dash is written as chr(0x2014), so this script
        # holds none of its own.
        "// refFilters is keyed by template NAME (matches built-in convention; survives\n"
        "// template rename if TEMPLATE_RENAMES handles it; otherwise filter quietly\n"
        "// becomes inert " + chr(0x2014) + " picker just shows all entries of that template, no crash).\n",
        B(r'''
// refFilters is keyed by template NAME (matches built-in convention). Since
// v1.7's r044 a template's rename carries its key in every template's and
// Fabula kind's field that aims at it (renameTemplateTargets), where before
// it went inert unless TEMPLATE_RENAMES moved it; a key no target answers to
// is inert, and the picker shows all of that template's entries.
'''),
    ),
])

# ===================================================== 17: Concordance
edit(MODULES / "17_concordance.jsx", [
    (
        B(r'''
      if (src.kind === "conlang" && (l.field === "varietyOf" || l.field === "descendedFrom")) continue;
'''),
        B(r'''
      if (src.kind === "conlang" && (l.field === "varietyOf" || l.field === "descendedFrom")) continue;
      // A word's links, which the index reads since r044 for a delete's
      // count, stay out: a word's etymology is the registry's edges.
      if (src.kind === "lexeme") continue;
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
    print(f"r044 applied to {len(staged)} files")


if __name__ == "__main__":
    main()
