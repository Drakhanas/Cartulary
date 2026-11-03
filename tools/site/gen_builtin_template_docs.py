r"""
The built-in templates, documented in full on the JSON Structure page.

Reads BUILTIN_TEMPLATES out of cartulary-src/modules/01_builtin-templates.jsx
(through node; the array is authored as plain literals), renders one
<details> block per template with the authored definition as valid JSON, and
keeps the region between two HTML markers inside <section id="js-builtins">
on site/helloworld.html. The region is generated, never hand-edited: when a
template moves, the seed is the edit and this script is the follow-through.

Three verifications ride every run:
  1. Reference audit: every refTemplate / refTemplates name resolves to a
     built-in template or a registered source; every showWhen.fieldLabel and
     dependsOnLabel resolves to a field on its own template. A miss fails.
  2. Round-trip: each rendered code block, unescaped, parses as JSON and
     deep-equals the seed object it came from. The page can't drift from the
     seed inside one run.
  3. check mode byte-compares the page's region against a fresh render and
     confirms the 'js-builtins' route in ANCHOR2ROUTE.

Run from anywhere inside the repository:
    python3 tools/site/gen_builtin_template_docs.py            # check (default, writes nothing)
    python3 tools/site/gen_builtin_template_docs.py --emit     # region to stdout
    python3 tools/site/gen_builtin_template_docs.py --splice   # write the region (and the
                                                               # section + route, first time)
    ... --page PATH   # act on a copy instead of site/helloworld.html

Exit 0 clean; 1 on drift, a failed audit, or a missing section; 2 on usage
or extraction errors.
"""
import argparse
import html
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents
            if (p / 'site').is_dir() and (p / 'cartulary-src').is_dir())
SEED = ROOT / 'cartulary-src' / 'modules' / '01_builtin-templates.jsx'
PAGE = ROOT / 'site' / 'helloworld.html'
MODULES = ROOT / 'cartulary-src' / 'modules'

MARK_START = ('<!-- BUILTIN-TEMPLATES:GENERATED start. Written by '
              'tools/site/gen_builtin_template_docs.py from '
              'cartulary-src/modules/01_builtin-templates.jsx. '
              'Edit the seed and regenerate; nothing between the markers is hand-edited. -->')
MARK_END = '<!-- BUILTIN-TEMPLATES:GENERATED end -->'

SECTION_OPEN = '''  <section id="js-builtins">
    <h3>The built-in templates, in full</h3>
    <p>These are the twenty templates a new world seeds, as the authored definitions the save file carries: every field, every option list, every reference target by name, every cascade and every visibility condition. Field <code>id</code>s aren't shown because they're generated per world (see <a href="#js-fields">Field definitions</a>); the ids, <code>kind</code>, and <code>origin</code> are added when the world seeds them. <code>halfWidth</code> appears on many fields; it's the legacy flag from before v1.3 and is ignored on load. This block is generated straight from the application's seed and checked against it, so what you read here is what ships.</p>
'''
SECTION_CLOSE = '  </section>\n\n'
ROUTE_ANCHOR = "'js-fields':'json-structure',"
ROUTE_ENTRY = "'js-builtins':'json-structure',"
SPLICE_BEFORE = '<section id="js-entries">'

EXTRACT_JS = r'''
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');
const start = src.indexOf('const BUILTIN_TEMPLATES = [');
if (start < 0) { console.error('anchor not found'); process.exit(2); }
let i = src.indexOf('[', start), depth = 0, end = -1;
let inStr = null, inLine = false, inBlock = false;
for (let j = i; j < src.length; j++) {
  const c = src[j], p = src[j-1], n = src[j+1];
  if (inLine) { if (c === '\n') inLine = false; continue; }
  if (inBlock) { if (p === '*' && c === '/') inBlock = false; continue; }
  if (inStr) { if (c === '\\') { j++; continue; } if (c === inStr) inStr = null; continue; }
  if (c === '/' && n === '/') { inLine = true; j++; continue; }
  if (c === '/' && n === '*') { inBlock = true; j++; continue; }
  if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
  if (c === '[') depth++;
  else if (c === ']') { depth--; if (depth === 0) { end = j; break; } }
}
if (end < 0) { console.error('array close not found'); process.exit(2); }
process.stdout.write(JSON.stringify(eval(src.slice(i, end + 1))));
'''

WIDTH = 110


