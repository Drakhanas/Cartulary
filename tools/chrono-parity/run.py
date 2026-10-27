#!/usr/bin/env python3
"""Chronometric parity, end to end: build the last passed build from its tag,
build the candidate, record both through the same steps, and compare.

    python3 tools/chrono-parity/run.py v1.7_r017
        the working tree against the build tagged v1.7_r017
    python3 tools/chrono-parity/run.py v1.7_r017 --candidate HEAD
        a commit (any git ref) against it instead
    python3 tools/chrono-parity/run.py v1.7_r017 --out DIR
        somewhere other than inlining/out/chrono-parity

The baseline is built in a temporary git worktree with that ref's own
build_inline.py, so it is the build Drak passed, byte for byte. The six
libraries the page loads from the CDN are unpacked from deps/. Recording needs
Node and Playwright with its Chromium (see README.md).

Exit 0 when Chronometric draws every step of every run the same, 1 when any
step differs, 2 when the run itself breaks, 3 when a step couldn't be taken.
"""
import argparse
import re
import shutil
import subprocess
import sys
import tarfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
LIBS = ['react', 'react-dom', 'babel-standalone', 'marked', 'd3', 'jszip']


def unpack_libs(dest):
    """Each library's tarball from deps/, unpacked to dest/<name>-<version>/."""
    dest.mkdir(parents=True, exist_ok=True)
    for name in LIBS:
        found = [p for p in (ROOT / 'deps').glob('*.tgz') if re.fullmatch(rf'{re.escape(name)}-\d[\w.]*\.tgz', p.name)]
        if len(found) != 1:
            raise SystemExit(f'deps/ should hold one {name} tarball; it holds {len(found)}')
        out = dest / found[0].name[:-len('.tgz')]
        if out.exists():
            continue
        with tarfile.open(found[0]) as tar:
            for member in tar.getmembers():
                if not member.isfile():
                    continue
                parts = Path(member.name).parts[1:]  # drop npm's "package/"
                if not parts or '..' in parts:
                    continue
                target = out.joinpath(*parts)
                target.parent.mkdir(parents=True, exist_ok=True)
                with tar.extractfile(member) as src, open(target, 'wb') as dst:
                    shutil.copyfileobj(src, dst)


def build(ref, dest, work):
    """The working HTML for a git ref, or for the working tree when ref is None."""
    if ref is None:
        subprocess.run([sys.executable, str(ROOT / 'inlining' / 'build_inline.py'), 'working'],
                       cwd=ROOT, check=True, stdout=subprocess.DEVNULL)
        shutil.copyfile(ROOT / 'inlining' / 'out' / 'cartulary-working.html', dest)
        return
    tree = work / ('tree-' + re.sub(r'[^\w.-]', '_', ref))
    if tree.exists():
        subprocess.run(['git', 'worktree', 'remove', '--force', str(tree)], cwd=ROOT, check=False)
    subprocess.run(['git', 'worktree', 'add', '--detach', str(tree), ref], cwd=ROOT, check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        subprocess.run([sys.executable, str(tree / 'inlining' / 'build_inline.py'), 'working'],
                       cwd=tree, check=True, stdout=subprocess.DEVNULL)
        shutil.copyfile(tree / 'inlining' / 'out' / 'cartulary-working.html', dest)
    finally:
        subprocess.run(['git', 'worktree', 'remove', '--force', str(tree)], cwd=ROOT, check=False)


def main():
    ap = argparse.ArgumentParser(description='Chronometric parity against the last passed build.')
    ap.add_argument('baseline', help='the git ref of the last passed build, e.g. v1.7_r017')
    ap.add_argument('--candidate', default=None, help='a git ref to check instead of the working tree')
    ap.add_argument('--out', default=str(ROOT / 'inlining' / 'out' / 'chrono-parity'))
    ap.add_argument('--aside', default=None, help="what compare sets aside, e.g. eras (see parity.js)")
    args = ap.parse_args()

    out = Path(args.out).resolve()
    out.mkdir(parents=True, exist_ok=True)
    for stale in ('baseline', 'candidate'):
        shutil.rmtree(out / stale, ignore_errors=True)
    libs = out / 'libs'
    unpack_libs(libs)
    base_html, cand_html = out / 'baseline.html', out / 'candidate.html'
    build(args.baseline, base_html, out)
    build(args.candidate, cand_html, out)

    parity = str(HERE / 'parity.js')
    steps = [
        ['node', parity, 'record', str(base_html), str(out / 'baseline'), '--libs', str(libs)],
        ['node', parity, 'record', str(cand_html), str(out / 'candidate'), '--libs', str(libs),
         '--fixtures', str(out / 'baseline' / 'fixtures')],
    ]
    for cmd in steps:
        code = subprocess.run(cmd).returncode
        if code != 0:
            return code
    compare = ['node', parity, 'compare', str(out / 'baseline'), str(out / 'candidate')]
    if args.aside:
        compare += ['--aside', args.aside]
    return subprocess.run(compare).returncode


if __name__ == '__main__':
    sys.exit(main())
