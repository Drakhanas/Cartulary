"""v1.7 r021: Chronometric's era names clear of the year labels, each cut to its band.

Drak's call at r020's plan (2026-10-26) put Fabula's era names on a line of
their own above the year labels from the start, and Chronometric's there in
a cut of their own right after r020; his call at r021's plan (2026-10-26),
recorded in docs/fabula-spec.md section 8 before this cut (e331732): an
era's name too long for its band is cut to fit it, with an ellipsis, and
shows in full on hover, in both timelines, through one function in the
Chronometric math. Claude's defaults for the rest are in the same section.

- 19_chronometric, the Chronometric math: chronoEraLabel, an era's name as
  its band draws it, whole when it fits between 6 pixels in and 4 before
  the band's end, else cut with an ellipsis, else nothing.
- 19_chronometric, the view: an era's name on the line Fabula's sit on, 24
  pixels above the axis line where it sat 6 above, its band's tint reaching
  36 above where it reached 18, and its name from chronoEraLabel, measured
  in the chart's italic type, with the full name on hover when it's cut.
- 28_fabula: the timeline's era names from chronoEraLabel the same way.
- tools/chrono-parity: compare takes --aside eras, which sets each era
  band, its tint and its name, aside in the drawing and the export, and
  run.py passes --aside through.

Declared scope: 19_chronometric, 28_fabula. Declarations added:
chronoEraLabel.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given). Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r021_era_names.py
"""
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())
MODULES = ROOT / "cartulary-src" / "modules"
PARITY = ROOT / "tools" / "chrono-parity"


def edit(path, pairs):
    text = path.read_text(encoding="utf-8")
    for pair in pairs:
        old, new = pair[0], pair[1]
        count = pair[2] if len(pair) > 2 else 1
        n = text.count(old)
        assert n == count, f"{path.name}: anchor occurs {n} times, not {count}:\n{old[:200]}"
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")


MEASURE_OLD = r"""  const measureText = useMemo(() => {
    const ctx = document.createElement("canvas").getContext("2d");
    const widths = new Map();
    return (text, size) => {
      const key = size + "|" + text;
      if (!widths.has(key)) {
        if (ctx) ctx.font = `${size}px "DM Sans", sans-serif`;
        widths.set(key, ctx ? ctx.measureText(text).width : text.length * size * 0.55);
      }
      return widths.get(key);
    };
  }, [fontsLoaded]);"""
MEASURE_NEW = r"""  const measureText = useMemo(() => {
    const ctx = document.createElement("canvas").getContext("2d");
    const widths = new Map();
    return (text, size, italic) => {
      const key = (italic ? "i" : "") + size + "|" + text;
      if (!widths.has(key)) {
        if (ctx) ctx.font = `${italic ? "italic " : ""}${size}px "DM Sans", sans-serif`;
        widths.set(key, ctx ? ctx.measureText(text).width : text.length * size * 0.55);
      }
      return widths.get(key);
    };
  }, [fontsLoaded]);"""

