"""v1.7 r002: reference target lists. A target added in the template builder
stays, a target removed there stays removed, and the entry-ref audit's flags
1 to 5 widen eleven built-in fields.

The defect (found 2026-10-24 while planning this cut, shown headless on the
r001 build). A reference field keeps its targets twice: names (refTemplate,
refTemplates), the form the built-in definitions and template and pack files
use, and ids (refTemplateId, refTemplatesId), the form the picker reads and the
template builder edits. The builder saved ids only. resolveTemplateRefs
re-derives ids from names whenever it runs: on a load that backfills a built-in
template or field, merges duplicate templates, or repairs a showWhen, and in
session on a pack import, a template restore, or a reset to built-in. Its
multi-target branch rebuilt the id list from the names alone, so a target the
user had added to a built-in multi-target field dropped out, and the cleanup at
the end of migrate() deleted every reference to it (House added to Faction ›
Allies, a House referenced, a load that backfills a built-in: the reference
gone). The same re-derivation undid the builder's other edits: a removed
target came back, a field cleared to take any template narrowed again, one
switched back to a single target turned multi-target again, and the target
hint on the field's label read the stale names. Drak's call (2026-10-24):
1(a), so nothing is lost and a removal sticks.

- resolveTemplateRefs (01_builtin-templates) never drops an id that still
  points at a template or a registered source; the names add whatever they
  resolve to. Names resolve through refTargetIndex, split out of it, which
  also resolves every registered source by name (Lexeme, Map and the rest),
  not only the body label and ConLang.
- syncRefTargetNames (01_builtin-templates, new) brings a field's target names
  into line with its ids, so resolving again changes nothing. saveTemplate
  (12_trunk) runs it on the template being saved; migrate() (10_migrate) runs
  it once per world on every template, after the template renames and before
  anything re-resolves, judging names by the rules the stored ids were
  derived by (registered sources other than the body label and ConLang didn't
  resolve before r002, so a name like Lexeme stays for the next resolve). A
  field holding an id that resolves to nothing (a deleted template, or a v1.4
  world's retired Astronomical Body template, r004's business) is left alone,
  and so is the v1.5 Language / Glossary supersede's cleared id list, which
  waits on a resolve (r004 again).

The flags (docs/entry-ref-audit.md; Drak, 2026-10-24: 1 to 5, as proposed).
BUILTIN_TEMPLATES widens eleven fields for new worlds:
  Artifact / Object / Currency › Current Owner: + Faction, House
  Character › Ally / Mentor and Enemies: + Faction, Culture / People, Deity / Entity
  Character › Possessions: + Weapon / Armor, Vehicle
  House › Heirlooms: + Weapon / Armor
  Religion › Founder: + Deity / Entity
  Substance / Material › Source / Where Found: + Creature, Astronomical Body
  Theme / Motif › Associated Objects: + Weapon / Armor, Vehicle
  Vehicle › Owner / Faction: + Character, House
  Vehicle › Power Source: + Substance / Material
  Weapon / Armor › Previous Owners: + Faction, House
and migrate(), once per world and field, after the v1.5 conversions, adds the
same targets to the same built-in fields by exact label, names and ids
together, never removing one. A single-target field becomes multi-target, as
the builder's toggle makes it; a field open to every template stays open; a
target template the user deleted isn't added, nor one whose name a template of
the user's own holds; a field holding an id that resolves to nothing is left
alone; a relabelled field isn't found. It edits the lists directly: calling
resolveTemplateRefs there would re-derive every field in the world.

Declared scope: 01_builtin-templates, 10_migrate, 12_trunk. Declarations
added: refTargetIndex, syncRefTargetNames (01_builtin-templates).

String-anchored edits; every anchor must occur exactly once. Run from
anywhere inside the repository:  python3 inlining/cuts/v1.7_r002_target_lists.py
"""
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())
MODULES = ROOT / "cartulary-src" / "modules"
BUILTINS = MODULES / "01_builtin-templates.jsx"
MIGRATE = MODULES / "10_migrate.jsx"
TRUNK12 = MODULES / "12_trunk.jsx"


def edit(path, pairs):
    text = path.read_text(encoding="utf-8")
    for old, new in pairs:
        n = text.count(old)
        assert n == 1, f"{path.name}: anchor occurs {n} times, not once:\n{old[:200]}"
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")