def extract_seed():
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as f:
        f.write(EXTRACT_JS)
        helper = f.name
    try:
        out = subprocess.run(['node', helper, str(SEED)],
                             capture_output=True, text=True)
    finally:
        Path(helper).unlink(missing_ok=True)
    if out.returncode != 0:
        sys.exit(f'seed extraction failed: {out.stderr.strip()}')
    return json.loads(out.stdout)


def registered_source_names():
    """Names a refTemplate may use besides template names: the *_REF_LABEL
    constants, the Fabula sources, and the legacy body alias."""
    names = {'Celestial Body'}
    for path in MODULES.rglob('*.jsx'):
        text = path.read_text(encoding='utf-8')
        names.update(re.findall(r'const\s+\w+_REF_LABEL\s*=\s*"([^"]+)"', text))
        names.update(re.findall(r'name:\s*"([^"]+\(Fabula\))"', text))
    return names


def audit(tpls):
    valid = {t['name'] for t in tpls} | registered_source_names()
    bad = []
    for t in tpls:
        labels = {f['label'].lower() for f in t['fields']}
        for f in t['fields']:
            targets = ([f['refTemplate']] if 'refTemplate' in f else []) + f.get('refTemplates', [])
            for n in targets:
                if n not in valid:
                    bad.append(f"{t['name']} / {f['label']}: unresolved target \"{n}\"")
            if 'showWhen' in f and f['showWhen'].get('fieldLabel', '').lower() not in labels:
                bad.append(f"{t['name']} / {f['label']}: showWhen parent \"{f['showWhen'].get('fieldLabel')}\" not on template")
            if 'dependsOnLabel' in f and f['dependsOnLabel'].lower() not in labels:
                bad.append(f"{t['name']} / {f['label']}: dependsOn parent \"{f['dependsOnLabel']}\" not on template")
    return bad


def wrap_items(items, first_indent, cont_indent, opener, closer):
    """Greedy-fill a JSON array of strings across lines of at most WIDTH."""
    parts = [json.dumps(x, ensure_ascii=False) for x in items]
    lines, cur = [], first_indent + opener
    for k, part in enumerate(parts):
        piece = part + (', ' if k < len(parts) - 1 else '')
        if len(cur) + len(piece) > WIDTH and cur.strip() != opener.strip():
            lines.append(cur.rstrip())
            cur = cont_indent + piece
        else:
            cur += piece
    lines.append(cur.rstrip() + closer)
    return '\n'.join(lines)


def render_field(f, indent='    '):
    inner = indent + '  '
    head, tail = [], []
    for key, val in f.items():
        if key == 'options':
            tail.append(wrap_items(val, inner, inner + '  ', '"options": [', ']'))
        elif key == 'optionsByParent':
            rows = [inner + '"optionsByParent": {']
            parents = list(val.items())
            for k, (parent, opts) in enumerate(parents):
                comma = ',' if k < len(parents) - 1 else ''
                rows.append(wrap_items(opts, inner + '  ',
                                       inner + '    ',
                                       json.dumps(parent, ensure_ascii=False) + ': [',
                                       ']' + comma))
            rows.append(inner + '}')
            tail.append('\n'.join(rows))
        elif key == 'showWhen':
            head.append('"showWhen": { "fieldLabel": %s, "values": %s }' % (
                json.dumps(val['fieldLabel'], ensure_ascii=False),
                json.dumps(val['values'], ensure_ascii=False)))
        else:
            head.append('%s: %s' % (json.dumps(key, ensure_ascii=False),
                                    json.dumps(val, ensure_ascii=False)))
    # greedy-fill the inline keys
    lines, cur = [], indent + '{ '
    for k, piece in enumerate(head):
        sep = ',' if (k < len(head) - 1 or tail) else ''
        chunk = piece + sep + (' ' if sep else '')
        if len(cur) + len(chunk) > WIDTH and cur.strip() != '{':
            lines.append(cur.rstrip())
            cur = inner + chunk
        else:
            cur += chunk
    if tail:
        lines.append(cur.rstrip())
        for k, block in enumerate(tail):
            lines.append(block + (',' if k < len(tail) - 1 else ''))
        lines.append(indent + '}')
    else:
        lines.append(cur.rstrip() + ' }')
    return '\n'.join(lines)


