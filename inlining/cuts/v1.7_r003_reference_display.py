"""v1.7 r003: references to records that aren't entries display, and maps
become reference targets.

The defect (found 2026-10-24 while planning the small data fixes, shown
headless on r001's build). Since v1.6.1's r052 a reference to an astronomical
body, a Glossopoeia record, or a map survives the load, but most places that
show one looked it up among entries only. The entry view looked among entries
and bodies, so a ConLang in the built-in language fields, any other Glossopoeia
record, and any map showed "(missing entry)", in group subfields and grid cells
as well; the HTML and Markdown exports looked among entries alone, so bodies
did too; and Concordance's hover pane dropped such a reference from its list.
Drak's calls (2026-10-24): fix the display everywhere; a Glossopoeia reference
is a plain chip that links nowhere yet, while maps and bodies keep the links
the click handler already gives them; maps become eligible targets on purpose;
and deleting a map counts the references to it and clears them, as deleting a
body does.

- 13_form-engine-display: resolveRefTarget (new) finds a reference's target
  among entries, bodies, and the registered records, and says whether a click
  can open it (entries, bodies, and maps; openEntryFromAnywhere knows those).
  EntryView passes the registered records to FieldValueDisplay, which uses it
  for reference fields, group subfields, and grid cells. A target that can't
  be opened is a chip without the arrow, its hover color held, titled with its
  type.
- 08_export-layer: registeredNodeIndex (new) indexes the registered records
  by id, and every export's context carries it. The Markdown exports write the
  record's name, as for an entry. In the HTML export refLinkHtml (new) links
  an entry or a map to its article (maps' articles use the entry-<id> scheme)
  and writes a body's or a Glossopoeia record's name as text titled with its
  type, since neither has an article.
- 17_concordance: the hover pane names a referenced record that isn't an
  entry instead of leaving it out.
- 22_trunk: the map source is ref-eligible; its comments stop saying nothing
  references a map.
- 12_trunk and 18_cartographia/04_index: deleteMap clears references to the
  map from entries' fields (scrubEntryRefs, as the body delete does), and
  both delete confirmations count them first (mapDeleteMessage, new).
- 26_home-data and site/helloworld.html: the Entry Reference help says what
  besides entries a reference can point at, and that deleting a body or a
  map clears references to it; the Cartographia index help says the delete
  confirmation counts them.

Declared scope: 08_export-layer, 12_trunk, 13_form-engine-display,
17_concordance, 18_cartographia/04_index, 22_trunk, 26_home-data; site/ outside
the tree. Declarations added: resolveRefTarget (13), registeredNodeIndex and
refLinkHtml (08), mapDeleteMessage (18_cartographia/04_index).

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given). Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r003_reference_display.py
"""
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())
MODULES = ROOT / "cartulary-src" / "modules"
SITE = ROOT / "site" / "helloworld.html"


def edit(path, pairs):
    text = path.read_text(encoding="utf-8")
    for pair in pairs:
        old, new = pair[0], pair[1]
        count = pair[2] if len(pair) > 2 else 1
        n = text.count(old)
        assert n == count, f"{path.name}: anchor occurs {n} times, not {count}:\n{old[:200]}"
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")


PLAIN_CHIP_STYLE = '{{ cursor: "default", background: "var(--accent-glow)", color: "var(--accent)" }}'

