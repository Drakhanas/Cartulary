#!/usr/bin/env python3
"""
check_docs.py -- mechanical gate for a Cartulary turnover doc set.

Rebuilt at session 17 from the skill spec, facts.json, and prove_teeth.py, the
only three artefacts of the original that survived. Behaviour is pinned by the
ten probes in prove_teeth.py: if a probe reads MISS, this file is wrong.

The premise, from the skill: everything checkable gets checked by a script, not
by attention. Session 16 shipped a turnover and spent four rounds correcting it,
and by round three most defects were in prose written during a correction round.
The artifact held every time. The documents did not.

Usage:
  check_docs.py --docs DIR --src DIR --facts FILE
  check_docs.py --docs DIR --src DIR --write-facts FILE
  check_docs.py --docs DIR --src DIR --baseline FILE
"""
import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

DOC_SET = [
    'handoff.md',
    'changelog.md',
    'roadmap.md',
    'cartulary-doctrine.md',
    'cartulary-spine-manifest.md',
    'journal.txt',
]

EM_FORMS = ['\u2014', '&#8212;', '&mdash;', '&#x2014;']

# Reflexive-use list from Drak's standing preferences. Matched case-insensitively
# on word boundaries and always scored against a per-file BASELINE, because these
# documents legitimately carry inherited instances from before the rule and a
# turnover is not a licence to rewrite history.
BANNED = [
    'robust', 'comprehensive', 'seamless', 'crucial', 'pivotal', 'meaningful',
    'profound', 'deeply', 'truly', 'load-bearing', 'load bearing',
    'doing a lot of work', 'doing heavy lifting', 'more than just',
    'tapestry', 'landscape', 'realm', 'ecosystem', 'journey', 'symphony',
    'delve', 'underscore', 'testament to', 'navigate', 'unpack', 'illuminate',
    'grapple with', 'that said', "it's worth noting", 'in many ways',
    'to some extent', 'broadly speaking',
]

STALE = re.compile(r'\[stale:')
ANCHOR_REF = re.compile(r'reference-r(\d{3})-body\.jsx')
MODULE_REF = re.compile(r'(?<![\w/])(\d{2})_([a-z0-9][a-z0-9-]*)'
                        r'(?:/(\d{2})_([a-z0-9][a-z0-9-]*))?(?:\.jsx)?(?![\w-])')
SIZED_REF = re.compile(r'`(\d{2}_[a-z0-9/_-]+?)(?:\.jsx)?`\s*\((\d[\d,]*)\)')


# ---------------------------------------------------------------- source facts

def tree_files(src):
    m = src / 'modules'
    return sorted(m.rglob('[0-9][0-9]_*.jsx'), key=lambda f: f.relative_to(m).as_posix())


def derive(src):
    m = src / 'modules'
    ps = tree_files(src)
    texts = {p.relative_to(m).as_posix(): p.read_text(encoding='utf-8') for p in ps}
    total = sum(len(t.splitlines()) for t in texts.values())
    body = '\n'.join(t.rstrip('\n') for t in texts.values())
    canonical = [l.strip() for l in body.split('\n') if l.strip()]
    decls = set(re.findall(
        r'^(?:const|let|var|function|class|async function)\s+([A-Za-z0-9_$]+)',
        body, re.M))
    anchors = sorted(f.name for f in src.glob('reference-*.jsx'))
    return {
        'module_file_count': len(ps),
        'total_lines': total,
        'raw_body_lines': len(body.split('\n')),
        'canonical_lines': len(canonical),
        'decl_count': len(decls),
        'no_trailing_newline': sum(1 for t in texts.values() if not t.endswith('\n')),
        'active_anchor': anchors[0] if len(anchors) == 1 else anchors,
    }


def prefix_map(src):
    """module base name -> set of legal NN prefixes, including nested parts."""
    m = src / 'modules'
    out = {}
    for p in tree_files(src):
        rel = p.relative_to(m)
        parts = rel.as_posix().replace('.jsx', '').split('/')
        for part in parts:
            nn, name = part.split('_', 1)
            out.setdefault(name, set()).add(nn)
        if len(parts) == 2:
            nn, name = parts[0].split('_', 1)
            out.setdefault(name, set()).add(nn)
    return out