FAC = '"Faction / Government / Organization"'
HOUSE = '"House / Dynasty / Clan / Bloodline"'

RESOLVE_HEAD_OLD = '''// Resolve refTemplate (name) to actual template id at load time
const resolveTemplateRefs = (templates) => {
  const byName = {};
  templates.forEach(t => { byName[t.name] = t.id; });
  // BODY_REF_LABEL ("Astronomical Body") is a sentinel name that doesn't map to
  // any real template; it represents state.celestialBodies as a ref target.
  // Adding it here lets refTemplates author-facing lists use the same
  // mechanism for both entry-templates and bodies. The picker recognizes
  // BODY_REF_SENTINEL and switches to body-listing mode.
  // r077/r081: map the body label (and its legacy alias) to the sentinel, but
  // ONLY if no real template already claims that name — a real template always
  // wins. This matters because the label was renamed to the Ephemeris workspace
  // name ("Astronomical Body"), which is also what the deleted v1.4 built-in was
  // called and a natural name for a user to recreate. Multi-template refs
  // re-resolve from names on every load (see fix() below), so an unconditional
  // assignment would silently hijack a user's same-named template every load.
  if (!(BODY_REF_LABEL in byName)) byName[BODY_REF_LABEL] = BODY_REF_SENTINEL;
  if (!("Celestial Body" in byName)) byName["Celestial Body"] = BODY_REF_SENTINEL; // legacy alias (pre-r077 label)
  // ConLang is the Glossopoeia language-container sentinel (state.glossopoeia.
  // conlangs), the supersede target for the retired Language / Glossary
  // template. Same guard: a real user template named "ConLang" wins.
  if (!(CONLANG_REF_LABEL in byName)) byName[CONLANG_REF_LABEL] = SYNTH_TPL_CONLANG;
  const fix = (field, ownTemplate) => {
'''

RESOLVE_HEAD_NEW = '''// How a reference field's target names map to ids, and ids back to names:
// every template by name, then the registered node sources. Split out of
// resolveTemplateRefs in v1.7 r002 so syncRefTargetNames below resolves names
// exactly as it does.
// BODY_REF_LABEL ("Astronomical Body") is a sentinel name that doesn't map to
// any real template; it represents state.celestialBodies as a ref target.
// Adding it here lets refTemplates author-facing lists use the same
// mechanism for both entry-templates and bodies. The picker recognizes
// BODY_REF_SENTINEL and switches to body-listing mode.
// r077/r081: map the body label (and its legacy alias) to the sentinel, but
// ONLY if no real template already claims that name — a real template always
// wins. This matters because the label was renamed to the Ephemeris workspace
// name ("Astronomical Body"), which is also what the deleted v1.4 built-in was
// called and a natural name for a user to recreate. Multi-template refs
// re-resolve from names whenever resolveTemplateRefs runs (see fix() below), so
// an unconditional assignment would silently hijack a user's same-named template.
// ConLang is the Glossopoeia language-container sentinel (state.glossopoeia.
// conlangs), the supersede target for the retired Language / Glossary
// template. Same guard: a real user template named "ConLang" wins.
// v1.7 r002: the same guard for every other registered source (Lexeme, Map and
// the rest), whose names a template or pack file could use and lost here.
// allSources false resolves names as before r002 (body label and ConLang only).
const refTargetIndex = (templates, allSources = true) => {
  const byName = {};
  const nameById = new Map();
  templates.forEach(t => { if (t && t.id) { byName[t.name] = t.id; nameById.set(t.id, t.name); } });
  if (!(BODY_REF_LABEL in byName)) byName[BODY_REF_LABEL] = BODY_REF_SENTINEL;
  if (!("Celestial Body" in byName)) byName["Celestial Body"] = BODY_REF_SENTINEL; // legacy alias (pre-r077 label)
  if (!(CONLANG_REF_LABEL in byName)) byName[CONLANG_REF_LABEL] = SYNTH_TPL_CONLANG;
  NODE_SOURCE_REGISTRY.forEach(src => {
    if (allSources && !(src.name in byName)) byName[src.name] = src.id;
    if (!nameById.has(src.id)) nameById.set(src.id, src.name);
  });
  return { byName, nameById };
};

// Resolve refTemplate (name) to actual template id at load time
const resolveTemplateRefs = (templates) => {
  const { byName, nameById } = refTargetIndex(templates);
  // v1.7 r002: an id that points at a template or a registered source survives
  // re-resolution (the multi-template branch of fix()).
  const liveTargetIds = new Set(nameById.keys());
  const fix = (field, ownTemplate) => {
'''