# ---------------------------------------------------------------- 13: display
edit(MODULES / "13_form-engine-display.jsx", [
    (
        '    return calendarDateToAbsoluteDay(state.world.calendar, cm);\n'
        '  })();\n'
        '  return (\n'
        '    <div className="entry-view">\n',
        '    return calendarDateToAbsoluteDay(state.world.calendar, cm);\n'
        '  })();\n'
        '  // v1.7 r003: the records that aren\'t entries (bodies, Glossopoeia records,\n'
        '  // maps), so a reference to one shows its name (resolveRefTarget).\n'
        '  const registeredNodes = state ? getRegisteredGraphNodes(state) : [];\n'
        '  return (\n'
        '    <div className="entry-view">\n',
    ),
    (
        'bodies={state?.celestialBodies} onOpenEntry={onOpenEntry}',
        'bodies={state?.celestialBodies} registeredNodes={registeredNodes} onOpenEntry={onOpenEntry}',
        3,
    ),
    (
        'function FieldValueDisplay({ field, value, entries, templates, bodies, onOpenEntry, imageFolder, dirHandle, calendar, entry, template, currentMomentDay }) {\n',
        '// v1.7 r003: what a reference value points at, for display: an entry, a body,\n'
        '// or another registered record (a Glossopoeia record, a map), or null when\n'
        '// nothing has its id. `open` says whether a click can take you there:\n'
        '// openEntryFromAnywhere knows entries, maps, and bodies, and a Glossopoeia\n'
        '// record has no route yet, so it shows as a plain chip (Drak, 2026-10-24).\n'
        '// `kind` names the record\'s type for a chip that can\'t be opened.\n'
        'const resolveRefTarget = (id, entries, bodies, registeredNodes) => {\n'
        '  if (!id) return null;\n'
        '  const e = (entries || []).find(x => x && x.id === id);\n'
        '  if (e) return { name: e.name, open: true };\n'
        '  const b = (bodies || []).find(x => x && x.id === id);\n'
        '  if (b) return { name: b.name, open: true };\n'
        '  const n = (registeredNodes || []).find(x => x && x.id === id);\n'
        '  if (!n) return null;\n'
        '  const src = getRegisteredSourceById(n.templateId);\n'
        '  return { name: n.name, open: n.templateId === SYNTH_TPL_MAP || n.templateId === BODY_REF_SENTINEL, kind: src ? src.name : "" };\n'
        '};\n'
        '\n'
        'function FieldValueDisplay({ field, value, entries, templates, bodies, registeredNodes, onOpenEntry, imageFolder, dirHandle, calendar, entry, template, currentMomentDay }) {\n',
    ),
    (
        '          // so the lookup falls through naturally for legacy refs too.\n'
        '          const ref = entries.find(e => e.id === it.id) || (bodies || []).find(b => b && b.id === it.id);\n'
        '          if (!ref) return <span key={i} className="entry-ref-chip" style={{ opacity: 0.5 }}>(missing entry)</span>;\n',
        '          // so the lookup falls through naturally for legacy refs too.\n'
        '          // v1.7 r003: so does any other registered record (resolveRefTarget).\n'
        '          const ref = resolveRefTarget(it.id, entries, bodies, registeredNodes);\n'
        '          if (!ref) return <span key={i} className="entry-ref-chip" style={{ opacity: 0.5 }}>(missing entry)</span>;\n'
        f'          if (!ref.open) return <span key={{i}} className="entry-ref-chip" style={PLAIN_CHIP_STYLE} title={{ref.kind}}>{{ref.name}}</span>;\n',
    ),
    (
        '                  <FieldValueDisplay field={sub} value={subval} entries={entries} templates={templates} bodies={bodies} onOpenEntry={onOpenEntry}',
        '                  <FieldValueDisplay field={sub} value={subval} entries={entries} templates={templates} bodies={bodies} registeredNodes={registeredNodes} onOpenEntry={onOpenEntry}',
    ),
    (
        '        const ref = entries.find(e => e.id === cv) || (bodies || []).find(b => b && b.id === cv);\n'
        '        if (!ref) return <span className="entry-ref-chip" style={{ opacity: 0.5 }}>(missing)</span>;\n',
        '        const ref = resolveRefTarget(cv, entries, bodies, registeredNodes);\n'
        '        if (!ref) return <span className="entry-ref-chip" style={{ opacity: 0.5 }}>(missing)</span>;\n'
        f'        if (!ref.open) return <span className="entry-ref-chip" style={PLAIN_CHIP_STYLE} title={{ref.kind}}>{{ref.name}}</span>;\n',
    ),
])

