"""v1.7 r014: Notes, a story's research notes, and a scene's research.

Drak's calls (2026-10-26), one per message, recorded in docs/fabula-spec.md
sections 4 and 10 before this cut (26652cb): Notes is a cut of its own, with
Meaning next and Plot Thread's and Theme / Motif's move under Fabula after
it; the Notes tab lists the story's research notes by topic, A to Z; a note
whose Open Questions holds any text is flagged open, in a color quieter than
an unpaid promise's red, and the tab's heading counts them, so emptying the
field clears the flag; and a scene's page lists, under its fields, the notes
whose Used In names it, read-only and worked out each time it's drawn. The
defaults the plan named for the rest of the tab are in section 5.11: + New
Note opens a new note in edit on a page of its own; a row shows the topic,
the flag, and the entries it applies to and the scenes it's used in, each
scene with its position; a note opens on its page over the Notes tab, with
Back to where it was opened from; Used In offers the story's scenes in the
outline's order with their positions, and Applies To the world's entries by
name; a scene's research shows in view and in edit, and not at all when no
note names the scene; Concordance draws a note to the entries it applies to
and the scenes it's used in; and in Lock Mode nothing adds, and every note
still opens.

- 28_fabula: the Notes tab (FabulaNotesTab) and a scene's research
  (FabulaSceneResearch), with their helpers, at the file's tail under a
  seventh header; research notes join the kinds with pages of their own,
  listed by the Notes tab; Concordance draws their edges; the Notes tab is
  built; a scene's page hands its research to the view and the form.
- 13_form-engine-display: EntryView draws a caller's footSlot under the
  fields.
- 14_form-engine-edit: EntryForm does the same.
- 12_trunk: the comment on what a reference opens names r013's and r014's
  kinds, which stopped at r011 (roadmap, v1.7).

Declared scope: 12_trunk, 13_form-engine-display, 14_form-engine-edit,
28_fabula. Declarations added: fabulaNoteOpen, fabulaNotesOf,
fabulaOpenFlag, FabulaNotesTab, FabulaSceneResearch.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given). Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r014_fabula_notes.py
"""
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())
MODULES = ROOT / "cartulary-src" / "modules"


def edit(path, pairs):
    text = path.read_text(encoding="utf-8")
    for pair in pairs:
        old, new = pair[0], pair[1]
        count = pair[2] if len(pair) > 2 else 1
        n = text.count(old)
        assert n == count, f"{path.name}: anchor occurs {n} times, not {count}:\n{old[:200]}"
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")


def header(title):
    line = f"// ─── {title} "
    return line + "─" * (82 - len(line))


# ---------------------------------------------------------------- 12: the comment on what opens
edit(MODULES / "12_trunk.jsx", [
    (r"""    // v1.7 r009: a cast record, an arc, or a relationship opens on its own
    // page over its story's (Drak, 2026-10-25), and since r011 an act, a
    // chapter, or a scene. From a Fabula page, Back returns to the page the
    // click came from; from anywhere else, such as Concordance, to the story's
    // tab that lists it (fabulaTabOf).""",
     r"""    // v1.7 r009: a cast record, an arc, or a relationship opens on its own
    // page over its story's (Drak, 2026-10-25), since r011 an act, a chapter,
    // or a scene, since r013 a plot point or a promise, and since r014 a
    // research note. From a Fabula page, Back returns to the page the click
    // came from; from anywhere else, such as Concordance, to the story's tab
    // that lists it (fabulaTabOf)."""),
])

# ---------------------------------------------------------------- 13: a slot under the fields
edit(MODULES / "13_form-engine-display.jsx", [
    (r"""onUpdateViewPrefs, canvasSlot, panels, foldedPanels, onTogglePanel, registeredNodes: nodesGiven, badgeExtra }) {""",
     r"""onUpdateViewPrefs, canvasSlot, panels, foldedPanels, onTogglePanel, registeredNodes: nodesGiven, badgeExtra, footSlot }) {"""),
    (r"""          </React.Fragment>
        );
      })}
    </div>
  );
}

// v1.7 r008: a template's fields as segments for drawing,""",
     r"""          </React.Fragment>
        );
      })}
      {/* v1.7 r014: what the caller draws under the fields, as a scene's page draws its research. */}
      {footSlot}
    </div>
  );
}

// v1.7 r008: a template's fields as segments for drawing,"""),
])