MULTI_OLD = '''    // v1.3: multi-template ref: refTemplates (array of names) → refTemplatesId
    // (array of instance ids). Dropped entries where the template doesn't exist.
    if (field.type === "entry-ref" && Array.isArray(field.refTemplates)) {
      field.refTemplatesId = field.refTemplates
        .map(n => byName[n])
        .filter(Boolean);
    }
'''

MULTI_NEW = '''    // v1.3: multi-template ref: refTemplates (array of names) → refTemplatesId
    // (array of instance ids). Dropped entries where the template doesn't exist.
    // v1.7 r002: an id that still resolves is never dropped here. Rebuilding the
    // ids from the names alone took away a target the template builder had
    // added (it saved ids without names), and migrate()'s cleanup then deleted
    // every reference to it. Kept ids stay in their order; the names add
    // whatever they resolve to.
    if (field.type === "entry-ref" && Array.isArray(field.refTemplates)) {
      const kept = (Array.isArray(field.refTemplatesId) ? field.refTemplatesId : []).filter(id => liveTargetIds.has(id));
      const fromNames = field.refTemplates.map(n => byName[n]).filter(Boolean);
      field.refTemplatesId = [...new Set([...kept, ...fromNames])];
    }
'''

SYNC_ANCHOR = '''  templates.forEach(t => t.fields.forEach(f => fix(f, t)));
};

const makeTemplateFromBuiltin = (bt) => ({
'''

SYNC_NEW = '''  templates.forEach(t => t.fields.forEach(f => fix(f, t)));
};

// v1.7 r002: a reference field's target names follow its target ids, so that
// resolving the names again changes nothing. The template builder edits ids
// and used to leave the names behind; resolveTemplateRefs then undid its
// edits whenever it ran: a removed target came back, a field cleared to take
// any template narrowed again, one switched back to a single target turned
// multi-target again, and the target hint on the field's label (refHintFor,
// which reads names first) went stale. (An added target dropped out, taking
// the references to it along; resolveTemplateRefs now keeps any id that still
// resolves.) saveTemplate runs this on the template being saved; migrate()
// runs it once per world on every template. `templates` is the whole list,
// for resolving names; `only`, when given, is the templates to change;
// `legacy` resolves names as resolveTemplateRefs did before r002, to judge ids
// it derived then (migrate()'s pass).
//
// Per entry-ref field, group subfields included:
//   - A field holding an id that resolves to nothing (a deleted template, or a
//     v1.4 world's retired Astronomical Body template) is left alone.
//   - Multi-target (a non-empty id list): a name whose target is listed keeps
//     its place; a name whose target isn't listed goes; a name that resolves
//     to nothing stays, so a restored built-in is targeted again; a listed
//     target without a name gets one at the end. A field with no name list
//     keeps ids only. A single-target name or id left from before the field
//     went multi-target goes: nothing reads it but the stale hint.
//   - Cleared (an empty id list): the names go if any of them resolves.
//   - Switched back to a single target (the id list and refFilters both null,
//     as the builder's toggle leaves them): the names go. An id list that's
//     null without that is the v1.5 Language / Glossary supersede waiting on
//     a resolve, and stays for the v1.4 path to repair.
//   - Single target: the name follows the id. Set to any template (the id
//     null), a name that resolves goes and one that doesn't stays. A name
//     with no id at all hasn't been resolved yet, and stays.
const syncRefTargetNames = (templates, only, legacy) => {
  const { byName, nameById } = refTargetIndex(templates, !legacy);
  const sync = (f) => {
    if (!f || typeof f !== "object") return;
    if (f.type === "group" && Array.isArray(f.subfields)) f.subfields.forEach(sync);
    if (f.type !== "entry-ref") return;
    const ids = Array.isArray(f.refTemplatesId) ? f.refTemplatesId : null;
    if (ids && ids.some(id => !nameById.has(id))) return;
    if (f.refTemplateId && !nameById.has(f.refTemplateId)) return;
    const names = Array.isArray(f.refTemplates) ? f.refTemplates : null;
    if (ids && ids.length > 0) {
      if (names) {
        const listed = new Set(ids);
        const named = new Set();
        const next = [];
        names.forEach(n => {
          const id = byName[n];
          if (id === undefined) next.push(n);
          else if (listed.has(id) && !named.has(id)) { next.push(n); named.add(id); }
        });
        ids.forEach(id => { if (!named.has(id)) { next.push(nameById.get(id)); named.add(id); } });
        f.refTemplates = next;
      }
      if ("refTemplate" in f) delete f.refTemplate;
      if (f.refTemplateId) f.refTemplateId = null;
      return;
    }
    if (ids) {
      if (names && names.some(n => byName[n] !== undefined)) f.refTemplates = [];
    } else if (names && f.refTemplatesId === null && f.refFilters === null) {
      delete f.refTemplates;
    }
    if (f.refTemplate) {
      if (f.refTemplateId) {
        if (byName[f.refTemplate] !== f.refTemplateId) f.refTemplate = nameById.get(f.refTemplateId);
      } else if (f.refTemplateId === null && byName[f.refTemplate] !== undefined) {
        delete f.refTemplate;
      }
    }
  };
  (only || templates).forEach(t => { if (t && Array.isArray(t.fields)) t.fields.forEach(sync); });
};

const makeTemplateFromBuiltin = (bt) => ({
'''