# ---------------------------------------------------------------- 08: exports
edit(MODULES / "08_export-layer.jsx", [
    (
        '        const ref = entryById[it.id];\n'
        '        if (!ref) return "(missing entry)";\n',
        '        // v1.7 r003: a body, a Glossopoeia record, or a map writes its name too.\n'
        '        const ref = entryById[it.id] || (ctx.nodeById && ctx.nodeById[it.id]);\n'
        '        if (!ref) return "(missing entry)";\n',
    ),
    (
        '        if (type === "entry-ref") { const ref = entryById[cv]; return ref ? ref.name : "(missing entry)"; }\n',
        '        if (type === "entry-ref") { const ref = entryById[cv] || (ctx.nodeById && ctx.nodeById[cv]); return ref ? ref.name : "(missing entry)"; }\n',
    ),
    (
        '  const ctx = { entryById, entryByLowerName, calendar: world.calendar, options, imageManifest: null };\n',
        '  const ctx = { entryById, nodeById: registeredNodeIndex(state), entryByLowerName, calendar: world.calendar, options, imageManifest: null };\n',
    ),
    (
        '  const ctx = { entryById, entryByLowerName, calendar: world.calendar, options, imageManifest };\n',
        '  const ctx = { entryById, nodeById: registeredNodeIndex(state), entryByLowerName, calendar: world.calendar, options, imageManifest };\n',
    ),
    (
        '// Render one field\'s value as HTML. Mirrors renderFieldForMd\'s structure but\n',
        '// v1.7 r003: the registered records (bodies, Glossopoeia records, maps) by id,\n'
        '// for an export\'s context, so a reference to one resolves as an entry\'s does.\n'
        'const registeredNodeIndex = (state) =>\n'
        '  Object.fromEntries(getRegisteredGraphNodes(state).map(n => [n.id, n]));\n'
        '\n'
        '// v1.7 r003: one reference value in the HTML export. An entry links to its\n'
        '// article, and so does a map, whose article reuses the entry-<id> scheme; a\n'
        '// body or a Glossopoeia record has no article, so it\'s its name, titled with\n'
        '// its type; an id nothing has is the broken-link span it always was.\n'
        'const refLinkHtml = (id, ctx) => {\n'
        '  const ref = ctx.entryById[id];\n'
        '  if (ref) return `<a class="entry-ref-link" href="#entry-${htmlEscape(ref.id)}">${htmlEscape(ref.name)}</a>`;\n'
        '  const node = ctx.nodeById ? ctx.nodeById[id] : null;\n'
        '  if (node && node.templateId === SYNTH_TPL_MAP) return `<a class="entry-ref-link" href="#entry-${htmlEscape(node.id)}">${htmlEscape(node.name)}</a>`;\n'
        '  if (node) {\n'
        '    const src = getRegisteredSourceById(node.templateId);\n'
        '    return `<span class="entry-ref-record" title="${htmlEscape(src ? src.name : "")}">${htmlEscape(node.name)}</span>`;\n'
        '  }\n'
        '  return `<span class="broken-link" title="Referenced entry no longer exists">(missing entry)</span>`;\n'
        '};\n'
        '\n'
        '// Render one field\'s value as HTML. Mirrors renderFieldForMd\'s structure but\n',
    ),
    (
        '        const ref = entryById[it.id];\n'
        '        const linkOrSpan = ref\n'
        '          ? `<a class="entry-ref-link" href="#entry-${htmlEscape(ref.id)}">${htmlEscape(ref.name)}</a>`\n'
        '          : `<span class="broken-link" title="Referenced entry no longer exists">(missing entry)</span>`;\n',
        '        const linkOrSpan = refLinkHtml(it.id, ctx);\n',
    ),
    (
        '        if (type === "entry-ref") {\n'
        '          const ref = entryById[cv];\n'
        '          return ref\n'
        '            ? `<a class="entry-ref-link" href="#entry-${htmlEscape(ref.id)}">${htmlEscape(ref.name)}</a>`\n'
        '            : `<span class="broken-link" title="Referenced entry no longer exists">(missing entry)</span>`;\n'
        '        }\n',
        '        if (type === "entry-ref") return refLinkHtml(cv, ctx);\n',
    ),
    (
        '  const baseCtx = {\n'
        '    entryById,\n'
        '    entryByLowerName,\n',
        '  const baseCtx = {\n'
        '    entryById,\n'
        '    nodeById: registeredNodeIndex(state),\n'
        '    entryByLowerName,\n',
    ),
])

# ---------------------------------------------------------------- 17: hover pane
edit(MODULES / "17_concordance.jsx", [
    (
        '    const entriesById = {};\n'
        '    for (const e of state.entries) entriesById[e.id] = e;\n',
        '    const entriesById = {};\n'
        '    for (const e of state.entries) entriesById[e.id] = e;\n'
        '    // v1.7 r003: a referenced body, Glossopoeia record, or map is named too,\n'
        '    // where it used to drop out of the pane.\n'
        '    const registeredNameById = {};\n'
        '    for (const n of getRegisteredGraphNodes(state)) registeredNameById[n.id] = n.name;\n',
    ),
    (
        '        const names = ids.map(id => entriesById[id]?.name).filter(Boolean);\n',
        '        const names = ids.map(id => entriesById[id]?.name || registeredNameById[id]).filter(Boolean);\n',
    ),
])

# ---------------------------------------------------------------- 22: registry
edit(MODULES / "22_trunk.jsx", [
    (
        '// graphable in Concordance with their outbound pin edges. NOT ref-eligible:\n'
        '// nothing entry-refs a map, so they never appear in the ref picker.\n',
        '// graphable in Concordance with their outbound pin edges. Ref-eligible since\n'
        '// v1.7 r003, on purpose (Drak, 2026-10-24): the template builder offered Map\n'
        '// as a target all along, and since v1.6.1\'s r052 a reference to a map\n'
        '// survives the load.\n',
    ),
    (
        '    refEligible: false,\n',
        '    refEligible: true,\n',
    ),
    (
        '    // Leaf node: nothing points back at a map.\n',
        '    // A field that references a map adds its own edge into the map, from the\n'
        '    // field walk in Concordance.\n',
    ),
])