# ---------------------------------------------------------------- 14: the same in edit
edit(MODULES / "14_form-engine-edit.jsx", [
    (r"""canvasSlot, hideTags, panels, foldedPanels, onTogglePanel, onRestoreTemplate }) {""",
     r"""canvasSlot, hideTags, panels, foldedPanels, onTogglePanel, onRestoreTemplate, footSlot }) {"""),
    (r"""            {!folded && units}
          </React.Fragment>
        );
        });
      })()}
    </div>
  );
}""",
     r"""            {!folded && units}
          </React.Fragment>
        );
        });
      })()}
      {/* v1.7 r014: what the caller draws under the fields, as a scene's page draws its research. */}
      {footSlot}
    </div>
  );
}"""),
])

# ---------------------------------------------------------------- 28: the Notes tab
edit(MODULES / "28_fabula.jsx", [
    (r"""  // a scene to its POV, participants, setting, and threads, and since r013 a
  // plot point to its scene and threads and a promise to its setup and payoff
  // scenes and its threads. Concordance drops an edge whose other end isn't
  // drawn.
  const links = { story: ["threads", "themes"], cast: ["character"], arc: ["cast"], relationship: ["castA", "castB"], scene: ["pov", "participants", "setting", "threads"], plotPoint: ["deliveredIn", "threads"], promise: ["setupIn", "payoffIn", "threads"] }[k.kind];""",
     r"""  // a scene to its POV, participants, setting, and threads, since r013 a
  // plot point to its scene and threads and a promise to its setup and payoff
  // scenes and its threads, and since r014 a research note to the entries it
  // applies to and the scenes it's used in. Concordance drops an edge whose
  // other end isn't drawn.
  const links = { story: ["threads", "themes"], cast: ["character"], arc: ["cast"], relationship: ["castA", "castB"], scene: ["pov", "participants", "setting", "threads"], plotPoint: ["deliveredIn", "threads"], promise: ["setupIn", "payoffIn", "threads"], research: ["appliesTo", "usedIn"] }[k.kind];"""),
    (r"""  { id: "notes", label: "Notes", built: false, holds: "the story's research notes" },""",
     r"""  { id: "notes", label: "Notes", built: true, holds: "the story's research notes" },"""),
    (r"""  // A tab other than Story: the story's title over the tabs and the tab's
  // own content, People's lists (v1.7 r009), the Outline (r011), or Plot
  // (r013).""",
     r"""  // A tab other than Story: the story's title over the tabs and the tab's
  // own content, People's lists (v1.7 r009), the Outline (r011), Plot
  // (r013), or Notes (r014)."""),
    (r"""onCreateThread={onCreateThread} onRestoreTemplate={isLocked ? undefined : onRestoreTemplate} />);
  }""",
     r"""onCreateThread={onCreateThread} onRestoreTemplate={isLocked ? undefined : onRestoreTemplate} />);
  }
  if (!draft && active === "notes") {
    return tabPage(<FabulaNotesTab state={state} story={story} isLocked={isLocked} onOpenRecord={onOpenRecord} onNewRecord={onNewRecord} />);
  }"""),
    (r"""  research: { one: "research note", many: "research notes" },""",
     r"""  research: { one: "research note", many: "research notes", add: "Note" },"""),
    (r"""// People's since v1.7's r009, the Outline's since r011, and since r013 the
// plot points and promises the Plot tab lists.
const FABULA_PAGE_KINDS = ["cast", "arc", "relationship", "part", "chapter", "scene", "plotPoint", "promise"];""",
     r"""// People's since v1.7's r009, the Outline's since r011, since r013 the plot
// points and promises the Plot tab lists, and since r014 the research notes
// the Notes tab lists.
const FABULA_PAGE_KINDS = ["cast", "arc", "relationship", "part", "chapter", "scene", "plotPoint", "promise", "research"];"""),
    (r"""// date (SCENE · II.4.A · UPDATED), and a page's references read as its
// pickers offer them.
function FabulaRecordPage(""",
     r"""// date (SCENE · II.4.A · UPDATED), and a page's references read as its
// pickers offer them. Since r014 a scene's page lists, under its fields, the
// research notes used in it.
function FabulaRecordPage("""),
    (r"""      No POV of its own, so it takes its chapter's: {inherited.name || "(unnamed)"}.
    </div>
  ) : null;""",
     r"""      No POV of its own, so it takes its chapter's: {inherited.name || "(unnamed)"}.
    </div>
  ) : null;
  // v1.7 r014: a scene's research, read-only, from the notes' Used In.
  const research = kind === "scene" ? <FabulaSceneResearch state={state} storyId={storyId} sceneId={record.id} editing={!!draft} onOpenEntry={onOpenEntry} /> : null;"""),
    (r"""        canvasSlot={note || povNote}
        onRestoreTemplate={isLocked ? undefined : onRestoreTemplate}
      />""",
     r"""        canvasSlot={note || povNote}
        footSlot={research}
        onRestoreTemplate={isLocked ? undefined : onRestoreTemplate}
      />"""),
    (r"""      canvasSlot={note || povNote}
      registeredNodes={nodes}
      badgeExtra={place ? place.path : null}
    />""",
     r"""      canvasSlot={note || povNote}
      footSlot={research}
      registeredNodes={nodes}
      badgeExtra={place ? place.path : null}
    />"""),
    (r"""const fabulaTabOf = (kind) => (FABULA_OUTLINE_KINDS.includes(kind) ? "outline" : kind === "plotPoint" || kind === "promise" ? "plot" : "people");""",
     r"""const fabulaTabOf = (kind) => (FABULA_OUTLINE_KINDS.includes(kind) ? "outline" : kind === "plotPoint" || kind === "promise" ? "plot" : kind === "research" ? "notes" : "people");"""),
])

