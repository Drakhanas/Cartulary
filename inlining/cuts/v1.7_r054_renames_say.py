r"""
v1.7 r054: Renames say where the links go, the Sweep's fourth cut.

docs/sweep-spec.md, section 3, with Drak's call at the cut on the detail
section 9 left open (2026-11-01, option a of two: a rename to a name another
record answers to is warned about and allowed; the other was to refuse the
name), and his call a of the same day after r053's turnover, that r054 take
r041's P2, the link index rebuilt after an edit, whose time had climbed to its
limit. Claude's plan, said to Drak and not stopped:

1. Renaming a record to a name another record already answers to, by its
   name, a former name, a body's other name, or a map's name, opens the
   rename modal even when the old name has no links. It counts the places
   whose [[links]] by the new name reach that record now and says where they
   lead after: here, where this record will claim the name first, or still
   there, where the other keeps it (r044's line, until now shown only when
   the old name had links). With no links by the old name the modal offers
   Rename and Cancel, there being nothing to update.
2. After an edit the link index is brought from the last build: the
   target lists nothing touched are kept, only the records that changed and
   those whose [[links]] a name change moves are read again, and the two flat
   lists Concordance and a Linked with condition read are made when first
   read. A change that reaches many records, or records that changed places,
   builds it whole, as before. The world description's links are kept while
   it's the same, as a record's are. (Found checking the build before it was
   staged: read through getters, the lists made Concordance's loop over the
   230,000 links of r041's generated world take about 30 ms where r053's took
   5, so they're made with the index again, about 10 ms there.)

- 22_trunk: wikiResolverBuild gives its keys out (byKey);
  wikiResolverChangedKeys; LINK_INDEX_MEMO keeps the last build and the
  description's links; linkIndexOf split into linkIndexRecords,
  linkIndexResolve, linkIndexBuild, linkIndexStep, and linkIndexOut;
  renamePlaces; renamePlan.
- 29_modals: the rename modal's lines and buttons (renameHolderLine), and
  askRename's fallback.

Declared scope: 22_trunk, 29_modals. Declarations added: linkIndexBuild,
linkIndexOut, linkIndexRecords, linkIndexResolve, linkIndexStep,
renameHolderLine, renamePlaces, wikiResolverChangedKeys. None removed. No
header added.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given), and nothing is written unless every anchor holds.
Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r054_renames_say.py
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


# ------------------------------------------------------------------ 22_trunk
edit(MODULES / "22_trunk.jsx", [
    # the resolver gives its keys out
    (B('''
// id; and names every name that reaches a record, in the order above, for
// the autocomplete.
'''), B('''
// id; names every name that reaches a record, in the order above, for the
// autocomplete; and since r054 byKey, each name's record by its key.
''')),
    ('''  return { find, resolve, names };\n};''', '''  return { find, resolve, names, byKey };\n};'''),
    # which keys two resolvers send to different records
    (B('''
// The resolver App draws with, for whatever below it reads a [[link]].
'''), B('''
// The keys two resolvers send to different records, or one of them to none,
// which the link index reads again (linkIndexStep, v1.7 r054).
const wikiResolverChangedKeys = (a, b) => {
  const out = new Set();
  a.byKey.forEach((rec, k) => { const r = b.byKey.get(k); if (!r || r.id !== rec.id) out.add(k); });
  b.byKey.forEach((rec, k) => { if (!a.byKey.has(k)) out.add(k); });
  return out;
};

// The resolver App draws with, for whatever below it reads a [[link]].
''')),
    # what the index keeps between builds
    (B('''
// world keeps no schema of its own. The names are the resolver's own
// (WIKI_RESOLVER_MEMO) since r043.
const LINK_INDEX_MEMO = { keys: null, index: null, records: new WeakMap(), schemas: new Map(), mapFields: null };
'''), B('''
// world keeps no schema of its own. The names are the resolver's own
// (WIKI_RESOLVER_MEMO) since r043. Since r054 it keeps the build the index
// was made from, which the next starts from (built, linkIndexStep), and the
// world description's links while it's the same (desc).
const LINK_INDEX_MEMO = { keys: null, index: null, built: null, desc: null, records: new WeakMap(), schemas: new Map(), mapFields: null };
''')),
    # the records read, pulled out of linkIndexOf
    (B('''
// The index, { byTarget, links, targets }: each target's links as linkPush
// makes them, src the source as { id, kind, group, name, storyId }, its kind
// entry, fabula, map, stemma, body, conlang, lexeme, or world, and its group its
// template, its Fabula kind, or its kind again; and since r043 every link in
// the order its record was read (links), beside its target (targets), which
// Concordance draws in. Put together again only when a slice it reads has
// changed.
const linkIndexOf = (state) => {
  const st = state || {};
  const fab = st.fabula || {};
  const glo = st.glossopoeia || {};
  const desc = st.world && typeof st.world.description === "string" ? st.world.description : "";
  const keys = [st.entries, st.templates, st.fabula, st.cartographia, st.stemmas, st.celestialBodies, glo.conlangs, glo.lexemes, desc];
  const memo = LINK_INDEX_MEMO;
  if (memo.index && memo.keys.every((k, i) => k === keys[i])) return memo.index;
  const wiki = wikiResolverOf(st);
  const byTarget = new Map();
  const links = [], targets = [];
  // A kept link goes into its target's list as it is; a [[link]]'s target is
  // found by name at every build, since names change without the link.
  const add = (x) => {
    const ls = x.links;
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i];
      const target = l.kind === "wiki" ? wiki.resolve(l.to) : l.to;
      if (typeof target !== "string" || !target || target === l.src.id) continue;
      let list = byTarget.get(target);
      if (!list) { list = []; byTarget.set(target, list); }
      list.push(l);
      links.push(l);
      targets.push(target);
    }
  };
  // Entries, through their templates.
'''), B('''
// Every record's links, each record's read or kept (linkRecordLinks), in the
// order the index reads the records: entries, Fabula's records, maps,
// stemmas, bodies, ConLangs, words, and the world description (v1.7 r054,
// pulled out of linkIndexOf).
const linkIndexRecords = (state) => {
  const st = state || {};
  const fab = st.fabula || {};
  const glo = st.glossopoeia || {};
  const desc = st.world && typeof st.world.description === "string" ? st.world.description : "";
  const memo = LINK_INDEX_MEMO;
  const out = [];
  const add = (x) => { out.push(x); };
  // Entries, through their templates.
''')),
    # the description kept, then the build, the step, and the index given out
    (B('''
  if (desc) {
    const x = { src: { id: LINK_SOURCE_WORLD, kind: "world", group: "world", name: "World description", storyId: null }, links: [] };
    linkWikiNames(desc, "description", "", "", false, x);
    add(x);
  }
  memo.keys = keys;
  memo.index = { byTarget, links, targets };
  return memo.index;
};
'''), B('''
  if (desc) {
    // kept while the description is the same, as a record's links are
    if (!memo.desc || memo.desc.text !== desc) {
      const x = { src: { id: LINK_SOURCE_WORLD, kind: "world", group: "world", name: "World description", storyId: null }, links: [] };
      linkWikiNames(desc, "description", "", "", false, x);
      memo.desc = { text: desc, x };
    }
    add(memo.desc.x);
  }
  return out;
};

// One record's targets, beside its links: a stored link's id, a [[link]]'s
// record by name (wiki, the resolver), since names change without the link,
// and null for a link that finds nothing or points at its own record, which
// the index leaves out.
const linkIndexResolve = (x, wiki) => {
  const ls = x.links;
  const out = new Array(ls.length);
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i];
    const t = l.kind === "wiki" ? wiki.resolve(l.to) : l.to;
    out[i] = typeof t === "string" && t && t !== l.src.id ? t : null;
  }
  return out;
};

// A build of the whole index: { wiki, xs, tgs, byTarget }, the resolver it
// read names through, every record's links (xs) and their targets beside
// them (tgs), and each target's links in the order they were read.
const linkIndexBuild = (state) => {
  const st = state || {};
  const wiki = wikiResolverOf(st);
  const xs = linkIndexRecords(st);
  const tgs = xs.map(x => linkIndexResolve(x, wiki));
  const byTarget = new Map();
  for (let i = 0; i < xs.length; i++) {
    const ls = xs[i].links, ts = tgs[i];
    for (let j = 0; j < ls.length; j++) {
      const t = ts[j];
      if (t === null) continue;
      let list = byTarget.get(t);
      if (!list) { list = []; byTarget.set(t, list); }
      list.push(ls[j]);
    }
  }
  return { wiki, xs, tgs, byTarget };
};

// The last build brought to state, the same as a build of the whole would
// give, or null where building it whole is the way (v1.7 r054, Drak's call
// a): the records kept keep their targets, and the target lists that no
// record touches are kept as they are; the records that came, changed, or
// went, and those whose [[links]] a name now sends elsewhere
// (wikiResolverChangedKeys), have their targets read again, and the lists of
// every target they touch, before or after, are put together again in the
// records' order. A change that reaches more than one record in sixteen (64
// at least), or records kept in a new order, builds it whole.
const linkIndexStep = (prev, state) => {
  if (!prev) return null;
  const st = state || {};
  const wiki = wikiResolverOf(st);
  const xs = linkIndexRecords(st);
  const n = xs.length;
  const most = Math.max(64, n >> 4);
  const was = new Map();
  for (let p = 0; p < prev.xs.length; p++) was.set(prev.xs[p], p);
  const tgs = new Array(n);
  const fresh = [];
  let last = -1;
  for (let i = 0; i < n; i++) {
    const p = was.get(xs[i]);
    if (p === undefined) { fresh.push(i); continue; }
    if (p < last) return null;
    last = p;
    tgs[i] = prev.tgs[p];
    was.delete(xs[i]);
  }
  if (fresh.length + was.size > most) return null;
  const dirty = new Set();
  const mark = (ts) => { for (let j = 0; j < ts.length; j++) if (ts[j] !== null) dirty.add(ts[j]); };
  was.forEach(p => mark(prev.tgs[p]));
  if (wiki !== prev.wiki) {
    const moved = wikiResolverChangedKeys(prev.wiki, wiki);
    if (moved.size > 0) {
      let redone = 0;
      for (let i = 0; i < n; i++) {
        if (tgs[i] === undefined) continue;
        const ls = xs[i].links;
        let hit = false;
        for (let j = 0; j < ls.length && !hit; j++) hit = ls[j].kind === "wiki" && moved.has(ls[j].to);
        if (!hit) continue;
        redone += 1;
        if (fresh.length + was.size + redone > most) return null;
        mark(tgs[i]);
        tgs[i] = linkIndexResolve(xs[i], wiki);
        mark(tgs[i]);
      }
    }
  }
  fresh.forEach(i => { tgs[i] = linkIndexResolve(xs[i], wiki); mark(tgs[i]); });
  const byTarget = new Map(prev.byTarget);
  dirty.forEach(t => byTarget.delete(t));
  if (dirty.size > 0) {
    for (let i = 0; i < n; i++) {
      const ls = xs[i].links, ts = tgs[i];
      for (let j = 0; j < ls.length; j++) {
        const t = ts[j];
        if (t === null || !dirty.has(t)) continue;
        let list = byTarget.get(t);
        if (!list) { list = []; byTarget.set(t, list); }
        list.push(ls[j]);
      }
    }
  }
  return { wiki, xs, tgs, byTarget };
};

// The index a build gives out, { byTarget, links, targets }, with its two
// flat lists, every link in the order its record was read beside its target,
// which Concordance and a Linked with condition read (v1.7 r054).
const linkIndexOut = (built) => {
  const links = [], targets = [];
  for (let i = 0; i < built.xs.length; i++) {
    const ls = built.xs[i].links, ts = built.tgs[i];
    for (let j = 0; j < ls.length; j++) if (ts[j] !== null) { links.push(ls[j]); targets.push(ts[j]); }
  }
  return { byTarget: built.byTarget, links, targets };
};

// The index, { byTarget, links, targets }: each target's links as linkPush
// makes them, src the source as { id, kind, group, name, storyId }, its kind
// entry, fabula, map, stemma, body, conlang, lexeme, or world, and its group its
// template, its Fabula kind, or its kind again; and since r043 every link in
// the order its record was read (links), beside its target (targets), which
// Concordance draws in. Put together again only when a slice it reads has
// changed, since r054 brought from the last build when an edit reaches few
// records (linkIndexStep).
const linkIndexOf = (state) => {
  const st = state || {};
  const glo = st.glossopoeia || {};
  const desc = st.world && typeof st.world.description === "string" ? st.world.description : "";
  const keys = [st.entries, st.templates, st.fabula, st.cartographia, st.stemmas, st.celestialBodies, glo.conlangs, glo.lexemes, desc];
  const memo = LINK_INDEX_MEMO;
  if (memo.index && memo.keys.every((k, i) => k === keys[i])) return memo.index;
  memo.built = linkIndexStep(memo.built, st) || linkIndexBuild(st);
  memo.keys = keys;
  memo.index = linkIndexOut(memo.built);
  return memo.index;
};
''')),
    # renames: how many places a name's [[links]] are in
    (B('''
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
'''), B('''
// How many places hold a [[link]] by key: the records renameRewrite would
// change for it, the world description as one (v1.7 r054).
const renamePlaces = (state, key) => renameRewrite(state, key, `${key}${String.fromCharCode(1)}`).places;

// What a rename of record id from oldName to newName would do, for the
// modal, or null when there's nothing to ask: the name is the same but for
// case, or the old name reaches the record from no text and, since r054, the
// new name reaches no other record. state is the world as the save will
// leave it but for the name (a draft's texts in, the old name kept). { id,
// kind, oldName, newName, places (those whose [[links]] by the old name reach
// it, none where the old name doesn't), formerLabel (where the record keeps
// former names, or null), former (that label, where the modal offers to add
// the old name there, or null when the old name is among them already),
// leaves and leavesFormer (what Rename only leaves those links doing,
// without the old name added and with it: { how: "broken" | "kept" |
// "moved", to }, or null with no places), taken (the record [[newName]]
// would reach instead of this one, or null), and since r054 holder (the
// record [[newName]] reaches now, where it's another) and holderPlaces
// (those whose [[links]] by the new name reach it) }.
const renamePlan = (state, id, oldName, newName) => {
  const st = state || {};
  const was = typeof oldName === "string" ? oldName.trim() : "";
  const now = typeof newName === "string" ? newName.trim() : "";
  const key = renameKey(was);
  const nowKey = renameKey(now);
  if (!key || !now || key === nowKey) return null;
  const wiki = wikiResolverBuild(st, null);
  const rec = wiki.find(key);
  const owns = !!rec && rec.id === id;
  const places = owns ? renameRewrite(st, key, now).places : 0;
  const there = wiki.find(nowKey);
  const holder = there && there.id !== id ? there : null;
  if (places === 0 && !holder) return null;
  const after = (also) => wikiResolverBuild(renameCopiedNames(renameRecordIn(st, id, now, also), id, was, now), null);
  const plain = after(null);
  const other = plain.find(nowKey);
  const taken = other && other.id !== id ? other : null;
  const holderPlaces = holder ? renamePlaces(st, nowKey) : 0;
  if (places === 0) {
    return {
      id, kind: owns ? rec.kind : null, oldName: was, newName: now, places, formerLabel: null, former: null,
      leaves: null, leavesFormer: null, taken, holder, holderPlaces,
    };
  }
  const formerLabel = renameFormerLabel(st, id, rec.kind);
  const reach = (w) => {
    const r = w.find(key);
    return !r ? { how: "broken", to: null } : r.id === id ? { how: "kept", to: null } : { how: "moved", to: r };
  };
  const leaves = reach(plain);
  const former = formerLabel && leaves.how !== "kept" ? formerLabel : null;
  return {
    id, kind: rec.kind, oldName: was, newName: now, places, formerLabel, former,
    leaves, leavesFormer: former ? reach(after(was)) : null,
    taken, holder, holderPlaces,
  };
};
''')),
])

# ------------------------------------------------------------------ 29_modals
edit(MODULES / "29_modals.jsx", [
    (B('''
// many places link by it and what Rename only leaves them doing, and offers
// Rename and update links, or Rename only, alone when the new name already
// reaches a record ahead of this one. Where the record keeps former names, a
// box adds the old name there, unticked (call 1). App draws it once.
'''), B('''
// many places link by it and what Rename only leaves them doing, and offers
// Rename and update links, or Rename only, alone when the new name already
// reaches a record ahead of this one. Where the record keeps former names, a
// box adds the old name there, unticked (call 1). Since r054 a rename to a
// name another record answers to asks here too, links by the old name or
// none, saying how many places link by the new name and where those links
// lead after; with none by the old name it offers Rename (Drak's call a, to
// warn and allow). App draws it once.
''')),
    ('''  const update = !p.taken && window.confirm(`Update the [[links]] by "${p.oldName}" to "${p.newName}"?`);''',
     '''  const update = p.places > 0 && !p.taken && window.confirm(`Update the [[links]] by "${p.oldName}" to "${p.newName}"?`);'''),
    # where the new name's links lead, before and after
    (B('''
// The modal, drawn once by App; askRename opens it. Esc and a click outside
'''), B('''
// Where the [[links]] by the new name lead, where another record answers to
// it now (v1.7 r054): here after the rename, or still there.
const renameHolderLine = (p) => {
  if (!p.holder) return null;
  const n = p.holderPlaces;
  const from = n > 0 ? `, from ${n} ${n === 1 ? "place" : "places"}` : "";
  if (!p.taken) return `[[${p.newName}]] leads to ${renameRecordNoun(p.holder)} now${from}; after the rename ${n > 0 ? "those links" : "it"} will lead here.`;
  if (p.places > 0) return null;
  return `[[${p.newName}]] leads to ${renameRecordNoun(p.taken)}${from}, and still will after the rename, so a [[link]] by "${p.newName}" won't reach it.`;
};

// The modal, drawn once by App; askRename opens it. Esc and a click outside
''')),
    (B('''
          <p className="record-rename-line" style={{ margin: 0 }}>[[Links]] in {p.places} {p.places === 1 ? "place" : "places"} lead to it by the old name.</p>
          {p.taken && <p className="record-rename-line" style={{ margin: "8px 0 0" }}>[[{p.newName}]] already leads to {renameRecordNoun(p.taken)}, so updating the links would send them there. It can be renamed without updating them.</p>}
'''), B('''
          {p.places > 0 && <p className="record-rename-line" style={{ margin: 0 }}>[[Links]] in {p.places} {p.places === 1 ? "place" : "places"} lead to it by the old name.</p>}
          {p.places > 0 && p.taken && <p className="record-rename-line" style={{ margin: "8px 0 0" }}>[[{p.newName}]] already leads to {renameRecordNoun(p.taken)}, so updating the links would send them there. It can be renamed without updating them.</p>}
''')),
    (B('''
          <p className="record-rename-line" style={{ margin: "8px 0 0" }}>{renameLeavesLine(p, former)}</p>
          {!p.taken && <p className="record-rename-line" style={{ margin: "8px 0 0" }}>Updating them saves a restore point first, Before rename, in Version History.</p>}
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={cancel}>Cancel</button>
          <button className="btn record-rename-only" onClick={() => done(false)} autoFocus={!!p.taken}>Rename only</button>
          {!p.taken && <button className="btn btn-accent record-rename-update" onClick={() => done(true)} autoFocus>Rename and update links</button>}
        </div>
'''), B('''
          {p.places > 0 && <p className="record-rename-line" style={{ margin: "8px 0 0" }}>{renameLeavesLine(p, former)}</p>}
          {p.places > 0 && !p.taken && <p className="record-rename-line" style={{ margin: "8px 0 0" }}>Updating them saves a restore point first, Before rename, in Version History.</p>}
          {renameHolderLine(p) && <p className="record-rename-line record-rename-holder" style={{ margin: p.places > 0 ? "10px 0 0" : 0 }}>{renameHolderLine(p)}</p>}
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={cancel}>Cancel</button>
          {p.places === 0 && <button className="btn btn-accent record-rename-go" onClick={() => done(false)} autoFocus>Rename</button>}
          {p.places > 0 && <button className="btn record-rename-only" onClick={() => done(false)} autoFocus={!!p.taken}>Rename only</button>}
          {p.places > 0 && !p.taken && <button className="btn btn-accent record-rename-update" onClick={() => done(true)} autoFocus>Rename and update links</button>}
        </div>
''')),
])


def main():
    staged = []
    for path, steps in PLAN:
        text = path.read_text(encoding="utf-8")
        for step in steps:
            old, new = step[0], step[1]
            count = step[2] if len(step) > 2 else 1
            n = text.count(old)
            assert n == count, f"{path.name}: anchor occurs {n} times, not {count}:\n{old[:300]}"
            text = text.replace(old, new)
        if chr(0xFEFF) in text:
            raise SystemExit(f"{path.name}: a byte-order mark would be written")
        staged.append((path, text))
    for path, text in staged:
        path.write_text(text, encoding="utf-8")
    print(f"r054 applied to {len(staged)} files")


if __name__ == "__main__":
    main()
