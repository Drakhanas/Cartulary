"""v1.7 r004: reference fields stop listing the templates that v1.5's
conversions and v1.6's map promotion retired.

The defect (Drak's r003 pass, 2026-10-24: his world, begun in v1.4 or before,
showed Location > Parent without Astronomical Body ticked; confirmed headless
on a world built in the v1.4 final). v1.5 turned the built-in Astronomical
Body template's entries into bodies and removed the template, renaming the
fields that targeted it but leaving their ids for resolveTemplateRefs, which
runs only when a later pass needs it (the comment said every load). A field
kept the removed template's id, which matched nothing: its picker offered no
bodies, and the cleanup at the end of migrate() deleted every reference to a
body from it. Location > Parent and Historical Event > Location are the
built-in fields hit, and any field of the user's that targeted the template.
The Language / Glossary supersede set a single-target field's id, but cleared
a multi-target field's id list for a resolve: the field took any template
meanwhile, a later resolve would rebuild the list without Lexeme though the
template's words had become lexemes, and an id the template builder had added
without a name was left dead. v1.6's map promotion, found while in here, left
the ids of the map templates it removed the same way, in fields of the user's
own (no built-in field targeted a map). From r002 on, a load whose backfills
resolve names takes a multi-target field's maps back from its "Map" name; a
single-target field kept the dead id. Drak's calls (2026-10-24): fix the
conversions and repair worlds already upgraded; fold the maps into this cut.

- 10_migrate: retargetRetired (new) points a reference field at the source a
  retired template's records moved to, names and ids together: Astronomical
  Body to the bodies; Language / Glossary to ConLang for a single target, and
  to ConLang and Lexeme for a multi-target field; a map template to the maps.
  The two v1.5 conversions call it with the template's own id. A repair pass,
  once per world, right after r002's name sync: a retired id is known by its
  shape (tpl-<slug>-<four characters>, none of the three built-ins ever
  renamed) and by matching nothing, or, for a map template, by the map
  promotion's list when the same load promoted it, and is retargeted; a list
  the supersede cleared is rebuilt from its names, with Lexeme added and every
  template the field already points at kept, so the cleanup deletes nothing,
  unless the field was set to one target since, when the stale names go. A
  reference the cleanup already deleted doesn't come back, and a map template
  of the user's own promoted before r004 keeps its id.
- 01_builtin-templates: syncRefTargetNames' comment says what mends the
  retired ids and the cleared lists.

Declared scope: 01_builtin-templates, 10_migrate. Declarations added:
retargetRetired (10).

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given). Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r004_retired_targets.py
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


# ---------------------------------------------------------------- 10: migrate
edit(MODULES / "10_migrate.jsx", [
    # The map templates the promotion retires, noted before it removes them.
    (
        "  if (!Array.isArray(state.cartographia)) state.cartographia = [];\n"
        "  {\n"
        "    const mapTpls = state.templates.filter(t => t && t.kind === \"map\");\n",
        "  if (!Array.isArray(state.cartographia)) state.cartographia = [];\n"
        "  // v1.7 r004: the map templates this load retires, noted before the block\n"
        "  // below removes them, for the repair after r002's name sync to point the\n"
        "  // reference fields that list them at the maps. Pointed there before that\n"
        "  // sync, a field would come out of it with Map listed twice.\n"
        "  const promotedMapTemplates = state.templates\n"
        "    .filter(t => t && t.kind === \"map\")\n"
        "    .map(t => ({ id: t.id, name: t.name }));\n"
        "  {\n"
        "    const mapTpls = state.templates.filter(t => t && t.kind === \"map\");\n",
    ),
    # The helper, ahead of migrate().
    (
        "// ─── Migration ─────────────────────────────────────────────────────────────────\n"
        "\n"
        "const migrate = (state) => {\n",
        "// ─── Migration ─────────────────────────────────────────────────────────────────\n"
        "\n"
        "// v1.7 r004: point a reference field that lists a retired template at the\n"
        "// source the template's records moved to, names and ids together.\n"
        "// `retired.isId` says which ids are the retired template's; `single` and\n"
        "// `singleName` replace it in a single-target field, `multi` and\n"
        "// `multiNames` in a multi-target one, which can take more than one. In the\n"
        "// name list the retired template's names (`names`) give way to the new\n"
        "// ones, a new name missing from it is added, and none is listed twice.\n"
        "// Group subfields are the caller's to walk.\n"
        "const retargetRetired = (f, retired) => {\n"
        "  if (!f || f.type !== \"entry-ref\") return;\n"
        "  if (f.refTemplateId && retired.isId(f.refTemplateId)) {\n"
        "    f.refTemplateId = retired.single;\n"
        "    f.refTemplate = retired.singleName;\n"
        "  }\n"
        "  if (Array.isArray(f.refTemplatesId) && f.refTemplatesId.some(retired.isId)) {\n"
        "    const ids = [];\n"
        "    f.refTemplatesId.forEach(id => (retired.isId(id) ? retired.multi : [id]).forEach(x => {\n"
        "      if (!ids.includes(x)) ids.push(x);\n"
        "    }));\n"
        "    f.refTemplatesId = ids;\n"
        "    if (Array.isArray(f.refTemplates)) {\n"
        "      const names = [];\n"
        "      const add = (n) => { if (!names.includes(n)) names.push(n); };\n"
        "      f.refTemplates.forEach(n => (retired.names.includes(n) ? retired.multiNames : [n]).forEach(add));\n"
        "      retired.multiNames.forEach(add);\n"
        "      f.refTemplates = names;\n"
        "    }\n"
        "  }\n"
        "};\n"
        "\n"
        "const migrate = (state) => {\n",
    ),
    # The repair pass, right after r002's name sync.
    (
        "  if (!state.migrations.refTargetNamesSyncedV17) {\n"
        "    syncRefTargetNames(state.templates, null, true);\n"
        "    state.migrations.refTargetNamesSyncedV17 = true;\n"
        "  }\n"
        "\n",
        "  if (!state.migrations.refTargetNamesSyncedV17) {\n"
        "    syncRefTargetNames(state.templates, null, true);\n"
        "    state.migrations.refTargetNamesSyncedV17 = true;\n"
        "  }\n"
        "\n"
        "  // v1.7 r004: the templates that v1.5's conversions and v1.6's map\n"
        "  // promotion retired, and the sources their records moved to\n"
        "  // (retargetRetired). The Astronomical Body names include \"Celestial\n"
        "  // Body\", the body label a v1.5 build before r077 wrote in their place;\n"
        "  // the map entry carries the map templates this load promotes, of the\n"
        "  // user's own as well as the built-in, by id and name. The conversions\n"
        "  // below use the first two with the template's own id.\n"
        "  const RETIRED_TEMPLATE_TARGETS = [\n"
        "    {\n"
        "      slug: \"astronomical-body\", names: [\"Astronomical Body\", \"Celestial Body\"],\n"
        "      single: BODY_REF_SENTINEL, singleName: BODY_REF_LABEL,\n"
        "      multi: [BODY_REF_SENTINEL], multiNames: [BODY_REF_LABEL],\n"
        "    },\n"
        "    {\n"
        "      slug: \"language-glossary\", names: [\"Language / Glossary\"],\n"
        "      single: SYNTH_TPL_CONLANG, singleName: CONLANG_REF_LABEL,\n"
        "      multi: [SYNTH_TPL_CONLANG, SYNTH_TPL_LEXEME], multiNames: [CONLANG_REF_LABEL, LEXEME_REF_LABEL],\n"
        "    },\n"
        "    {\n"
        "      slug: \"map\", names: [MAP_REF_LABEL, ...promotedMapTemplates.map(t => t.name)],\n"
        "      ids: promotedMapTemplates.map(t => t.id),\n"
        "      single: SYNTH_TPL_MAP, singleName: MAP_REF_LABEL,\n"
        "      multi: [SYNTH_TPL_MAP], multiNames: [MAP_REF_LABEL],\n"
        "    },\n"
        "  ];\n"
        "\n"
        "  // v1.7 r004: repair the reference fields of a world upgraded before\n"
        "  // r004, once per world. Two things were left behind. (1) A retired\n"
        "  // template's id, wherever a field listed it: the Astronomical Body\n"
        "  // conversion and the map promotion left every one, and the Language /\n"
        "  // Glossary supersede one it couldn't find by name (an id the template\n"
        "  // builder had added alone). Matching nothing, it gave the field a picker\n"
        "  // with none of the records that had moved, and the cleanup at the end of\n"
        "  // migrate() deleted every reference to one from a multi-target field\n"
        "  // (Location › Parent, Historical Event › Location). The id is\n"
        "  // retargeted. A built-in template's id is tpl-<slug of its name>-<four\n"
        "  // characters>, and none of the three was ever renamed, so a retired one\n"
        "  // is known by that shape once nothing has it; a map template of the\n"
        "  // user's own is known only in the load that promotes it, so one promoted\n"
        "  // before r004 keeps its id. (2) A multi-target field\n"
        "  // that targeted Language / Glossary: the supersede renamed it to ConLang\n"
        "  // in the names and cleared the id list, so the field has taken any\n"
        "  // template since. Its list is rebuilt from its names, with Lexeme added\n"
        "  // for the words that became lexemes, and with every template or source\n"
        "  // the field already points at, so the cleanup deletes nothing; a field\n"
        "  // set to one target since keeps it, and its stale names go. This runs\n"
        "  // after r002's name sync, which resolves names as they resolved before\n"
        "  // r002, when Lexeme and Map didn't, and so would list either twice in a\n"
        "  // list mended here; and before the duplicate merge and the backfills,\n"
        "  // whose resolves would rebuild a cleared list without Lexeme. A\n"
        "  // reference the cleanup already deleted doesn't come back.\n"
        "  if (!state.migrations.retiredTargetsRepairedV17) {\n"
        "    const { byName, nameById } = refTargetIndex(state.templates);\n"
        "    const retired = RETIRED_TEMPLATE_TARGETS.map(r => {\n"
        "      const prefix = `tpl-${r.slug}-`;\n"
        "      const isId = (id) => typeof id === \"string\" && !nameById.has(id)\n"
        "        && ((r.ids || []).includes(id) || (id.length === prefix.length + 4 && id.startsWith(prefix)));\n"
        "      return { ...r, isId };\n"
        "    });\n"
        "    const entryById = new Map(state.entries.filter(e => e && e.id).map(e => [e.id, e]));\n"
        "    const sourceById = new Map(getRegisteredGraphNodes(state).map(n => [n.id, n.templateId]));\n"
        "    // What the field's references point at, across the template's entries:\n"
        "    // an entry's template, or a record's source.\n"
        "    const heldTargets = (tpl, f) => {\n"
        "      const out = [];\n"
        "      state.entries.forEach(e => {\n"
        "        if (!e || e.templateId !== tpl.id || !e.fields) return;\n"
        "        const v = e.fields[f.id];\n"
        "        (Array.isArray(v) ? v : [v]).forEach(x => {\n"
        "          const id = typeof x === \"string\" ? x : (x && typeof x === \"object\" && typeof x.id === \"string\" ? x.id : null);\n"
        "          if (!id) return;\n"
        "          const target = entryById.get(id);\n"
        "          const src = target ? target.templateId : sourceById.get(id);\n"
        "          if (src && nameById.has(src) && !out.includes(src)) out.push(src);\n"
        "        });\n"
        "      });\n"
        "      return out;\n"
        "    };\n"
        "    // topLevel: the cleanup judges only top-level fields, so only they need\n"
        "    // the held targets.\n"
        "    const repair = (tpl, f, topLevel) => {\n"
        "      if (!f || typeof f !== \"object\") return;\n"
        "      if (f.type === \"group\" && Array.isArray(f.subfields)) f.subfields.forEach(sf => repair(tpl, sf, false));\n"
        "      if (f.type !== \"entry-ref\") return;\n"
        "      retired.forEach(r => retargetRetired(f, r));\n"
        "      if (f.refTemplatesId !== null || !Array.isArray(f.refTemplates) || !f.refTemplates.includes(CONLANG_REF_LABEL)) return;\n"
        "      if (f.refTemplateId) { delete f.refTemplates; return; }\n"
        "      const ids = [];\n"
        "      const add = (id) => { if (id && !ids.includes(id)) ids.push(id); };\n"
        "      f.refTemplates.forEach(n => { add(byName[n]); if (n === CONLANG_REF_LABEL) add(SYNTH_TPL_LEXEME); });\n"
        "      if (topLevel) heldTargets(tpl, f).forEach(add);\n"
        "      const names = [...f.refTemplates];\n"
        "      ids.forEach(id => { if (!names.some(n => byName[n] === id)) names.push(nameById.get(id)); });\n"
        "      f.refTemplatesId = ids;\n"
        "      f.refTemplates = names;\n"
        "      if (\"refTemplateId\" in f) f.refTemplateId = null;\n"
        "      if (\"refTemplate\" in f) delete f.refTemplate;\n"
        "    };\n"
        "    state.templates.forEach(t => { if (t && Array.isArray(t.fields)) t.fields.forEach(f => repair(t, f, true)); });\n"
        "    state.migrations.retiredTargetsRepairedV17 = true;\n"
        "  }\n"
        "\n",
    ),
    # The Astronomical Body conversion: the ids go with the names.
    (
        "    // Rewrite refTemplates / refTemplate / refFilters across surviving\n"
        "    // templates: \"Astronomical Body\" → BODY_REF_LABEL (\"Celestial Body\").\n",
        "    // Rewrite refTemplates / refTemplate / refFilters across surviving\n"
        "    // templates: \"Astronomical Body\" → BODY_REF_LABEL (\"Celestial Body\"\n"
        "    // when this was written, \"Astronomical Body\" again since r077).\n",
    ),
    (
        "    const rewriteRefsOnFields = (fields) => {\n"
        "      if (!Array.isArray(fields)) return;\n"
        "      fields.forEach(f => {\n"
        "        if (!f) return;\n"
        "        if (f.type === \"entry-ref\") {\n"
        "          if (f.refTemplate === \"Astronomical Body\") f.refTemplate = BODY_REF_LABEL;\n",
        "    //\n"
        "    // v1.7 r004: the template's id goes too, wherever a field lists it\n"
        "    // (retargetRetired). Before r004 the ids were left for\n"
        "    // resolveTemplateRefs, which runs only when a later pass needs it, so a\n"
        "    // field kept an id that matched nothing once the template was gone: its\n"
        "    // picker offered no bodies, and the cleanup at the end of migrate()\n"
        "    // deleted every reference to one (Location › Parent, Historical Event ›\n"
        "    // Location). The repair pass after the template renames mends a world\n"
        "    // converted before r004.\n"
        "    const astroRetired = astroTemplate\n"
        "      ? { ...RETIRED_TEMPLATE_TARGETS.find(r => r.slug === \"astronomical-body\"), isId: (id) => id === astroTemplate.id }\n"
        "      : null;\n"
        "    const rewriteRefsOnFields = (fields) => {\n"
        "      if (!Array.isArray(fields)) return;\n"
        "      fields.forEach(f => {\n"
        "        if (!f) return;\n"
        "        if (f.type === \"entry-ref\") {\n"
        "          if (astroRetired) retargetRetired(f, astroRetired);\n"
        "          if (f.refTemplate === \"Astronomical Body\") f.refTemplate = BODY_REF_LABEL;\n",
    ),
    (
        "            f.refFilters = next;\n"
        "          }\n"
        "          // refTemplateId / refTemplatesId get re-resolved downstream by\n"
        "          // resolveTemplateRefs on every load; leave them for now.\n"
        "        }\n",
        "            f.refFilters = next;\n"
        "          }\n"
        "        }\n",
    ),
    # The Language / Glossary supersede: by id as well, and the ids kept.
    (
        "    // Re-point ref fields naming the retired template: \"Language / Glossary\" ->\n"
        "    // \"ConLang\". resolveTemplateRefs maps the name to SYNTH_TPL_CONLANG on load;\n"
        "    // existing ref values keep resolving via the ConLang node-source (ids kept).\n"
        "    const repoint = (fields) => {\n",
        "    // Re-point ref fields naming the retired template: \"Language / Glossary\" ->\n"
        "    // \"ConLang\". resolveTemplateRefs maps the name to SYNTH_TPL_CONLANG when it\n"
        "    // runs; existing ref values keep resolving via the ConLang node-source (ids\n"
        "    // kept).\n"
        "    const lgRetired = lgTemplate\n"
        "      ? { ...RETIRED_TEMPLATE_TARGETS.find(r => r.slug === \"language-glossary\"), isId: (id) => id === lgTemplate.id }\n"
        "      : null;\n"
        "    const repoint = (fields) => {\n",
    ),
    (
        "          if (f.refTemplate === \"Language / Glossary\") { f.refTemplate = CONLANG_REF_LABEL; f.refTemplateId = SYNTH_TPL_CONLANG; }\n"
        "          // Multi ref: rewrite the name and clear the id list; resolveTemplateRefs\n"
        "          // re-derives refTemplatesId from names unconditionally on load.\n"
        "          if (Array.isArray(f.refTemplates) && f.refTemplates.includes(\"Language / Glossary\")) {\n"
        "            f.refTemplates = f.refTemplates.map(n => n === \"Language / Glossary\" ? CONLANG_REF_LABEL : n);\n"
        "            f.refTemplatesId = null;\n"
        "          }\n",
        "          if (f.refTemplate === \"Language / Glossary\") { f.refTemplate = CONLANG_REF_LABEL; f.refTemplateId = SYNTH_TPL_CONLANG; }\n"
        "          // v1.7 r004: by id as well, and a multi-target field keeps its ids:\n"
        "          // the template's id becomes ConLang and Lexeme, since its words\n"
        "          // became lexemes (retargetRetired). Before r004 the id list was\n"
        "          // cleared for resolveTemplateRefs to rebuild from the names, which\n"
        "          // happens only when a later pass needs it: the field took any\n"
        "          // template meanwhile, and the rebuilt list would have left out\n"
        "          // Lexeme, so the cleanup would have deleted the references to the\n"
        "          // words. A name the ids don't back is still renamed. The repair\n"
        "          // pass after the template renames mends a world converted before\n"
        "          // r004.\n"
        "          if (lgRetired) retargetRetired(f, lgRetired);\n"
        "          if (Array.isArray(f.refTemplates) && f.refTemplates.includes(\"Language / Glossary\")) {\n"
        "            f.refTemplates = f.refTemplates.map(n => n === \"Language / Glossary\" ? CONLANG_REF_LABEL : n);\n"
        "          }\n",
    ),
])

# ---------------------------------------------------------------- 01: comment
edit(MODULES / "01_builtin-templates.jsx", [
    (
        "//   - A field holding an id that resolves to nothing (a deleted template, or a\n"
        "//     v1.4 world's retired Astronomical Body template) is left alone.\n",
        "//   - A field holding an id that resolves to nothing (a deleted template, say)\n"
        "//     is left alone. migrate() mends one the v1.5 conversions retired, just\n"
        "//     after its own call here (v1.7 r004).\n",
    ),
    (
        "//     as the builder's toggle leaves them): the names go. An id list that's\n"
        "//     null without that is the v1.5 Language / Glossary supersede waiting on\n"
        "//     a resolve, and stays for the v1.4 path to repair.\n",
        "//     as the builder's toggle leaves them): the names go. An id list that's\n"
        "//     null without that is left from the v1.5 Language / Glossary supersede,\n"
        "//     and stays for migrate() to mend (v1.7 r004).\n",
    ),
])

print("v1.7 r004 applied: 01_builtin-templates, 10_migrate")
