#!/usr/bin/env python3
"""
r048: carve `cartographia` out of `16_trunk` (pure split, no gather owed).

The arc at r047: `16_trunk` 1-265 SettingsView (spine-owned residue), 266-1293
concordance, 1294-6526 cartographia; three contiguous runs tiling the arc, each
leading with its boundary blank and ending on code. Cartographia is the tail,
so it leaves first (back to front) and concordance keeps its line numbers for
r049.

Members located BY NAME in the r047 tree: 95 declarations, one contiguous run,
MAP_PALETTE (16_trunk:1306) through CartographiaIndexView (6413, closes at
6526). Preceding declaration GraphView (concordance) closes at 1293.

Cartographia carves as a DIRECTORY on the glossopoeia/ephemeris pattern, split
at its five section headers, each of which already sits on a rule-1 seam
(blank before it, code before the blank):

  17_cartographia/00_model.jsx     1294-2389  1,096 lines  37 decls  MAP_PALETTE .. MapStampGlyph
  17_cartographia/01_renderer.jsx  2390-2769    380 lines  15 decls  mapNum .. useImageNaturalSize
  17_cartographia/02_tools.jsx     2770-4890  2,121 lines  28 decls  MAP_TOOLS .. MapEditorOverlay
  17_cartographia/03_view.jsx      4891-6178  1,288 lines  12 decls  useMapImageUrl .. MapEditor
  17_cartographia/04_index.jsx     6179-6526    348 lines   3 decls  MapStampImportButton .. CartographiaIndexView

Seams read before slicing (16_trunk, r047 numbering):
  1293 `}`      last line of GraphView            -> stays in 16_trunk (its new last line)
  1294 blank    leads 00_model                    (rule 1)
  1295 `// ─── Map drawing model (v1.6 pillar 3) ───`   header travels (rule 3)
  2389 `}`  / 2390 blank / 2391 `// ─── Map drawing renderer (v1.6 pillar 3) ───`
  2769 `}`  / 2770 blank / 2771 `// ─── Map drawing tools (v1.6 pillar 3) ───`
  4890 `}`  / 4891 blank / 4892 `// ─── Map view ───`
  6178 `}`  / 6179 blank / 6180 `// ─── Cartographia ───`
  6526 `}`      last line of CartographiaIndexView -> last line of 04_index

Result:
  16_trunk.jsx          lines    1-1293  (1,293)  SettingsView, concordance (spans unchanged)
  17_cartographia/      lines 1294-6526  (5,233)  new, five parts
  everything downstream reflows +1:
    17_chronometric -> 18_chronometric    23_kalendarium -> 24_kalendarium
    18_linea        -> 19_linea           24_home-data   -> 25_home-data
    19_stemma       -> 20_stemma          25_trunk       -> 26_trunk
    20_trunk        -> 21_trunk           26_modals      -> 27_modals
    21_glossopoeia/ -> 22_glossopoeia/    27_trunk       -> 28_trunk
    22_ephemeris/   -> 23_ephemeris/

New files carry no trailing newline, matching 16_trunk and every file the
session-18 carves wrote. The assembler rstrips per file, so the body is
unaffected either way; the count is a facts.json figure, so it is kept
deliberate: 30 -> 35.

Decided at the fork (Drak, 2026-10-22): every recommendation (two carves,
two bumps, back to front; a directory of five at the headers; the downstream
prefixes reflowed; 16_trunk stays a trunk arc; one turnover after both).

Pure carve: `verify` must come back GREEN against the r047 anchor with
byte-identity exact; then `freeze` (no name) rewrites the anchor's layout for
the new file set; then `verify` again. No browser pass (no byte changed).
"""
import re
from pathlib import Path

MODULES = Path(__file__).resolve().parent.parent.parent / 'cartulary-src' / 'modules'