TAIL = r'''

''' + header("Fabula: Notes (v1.7 r014)") + r'''
// The Notes tab (docs/fabula-spec.md, sections 4 and 5.11, Drak's calls of
// 2026-10-26): the story's research notes by topic, A to Z, each opening on
// a page of its own. A note whose Open Questions holds any text is flagged
// open wherever its row appears, in a color quieter than an unpaid promise's
// red, and the tab's heading counts them; emptying the field clears the
// flag. A scene's page lists, under its fields, the notes whose Used In
// names it: read-only, changed from the note's side, and worked out each
// time the page is drawn, so nothing is stored.

// A note with open questions: its Open Questions holds any text.
const fabulaNoteOpen = (rec) => {
  const q = rec && rec.fields ? rec.fields.openQuestions : null;
  return typeof q === "string" && q.trim() !== "";
};

// A story's research notes by topic, A to Z; given a scene, only the notes
// whose Used In names it.
const fabulaNotesOf = (state, storyId, sceneId) => {
  const byName = (a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
  const usedIn = (r) => Array.isArray((r.fields || {}).usedIn) && r.fields.usedIn.includes(sceneId);
  return fabulaArr((state && state.fabula) || {}, "research")
    .filter(r => r && r.id && r.storyId === storyId && (!sceneId || usedIn(r)))
    .slice().sort(byName);
};

// The open flag.
const fabulaOpenFlag = () => (
  <span className="fabula-note-open" title="This note has open questions" style={{ fontSize: 11, padding: "0 7px", border: "1px solid var(--accent)", borderRadius: 9, color: "var(--accent)", letterSpacing: ".04em" }}>open</span>
);

// The Notes tab.
function FabulaNotesTab({ state, story, isLocked, onOpenRecord, onNewRecord }) {
  const fab = state.fabula || {};
  const notes = fabulaNotesOf(state, story.id);
  const open = notes.filter(fabulaNoteOpen).length;
  const places = fabulaOutlinePlaces(state, story.id);
  const entryById = new Map((state.entries || []).filter(e => e && e.id).map(e => [e.id, e]));
  const sceneById = new Map(fabulaArr(fab, "scenes").filter(s => s && s.id && s.storyId === story.id).map(s => [s.id, s]));
  const ids = (v) => (Array.isArray(v) ? v : []).filter(x => typeof x === "string" && x);
  // A row's details, each kept with the dot before it, and a list of names
  // in the order the field holds them, as a promise's row lists its scenes;
  // a scene names itself by its position, quieter, then its title.
  const dotted = (parts) => parts.map((p, i) => <span key={i}>{i > 0 ? "\u00a0\u00b7 " : ""}{p}</span>);
  const commas = (nodes) => nodes.map((n, i) => <span key={i}>{i > 0 ? ", " : ""}{n}</span>);
  const about = (v) => ids(v).map(id => entryById.get(id)).filter(Boolean).map(e => e.name || "(unnamed)");
  const usedIn = (v) => ids(v).filter(id => sceneById.has(id)).map(id => {
    const p = places.get(id);
    return <>{p && <span className="fabula-note-position" style={{ opacity: 0.6 }}>{p.path} </span>}{sceneById.get(id).name || "(untitled)"}</>;
  });
  // The title, then the flag, take the slack on their line, so the details
  // sit at the right while they fit and drop under the title, flush left,
  // when they don't, as the Plot tab's rows do.
  const lead = (last) => ({ flex: last ? "1000 1 auto" : "0 1 auto", minWidth: 0 });
  const metaStyle = { flex: "1 1 auto", minWidth: 0, fontSize: 12, fontWeight: 400, color: "var(--text-dim)", textAlign: "left", overflowWrap: "anywhere" };
  const row = (r) => {
    const f = r.fields || {};
    const flagged = fabulaNoteOpen(r);
    const a = about(f.appliesTo), u = usedIn(f.usedIn);
    const parts = [a.length ? <>about {commas(a)}</> : null, u.length ? <>used in {commas(u)}</> : null].filter(Boolean);
    return (
      <div
        key={r.id}
        className="stemma-index-row fabula-note-row"
        data-note={r.id}
        data-open={flagged ? "true" : undefined}
        role="button"
        tabIndex={0}
        title="Open this research note"
        onClick={() => onOpenRecord("research", r.id)}
        onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onOpenRecord("research", r.id); } }}
        style={{ padding: "9px 12px 9px 16px", background: "var(--surf)", display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 12, rowGap: 2, cursor: "pointer" }}
      >
        <span className="fabula-note-title" style={{ ...lead(!flagged), fontSize: 14.5, fontWeight: 500, overflowWrap: "anywhere" }}>{r.name || "(untitled)"}</span>
        {flagged && <span style={lead(true)}>{fabulaOpenFlag()}</span>}
        {parts.length > 0 && <span className="fabula-note-meta" style={metaStyle}>{dotted(parts)}</span>}
      </div>
    );
  };
  return (
    <div className="fabula-notes">
      <div className="fabula-notes-section" style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
          <div className="field-label">
            <span>Research Notes</span>
            {open > 0 && <span className="fabula-notes-open-count" style={{ textTransform: "none", letterSpacing: 0, fontSize: 12, color: "var(--accent)" }}>{"\u00b7 "}{open} open</span>}
          </div>
          {!isLocked && <button className="btn" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => onNewRecord("research")}>+ New {FABULA_NOUNS.research.add}</button>}
        </div>
        {notes.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--text-dim)", fontStyle: "italic" }}>No research notes yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
            {notes.map(row)}
          </div>
        )}
      </div>
    </div>
  );
}

// A scene's research, under its fields: the notes whose Used In names it,
// by topic, each opening its note, and nothing at all when there are none.
// In edit it says where the list is changed.
function FabulaSceneResearch({ state, storyId, sceneId, editing, onOpenEntry }) {
  const notes = fabulaNotesOf(state, storyId, sceneId);
  if (notes.length === 0) return null;
  return (
    <div className="fabula-scene-research" style={{ marginTop: 26 }}>
      <div className="field-label">
        <span>Research</span>
        {editing && <span style={{ textTransform: "none", letterSpacing: 0, fontSize: 12, color: "var(--text-dim)" }}>set by each note's Used In</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
        {notes.map(r => (
          <div
            key={r.id}
            className="stemma-index-row fabula-scene-note"
            data-note={r.id}
            role="button"
            tabIndex={0}
            title="Open this research note"
            onClick={() => onOpenEntry(r.id)}
            onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onOpenEntry(r.id); } }}
            style={{ padding: "8px 14px", background: "var(--surf)", display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 10, rowGap: 2, cursor: "pointer" }}
          >
            <span className="fabula-note-title" style={{ fontSize: 14, minWidth: 0, overflowWrap: "anywhere" }}>{r.name || "(untitled)"}</span>
            {fabulaNoteOpen(r) && fabulaOpenFlag()}
          </div>
        ))}
      </div>
    </div>
  );
}'''

p28 = MODULES / "28_fabula.jsx"
t28 = p28.read_text(encoding="utf-8")
end = "      {promisesSection}\n    </div>\n  );\n}"
assert not t28.endswith("\n") and t28.endswith(end), "28_fabula.jsx no longer ends the way this cut expects"
p28.write_text(t28 + TAIL, encoding="utf-8")
print("v1.7 r014 applied: 12_trunk, 13_form-engine-display, 14_form-engine-edit, 28_fabula")
