
// ─── Fabula: People (v1.7 r009) ────────────────────────────────────────────────
// People (docs/fabula-spec.md, section 4, Drak's calls of 2026-10-25): the
// story's cast, arcs, and relationships, each opening on a page of its own
// over the story's page, a reference to one opening it as a reference to an
// entry opens the entry. A delete never takes another record with it: it
// counts what points at the record and clears those references. A deleted
// world entry is cleaned out of Fabula the way it's cleaned out of entries,
// and a cast record whose character it was stays, marked (spec, section 9).

// A kind's record in a sentence, one or many; add names its + New button.
const FABULA_NOUNS = {
  corpus: { one: "corpus", many: "corpora" },
  story: { one: "story", many: "stories" },
  cast: { one: "cast record", many: "cast records", add: "Cast" },
  arc: { one: "arc", many: "arcs", add: "Arc" },
  relationship: { one: "relationship", many: "relationships", add: "Relationship" },
  plotPoint: { one: "plot point", many: "plot points" },
  promise: { one: "promise and payoff", many: "promises and payoffs", add: "Promise" },
  part: { one: "part", many: "parts" },
  chapter: { one: "chapter", many: "chapters" },
  scene: { one: "scene", many: "scenes" },
  research: { one: "research note", many: "research notes", add: "Note" },
};

// The kinds whose records have pages of their own, so a reference opens one:
// People's since v1.7's r009, the Outline's since r011, since r013 the plot
// points and promises the Plot tab lists, and since r014 the research notes
// the Notes tab lists.
const FABULA_PAGE_KINDS = ["cast", "arc", "relationship", "part", "chapter", "scene", "plotPoint", "promise", "research"];

// A cast list's order: by Importance, then by name.
const FABULA_IMPORTANCE = ["Main", "Secondary", "Minor"];

const fabulaCount = (kind, n) => `${n} ${n === 1 ? FABULA_NOUNS[kind].one : FABULA_NOUNS[kind].many}`;