def file_sizes(src):
    m = src / 'modules'
    out = {}
    for p in tree_files(src):
        rel = p.relative_to(m).as_posix().replace('.jsx', '')
        n = len(p.read_text(encoding='utf-8').splitlines())
        out[rel] = n
        out[rel.split('/')[-1]] = n
    return out


# ------------------------------------------------------------- live-line logic

def live_lines(name, text):
    """
    (lineno, line) for every line the checker treats as a LIVE claim.

    Superseded regions, per the skill: older changelog session blocks, roadmap
    content above the newest ADDED block, journal entries before the newest one
    (since 2026-10-23, when the journal began to accumulate), and any line
    carrying [stale:].
    """
    lines = text.split('\n')
    start = 0
    if name == 'changelog.md':
        hdrs = [i for i, l in enumerate(lines) if l.startswith('### Session')]
        if hdrs:
            start = hdrs[-1]
    elif name == 'roadmap.md':
        hdrs = [i for i, l in enumerate(lines) if l.startswith('=== ADDED')]
        if hdrs:
            start = hdrs[-1]
    elif name == 'journal.txt':
        hdrs = [i for i, l in enumerate(lines) if l.startswith('=== ')]
        if hdrs:
            start = hdrs[-1]
    return [(i + 1, l) for i, l in enumerate(lines)
            if i >= start and not STALE.search(l)]


# -------------------------------------------------------------------- checks

def check_em_dash(docs, base, out):
    bad = []
    for name in DOC_SET:
        t = (docs / name).read_text(encoding='utf-8')
        n = sum(t.count(f) for f in EM_FORMS)
        b = base.get('em_dash', {}).get(name)
        if b is None:
            bad.append(f'{name}: no baseline recorded')
        elif n > b:
            bad.append(f'{name}: {n} em dashes, baseline {b} (+{n - b} newly authored)')
    return bad


def check_banned(docs, base, out):
    bad = []
    for name in DOC_SET:
        t = (docs / name).read_text(encoding='utf-8').lower()
        b = base.get('banned', {}).get(name, {})
        for w in BANNED:
            n = len(re.findall(r'(?<![\w-])' + re.escape(w) + r'(?![\w-])', t))
            prev = b.get(w, 0)
            if n > prev:
                bad.append(f'{name}: "{w}" x{n}, baseline {prev}')
    return bad


def check_stale_filename(docs, pmap, out):
    bad = []
    for name in DOC_SET:
        for ln, line in live_lines(name, (docs / name).read_text(encoding='utf-8')):
            for m in MODULE_REF.finditer(line):
                nn, base = m.group(1), m.group(2)
                if base not in pmap:
                    continue
                if nn not in pmap[base]:
                    bad.append(f'{name}:{ln} `{m.group(0)}` -> {base} lives at '
                               f'{sorted(pmap[base])}')
                if m.group(3):
                    nn2, b2 = m.group(3), m.group(4)
                    if b2 in pmap and nn2 not in pmap[b2]:
                        bad.append(f'{name}:{ln} `{m.group(0)}` -> {b2} lives at '
                                   f'{sorted(pmap[b2])}')
    return bad


def check_line_counts(docs, sizes, out):
    bad = []
    for name in DOC_SET:
        for ln, line in live_lines(name, (docs / name).read_text(encoding='utf-8')):
            for m in SIZED_REF.finditer(line):
                key = m.group(1)
                if key not in sizes:
                    continue
                claimed = int(m.group(2).replace(',', ''))
                if claimed != sizes[key]:
                    bad.append(f'{name}:{ln} `{key}` ({claimed}) but tree has {sizes[key]}')
    return bad