# ------------------------------------------------- 19: the math and the view
edit(MODULES / "19_chronometric.jsx", [
    (r"""// what the lanes draw, on Drak's calls (2026-10-26): rows by what each event
// draws, long lane titles wrapped with their lanes grown to fit, and year
// ticks on whole years.""",
     r"""// what the lanes draw, on Drak's calls (2026-10-26): rows by what each event
// draws, long lane titles wrapped with their lanes grown to fit, and year
// ticks on whole years. v1.7's r021, on his call at its plan, cut an era's
// name to fit its band."""),
    (r"""    bands.push({ era, start, end });
  }
  return bands;
};
""",
     r"""    bands.push({ era, start, end });
  }
  return bands;
};

// An era's name as its band draws it (v1.7 r021): whole when it fits between
// 6 pixels in from the band's start and 4 before its end, else the longest
// start of it that fits there with an ellipsis, else nothing. width is the
// band's drawn width; widthOf measures a name in the chart's italic type.
const chronoEraLabel = (name, width, widthOf) => {
  const room = width - 10;
  const full = name || "";
  if (widthOf(full) <= room) return full;
  let cut = full;
  while (cut.length > 0 && widthOf(cut.replace(/\s+$/, "") + "…") > room) cut = cut.slice(0, -1);
  cut = cut.replace(/\s+$/, "");
  return cut ? cut + "…" : "";
};
"""),
    (r"""  // Text widths for the lanes' layout (v1.7 r019), measured on a canvas in
  // the fonts the chart draws in, and measured again once the page's fonts
  // finish loading, since a fallback face sets other widths.""",
     r"""  // Text widths for the lanes' layout (v1.7 r019), measured on a canvas in
  // the fonts the chart draws in, and measured again once the page's fonts
  // finish loading, since a fallback face sets other widths; since r021 in
  // italic too, for the era names."""),
    (MEASURE_OLD, MEASURE_NEW),
    (r"""          {/* Era bands */}
          {eraBands.map((b, i) => {""",
     r"""          {/* Era bands, their names on a line of their own above the year
              labels, each cut to fit its band (v1.7 r021) */}
          {eraBands.map((b, i) => {"""),
    (r"""                <rect x={x1} y={TOP_GUTTER - 18} width={x2 - x1} height={totalHeight - TOP_GUTTER + 18} fill={hues[i % hues.length]} />
                {(x2 - x1) > 50 && (
                  <text
                    x={x1 + 6} y={TOP_GUTTER - 6}
                    fill="var(--accent-dim)"
                    fontSize={10}
                    fontFamily="DM Sans, sans-serif"
                    fontStyle="italic"
                  >
                    {b.era.shortName || b.era.name}
                  </text>
                )}""",
     r"""                <rect x={x1} y={TOP_GUTTER - 36} width={x2 - x1} height={totalHeight - TOP_GUTTER + 36} fill={hues[i % hues.length]} />
                {(x2 - x1) > 50 && (() => {
                  const full = b.era.shortName || b.era.name || "";
                  const label = chronoEraLabel(full, x2 - x1, (s) => measureText(s, 10, true));
                  return label && (
                    <text
                      x={x1 + 6} y={TOP_GUTTER - 24}
                      fill="var(--accent-dim)"
                      fontSize={10}
                      fontFamily="DM Sans, sans-serif"
                      fontStyle="italic"
                    >
                      {label}
                      {label !== full && <title>{full}</title>}
                    </text>
                  );
                })()}"""),
])

# ------------------------------------------------- 28: the timeline's era names
edit(MODULES / "28_fabula.jsx", [
    (r"""  // Text widths, measured as Chronometric measures them: on a canvas in the
  // chart's fonts, and again once the page's fonts finish loading.""",
     r"""  // Text widths, measured as Chronometric measures them: on a canvas in the
  // chart's fonts, and again once the page's fonts finish loading, since
  // v1.7's r021 in italic too, for the era names."""),
    (MEASURE_OLD, MEASURE_NEW),
    (r"""              {/* Era bands, their names on a line of their own above the year labels */}""",
     r"""              {/* Era bands, their names on a line of their own above the year
                  labels, each cut to fit its band (v1.7 r021) */}"""),
    (r"""                    {(x2 - x1) > 50 && (
                      <text className="fabula-tl-era" x={x1 + 6} y={TOP_GUTTER - 24} fill="var(--accent-dim)" fontSize={10} fontFamily="DM Sans, sans-serif" fontStyle="italic">
                        {b.era.shortName || b.era.name}
                      </text>
                    )}""",
     r"""                    {(x2 - x1) > 50 && (() => {
                      const full = b.era.shortName || b.era.name || "";
                      const label = chronoEraLabel(full, x2 - x1, (s) => measureText(s, 10, true));
                      return label && (
                        <text className="fabula-tl-era" x={x1 + 6} y={TOP_GUTTER - 24} fill="var(--accent-dim)" fontSize={10} fontFamily="DM Sans, sans-serif" fontStyle="italic">
                          {label}
                          {label !== full && <title>{full}</title>}
                        </text>
                      );
                    })()}"""),
])

