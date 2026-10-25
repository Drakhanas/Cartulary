"""v1.7 r005: a multi-select can take values of the user's own.

Drak's calls (2026-10-25), from the Fabula field-list review: the four Fabula
multi-selects whose draft lists end in Other (Premise > Conflict Kinds,
Genre > Tone, Cast > Role, Relationship > Kind) get a real Other, built for
every template rather than worked around (fork A, b); it's its own cut, ahead
of Fabula's first, since it doesn't depend on the field lists (fork D, a);
and what's typed is saved as more strings in the same list, so the stored
shape doesn't change (fork E, a).

- 14_form-engine-edit: MultiSelectEditor, when the field has otherTextField,
  shows an Other box under its options. A value typed there (Enter, or leaving
  the box) joins the list; one that matches an option, or a value already
  picked, ignoring case, picks that instead. A listed value that isn't an
  option is the user's own while the setting is on, a chip like the options'
  and removed the same way; with the setting off it shows as before, dashed,
  the way a pick whose option was deleted does; its tooltip's dash becomes a
  semicolon, matching the new one's.
- 15_template-builder: the Allow custom "Other" text checkbox is offered on
  multi-selects, fields and subfields, with a hint of its own.
- 26_home-data: the builder help says a multi-select can carry it, and the
  JSON Save File Schema topic's value table says what a multi-select holds
  with it, and what a dropdown with it holds (`{ value, customText }`, which
  the table left out).
- site/helloworld.html, outside the tree: the same, on the Templates and
  Fields pages and the JSON Structure page.

Nothing reads a multi-select's value differently: the entry view, the
exports, and migrate()'s normalizing already keep values that aren't options.

Declared scope: 14_form-engine-edit, 15_template-builder, 26_home-data; site/
outside the tree. No declarations added.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given). Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r005_multiselect_other.py
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


# ---------------------------------------------------------------- 14: editor
edit(MODULES / "14_form-engine-edit.jsx", [
    (
        "// never silently dropped; they can be toggled off but not re-added.\n"
        "function MultiSelectEditor({ field, value, onChange }) {\n"
        "  const selected = Array.isArray(value)\n"
        "    ? value.filter(v => v != null && String(v).trim() !== \"\").map(v => String(v).trim())\n"
        "    : [];\n"
        "  const options = Array.isArray(field.options) ? field.options : [];\n"
        "  const stale = selected.filter(v => !options.includes(v));\n"
        "  const chips = [...options, ...stale];\n"
        "  const toggle = (opt) => {\n"
        "    if (selected.includes(opt)) onChange(selected.filter(v => v !== opt));\n"
        "    else onChange([...selected, opt]);\n"
        "  };\n"
        "  if (chips.length === 0) return <div className=\"field-hint\">No options defined for this field.</div>;\n"
        "  return (\n"
        "    <div className=\"multiselect-editor\">\n"
        "      {chips.map(opt => {\n"
        "        const on = selected.includes(opt);\n"
        "        const isStale = stale.includes(opt);\n"
        "        return (\n"
        "          <button\n"
        "            type=\"button\"\n"
        "            key={opt}\n"
        "            className={`multiselect-chip${on ? \" multiselect-chip-on\" : \"\"}${isStale ? \" multiselect-chip-stale\" : \"\"}`}\n"
        "            onClick={() => toggle(opt)}\n"
        "            title={isStale ? \"No longer in this field's option set — click to remove\" : undefined}\n"
        "          >\n"
        "            {opt}\n"
        "          </button>\n"
        "        );\n"
        "      })}\n"
        "    </div>\n"
        "  );\n"
        "}\n",
        "// never silently dropped; they can be toggled off but not re-added.\n"
        "// v1.7 r005: with otherTextField on, an Other box under the options takes\n"
        "// values of the user's own, each saved as one more string in the same list\n"
        "// (Drak's call, 2026-10-25), so nothing that reads the value changes. A\n"
        "// typed value matching an option, or a value already picked, ignoring\n"
        "// case, picks that instead. While the setting is on, a listed value that\n"
        "// isn't an option is the user's own: a chip like the options', removed\n"
        "// the same way. With it off, such a value shows dashed, as a pick whose\n"
        "// option was deleted does.\n"
        "function MultiSelectEditor({ field, value, onChange }) {\n"
        "  const selected = Array.isArray(value)\n"
        "    ? value.filter(v => v != null && String(v).trim() !== \"\").map(v => String(v).trim())\n"
        "    : [];\n"
        "  const options = Array.isArray(field.options) ? field.options : [];\n"
        "  const allowOwn = !!field.otherTextField;\n"
        "  const stale = selected.filter(v => !options.includes(v));\n"
        "  const chips = [...options, ...stale];\n"
        "  const [own, setOwn] = useState(\"\");\n"
        "  const toggle = (opt) => {\n"
        "    if (selected.includes(opt)) onChange(selected.filter(v => v !== opt));\n"
        "    else onChange([...selected, opt]);\n"
        "  };\n"
        "  const addOwn = () => {\n"
        "    const typed = own.trim();\n"
        "    setOwn(\"\");\n"
        "    if (!typed) return;\n"
        "    const same = (x) => x.toLowerCase() === typed.toLowerCase();\n"
        "    if (selected.some(same)) return;\n"
        "    onChange([...selected, options.find(same) || typed]);\n"
        "  };\n"
        "  if (chips.length === 0 && !allowOwn) return <div className=\"field-hint\">No options defined for this field.</div>;\n"
        "  return (\n"
        "    <div className=\"multiselect-editor\">\n"
        "      {chips.map(opt => {\n"
        "        const on = selected.includes(opt);\n"
        "        const offList = stale.includes(opt);\n"
        "        const isStale = offList && !allowOwn;\n"
        "        return (\n"
        "          <button\n"
        "            type=\"button\"\n"
        "            key={opt}\n"
        "            className={`multiselect-chip${on ? \" multiselect-chip-on\" : \"\"}${isStale ? \" multiselect-chip-stale\" : \"\"}`}\n"
        "            onClick={() => toggle(opt)}\n"
        "            title={isStale ? \"No longer in this field's option set; click to remove\" : (offList ? \"Your own value; click to remove\" : undefined)}\n"
        "          >\n"
        "            {opt}\n"
        "          </button>\n"
        "        );\n"
        "      })}\n"
        "      {allowOwn && (\n"
        "        <input\n"
        "          className=\"input\"\n"
        "          value={own}\n"
        "          onChange={e => setOwn(e.target.value)}\n"
        "          onKeyDown={e => { if (e.key === \"Enter\") { e.preventDefault(); addOwn(); } }}\n"
        "          onBlur={addOwn}\n"
        "          placeholder={`Other ${(field.label || \"value\").toLowerCase()}: type your own, Enter adds it`}\n"
        "          maxLength={80}\n"
        "        />\n"
        "      )}\n"
        "    </div>\n"
        "  );\n"
        "}\n",
    ),
])

# ---------------------------------------------------------------- 15: builder
edit(MODULES / "15_template-builder.jsx", [
    (
        "// field: required, secret, otherTextField (select), multi/multi-template/\n",
        "// field: required, secret, otherTextField (select, multiselect), multi/multi-template/\n",
    ),
    (
        "                {sf.type === \"select\" && (\n"
        "                  <label title=\"Adds an 'Other' option that lets users type a custom value\">\n"
        "                    <input type=\"checkbox\" checked={!!sf.otherTextField} onChange={e => onUpdate(parentPath, sf.id, { otherTextField: e.target.checked })} />\n",
        "                {(sf.type === \"select\" || sf.type === \"multiselect\") && (\n"
        "                  <label title={sf.type === \"select\" ? \"Adds an 'Other' option that lets users type a custom value\" : \"Adds an Other box where users type values of their own\"}>\n"
        "                    <input type=\"checkbox\" checked={!!sf.otherTextField} onChange={e => onUpdate(parentPath, sf.id, { otherTextField: e.target.checked })} />\n",
    ),
    (
        "              {sf.type === \"select\" && sf.otherTextField && (\n"
        "                <div className=\"tpl-cascade-hint\" style={{ marginLeft: 0 }}>\n"
        "                  \"Other\" will be auto-added to the dropdown at runtime.\n"
        "                </div>\n"
        "              )}\n",
        "              {sf.type === \"select\" && sf.otherTextField && (\n"
        "                <div className=\"tpl-cascade-hint\" style={{ marginLeft: 0 }}>\n"
        "                  \"Other\" will be auto-added to the dropdown at runtime.\n"
        "                </div>\n"
        "              )}\n"
        "              {sf.type === \"multiselect\" && sf.otherTextField && (\n"
        "                <div className=\"tpl-cascade-hint\" style={{ marginLeft: 0 }}>\n"
        "                  An Other box goes under the options; each value typed there is saved with the picked ones.\n"
        "                </div>\n"
        "              )}\n",
    ),
    (
        "            {field.type === \"select\" && (\n"
        "              <label title=\"Adds an 'Other' option that lets users type a custom value\">\n"
        "                <input type=\"checkbox\" checked={!!field.otherTextField} onChange={e => updateField(field.id, { otherTextField: e.target.checked })} />\n",
        "            {(field.type === \"select\" || field.type === \"multiselect\") && (\n"
        "              <label title={field.type === \"select\" ? \"Adds an 'Other' option that lets users type a custom value\" : \"Adds an Other box where users type values of their own\"}>\n"
        "                <input type=\"checkbox\" checked={!!field.otherTextField} onChange={e => updateField(field.id, { otherTextField: e.target.checked })} />\n",
    ),
    (
        "          {field.type === \"select\" && field.otherTextField && (\n"
        "            <div className=\"tpl-cascade-hint\" style={{ marginLeft: 0 }}>\n"
        "              \"Other\" will be auto-added to the dropdown at runtime.\n"
        "            </div>\n"
        "          )}\n",
        "          {field.type === \"select\" && field.otherTextField && (\n"
        "            <div className=\"tpl-cascade-hint\" style={{ marginLeft: 0 }}>\n"
        "              \"Other\" will be auto-added to the dropdown at runtime.\n"
        "            </div>\n"
        "          )}\n"
        "          {field.type === \"multiselect\" && field.otherTextField && (\n"
        "            <div className=\"tpl-cascade-hint\" style={{ marginLeft: 0 }}>\n"
        "              An Other box goes under the options; each value typed there is saved with the picked ones.\n"
        "            </div>\n"
        "          )}\n",
    ),
])

# ---------------------------------------------------------------- 26: help
edit(MODULES / "26_home-data.jsx", [
    (
        "- **Other-text reveal on select.** A select field can be configured so picking \"Other\" reveals a free-text input for the actual value. Useful for fields where you want canonical options plus an escape hatch.\n",
        "- **Other-text reveal on select.** A select field can be configured so picking \"Other\" reveals a free-text input for the actual value. Useful for fields where you want canonical options plus an escape hatch. A multi-select can carry the same setting: an Other box under its options takes values of your own, and each one is saved beside the options picked.\n",
    ),
    (
        "| \\`select\\` | string (one of the field's \\`options\\`) |\n"
        "| \\`multiselect\\` | array of strings (a subset of the field's \\`options\\`) |\n",
        "| \\`select\\` | string (one of the field's \\`options\\`); with Allow custom \"Other\" text, \\`{ value, customText }\\`, where \\`customText\\` holds what was typed when \\`value\\` is \"Other\" |\n"
        "| \\`multiselect\\` | array of strings: the field's \\`options\\` picked, plus any values typed under Other when the field allows them |\n",
    ),
])

# ---------------------------------------------------------------- site
edit(SITE, [
    (
        "A dropdown can offer an Other option that opens a free-text box when none of the canned answers fit.",
        "A dropdown can offer an Other option that opens a free-text box when none of the canned answers fit, and a multi-select an Other box for answers of your own.",
    ),
    (
        "but the field can hold any number of them at once: a creature with several Habitats, a character with multiple Roles. Multi-selects always render full-width.</p></li>",
        "but the field can hold any number of them at once: a creature with several Habitats, a character with multiple Roles. Multi-selects always render full-width. With the Other setting on, a multi-select also takes answers you type, each kept beside the options picked.</p></li>",
    ),
    (
        "Canonical options for the common cases, a way out for the one you didn't foresee.</p></li>",
        "Canonical options for the common cases, a way out for the one you didn't foresee. A Multi-select can carry it too, as a box under its options: each answer you type there joins the ones you picked.</p></li>",
    ),
    (
        "<td style=\"padding:.35em .8em;border-bottom:1px solid var(--border)\">string (one of the field's <code>options</code>)</td></tr>",
        "<td style=\"padding:.35em .8em;border-bottom:1px solid var(--border)\">string (one of the field's <code>options</code>); with the Other setting on, <code>{ value, customText }</code>, where <code>customText</code> holds what was typed when <code>value</code> is \"Other\"</td></tr>",
    ),
    (
        "<td style=\"padding:.35em .8em;border-bottom:1px solid var(--border)\">array of strings (subset of <code>options</code>)</td></tr>",
        "<td style=\"padding:.35em .8em;border-bottom:1px solid var(--border)\">array of strings: picks from <code>options</code>, plus any answers typed under Other when the field allows them</td></tr>",
    ),
])

print("v1.7 r005 applied: 14, 15, 26, and site/helloworld.html")