def check_tables(docs, out):
    bad = []
    for name in DOC_SET:
        lines = (docs / name).read_text(encoding='utf-8').split('\n')
        i = 0
        while i < len(lines):
            if lines[i].strip().startswith('|') and i + 1 < len(lines) \
                    and re.match(r'^\s*\|[\s:|-]+\|\s*$', lines[i + 1]):
                width = lines[i].strip().strip('|').count('|') + 1
                j = i
                while j < len(lines) and lines[j].strip().startswith('|'):
                    if j != i + 1:
                        w = lines[j].strip().strip('|').count('|') + 1
                        if w != width:
                            bad.append(f'{name}:{j + 1} table row has {w} cells, '
                                       f'header has {width}')
                    j += 1
                i = j
            else:
                i += 1
    return bad


def check_published(docs, facts, out):
    bad = []
    blob = {n: (docs / n).read_text(encoding='utf-8') for n in DOC_SET}
    for key, spec in facts.get('published', {}).items():
        want = spec['value']
        want = want if isinstance(want, list) else [want]
        want = {str(w).replace(',', '') for w in want}
        pat = re.compile(spec['pattern'], re.M | re.I)
        seen = 0
        for name, text in blob.items():
            for ln, line in live_lines(name, text):
                for m in pat.finditer(line):
                    seen += 1
                    got = m.group(1).replace(',', '')
                    if got.lower() not in {w.lower() for w in want}:
                        bad.append(f'{name}:{ln} {key} reads {m.group(1)!r}, '
                                   f'facts say {sorted(want)}')
        if seen == 0:
            bad.append(f'{key}: pattern matched nothing in the live doc set')
    return bad


# A retired anchor named as HISTORY is correct prose: the anchor-history
# paragraph, the rotation table, and prerequisite 3's account of the stale
# project script all have to name them. The check fires only when a retired
# anchor appears on a line carrying no history or staleness signal, which is
# what "named as live" means. The first edition of this check had no such
# heuristic and reported 22 false positives across five documents, every one of
# them a correct sentence.
HISTORY_SIGNAL = re.compile(
    r'retired|anchored|anchor rotated|rotation|history|stale|superseded|'
    r'\u2192|->|was the|formerly|no longer', re.I)


def check_anchor(docs, active, out):
    bad = []
    seen_active = False
    for name in DOC_SET:
        text = (docs / name).read_text(encoding='utf-8')
        if active in text:
            seen_active = True
        for ln, line in live_lines(name, text):
            for m in ANCHOR_REF.finditer(line):
                if m.group(0) != active and not HISTORY_SIGNAL.search(line):
                    bad.append(f'{name}:{ln} names retired anchor {m.group(0)} '
                               f'with no history marker; active is {active}')
    if not seen_active:
        bad.append(f'active anchor {active} is named nowhere in the doc set')
    return bad


def check_required(docs, facts, out):
    bad = []
    for name, needles in facts.get('required_strings', {}).items():
        t = (docs / name).read_text(encoding='utf-8')
        for s in needles:
            if s not in t:
                bad.append(f'{name}: missing required string {s!r}')
    return bad


def check_spans(src, facts, out):
    bad = []
    m = src / 'modules'
    for rel, spans in facts.get('spans', {}).items():
        p = m / rel
        if not p.exists():
            bad.append(f'{rel}: not in the tree')
            continue
        L = p.read_text(encoding='utf-8').splitlines()
        n = len(L)
        cur = 1
        for a, b, label in spans:
            if a != cur:
                bad.append(f'{rel} {label}: starts at {a}, expected {cur} '
                           f'({"gap" if a > cur else "overlap"})')
            if a < 1 or b > n or b < a:
                bad.append(f'{rel} {label}: span {a}-{b} outside 1-{n}')
                cur = b + 1
                continue
            if L[a - 1].strip() != '':
                bad.append(f'{rel} {label}: span starts at {a}, not a blank '
                           f'(boundary rule 1)')
            if L[b - 1].strip() == '':
                bad.append(f'{rel} {label}: span ends at {b} on a blank '
                           f'(boundary rule 1)')
            cur = b + 1
        if cur != n + 1:
            bad.append(f'{rel}: spans cover 1-{cur - 1}, file is {n} lines')
    return bad


