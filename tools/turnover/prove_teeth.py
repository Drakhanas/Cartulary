#!/usr/bin/env python3
"""
prove_teeth.py -- mutation probes for check_docs.py.

Run after ANY change to check_docs.py or facts.json. Each probe injects one
defect into a throwaway copy of the doc set and asserts the gate goes RED on
the right check. A gate nobody has tried to fool is a gate nobody knows works;
this project shipped two such gates (byte_ok at r023, raw_ok at r025) and both
had been silently scoring wrong for twenty-plus revisions.

Usage: python3 prove_teeth.py --docs DIR --src DIR
"""
import json, shutil, subprocess, tempfile
from pathlib import Path
import argparse
_ap = argparse.ArgumentParser()
_ap.add_argument('--docs', required=True, type=Path)
_ap.add_argument('--src', required=True, type=Path)
_a = _ap.parse_args()
SRC = _a.src; DOCS = _a.docs
HERE = Path(__file__).parent
def run(docs, facts):
    r=subprocess.run(['python3',str(HERE / 'check_docs.py'),'--docs',str(docs),
                      '--src',str(SRC),'--facts',str(facts)],capture_output=True,text=True)
    fails=[l.strip() for l in r.stdout.split('\n') if ' FAIL' in l]
    return r.returncode, fails[0].split()[0] if fails else '-'
probes=[
 ("em dash inserted",        lambda d: (d/'handoff.md').write_text((d/'handoff.md').read_text()+"\nA \u2014 B\n")),
 ("stale NN_ filename",      lambda d: (d/'handoff.md').write_text((d/'handoff.md').read_text()+"\nSee `17_home-data.jsx`.\n")),
 ("wrong line count",        lambda d: (d/'handoff.md').write_text((d/'handoff.md').read_text()+"\n`05_field-system` (999) here.\n")),
 ("malformed table row",     lambda d: (d/'handoff.md').write_text((d/'handoff.md').read_text()+"\n| a | b |\n|---|---|\n| a | b | c |\n")),
 ("banned phrase",           lambda d: (d/'handoff.md').write_text((d/'handoff.md').read_text()+"\nA robust and seamless approach.\n")),
 ("retired anchor as live",  lambda d: (d/'handoff.md').write_text((d/'handoff.md').read_text()+"\nUse `reference-r018-body.jsx`.\n")),
]
# The required-string probe reads its target FROM facts.json instead of naming one.
# The original hardcoded "r025, header integrity", which stopped proving anything the
# moment that string left required_strings, and read as a gate blind spot when it was
# really a stale probe. Deriving the target is a coupling fix, not a weakening: the
# probe still deletes a string the gate is supposed to require, in any session.
def _drop_required(d):
    f = json.loads((d/'facts.json').read_text())
    doc, needles = next(iter(f['required_strings'].items()))
    tgt = needles[0]
    # ALL occurrences, not the first: the check is presence-based, so removing one
    # of several leaves the string present and the probe proves nothing.
    (d/doc).write_text((d/doc).read_text().replace(tgt, ''))
probes.append(("required string removed", _drop_required))

# The published-figure probe likewise derives its target. The original replaced the
# literal "**34 files, 39,335 lines", which was the r025 figure; at r030 that string no
# longer existed in any document, the replace was a no-op, and the probe read MISS on a
# gate that had caught exactly this drift an hour earlier. A probe whose target is a
# literal from one session proves that session. This one takes the first `published`
# entry, finds its pattern's first live match in the doc set, and bumps the number.
import re as _re
def _drift_published(d):
    f = json.loads((d/'facts.json').read_text())
    key, spec = next(iter(f['published'].items()))
    pat = _re.compile(spec['pattern'], _re.M | _re.I)
    for name in ['handoff.md', 'cartulary-spine-manifest.md', 'changelog.md',
                 'roadmap.md', 'cartulary-doctrine.md', 'journal.txt']:
        text = (d/name).read_text()
        m = pat.search(text)
        if m and m.group(1).replace(',', '').isdigit():
            n = int(m.group(1).replace(',', ''))
            s, e = m.span(1)
            (d/name).write_text(text[:s] + str(n + 1) + text[e:])
            return
    raise SystemExit(f'published probe: pattern for {key!r} matched no numeric figure')
probes.append(("published figure drift", _drift_published))
# A probe that misses must fail the run, not only print MISS: CI runs this script after the
# doc gate, and until 2026-10-23 it always exited 0, so a green CI said nothing about the
# probes. The fact-check of the rewritten handoff found it by raising the baseline in a
# scratch copy and watching the run print MISS and exit 0.
misses=[]
print(f'{"probe":26} {"exit":>4}  first failing check')
for name, mutate in probes:
    with tempfile.TemporaryDirectory() as td:
        d=Path(td)/'docs'; shutil.copytree(DOCS,d)
        mutate(d)
        code,chk=run(d, d/'facts.json')
        mark='OK ' if code!=0 else 'MISS'
        if code==0: misses.append(name)
        print(f'  {mark} {name:24} {code:>4}  {chk}')
# span + assertion probes mutate facts, not docs
with tempfile.TemporaryDirectory() as td:
    d=Path(td)/'docs'; shutil.copytree(DOCS,d)
    # Derived, not hard-coded: the original set 16_trunk's second span to end at 3606,
    # which at r030 was past the end of a 2,051-line file and fired the out-of-range
    # branch rather than the rule-1 branch the label names. Ending the first span of
    # the first arc on its own leading blank is a rule-1 violation in any session.
    f=json.loads((d/'facts.json').read_text())
    arc=next(iter(f['spans'])); f['spans'][arc][0][1]=f['spans'][arc][0][0]
    (d/'facts.json').write_text(json.dumps(f,indent=2))
    code,chk=run(d,d/'facts.json'); print(f'  {"OK " if code else "MISS"} {"span ends on blank":24} {code:>4}  {chk}')
    if not code: misses.append('span ends on blank')
with tempfile.TemporaryDirectory() as td:
    d=Path(td)/'docs'; shutil.copytree(DOCS,d)
    # Derived: the original set line 2056, an r025 figure that at r030 was out of range
    # for the file it named. Off by one lands on a neighbouring line that does not
    # carry the asserted string, in any session.
    f=json.loads((d/'facts.json').read_text()); f['assertions'][0]['line']+=1
    (d/'facts.json').write_text(json.dumps(f,indent=2))
    code,chk=run(d,d/'facts.json'); print(f'  {"OK " if code else "MISS"} {"tree assertion wrong":24} {code:>4}  {chk}')
    if not code: misses.append('tree assertion wrong')

print()
print("If any probe reads MISS, the gate has a blind spot. Fix the check, not the probe.")
if misses:
    print(f"{len(misses)} probe(s) missed: {', '.join(misses)}")
    raise SystemExit(1)