def render_template_json(t):
    keys = [k for k in t if k != 'fields']
    pad = max(len(k) for k in keys) + 3
    out = ['{']
    for k in keys:
        lead = ('"%s":' % k).ljust(pad + 1)
        out.append('  %s %s,' % (lead.rstrip().ljust(pad), json.dumps(t[k], ensure_ascii=False)))
    out.append('  "fields": [')
    blocks = [render_field(f) for f in t['fields']]
    out.append(',\n'.join(blocks))
    out.append('  ]')
    out.append('}')
    return '\n'.join(out)


def render_region(tpls):
    blocks = [MARK_START]
    for t in tpls:
        code = html.escape(render_template_json(t), quote=False)
        blocks.append(
            '    <details>\n'
            '      <summary style="cursor:pointer;padding:.3em 0">'
            '<span style="color:%s">%s</span> <strong>%s</strong> '
            '<span style="opacity:.65;font-size:.9em">(%d fields)</span></summary>\n'
            '      <pre><code>%s</code></pre>\n'
            '    </details>'
            % (html.escape(t['color']), html.escape(t['icon']),
               html.escape(t['name']), len(t['fields']), code)
        )
    blocks.append('    ' + MARK_END)
    return '\n'.join(blocks)


def round_trip(tpls, region):
    """Each code block, unescaped, must parse back to its seed object."""
    codes = re.findall(r'<pre><code>(.*?)</code></pre>', region, re.S)
    if len(codes) != len(tpls):
        return ['code block count %d != template count %d' % (len(codes), len(tpls))]
    bad = []
    for t, c in zip(tpls, codes):
        try:
            back = json.loads(html.unescape(c))
        except json.JSONDecodeError as e:
            bad.append('%s: rendered block is not valid JSON (%s)' % (t['name'], e))
            continue
        if back != t:
            bad.append('%s: rendered block does not round-trip to the seed' % t['name'])
    return bad


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--emit', action='store_true', help='print the region to stdout')
    ap.add_argument('--splice', action='store_true', help='write the region into the page')
    ap.add_argument('--page', type=Path, default=PAGE, help='page to check or splice (default site/helloworld.html)')
    args = ap.parse_args()

    tpls = extract_seed()
    problems = audit(tpls)
    if problems:
        print('AUDIT FAILED:')
        for p in problems:
            print('  ' + p)
        sys.exit(1)

    region = render_region(tpls)
    rt = round_trip(tpls, region)
    if rt:
        print('ROUND-TRIP FAILED:')
        for p in rt:
            print('  ' + p)
        sys.exit(1)

    nfields = sum(len(t['fields']) for t in tpls)
    stamp = '%d templates, %d fields, %d option lists, region %d bytes' % (
        len(tpls), nfields,
        sum(1 for t in tpls for f in t['fields'] if 'options' in f),
        len(region))

    if args.emit:
        print(region)
        return

    page_text = args.page.read_text(encoding='utf-8')
    s, e = page_text.find(MARK_START), page_text.find(MARK_END)

    if args.splice:
        if s >= 0 and e > s:
            new = page_text[:s] + region + page_text[e + len(MARK_END):]
        else:
            if SPLICE_BEFORE not in page_text:
                sys.exit('splice anchor %r not found' % SPLICE_BEFORE)
            block = SECTION_OPEN + region + '\n' + SECTION_CLOSE
            new = page_text.replace(SPLICE_BEFORE, block + '  ' + SPLICE_BEFORE, 1)
        if ROUTE_ENTRY not in new:
            if new.count(ROUTE_ANCHOR) != 1:
                sys.exit('route anchor %r not found exactly once' % ROUTE_ANCHOR)
            new = new.replace(ROUTE_ANCHOR, ROUTE_ANCHOR + ROUTE_ENTRY, 1)
        args.page.write_text(new, encoding='utf-8')
        print('SPLICED into %s: %s' % (args.page, stamp))
        return

    # check (default)
    ok = True
    if s < 0 or e < s:
        print('CHECK: section/markers not present in %s' % args.page)
        ok = False
    elif page_text[s:e + len(MARK_END)] != region:
        print('CHECK: region DRIFTED from the seed render')
        ok = False
    if ROUTE_ENTRY not in page_text:
        print('CHECK: ANCHOR2ROUTE is missing %s' % ROUTE_ENTRY)
        ok = False
    print(('CHECK GREEN: ' if ok else 'CHECK RED: ') + stamp)
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
