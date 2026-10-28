#!/usr/bin/env python3
"""Map renderer parity (v1.7 r032): the baseline's map model and renderer
against the candidate's over a generated set of drawings, through
renderer.js. Unpacks Babel from deps/ the way run.py does, then runs:

    python3 tools/stemma-parity/renderer.py <baseline ref> [<candidate ref>]

With no candidate the working tree is the candidate. The exit code is
renderer.js's: 0 when every drawing renders the same and the arrow checks
hold, 1 when any differ, 2 when the run breaks.
"""
import subprocess
import sys
from pathlib import Path

from run import ROOT, unpack_libs

HERE = Path(__file__).resolve().parent


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    libs = ROOT / 'inlining' / 'out' / 'stemma-parity' / 'libs'
    unpack_libs(libs)
    cmd = ['node', str(HERE / 'renderer.js'), argv[0]]
    cmd += [argv[1]] if len(argv) > 1 else ['--working']
    cmd += ['--libs', str(libs)]
    return subprocess.call(cmd, cwd=ROOT)


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