# ------------------------------------------------- tools/chrono-parity: --aside eras
edit(PARITY / "parity.js", [
    (r"""//   node parity.js compare <baseline outdir> <candidate outdir> [--only FIELD,...]
//
// record opens""",
     r"""//   node parity.js compare <baseline outdir> <candidate outdir> [--only FIELD,...] [--aside eras]
//
// record opens"""),
    (r"""// edits saved, when a cut changes the drawing on purpose and the edits mustn't).
// Exit codes:""",
     r"""// edits saved, when a cut changes the drawing on purpose and the edits mustn't);
// --aside eras sets each era band, its tint and its name, aside in the drawing
// and the export alike, for a cut that changes the era bands on purpose and
// nothing else (v1.7's r021).
// Exit codes:"""),
    (r"""function compare(dirA, dirB, only) {
  const load = (dir, f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, f))).toString('utf8'));""",
     r"""// An era band's markup, a <g> holding its tinted <rect> and, when the band
// draws one, its name's <text>: as the page renders it and as the export
// serializes it. --aside eras leaves a placeholder in each one's place, so a
// band drawn in one build and not the other still differs.
const ERA_BAND = /<g[^>]*><rect[^>]*\bfill="rgba\((?:200,169,110|160,110,200|110,158,200|200,110,110),\.06\)"[^>]*?(?:\/>|><\/rect>)(?:<text[^>]*>(?:(?!<\/text>)[\s\S])*<\/text>)?<\/g>/g;
const setAside = (r, aside) => {
  if (!aside || !aside.includes('eras')) return r;
  const out = { ...r };
  ['svg', 'exported'].forEach(k => { if (typeof out[k] === 'string') out[k] = out[k].replace(ERA_BAND, '<g data-aside="era band"></g>'); });
  return out;
};

function compare(dirA, dirB, only, aside) {
  const load = (dir, f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, f))).toString('utf8')).map(r => setAside(r, aside));"""),
    (r"""  const fields = only ? `, ${only.join(' and ')} only` : '';""",
     r"""  const fields = (only ? `, ${only.join(' and ')} only` : '') + (aside ? `, ${aside.join(' and ')} set aside` : '');"""),
    (r"""    process.exit(compare(pos[0], pos[1], opt('only') ? opt('only').split(',') : null));""",
     r"""    process.exit(compare(pos[0], pos[1], opt('only') ? opt('only').split(',') : null, opt('aside') ? opt('aside').split(',') : null));"""),
    (r"""      + '       node parity.js compare <baseline outdir> <candidate outdir> [--only FIELD,...]');""",
     r"""      + '       node parity.js compare <baseline outdir> <candidate outdir> [--only FIELD,...] [--aside eras]');"""),
])
edit(PARITY / "run.py", [
    (r"""    ap.add_argument('--out', default=str(ROOT / 'inlining' / 'out' / 'chrono-parity'))
    args = ap.parse_args()""",
     r"""    ap.add_argument('--out', default=str(ROOT / 'inlining' / 'out' / 'chrono-parity'))
    ap.add_argument('--aside', default=None, help="what compare sets aside, e.g. eras (see parity.js)")
    args = ap.parse_args()"""),
    (r"""    return subprocess.run(['node', parity, 'compare', str(out / 'baseline'), str(out / 'candidate')]).returncode""",
     r"""    compare = ['node', parity, 'compare', str(out / 'baseline'), str(out / 'candidate')]
    if args.aside:
        compare += ['--aside', args.aside]
    return subprocess.run(compare).returncode"""),
])
edit(PARITY / "README.md", [
    (r"""moved no event sideways, and every drag and panel step saved the same entries
as r018's did.""",
     r"""moved no event sideways, and every drag and panel step saved the same entries
as r018's did.

`parity.js compare --aside eras`, or `run.py <ref> --aside eras`, sets each era
band aside, its tint and its name, in the drawing and in the export, leaving a
placeholder in its place, and compares the rest. r021 moved Chronometric's era
names onto a line of their own above the year labels and cut each to its band,
so its drawing differs wherever an era is drawn; with the era bands set aside
it had to come out identical to r020's, and a copy of r021 with one year label
moved a pixel had to come out different, so the setting-aside is known to hide
nothing else."""),
])
print("v1.7 r021 applied: 19_chronometric, 28_fabula, tools/chrono-parity")