edit(BUILTINS, [
    # Flag 2: Artifact › Current Owner
    (
        '      { label: "Current Owner", type: "entry-ref", refTemplate: "Character", halfWidth: true },\n',
        f'      {{ label: "Current Owner", type: "entry-ref", refTemplates: ["Character", {FAC}, {HOUSE}], halfWidth: true }},\n',
    ),
    # Flags 3 and 1: Character › Ally / Mentor, Enemies, Possessions
    (
        '      { label: "Ally / Mentor", type: "entry-ref", refTemplate: "Character", multi: true },\n'
        '      { label: "Enemies", type: "entry-ref", refTemplate: "Character", multi: true },\n'
        '      { label: "Possessions", type: "entry-ref", refTemplate: "Artifact / Object / Currency", multi: true },\n',
        '      { label: "Ally / Mentor", type: "entry-ref",\n'
        f'        refTemplates: ["Character", {FAC}, "Culture / People", "Deity / Entity"], multi: true }},\n'
        '      { label: "Enemies", type: "entry-ref",\n'
        f'        refTemplates: ["Character", {FAC}, "Culture / People", "Deity / Entity"], multi: true }},\n'
        '      { label: "Possessions", type: "entry-ref", refTemplates: ["Artifact / Object / Currency", "Weapon / Armor", "Vehicle"], multi: true },\n',
    ),
    # Flag 1: House › Heirlooms
    (
        '      { label: "Heirlooms", type: "entry-ref", refTemplate: "Artifact / Object / Currency", multi: true },\n',
        '      { label: "Heirlooms", type: "entry-ref", refTemplates: ["Artifact / Object / Currency", "Weapon / Armor"], multi: true },\n',
    ),
    # Flag 5: Religion › Founder (House › Founder stays Character)
    (
        '      { label: "Founder", type: "entry-ref", refTemplate: "Character", halfWidth: true },\n'
        '      { label: "Founded / Established"',
        '      { label: "Founder", type: "entry-ref", refTemplates: ["Character", "Deity / Entity"], halfWidth: true },\n'
        '      { label: "Founded / Established"',
    ),
    # Flag 4: Substance › Source / Where Found
    (
        '      { label: "Source / Where Found", type: "entry-ref", refTemplate: "Location", multi: true },\n',
        '      { label: "Source / Where Found", type: "entry-ref", refTemplates: ["Location", "Creature", "Astronomical Body"], multi: true },\n',
    ),
    # Flag 1: Theme / Motif › Associated Objects
    (
        '      { label: "Associated Objects", type: "entry-ref", refTemplate: "Artifact / Object / Currency", multi: true },\n',
        '      { label: "Associated Objects", type: "entry-ref", refTemplates: ["Artifact / Object / Currency", "Weapon / Armor", "Vehicle"], multi: true },\n',
    ),
    # Flag 2: Vehicle › Owner / Faction
    (
        '      { label: "Owner / Faction", type: "entry-ref", refTemplate: "Faction / Government / Organization", halfWidth: true },\n',
        f'      {{ label: "Owner / Faction", type: "entry-ref", refTemplates: [{FAC}, "Character", {HOUSE}], halfWidth: true }},\n',
    ),
    # Flag 4: Vehicle › Power Source
    (
        '      { label: "Power Source", type: "entry-ref", refTemplate: "Magic / Tech System", multi: true },\n',
        '      { label: "Power Source", type: "entry-ref", refTemplates: ["Magic / Tech System", "Substance / Material"], multi: true },\n',
    ),
    # Flag 2: Weapon / Armor › Previous Owners
    (
        '      { label: "Previous Owners", type: "entry-ref", refTemplate: "Character", multi: true },\n',
        f'      {{ label: "Previous Owners", type: "entry-ref", refTemplates: ["Character", {FAC}, {HOUSE}], multi: true }},\n',
    ),
    (RESOLVE_HEAD_OLD, RESOLVE_HEAD_NEW),
    (MULTI_OLD, MULTI_NEW),
    (SYNC_ANCHOR, SYNC_NEW),
])