const fabulaJoin = (parts) => parts.length <= 1 ? (parts[0] || "")
  : parts.length === 2 ? `${parts[0]} and ${parts[1]}`
  : `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;

// A kind's fields as stored, or the seed's: what the cleaning and the
// counting walk. Neither needs the targets worked out.
const fabulaKindFields = (state, kind) => {
  const stored = state && state.fabula && state.fabula.schemas && state.fabula.schemas[kind];
  if (stored && Array.isArray(stored.fields)) return stored.fields;
  const seeded = fabulaSeedSchemas((state && state.templates) || [])[kind];
  return seeded ? seeded.fields : [];
};

// Fabula with every reference to deletedIds cleared, through the same walk
// scrubEntryRefs gives entries (groups and grids included). names maps a
// deleted entry's id to its name, for a cast record whose character it was:
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

// How many of each kind's records point at id: [[kind, n]], for a delete's
// confirmation.
const fabulaInboundCounts = (state, id) => {
  const fab = (state && state.fabula) || {};
  return FABULA_KINDS.map(k => {
    const arr = (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).filter(r => r && r.id !== id);
    const tpl = { id: k.id, fields: fabulaKindFields(state, k.kind) };
    return [k.kind, countInboundEntryRefs(arr.map(r => ({ ...r, templateId: k.id })), [tpl], id)];
  }).filter(([, n]) => n > 0);
};

const fabulaRecordDeleteMessage = (state, kind, rec) => {
  const head = `Delete the ${FABULA_NOUNS[kind].one} "${rec.name || "untitled"}"?`;
  const counts = fabulaInboundCounts(state, rec.id);
  if (counts.length === 0) return head;
  const total = counts.reduce((a, [, n]) => a + n, 0);
  const said = fabulaJoin(counts.map(([kk, n]) => kk === "story" ? "the story" : fabulaCount(kk, n)));
  return `${head} ${said.charAt(0).toUpperCase()}${said.slice(1)} ${total === 1 ? "points" : "point"} at it; ${total === 1 ? "it stays" : "they stay"}, without it.`;
};

// What deleting a story takes with it: its own records, by kind.
const fabulaStoryDeleteMessage = (state, story) => {
  const fab = (state && state.fabula) || {};
  const counts = FABULA_KINDS.filter(k => k.kind !== "corpus" && k.kind !== "story")
    .map(k => [k.kind, (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).filter(r => r && r.storyId === story.id).length])
    .filter(([, n]) => n > 0);
  const head = `Delete the story "${story.name || "untitled story"}"?`;
  if (counts.length === 0) return head;
  const one = counts.length === 1 && counts[0][1] === 1;
  return `${head} Its ${fabulaJoin(counts.map(([kk, n]) => fabulaCount(kk, n)))} ${one ? "goes" : "go"} with it.`;
};

// Fabula's slices below the story level without one story's records.
const fabulaDropStoryRecords = (fab, storyId) => Object.fromEntries(
  FABULA_KINDS.filter(k => k.kind !== "corpus" && k.kind !== "story")
    .map(k => [k.slice, (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).filter(r => !r || r.storyId !== storyId)])
);

// A record with a page of its own, found by id: { kind, record } or null.
const fabulaFindRecord = (state, id) => {
  const fab = (state && state.fabula) || {};
  for (const kind of FABULA_PAGE_KINDS) {
    const k = FABULA_KINDS.find(x => x.kind === kind);
    const record = (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).find(r => r && r.id === id);
    if (record) return { kind, record };
  }
  return null;
};

// Whether a reference to a record of this source opens it (resolveRefTarget).
const fabulaRecordOpens = (sourceId) => FABULA_KINDS.some(k => k.id === sourceId && FABULA_PAGE_KINDS.includes(k.kind));

// A cast record's name follows the character picked while it's still blank or
// still the last character's name; a name of the user's own stays.
const fabulaCastNameFill = (state, prev, next) => {
  const was = (prev.fields || {}).character, now = (next.fields || {}).character;
  if (!now || now === was) return next;
  const nameOf = (id) => { const e = (state.entries || []).find(x => x.id === id); return e ? e.name : ""; };
  const prevName = (prev.name || "").trim();
  if (prevName && prevName !== nameOf(was)) return next;
  return { ...next, name: nameOf(now) || next.name };
};

// The People tab: the story's cast, by importance and then name, its arcs,
// and its relationships, each list with its + New. A row's details sit to
// the right of its name and drop under it when the two don't fit, each dot
// kept with the detail before it.
function FabulaPeopleTab({ state, story, isLocked, onOpenRecord, onNewRecord }) {
  const fab = state.fabula || {};
  const mine = (slice) => (Array.isArray(fab[slice]) ? fab[slice] : []).filter(r => r && r.id && r.storyId === story.id);
  const byName = (a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
  const castById = new Map(mine("cast").map(c => [c.id, c]));
  const castName = (id) => { const c = typeof id === "string" && castById.get(id); return c ? (c.name || "(unnamed)") : null; };
  const rank = (c) => { const i = FABULA_IMPORTANCE.indexOf(formatSelectDisplay((c.fields || {}).importance)); return i === -1 ? FABULA_IMPORTANCE.length : i; };
  const many = (v) => (Array.isArray(v) ? v : []).filter(Boolean).join(", ");
  const cast = mine("cast").slice().sort((a, b) => rank(a) - rank(b) || byName(a, b));
  const arcs = mine("arcs").slice().sort(byName);
  const rels = mine("relationships").slice().sort(byName);
  const meta = {
    cast: (c) => [formatSelectDisplay((c.fields || {}).importance), many((c.fields || {}).role), c.characterDeleted ? "character deleted" : null],
    arc: (a) => {
      const f = a.fields || {};
      const names = (Array.isArray(f.cast) ? f.cast : []).map(castName).filter(Boolean);
      return [names.length ? fabulaJoin(names) : "no cast", formatSelectDisplay(f.arcType), formatSelectDisplay(f.status)];
    },
    relationship: (r) => {
      const f = r.fields || {};
      const a = castName(f.castA), b = castName(f.castB);
      return [a || b ? `${a || "?"} and ${b || "?"}` : "no cast", many(f.kind)];
    },
  };
  const section = (title, kind, items, empty) => (
    <div className="fabula-people-section" data-kind={kind} style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <div className="field-label"><span>{title}</span></div>
        {!isLocked && <button className="btn" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => onNewRecord(kind)}>+ New {FABULA_NOUNS[kind].add}</button>}
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--text-dim)", fontStyle: "italic" }}>{empty}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
          {items.map(r => (
            <div
              key={r.id}
              className="stemma-index-row fabula-record-row"
              role="button"
              tabIndex={0}
              title={`Open this ${FABULA_NOUNS[kind].one}`}
              onClick={() => onOpenRecord(kind, r.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenRecord(kind, r.id); } }}
              style={{ padding: "10px 16px", background: "var(--surf)", display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 12, rowGap: 2, cursor: "pointer" }}
            >
              <div style={{ fontSize: 15, fontWeight: 500, minWidth: 0, overflowWrap: "anywhere" }}>{r.name || "(untitled)"}</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginLeft: "auto", minWidth: 0, textAlign: "right", overflowWrap: "anywhere" }}>{meta[kind](r).filter(Boolean).join("\u00a0\u00b7 ")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  return (
    <div className="fabula-people">
      {section("Cast", "cast", cast, "No cast yet.")}
      {section("Arcs", "arc", arcs, "No arcs yet.")}
      {section("Relationships", "relationship", rels, "No relationships yet.")}
    </div>
  );
}

// A record's page, over its story's (a cast record's, an arc's, or a
// relationship's since v1.7's r009; an act's, a chapter's, or a scene's
// since r011; a plot point's or a promise's since r013): its fields in view
// or, with a draft, in edit, its pickers offering the story's own records.
// A cast record whose character was deleted says so. Since r012 an act's, a
// chapter's, or a scene's page says where it sits, between its kind and its
// date (SCENE · II.4.A · UPDATED), and a page's references read as its
// pickers offer them. Since r014 a scene's page lists, under its fields, the
// research notes used in it.
function FabulaRecordPage({ state, kind, record, draft, onDraftChange, storyId, isLocked, onRestoreTemplate, showSecrets, allTags, dirHandle, flash, onOpenEntry, onSelectTag, onUpdateViewPrefs }) {
  const template = fabulaTemplate(state, kind, { storyId, recordId: record.id });
  const gone = kind === "cast" ? record.characterDeleted : null;
  const nodes = fabulaStoryNodes(state, storyId);
  const place = FABULA_OUTLINE_KINDS.includes(kind) ? fabulaOutlinePlaces(state, storyId).get(record.id) : null;
  // v1.7 r011: a scene with no POV of its own takes its chapter's, and says so.
  const inherited = kind === "scene" ? fabulaInheritedPov(state, storyId, draft || record) : null;
  const povNote = inherited ? (
    <div className="fabula-pov-inherited" style={{ margin: "0 0 18px", padding: "8px 14px", border: "1px solid var(--border)", borderLeft: "2px solid var(--accent)", borderRadius: 3, fontSize: 13, color: "var(--text)" }}>
      No POV of its own, so it takes its chapter's: {inherited.name || "(unnamed)"}.
    </div>
  ) : null;
  // v1.7 r014: a scene's research, read-only, from the notes' Used In.
  const research = kind === "scene" ? <FabulaSceneResearch state={state} storyId={storyId} sceneId={record.id} editing={!!draft} onOpenEntry={onOpenEntry} /> : null;
  const note = gone ? (
    <div className="fabula-character-deleted" style={{ margin: "0 0 18px", padding: "10px 14px", border: "1px solid var(--border)", borderLeft: "2px solid var(--danger)", borderRadius: 3, fontSize: 13, color: "var(--text)" }}>
      Character deleted{gone.name ? ` (was ${gone.name})` : ""}. {draft ? "Pick another below, or cancel and delete this cast record." : "Edit to pick another, or delete this cast record."}
    </div>
  ) : null;
  if (draft) {
    return (
      <EntryForm
        draft={draft}
        template={template}
        entries={state.entries}
        templates={state.templates}
        bodies={state.celestialBodies}
        registeredNodes={nodes}
        onChange={(d) => onDraftChange(kind === "cast" ? fabulaCastNameFill(state, draft, d) : d)}
        showSecrets={showSecrets}
        imageFolder={state.world.imageFolder}
        allTags={allTags}
        dirHandle={dirHandle}
        calendar={getCalendar(state, null)}
        primaryCalendar={state.world.calendar}
        additionalCalendars={[]}
        selfEntryId={draft.id}
        flash={flash}
        hideTags
        canvasSlot={note || povNote}
        footSlot={research}
        onRestoreTemplate={isLocked ? undefined : onRestoreTemplate}
      />
    );
  }
  return (
    <EntryView
      entry={record}
      template={template}
      templates={state.templates}
      entries={state.entries}
      onOpenEntry={onOpenEntry}
      onSelectTag={onSelectTag}
      showSecrets={showSecrets}
      imageFolder={state.world.imageFolder}
      dirHandle={dirHandle}
      calendar={getCalendar(state, null)}
      state={state}
      onUpdateViewPrefs={onUpdateViewPrefs}
      canvasSlot={note || povNote}
      footSlot={<>{research}<ReferencedBy key={record.id} state={state} targetId={record.id} showSecrets={showSecrets} onOpenEntry={onOpenEntry} exclude={kind === "scene" ? REFERENCED_BY_LISTED.scene : null} /></>}
      registeredNodes={nodes}
      badgeExtra={place ? place.path : null}
    />
  );
}