def check_assertions(src, facts, out):
    bad = []
    m = src / 'modules'
    for a in facts.get('assertions', []):
        p = m / a['file']
        if not p.exists():
            bad.append(f"{a['file']}: not in the tree")
            continue
        L = p.read_text(encoding='utf-8').splitlines()
        ln = a['line']
        if not (1 <= ln <= len(L)):
            bad.append(f"{a['file']}:{ln} out of range (file is {len(L)})")
            continue
        if a['contains'] not in L[ln - 1]:
            bad.append(f"{a['file']}:{ln} does not contain {a['contains']!r} "
                       f"(found {L[ln - 1][:60]!r})")
    return bad


# ----------------------------------------------------------------------- modes

def write_facts(docs, src, path):
    prior = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
    out = {'derived': derive(src)}
    for k in ('published', 'assertions', 'spans', 'required_strings'):
        if k in prior:
            out[k] = prior[k]
    path.write_text(json.dumps(out, indent=2) + '\n', encoding='utf-8')
    print(f'facts written: {path}')
    for k, v in out['derived'].items():
        print(f'  {k:22} {v}')


def write_baseline(docs, path):
    em, ban = {}, {}
    for name in DOC_SET:
        t = (docs / name).read_text(encoding='utf-8')
        em[name] = sum(t.count(f) for f in EM_FORMS)
        low = t.lower()
        ban[name] = {w: len(re.findall(r'(?<![\w-])' + re.escape(w) + r'(?![\w-])', low))
                     for w in BANNED}
        ban[name] = {w: c for w, c in ban[name].items() if c}
    path.write_text(json.dumps({'em_dash': em, 'banned': ban}, indent=2) + '\n',
                    encoding='utf-8')
    print(f'baseline written: {path}')
    for name in DOC_SET:
        print(f'  {name:32} em-dash {em[name]:5}  banned {sum(ban[name].values())}')


def gate(docs, src, facts_path):
    facts = json.loads(facts_path.read_text(encoding='utf-8'))
    base_path = docs / '.turnover-baseline.json'
    base = json.loads(base_path.read_text(encoding='utf-8')) if base_path.exists() else {}

    live = derive(src)
    active = facts['derived'].get('active_anchor')
    if isinstance(active, list):
        active = active[0] if active else ''

    checks = [
        ('derived_vs_tree', [f'{k}: facts say {v}, tree says {live[k]}'
                             for k, v in facts['derived'].items() if live.get(k) != v]),
        ('em_dash', check_em_dash(docs, base, None)),
        ('banned_phrase', check_banned(docs, base, None)),
        ('stale_filename', check_stale_filename(docs, prefix_map(src), None)),
        ('line_count', check_line_counts(docs, file_sizes(src), None)),
        ('table_shape', check_tables(docs, None)),
        ('published_figure', check_published(docs, facts, None)),
        ('retired_anchor', check_anchor(docs, active, None)),
        ('required_string', check_required(docs, facts, None)),
        ('span_tiling', check_spans(src, facts, None)),
        ('tree_assertion', check_assertions(src, facts, None)),
    ]

    ok = True
    for name, bad in checks:
        print(f'  {name:18} {"PASS" if not bad else "FAIL"}')
        for b in bad[:12]:
            print(f'      {b}')
        if len(bad) > 12:
            print(f'      ... and {len(bad) - 12} more')
        ok = ok and not bad

    print()
    print('DOCS', 'GREEN' if ok else 'RED')
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--docs', required=True, type=Path)
    ap.add_argument('--src', required=True, type=Path)
    ap.add_argument('--facts', type=Path)
    ap.add_argument('--write-facts', type=Path)
    ap.add_argument('--baseline', type=Path)
    a = ap.parse_args()

    if a.write_facts:
        write_facts(a.docs, a.src, a.write_facts)
        return 0
    if a.baseline:
        write_baseline(a.docs, a.baseline)
        return 0
    if a.facts:
        return gate(a.docs, a.src, a.facts)
    ap.error('one of --facts, --write-facts, --baseline is required')


if __name__ == '__main__':
    sys.exit(main())