TRUNK_LINES = 6526
PARTS = [  # (file, first line, last line) in 16_trunk's r047 numbering, 1-based inclusive
    ('00_model.jsx', 1294, 2389),
    ('01_renderer.jsx', 2390, 2769),
    ('02_tools.jsx', 2770, 4890),
    ('03_view.jsx', 4891, 6178),
    ('04_index.jsx', 6179, 6526),
]
HEADERS = {
    '00_model.jsx': '// ─── Map drawing model (v1.6 pillar 3)',
    '01_renderer.jsx': '// ─── Map drawing renderer (v1.6 pillar 3)',
    '02_tools.jsx': '// ─── Map drawing tools (v1.6 pillar 3)',
    '03_view.jsx': '// ─── Map view',
    '04_index.jsx': '// ─── Cartographia',
}
MEMBERS = {
    '00_model.jsx': ['MAP_PALETTE', 'MAP_BACKGROUND_PRESETS', 'MAP_STROKE_WIDTH_RANGE', 'MAP_TEXT_SIZES', 'MAP_SHAPE_TYPES', 'MAP_DRAWING_DEFAULT_SIZE', 'makeDefaultMapLayer', 'MAP_RASTER_LAYER', 'mapRasterLayerCheck', 'mapDecodeImage', 'makeDefaultDrawing', 'ensureMapShape', 'ensureDrawingShape', 'ensureMapData', 'makeDefaultMapData', 'ensureMapStamps', 'MAP_STAMP_ALLOWLIST', 'mapStampSlug', 'MAP_RASTER_TIP', 'MAP_STAMP_ID_MAX', 'mapRasterTipCheck', 'mapPrepareRasterTip', 'mapPixelsToDataUrl', 'mapReadAbr', 'mapReadGbr', 'mapReadGih', 'mapReadBplist', 'mapReadProcreateBrushes', 'buildMapStampPngZip', 'mapStampViewBox', 'sanitizeMapStampBody', 'parseMapStampPack', 'buildMapStampPackFile', 'mapStampUsage', 'mapStampGroups', 'mapReadStampFiles', 'MapStampGlyph'],
    '01_renderer.jsx': ['mapNum', 'mapEscapeXml', 'mapDrawingHasContent', 'mapSmoothPath', 'mapGrainFilterNode', 'MAP_BUILTIN_STAMPS', 'mapStampDef', 'mapTextWidthEstimate', 'mapTextPivot', 'mapTextArcPath', 'mapShapeNode', 'buildMapDrawingTree', 'mapTreeToString', 'mapTreeToReact', 'useImageNaturalSize'],
    '02_tools.jsx': ['MAP_TOOLS', 'MAP_STRIP_GROUPS', 'MAP_STRIP_DEFAULT', 'mapStripLayout', 'mapDescribeShape', 'MAP_CANVAS_PRESETS', 'MAP_FREEHAND', 'MAP_PAINT', 'mapBuiltinTips', 'mapTipDef', 'mapTipSprite', 'mapSimplifyPoints', 'MAP_FILL', 'mapMatchMask', 'mapDilateMask', 'mapFloodMask', 'mapTraceMask', 'mapSvgToCanvas', 'translateMapShape', 'mapShapeFrame', 'useMapDrawing', 'mapTrimHistory', 'useMapHistory', 'MapToolStrip', 'MapStripArrangeModal', 'MapStampPicker', 'MapLayerPanel', 'MapEditorOverlay'],
    '03_view.jsx': ['useMapImageUrl', 'useMapLayerImages', 'mapFontFaceCss', 'buildMapDownloadSvg', 'rasterizeMapSvg', 'MAP_CAMERA', 'useMapCamera', 'MapZoomControls', 'useResizeHandler', 'MapPin', 'MapView', 'MapEditor'],
    '04_index.jsx': ['MapStampImportButton', 'MapStampsPanel', 'CartographiaIndexView'],
}
HEAD_MEMBERS = ['SettingsView', 'VAGUE_EDGE_LABELS', 'GraphView']

RENAMES = [    # reverse order so no rename lands on a name that still exists
    ('27_trunk.jsx', '28_trunk.jsx'),
    ('26_modals.jsx', '27_modals.jsx'),
    ('25_trunk.jsx', '26_trunk.jsx'),
    ('24_home-data.jsx', '25_home-data.jsx'),
    ('23_kalendarium.jsx', '24_kalendarium.jsx'),
    ('22_ephemeris', '23_ephemeris'),
    ('21_glossopoeia', '22_glossopoeia'),
    ('20_trunk.jsx', '21_trunk.jsx'),
    ('19_stemma.jsx', '20_stemma.jsx'),
    ('18_linea.jsx', '19_linea.jsx'),
    ('17_chronometric.jsx', '18_chronometric.jsx'),
]

