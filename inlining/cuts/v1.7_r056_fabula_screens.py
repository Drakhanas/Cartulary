r"""
v1.7 r056: Fabula's screens, the Sweep's sixth cut.

docs/sweep-spec.md, section 3. Section 9 leaves it no open detail. Claude's
plan, said to Drak, who said go:

1. The outline by keyboard. On a focused row, Up and Down step to the row
   above and below, beats included, and Home and End to the first and last;
   Alt with the arrows still moves the row. Defaults: Right and Left do as a
   tree's do, Right unfolding a folded row or stepping to the first row in
   it, Left folding an open row or stepping out to the row it sits in; the
   arrows step only from a row itself, not from its buttons or boxes; Tab
   works as it did.
2. A long story title on the index takes the row's first line, whole,
   wrapping there if it has to, instead of being cut. Default: the counts,
   the date, the Corpus dropdown, Rename, and Delete go on the line under
   it. The counts leave the title's button, and a click on them still opens
   the story; a corpus page's reading order uses the same row.
3. A picker's option reads "A · The Ford". Default: every act, chapter, and
   scene in a picker, and the picked rows of a field that holds several,
   which use the same label; the chips stay as they are.
4. A field Reset to Default brings back drops its links to records deleted
   while it was gone, and keeps its other values and its links to records
   still here. Defaults: that covers a subfield brought back into a group and
   a field whose type the reset turns back into a link; a dead link in a
   field the kind kept all along is left alone; the confirmation doesn't
   change. An entries template's reset, where a field whose type was changed
   keeps its id and its values, is filed as a roadmap row, not taken here.

- 28_fabula/01_index: FabulaStoryLine is the title alone, the button that
  opens the story; FabulaStoryCounts, new, the counts and the date, a click
  on them opening it too; FabulaStoryRow wraps, the counts and the buttons
  in a part of their own after the title, and its comment.
- 28_fabula/04_outline: step, in FabulaOutlineTab, the plain arrows, Home,
  and End from a row, which onNodeKey and onBeatKey call after Alt's moves;
  a node's row hands onNodeKey whether it's folded.
- 28_fabula/09_templates: fabulaResetBack and fabulaDropDeadLinks, new, and
  fabulaResetSchema running them, and its comment.
- 14_form-engine-edit: in EntryRefEditor, the candidates synthReg makes from
  registered nodes keep a node's place, and formatEntryLabel gives a record
  with a place in its story's outline its place, a middle dot, and its name.

Declared scope: 14_form-engine-edit, 28_fabula/01_index, 28_fabula/04_outline,
28_fabula/09_templates. Declarations added: FabulaStoryCounts,
fabulaResetBack, fabulaDropDeadLinks; none removed. No header added.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given), and nothing is written unless every anchor holds.
Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r056_fabula_screens.py
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


# ------------------------------------------------------------ 28_fabula/01_index
edit(MODULES / "28_fabula" / "01_index.jsx", [
    (B('''
function FabulaStoryLine({ state, story, onOpen }) {
  const counts = fabulaStoryCounts(state, story.id);
  const status = formatSelectDisplay((story.fields || {}).status);
  // v1.7 r008: a click on the line opens the story's page.
  const open = onOpen ? {
    role: "button",
    tabIndex: 0,
    title: "Open this story",
    onClick: () => onOpen(story.id),
    onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(story.id); } },
  } : {};
  return (
    <div className="fabula-story-line" {...open} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, cursor: onOpen ? "pointer" : undefined }}>
      <div style={{ fontSize: 15, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>{story.name || "(untitled story)"}</div>
      <div style={{ fontSize: 12, color: "var(--text-dim)", whiteSpace: "nowrap" }}>
        {status && <span>{status} · </span>}
        {counts.cast} cast · {counts.scenes} {counts.scenes === 1 ? "scene" : "scenes"}
        {story.updatedAt && <span> · updated {fmtDate(story.updatedAt)}</span>}
      </div>
    </div>
  );
}
'''), B('''
// A story's title, the button that opens its page (v1.7 r008). Since v1.7
// r056 its counts are a part of the row of their own (FabulaStoryCounts), so
// a title too long to sit beside them and the row's buttons can take a line.
function FabulaStoryLine({ story, onOpen }) {
  const open = onOpen ? {
    role: "button",
    tabIndex: 0,
    title: "Open this story",
    onClick: () => onOpen(story.id),
    onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(story.id); } },
  } : {};
  return (
    <div className="fabula-story-line" {...open} style={{ flex: "1 1 auto", minWidth: 0, fontSize: 15, fontWeight: 500, overflowWrap: "anywhere", cursor: onOpen ? "pointer" : undefined }}>{story.name || "(untitled story)"}</div>
  );
}

// A story's counts and date, after its title; a click on them opens the
// story too, as it did when they were part of the title's button.
function FabulaStoryCounts({ state, story, onOpen }) {
  const counts = fabulaStoryCounts(state, story.id);
  const status = formatSelectDisplay((story.fields || {}).status);
  return (
    <div className="fabula-story-counts" title={onOpen ? "Open this story" : undefined} onClick={onOpen ? () => onOpen(story.id) : undefined} style={{ fontSize: 12, color: "var(--text-dim)", whiteSpace: "nowrap", cursor: onOpen ? "pointer" : undefined }}>
      {status && <span>{status} · </span>}
      {counts.cast} cast · {counts.scenes} {counts.scenes === 1 ? "scene" : "scenes"}
      {story.updatedAt && <span> · updated {fmtDate(story.updatedAt)}</span>}
    </div>
  );
}
''')),
    (B('''
// the typing is over. leading comes before the title (the reading order's
// number), actions before Rename, trailing after it.
'''), B('''
// the typing is over. leading comes before the title (the reading order's
// number), actions before Rename, trailing after it. A title too long to sit
// beside its counts and the buttons takes the row's first line, whole, and
// they go on the line under it (v1.7 r056), where the title's column gave
// and a long title was cut to fit.
''')),
    (B('''
    <div className="stemma-index-row" {...rest} style={{ padding: "10px 16px", background: "var(--surf)", display: "flex", alignItems: "center", gap: 12, ...(rowStyle || {}) }}>
'''), B('''
    <div className="stemma-index-row" {...rest} style={{ padding: "10px 16px", background: "var(--surf)", display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 12, rowGap: 6, ...(rowStyle || {}) }}>
''')),
    (B('''
      ) : <FabulaStoryLine state={state} story={story} onOpen={onOpen} />}
      {!isLocked && !renaming && (
        <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
          {actions}
          <button className="btn" style={{ padding: "3px 8px", fontSize: 12 }} onClick={() => { setText(story.name || ""); setRenaming(true); }} title="Rename this story">Rename</button>
          {trailing}
        </div>
      )}
    </div>
'''), B('''
      ) : (
        <>
          <FabulaStoryLine story={story} onOpen={onOpen} />
          <div className="fabula-story-rest" style={{ marginLeft: "auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", columnGap: 12, rowGap: 6 }}>
            <FabulaStoryCounts state={state} story={story} onOpen={onOpen} />
            {!isLocked && (
              <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                {actions}
                <button className="btn" style={{ padding: "3px 8px", fontSize: 12 }} onClick={() => { setText(story.name || ""); setRenaming(true); }} title="Rename this story">Rename</button>
                {trailing}
              </div>
            )}
          </div>
        </>
      )}
    </div>
''')),
])


# ------------------------------------------------------------ 28_fabula/04_outline
edit(MODULES / "28_fabula" / "04_outline.jsx", [
    (B('''
  const ARROWS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "out", ArrowRight: "in" };
  const typing = (e) => { const tag = e.target && e.target.tagName; return tag === "INPUT" || tag === "TEXTAREA"; };
  const onNodeKey = (e, node) => {
    if (typing(e)) return;
    if (e.altKey && ARROWS[e.key]) { e.preventDefault(); move(node.id, ARROWS[e.key]); return; }
    if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onOpenRecord(node.kind, node.id); }
  };
  const onBeatKey = (e, sceneId, i) => {
    if (typing(e)) return;
    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); moveBeat(sceneId, i, e.key === "ArrowUp" ? i - 1 : i + 1); return; }
    if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); startEdit(sceneId, i, "beat"); }
  };
'''), B('''
  const ARROWS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "out", ArrowRight: "in" };
  const typing = (e) => { const tag = e.target && e.target.tagName; return tag === "INPUT" || tag === "TEXTAREA"; };
  // v1.7 r056: the plain arrows step the focus as a tree's do, from a row
  // itself and not from its buttons or boxes. Up and Down go to the row
  // above and below, beats included, and Home and End to the first and the
  // last in sight; Right unfolds a folded row or steps to the first row in
  // it, and Left folds an open row or steps out to the row it sits in. node
  // is null for a beat, which holds no rows. Alt with the arrows still moves
  // a row, and Tab works as it did.
  const STEP_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"];
  const step = (e, node, folded) => {
    if (e.target !== e.currentTarget || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || !STEP_KEYS.includes(e.key)) return false;
    e.preventDefault();
    const row = e.currentTarget;
    const rows = rootRef.current ? [...rootRef.current.querySelectorAll('[role="treeitem"]')] : [];
    const at = rows.indexOf(row);
    let to = null;
    if (e.key === "ArrowDown") to = rows[at + 1];
    else if (e.key === "ArrowUp") to = rows[at - 1];
    else if (e.key === "Home") to = rows[0];
    else if (e.key === "End") to = rows[rows.length - 1];
    else if (e.key === "ArrowRight") {
      if (node && folded) onToggleFold(node.id);
      else if (node && row.nextElementSibling) to = row.nextElementSibling.querySelector('[role="treeitem"]');
    } else if (node && !folded) onToggleFold(node.id);
    else {
      const up = row.closest('[role="group"], [role="tree"]');
      to = up && up.getAttribute("role") === "group" ? up.previousElementSibling : null;
    }
    if (to && to !== row && to.getAttribute("role") === "treeitem") to.focus();
    return true;
  };
  const onNodeKey = (e, node, folded) => {
    if (typing(e)) return;
    if (e.altKey && ARROWS[e.key]) { e.preventDefault(); move(node.id, ARROWS[e.key]); return; }
    if (step(e, node, folded)) return;
    if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onOpenRecord(node.kind, node.id); }
  };
  const onBeatKey = (e, sceneId, i) => {
    if (typing(e)) return;
    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); moveBeat(sceneId, i, e.key === "ArrowUp" ? i - 1 : i + 1); return; }
    if (step(e, null, false)) return;
    if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); startEdit(sceneId, i, "beat"); }
  };
''')),
    ('''          onKeyDown={e => onNodeKey(e, node)}\n''',
     '''          onKeyDown={e => onNodeKey(e, node, folded)}\n'''),
])


# ------------------------------------------------------------ 28_fabula/09_templates
edit(MODULES / "28_fabula" / "09_templates.jsx", [
    (B('''
// Reset to Default for one of Fabula's kinds: the seed's schema, unedited,
// and every value its records hold under a field the seed doesn't have
// cleared, as a built-in template's reset clears its entries'. A reference
// the seed takes more than one of keeps what it held, as a list of one.
// Returns Fabula.
'''), B('''
// The seed's fields that Reset to Default brings back to one of Fabula's
// kinds (v1.7 r056): each one the kind's schema lacks or holds as another
// type, and, in a group the schema still has, the subfields that holds for.
const fabulaResetBack = (seedFields, haveFields) => {
  const have = new Map((Array.isArray(haveFields) ? haveFields : []).filter(f => f && f.id).map(f => [f.id, f]));
  const back = [];
  (Array.isArray(seedFields) ? seedFields : []).forEach(sf => {
    const hf = have.get(sf.id);
    if (!hf || hf.type !== sf.type) back.push(sf);
    else if (sf.type === "group") {
      const subfields = fabulaResetBack(sf.subfields, hf.subfields);
      if (subfields.length > 0) back.push({ ...sf, subfields });
    }
  });
  return back;
};

// A kind's records with the links that fields hold to records the world no
// longer has dropped, through the walk a delete clears links with
// (scrubEntryRefs), for the fields Reset to Default brings back (v1.7 r056):
// a delete clears links through the fields a kind has (fabulaKindFields),
// so these kept their links to what was deleted while they were gone, and
// came back reading (missing entry). A record it changes nothing in keeps
// its identity.
const fabulaDropDeadLinks = (state, k, records, fields, now) => {
  if (!fields || fields.length === 0) return records;
  const live = new Set([...(state.entries || []), ...(state.celestialBodies || []), ...getRegisteredGraphNodes(state)].filter(x => x && x.id).map(x => x.id));
  const dead = new Set();
  const gone = (id) => { if (typeof id === "string" && id && !live.has(id)) dead.add(id); };
  const look = (list, vals) => (Array.isArray(list) ? list : []).forEach(f => {
    const v = vals && typeof vals === "object" ? vals[f.id] : null;
    if (v == null || v === "") return;
    if (f.type === "entry-ref") (Array.isArray(v) ? v : [v]).forEach(x => gone(typeof x === "string" ? x : x && x.id));
    else if (f.type === "group" && Array.isArray(v)) v.forEach(inst => look(f.subfields, inst));
    else if (f.type === "grid") forEachGridRefCell(v, (rid, cid, cell) => gone(cell.value));
  });
  records.forEach(r => { if (r && r.fields) look(fields, r.fields); });
  if (dead.size === 0) return records;
  const tpl = { id: k.id, fields };
  return records.map(r => {
    if (!r || !r.fields || typeof r.fields !== "object") return r;
    const tagged = { ...r, templateId: k.id };
    const [out] = scrubEntryRefs([tagged], [tpl], dead);
    if (out === tagged) return r;
    const { templateId, ...rest } = out;
    return { ...rest, updatedAt: now };
  });
};

// Reset to Default for one of Fabula's kinds: the seed's schema, unedited,
// and every value its records hold under a field the seed doesn't have
// cleared, as a built-in template's reset clears its entries'. A reference
// the seed takes more than one of keeps what it held, as a list of one, and
// since v1.7 r056 a field the reset brings back drops its links to records
// that are gone (fabulaDropDeadLinks). Returns Fabula.
''')),
    (B('''
  return { ...fab, [k.slice]: records, schemas: { ...(fab.schemas || {}), [kind]: seed } };
'''), B('''
  const back = fabulaResetBack(seed.fields, fabulaSchemaOf(state, kind).fields);
  return { ...fab, [k.slice]: fabulaDropDeadLinks(state, k, records, back, now), schemas: { ...(fab.schemas || {}), [kind]: seed } };
''')),
])


# ------------------------------------------------------------ 14_form-engine-edit
edit(MODULES / "14_form-engine-edit.jsx", [
    (B('''
    const synthReg = (allowedSet) => (registeredNodes || [])
      .filter(n => n && n.templateId !== BODY_REF_SENTINEL && (!allowedSet || allowedSet.has(n.templateId)))
      .map(n => ({ id: n.id, name: n.name || "(unnamed)", templateId: n.templateId, _isSynth: true }));
'''), B('''
    // A node's place in its story's outline comes along (v1.7 r056), for
    // formatEntryLabel.
    const synthReg = (allowedSet) => (registeredNodes || [])
      .filter(n => n && n.templateId !== BODY_REF_SENTINEL && (!allowedSet || allowedSet.has(n.templateId)))
      .map(n => ({ id: n.id, name: n.name || "(unnamed)", templateId: n.templateId, _isSynth: true, ...(n.place ? { place: n.place } : {}) }));
''')),
    (B('''
  const formatEntryLabel = (e) => {
    if (!isMultiTpl) return e.name;
'''), B('''
  const formatEntryLabel = (e) => {
    // v1.7 r056: an act, a chapter, or a scene placed in its story's outline
    // (fabulaStoryNodes) reads its place and its name split by a middle dot,
    // "A · The Ford", where the option's plain text ran them together.
    if (e.place) return `${e.place.path} · ${e.place.name}`;
    if (!isMultiTpl) return e.name;
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
    print(f"r056 applied to {len(staged)} files")


if __name__ == "__main__":
    main()