SYNC_PASS = '''  // v1.7 r002: each reference field's target names brought into line with its
  // ids, once per world, before anything below re-resolves them (the
  // duplicate merge, the built-in backfills, the showWhen repair). A world
  // saved before r002 holds the template builder's target edits in the ids
  // alone, and resolving the stale names would undo them. After the template
  // renames, so the names come out current. Names resolve as they did before
  // r002, when the stored ids were derived: a name only r002 resolves (Lexeme,
  // Map) dropped out then and reads as a name that resolves to nothing, kept
  // for the next resolve to pick up. See syncRefTargetNames.
  if (!state.migrations || typeof state.migrations !== "object") state.migrations = {};
  if (!state.migrations.refTargetNamesSyncedV17) {
    syncRefTargetNames(state.templates, null, true);
    state.migrations.refTargetNamesSyncedV17 = true;
  }

'''

FLAGS_PASS = '''  // v1.7 r002: the entry-ref audit's flags 1 to 5 (docs/entry-ref-audit.md;
  // Drak, 2026-10-24). Eleven built-in fields gain targets in worlds made
  // before r002 (BUILTIN_TEMPLATES carries them for new worlds), once per world
  // and field, names and ids together, never removing one. A single-target
  // field becomes multi-target, as the builder's toggle makes it; a field open
  // to every template stays open; a field holding an id that resolves to
  // nothing is left alone, as syncRefTargetNames leaves it; a target template
  // the user deleted isn't added, nor one whose name a template of the user's
  // own holds; a field the user relabelled isn't found. The lists are edited
  // here directly, because calling resolveTemplateRefs would re-derive every
  // field in the world. After the v1.5 conversions, so the body target is the
  // body source and not a v1.4 template about to be removed. Tracked per world
  // (state.world.refTargetUpdates), as OPTIONS_UPDATES is.
  {
    const FAC = "Faction / Government / Organization";
    const HOUSE = "House / Dynasty / Clan / Bloodline";
    const REF_TARGET_ADDITIONS = [
      { template: "Artifact / Object / Currency", field: "Current Owner", rev: "v1.7-r002", add: [FAC, HOUSE] },
      { template: "Character", field: "Ally / Mentor", rev: "v1.7-r002", add: [FAC, "Culture / People", "Deity / Entity"] },
      { template: "Character", field: "Enemies", rev: "v1.7-r002", add: [FAC, "Culture / People", "Deity / Entity"] },
      { template: "Character", field: "Possessions", rev: "v1.7-r002", add: ["Weapon / Armor", "Vehicle"] },
      { template: HOUSE, field: "Heirlooms", rev: "v1.7-r002", add: ["Weapon / Armor"] },
      { template: "Religion / Belief System", field: "Founder", rev: "v1.7-r002", add: ["Deity / Entity"] },
      { template: "Substance / Material", field: "Source / Where Found", rev: "v1.7-r002", add: ["Creature", BODY_REF_LABEL] },
      { template: "Theme / Motif", field: "Associated Objects", rev: "v1.7-r002", add: ["Weapon / Armor", "Vehicle"] },
      { template: "Vehicle", field: "Owner / Faction", rev: "v1.7-r002", add: ["Character", HOUSE] },
      { template: "Vehicle", field: "Power Source", rev: "v1.7-r002", add: ["Substance / Material"] },
      { template: "Weapon / Armor", field: "Previous Owners", rev: "v1.7-r002", add: [FAC, HOUSE] },
    ];
    if (!state.world.refTargetUpdates || typeof state.world.refTargetUpdates !== "object") {
      state.world.refTargetUpdates = {};
    }
    const { byName, nameById } = refTargetIndex(state.templates);
    const targetIdFor = (name) => {
      const builtin = state.templates.find(t => t.name === name && t.origin === TEMPLATE_ORIGIN.BUILTIN);
      if (builtin) return builtin.id;
      if (state.templates.some(t => t.name === name)) return null;
      const src = NODE_SOURCE_REGISTRY.find(s => s.name === name);
      return src ? src.id : null;
    };
    REF_TARGET_ADDITIONS.forEach(({ template: tplName, field: fieldLabel, rev, add }) => {
      const migKey = `${tplName}:${fieldLabel}:targets:${rev}`;
      if (state.world.refTargetUpdates[migKey]) return;
      state.world.refTargetUpdates[migKey] = true;
      const tpl = state.templates.find(t => t.name === tplName && t.origin === TEMPLATE_ORIGIN.BUILTIN);
      const f = tpl && (tpl.fields || []).find(x => x && x.label === fieldLabel && x.type === "entry-ref");
      if (!f) return;
      const multi = Array.isArray(f.refTemplatesId) && f.refTemplatesId.length > 0;
      // A single target never resolved yet (no id key at all) counts by its name.
      const single = f.refTemplateId
        || ((f.refTemplate && !("refTemplateId" in f)) ? byName[f.refTemplate] : undefined);
      const ids = multi ? [...f.refTemplatesId] : (single ? [single] : []);
      if (ids.length === 0) return;
      if (ids.some(id => !nameById.has(id))) return;
      const names = (multi && Array.isArray(f.refTemplates)) ? [...f.refTemplates] : ids.map(id => nameById.get(id));
      add.forEach(name => {
        const id = targetIdFor(name);
        if (!id || ids.includes(id)) return;
        ids.push(id);
        names.push(name);
      });
      f.refTemplatesId = ids;
      f.refTemplates = names;
      if (!multi) {
        f.refTemplateId = null;
        if ("refTemplate" in f) delete f.refTemplate;
      }
    });
  }

'''