DECL = re.compile(r'^(?:const|let|var|function|class|async function)\s+([A-Za-z0-9_$]+)')


def check(cond, msg):
    if not cond:
        raise SystemExit('ABORT: ' + msg)


def main():
    trunk = MODULES / '16_trunk.jsx'
    text = trunk.read_text(encoding='utf-8')
    check(not text.endswith('\n'), '16_trunk unexpectedly carries a trailing newline')
    lines = text.split('\n')
    check(len(lines) == TRUNK_LINES, f'16_trunk has {len(lines)} lines, expected {TRUNK_LINES}')

    first = PARTS[0][1]
    head = lines[:first - 1]
    check(len(head) == 1293, f'head is {len(head)} lines, expected 1293')
    check(head[0] == '', 'head does not lead with a blank')
    check(head[-1] == '}', f'head does not end on a closing brace: {head[-1]!r}')
    check([DECL.match(l).group(1) for l in head if DECL.match(l)] == HEAD_MEMBERS, 'head members differ')

    parts = {}
    cursor = first
    for name, a, b in PARTS:
        check(a == cursor, f'{name}: starts at {a}, expected {cursor}')
        seg = lines[a - 1:b]
        check(seg[0] == '', f'{name} does not lead with a blank (line {a}: {seg[0]!r})')
        check(seg[1].startswith(HEADERS[name]), f'{name} header missing at line {a + 1}: {seg[1]!r}')
        check(seg[-1] == '}', f'{name} does not end on a closing brace (line {b}: {seg[-1]!r})')
        check(lines[a - 2] == '}', f'{name}: the line before its leading blank is not code: {lines[a - 2]!r}')
        members = [DECL.match(l).group(1) for l in seg if DECL.match(l)]
        check(members == MEMBERS[name], f'{name} members differ:\n  got {members}')
        parts[name] = seg
        cursor = b + 1
    check(cursor == TRUNK_LINES + 1, f'parts cover through {cursor - 1}, arc is {TRUNK_LINES}')
    check(sum(len(s) for s in parts.values()) == 5233, 'parts do not total 5,233 lines')
    # nothing map-named stays behind
    leaked = [DECL.match(l).group(1) for l in head if DECL.match(l) and re.match(r'(?i)map|cartograph', DECL.match(l).group(1))]
    check(not leaked, f'map-named declarations outside the span: {leaked}')

    # every source present; every destination that is not itself a source absent
    sources = {old for old, _ in RENAMES}
    for old, new in RENAMES:
        check((MODULES / old).exists(), f'missing {old}')
        if new not in sources:
            check(not (MODULES / new).exists(), f'{new} already exists')
    check(not (MODULES / '17_cartographia').exists(), '17_cartographia/ already exists')

    # --- mutate ---
    for old, new in RENAMES:
        (MODULES / old).rename(MODULES / new)
    d = MODULES / '17_cartographia'
    d.mkdir()
    for name, _, _ in PARTS:
        (d / name).write_text('\n'.join(parts[name]), encoding='utf-8')
    trunk.write_text('\n'.join(head), encoding='utf-8')

    files = sorted(MODULES.rglob('[0-9][0-9]_*.jsx'), key=lambda f: f.relative_to(MODULES).as_posix())
    total = sum(len(p.read_text(encoding='utf-8').splitlines()) for p in files)
    nonl = sum(1 for p in files if not p.read_text(encoding='utf-8').endswith('\n'))
    print(f'files {len(files)}  lines {total}  no-trailing-newline {nonl}')
    for p in files:
        print(f'  {len(p.read_text(encoding="utf-8").splitlines()):6d}  {p.relative_to(MODULES).as_posix()}')
    print('trunk arcs left:', [p.name for p in files if p.name.endswith('_trunk.jsx')])


if __name__ == '__main__':
    main()