# ---------------------------------------------------------------- 12: deleteMap
edit(MODULES / "12_trunk.jsx", [
    (
        '    // Maps are leaf nodes (nothing entry-refs them), so no ref scrub is needed.\n'
        '    // Any lingering concordance position keyed by this id is dropped on next\n'
        '    // load by migrate\'s position validation; live, it simply stops rendering.\n'
        '    updateState(s => ({ ...s, cartographia: (s.cartographia || []).filter(m => m.id !== id) }));\n',
        '    // v1.7 r003: maps are reference targets, so the delete clears references\n'
        '    // to this one from every entry\'s fields, groups and grids included, as a\n'
        '    // body\'s delete does; both confirmations count them first\n'
        '    // (mapDeleteMessage). Any lingering concordance position keyed by this id\n'
        '    // is dropped on next load by migrate\'s position validation; live, it\n'
        '    // simply stops rendering.\n'
        '    updateState(s => ({\n'
        '      ...s,\n'
        '      cartographia: (s.cartographia || []).filter(m => m.id !== id),\n'
        '      entries: scrubEntryRefs(s.entries, s.templates, new Set([id])),\n'
        '    }));\n',
    ),
    (
        '                  if (rec && confirm(`Delete map "${rec.name}"? This cannot be undone.`)) deleteMap(activeMapId);\n',
        '                  if (rec && confirm(mapDeleteMessage(rec, state))) deleteMap(activeMapId);\n',
    ),
])

# ---------------------------------------------------------------- 18/04: index
edit(MODULES / "18_cartographia" / "04_index.jsx", [
    (
        'function CartographiaIndexView({ state, isLocked, onOpen, onCreate, onDelete, onStampsChange, flash }) {\n',
        '// v1.7 r003: a map\'s delete confirmation, counting the entries that reference\n'
        '// it, as a body\'s delete does; deleteMap clears those references.\n'
        'const mapDeleteMessage = (rec, state) => {\n'
        '  const n = countInboundEntryRefs(state.entries, state.templates, rec.id);\n'
        '  const refs = n === 0 ? ""\n'
        '    : n === 1 ? " Referenced by 1 entry. Deleting this map removes that reference; the entry stays intact."\n'
        '    : ` Referenced by ${n} entries. Deleting this map removes those references; the entries stay intact.`;\n'
        '  return `Delete map "${rec.name}"?${refs} This cannot be undone.`;\n'
        '};\n'
        '\n'
        'function CartographiaIndexView({ state, isLocked, onOpen, onCreate, onDelete, onStampsChange, flash }) {\n',
    ),
    (
        '                        if (confirm(`Delete map "${rec.name}"? This cannot be undone.`)) {\n',
        '                        if (confirm(mapDeleteMessage(rec, state))) {\n',
    ),
])

# ---------------------------------------------------------------- 26: help
edit(MODULES / "26_home-data.jsx", [
    (
        "- **Entry Reference** — link to another entry (single or multi). Deleting the referenced entry (or the template that owns it) automatically clears the reference from any entry that pointed at it; you won't be left with broken links pointing at nothing.",
        "- **Entry Reference** — link to another entry (single or multi), or to a record that isn't an entry: an Astronomical Body, a Glossopoeia record, or a Map, which the template builder lists after the templates. Deleting the referenced entry, body, or map, or the template an entry belongs to, automatically clears the reference from any entry that pointed at it; you won't be left with broken links pointing at nothing.",
    ),
    (
        "Delete on the row removes the map with its drawing and its pins (the entries the pins linked to are untouched).",
        "Delete on the row removes the map with its drawing and its pins (the entries the pins linked to are untouched); when entries reference the map, the confirmation says how many, and the references are cleared.",
    ),
])

# ---------------------------------------------------------------- site
edit(SITE, [
    (
        "You can narrow further by field value when you need to: a ref to Characters where Status is Living, say.</p></li>",
        "You can narrow further by field value when you need to: a ref to Characters where Status is Living, say. Besides your templates, a ref can point at Astronomical Bodies, the Glossopoeia record types, and Maps, which the builder lists after the templates.</p></li>",
    ),
    (
        "<p>And the safety net: delete an entry that something else points at, or delete the whole template it belonged to, and Cartulary clears the dangling links automatically.",
        "<p>And the safety net: delete an entry that something else points at, the whole template it belonged to, or a body or a map, and Cartulary clears the dangling links automatically.",
    ),
    (
        "the map, its drawing, and all its pins are removed, and entries the pins linked to are unaffected.</p>",
        "the map, its drawing, and all its pins are removed, and entries the pins linked to are unaffected. When entries reference the map, the confirmation says how many, and those references are cleared.</p>",
    ),
])

print("v1.7 r003 applied: 08, 12, 13, 17, 18_cartographia/04_index, 22, 26, and site/helloworld.html")