edit(MIGRATE, [
    (
        "  // Deduplication pass: heal worlds that already received the duplicate from\n",
        SYNC_PASS + "  // Deduplication pass: heal worlds that already received the duplicate from\n",
    ),
    (
        "  // Normalize each entry's field values via the shared helper. This catches\n",
        FLAGS_PASS + "  // Normalize each entry's field values via the shared helper. This catches\n",
    ),
])

edit(TRUNK12, [
    (
        "      cleaned.origin = TEMPLATE_ORIGIN.USER;\n"
        "      ensureIds(cleaned.fields);\n",
        "      cleaned.origin = TEMPLATE_ORIGIN.USER;\n"
        "      ensureIds(cleaned.fields);\n"
        "      // v1.7 r002: target names follow target ids (see syncRefTargetNames).\n"
        "      syncRefTargetNames([...state.templates, cleaned], [cleaned]);\n",
    ),
    (
        "      // it stays user-origin.\n"
        "      ensureIds(cleaned.fields);\n",
        "      // it stays user-origin.\n"
        "      ensureIds(cleaned.fields);\n"
        "      syncRefTargetNames(state.templates.map(t => t.id === activeTemplateId ? cleaned : t), [cleaned]);\n",
    ),
])

print("v1.7 r002 applied: 01_builtin-templates (flags 1-5, refTargetIndex, resolveTemplateRefs, syncRefTargetNames), "
      "10_migrate (name sync, flags), 12_trunk (saveTemplate)")
