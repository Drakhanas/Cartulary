r"""
v1.7 r055: Chronometric fits its frame, the Sweep's fifth cut.

docs/sweep-spec.md, section 3, after the Sweep's tooling commit (2e6f88d),
which gave tools/chrono-parity the narrower recording this cut is checked
with. Section 9 leaves it no open detail. Claude's plan, said to Drak, who
asked for the staged file:

1. The chart takes its width from .chrono-svg-wrap, the frame it's drawn in,
   where it took it from .chrono-view, whose width counts the view's padding,
   18 pixels a side (shell.html), so the chart was drawn 36 pixels wider than
   its frame, which hid its 24-pixel right margin and its last 12 pixels, and
   cut a year label centered near its end. Default: the SVG and PNG exports
   follow the chart's width, as they did, so they come out 36 pixels
   narrower than r054's, still whole.
2. A drag's position is written to dragStateRef where the press, the move,
   and the release are handled, where an effect wrote it after each render,
   so a release right after the last move commits that move and not the one
   before it.

- 19_chronometric: TimelineView's width measure and its comment, the ref
  moved from .chrono-view to .chrono-svg-wrap; the drag's ref written in
  handleEventMouseDown and in the drag commit effect's move and release, the
  effect that copied dragState into it gone, and the drag comment.

Declared scope: 19_chronometric. No declaration added or removed; no header
added.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given), and nothing is written unless every anchor holds.
Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r055_chrono_fits_frame.py
"""
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())
MODULES = ROOT / "cartulary-src" / "modules"

PLAN = []


def B(s):
    """A block written with its opening newline, which isn't part of it."""
    return s[1:] if s.startswith("\n") else s


def edit(path, steps):
    PLAN.append((path, steps))


# ------------------------------------------------------------ 19_chronometric
edit(MODULES / "19_chronometric.jsx", [
    # the width, from the frame
    (B('''
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1000);
'''), B('''
  // The chart's width is its frame's, .chrono-svg-wrap's, which the ref is on
  // since v1.7 r055: .chrono-view's counts its padding, 18 pixels a side, and
  // drew the chart 36 pixels wider than the frame, which hid its right margin.
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1000);
''')),
    ('''    <div className="chrono-view" ref={containerRef}>\n      <div className="chrono-controls">''',
     '''    <div className="chrono-view">\n      <div className="chrono-controls">'''),
    ('''      <div className="chrono-svg-wrap">\n        <svg\n          ref={svgRef}''',
     '''      <div className="chrono-svg-wrap" ref={containerRef}>\n        <svg\n          ref={svgRef}'''),
    # the drag's ref, written where the gesture is handled
    (B('''
  // Mouseup commits the change via onUpdateEntryDate, OR if the user never
  // moved, treats it as a click and selects the event.
  const [dragState, setDragState] = useState(null);
  const dragStateRef = useRef(null);
  useEffect(() => { dragStateRef.current = dragState; }, [dragState]);
'''), B('''
  // Mouseup commits the change via onUpdateEntryDate, OR if the user never
  // moved, treats it as a click and selects the event. The handlers read the
  // drag from dragStateRef, which they write as they set dragState (v1.7
  // r055): an effect that copied it after the render left a release that came
  // before the last move's render to commit the move before it.
  const [dragState, setDragState] = useState(null);
  const dragStateRef = useRef(null);
''')),
    (B('''
    mouseEvent.stopPropagation();  // suppress pan
    mouseEvent.preventDefault();
    setDragState({
      eventKey: eventKey(ev),
      edge,
      startX: mouseEvent.clientX,
      startEvent: ev,
      deltaYears: 0,
      moved: false,
    });
  };
'''), B('''
    mouseEvent.stopPropagation();  // suppress pan
    mouseEvent.preventDefault();
    const next = {
      eventKey: eventKey(ev),
      edge,
      startX: mouseEvent.clientX,
      startEvent: ev,
      deltaYears: 0,
      moved: false,
    };
    dragStateRef.current = next;
    setDragState(next);
  };
''')),
    (B('''
      const moved = cur.moved || Math.abs(dx) > 3;
      setDragState({ ...cur, deltaYears, moved });
    };
    const onUp = () => {
      const cur = dragStateRef.current;
      setDragState(null);
'''), B('''
      const moved = cur.moved || Math.abs(dx) > 3;
      const next = { ...cur, deltaYears, moved };
      dragStateRef.current = next;
      setDragState(next);
    };
    const onUp = () => {
      const cur = dragStateRef.current;
      dragStateRef.current = null;
      setDragState(null);
''')),
])


def main():
    staged = []
    for path, steps in PLAN:
        text = path.read_text(encoding="utf-8")
        for step in steps:
            old, new = step[0], step[1]
            count = step[2] if len(step) > 2 else 1
            n = text.count(old)
            assert n == count, f"{path.name}: anchor occurs {n} times, not {count}:\n{old[:300]}"
            text = text.replace(old, new)
        if chr(0xFEFF) in text:
            raise SystemExit(f"{path.name}: a byte-order mark would be written")
        staged.append((path, text))
    for path, text in staged:
        path.write_text(text, encoding="utf-8")
    print(f"r055 applied to {len(staged)} files")


if __name__ == "__main__":
    main()
