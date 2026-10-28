#!/usr/bin/env node
// Map renderer parity (v1.7 r032). Loads the map model and the map renderer
// (18_cartographia/00_model.jsx and 01_renderer.jsx) from two trees, the
// baseline (a git ref) and the candidate (a git ref, or the working tree),
// transpiles each pair with the app's own Babel, and renders the same set
// of drawings through both, comparing the SVG text the export writes
// (mapTreeToString over buildMapDrawingTree). The set is generated from a
// fixed seed, so it is the same every run: every shape type with every
// option the model has (smooth and not, bent and rotated labels, labels in
// ink and stroked, built-in stamps, imported stamps of each kind, missing
// stamps with and without the editor's placeholder, regions with holes,
// hidden and locked layers, raster layers with and without an image, grain,
// an image canvas and an image-less one). Then it checks what the candidate
// is meant to add: a stroke with `arrow` set renders heads, one with none
// renders as before.
//
//   node tools/stemma-parity/renderer.js <baseline ref> [<candidate ref>|--working] --libs <dir>
//
// Exit 0 when every drawing renders the same and the arrow checks hold, 1
// when a drawing differs or a check fails, 2 when the run itself breaks.
// renderer.py wraps this: it unpacks Babel from deps/ and runs it.
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const libs = flag("--libs");
const positional = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--libs");
const baseRef = positional[0];
const candRef = args.includes("--working") ? null : positional[1] || null;
if (!baseRef || !libs) {
  console.error("usage: renderer.js <baseline ref> [<candidate ref>|--working] --libs <dir>");
  process.exit(2);
}
const ROOT = path.resolve(__dirname, "..", "..");
const FILES = ["cartulary-src/modules/18_cartographia/00_model.jsx", "cartulary-src/modules/18_cartographia/01_renderer.jsx"];

const babelDir = fs.readdirSync(libs).find(n => n.startsWith("babel-standalone"));
if (!babelDir) { console.error(`no babel-standalone under ${libs}`); process.exit(2); }
const Babel = require(path.join(libs, babelDir, "babel.min.js"));

function source(ref) {
  return FILES.map(f => (ref ? execFileSync("git", ["show", `${ref}:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }) : fs.readFileSync(path.join(ROOT, f), "utf8"))).join("\n");
}

// The two modules, evaluated in their own context with the few globals they
// reach for: React's hooks (the renderer's image hook is defined, never
// called), genId (a counter, the same sequence on both sides, for the layer
// a drawing with none is given), and the
// handful of names the model's later helpers mention at definition time.
function load(ref) {
  const src = source(ref);
  const js = Babel.transform(src, { presets: ["react"], sourceType: "script" }).code;
  const ctx = {
    React: { createElement: () => null },
    useState: () => [null, () => {}], useEffect: () => {}, useRef: () => ({ current: null }), useMemo: (f) => f(),
    genId: (() => { let n = 0; return () => `fixture-${(++n).toString(36).padStart(6, "0")}`; })(), // the same sequence on both sides
    console, Math, JSON, Number, String, Array, Object, Map, Set, Infinity, NaN, isFinite, parseFloat, parseInt,
    Uint8Array, Uint8ClampedArray, Float32Array, DataView, ArrayBuffer, TextDecoder, Promise, Error, RegExp, Date, encodeURIComponent, decodeURIComponent,
    document: undefined, window: undefined, Image: undefined,
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(js + "\n;this.__api = { ensureDrawingShape, buildMapDrawingTree, mapTreeToString, MAP_BUILTIN_STAMPS, MAP_PALETTE };", ctx, { filename: `${ref || "working"}.js` });
  return ctx.__api;
}

// A fixed-seed generator, so the set is the same for both sides and every run.
function rng(seed) {
  let a = seed >>> 0;
  return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const PALETTE = ["#2b2420", "#6b4e2e", "#e8dcc0", "#4f6b3a", "#5b7f99", "#8a8378", "#8c3b2e", "#f4efe4"];
const STAMPS = ["mountain", "tree", "settlement", "compass", "forest__pine", "ruins__tower", "nowhere__gone"];
const WORLD_STAMPS = [
  { id: "forest__pine", name: "Pine", viewBox: "0 0 64 64", body: '<path d="M32 4 L12 40 H52 Z" stroke-width="3"/>', packId: "forest", pack: "Forest" },
  { id: "ruins__tower", name: "Tower", kind: "alpha", width: 40, height: 64, image: "data:image/png;base64,iVBORw0KGgo=", packId: "ruins", pack: "Ruins", spacing: 20 },
  { id: "ruins__gate", name: "Gate", kind: "color", width: 64, height: 32, image: "data:image/png;base64,iVBORw0KGgo=", packId: "ruins", pack: "Ruins" },
];
function makeShape(r, i, k) {
  const pick = (list) => list[Math.floor(r() * list.length)];
  const num = (lo, hi, dp) => { const v = lo + r() * (hi - lo); const m = Math.pow(10, dp == null ? 2 : dp); return Math.round(v * m) / m; };
  const maybeHex = () => (r() < 0.15 ? null : pick(PALETTE));
  const pts = (n) => Array.from({ length: n }, () => [num(-50, 1700), num(-50, 1100)]);
  const type = pick(["rect", "ellipse", "polygon", "stroke", "stroke", "text", "stamp", "region"]);
  const base = { id: `shape-${k}-${i}`, type, fill: maybeHex(), stroke: maybeHex(), strokeWidth: pick([1, 2, 4, 4, 8, 16, 32, 64, 0.5, 100, NaN]) };
  switch (type) {
    case "rect": return { ...base, x: num(0, 1500), y: num(0, 900), w: num(1, 400), h: num(1, 300), smooth: r() < 0.5 };
    case "ellipse": return { ...base, x: num(0, 1500), y: num(0, 900), w: num(1, 400), h: num(1, 300) };
    case "polygon": return { ...base, points: pts(2 + Math.floor(r() * 7)), smooth: r() < 0.5 };
    // a map saved before r032 carries no `arrow`; "none" and a value the
    // model doesn't know must render as its absence does (the heads are
    // checked apart, below)
    case "stroke": return { ...base, points: pts(1 + Math.floor(r() * 12)), smooth: r() < 0.5, ...(r() < 0.3 ? { arrow: pick(["none", "bogus", 7]) } : {}) };
    case "region": return { ...base, rings: Array.from({ length: 1 + Math.floor(r() * 3) }, () => pts(2 + Math.floor(r() * 6))), smooth: r() < 0.5 };
    case "text": return { ...base, x: num(0, 1500), y: num(0, 900), text: pick(["Label", "The Western Reach", "Ys", "A & B < C", "", "Mountains of Mourning"]), fontSize: pick([24, 36, 56, 40]), rotation: pick([0, 0, 15, -30, 90, 200]), arc: pick([0, 0, 0.5, 20, -45, 180, -200, 90]) };
    case "stamp": return { ...base, x: num(0, 1500), y: num(0, 900), w: num(8, 200), h: num(8, 200), stampId: r() < 0.08 ? "" : pick(STAMPS), rotation: pick([0, 0, 45, -10, 120]) };
    default: return base;
  }
}
function makeDrawing(r, k) {
  const pick = (list) => list[Math.floor(r() * list.length)];
  const layers = [];
  const n = 1 + Math.floor(r() * 4);
  for (let l = 0; l < n; l++) {
    const raster = r() < 0.2;
    const base = { id: `layer-${k}-${l}`, name: pick(["Drawing", "Ink", "Paint", "", "Layer with a long name"]), visible: r() < 0.85, locked: r() < 0.2 };
    if (raster) layers.push({ ...base, kind: "raster", image: pick([null, "data:image/png;base64,iVBORw0KGgo=", "paint-1.png", "missing.png", "bad reference"]), width: pick([1600, 800, 0, NaN]), height: pick([1000, 500]) });
    else layers.push({ ...base, kind: "vector", shapes: Array.from({ length: Math.floor(r() * 12) }, (_, i) => makeShape(r, i, `${k}-${l}`)) });
  }
  if (r() < 0.1) layers.length = 0;
  return {
    width: pick([1600, 1200, 1000, 0, NaN]), height: pick([1000, 1600, 1200]),
    background: { fill: pick(["#f1e9d6", "#ffffff", "#e8dcc0", "not a color"]), grain: pick([0, 0.25, 0.45, 1, 2, -1]) },
    layers,
  };
}
function makeOpts(r, k) {
  const pick = (list) => list[Math.floor(r() * list.length)];
  const withImage = r() < 0.4;
  const layerImages = r() < 0.5 ? new Map([["paint-1.png", "blob:paint-1"]]) : { "paint-1.png": "blob:paint-1" };
  return {
    id: pick([`map-${k}`, "", "a map/with:odd chars", undefined]),
    className: pick([undefined, "map-canvas-svg"]),
    label: pick([undefined, "A map", "Map \"quoted\" & more"]),
    imageHref: withImage ? "data:image/png;base64,iVBORw0KGgo=" : undefined,
    imageWidth: withImage ? pick([1920, 800, 0]) : undefined,
    imageHeight: withImage ? pick([1080, 600]) : undefined,
    stamps: r() < 0.7 ? WORLD_STAMPS : [],
    placeholder: r() < 0.5,
    layerImages,
  };
}

let base, cand;
try {
  base = load(baseRef);
  cand = load(candRef);
} catch (err) {
  console.error(`could not load the modules: ${err && err.stack || err}`);
  process.exit(2);
}

const r = rng(20261028);
const N = 400;
let same = 0, differ = 0, shapes = 0;
const diffs = [];
for (let k = 0; k < N; k++) {
  const drawing = makeDrawing(r, k);
  const opts = makeOpts(r, k);
  shapes += drawing.layers.reduce((n, l) => n + (l.shapes ? l.shapes.length : 0), 0);
  let a, b;
  try {
    a = base.mapTreeToString(base.buildMapDrawingTree(JSON.parse(JSON.stringify(drawing)), { ...opts }));
    b = cand.mapTreeToString(cand.buildMapDrawingTree(JSON.parse(JSON.stringify(drawing)), { ...opts }));
  } catch (err) {
    console.error(`drawing ${k} threw: ${err && err.stack || err}`);
    process.exit(2);
  }
  if (a === b) same++;
  else {
    differ++;
    if (diffs.length < 5) {
      let i = 0;
      while (i < a.length && i < b.length && a[i] === b[i]) i++;
      diffs.push({ k, at: i, base: a.slice(Math.max(0, i - 80), i + 120), cand: b.slice(Math.max(0, i - 80), i + 120) });
    }
  }
}
console.log(`${N} drawings, ${shapes} shapes: ${same} render the same, ${differ} differ`);
diffs.forEach(d => {
  console.log(`--- drawing ${d.k}, first difference at ${d.at}`);
  console.log(`baseline:  ...${d.base}...`);
  console.log(`candidate: ...${d.cand}...`);
});

// What the candidate adds: a stroke with `arrow` renders heads (two more
// subpaths per head, each M L L), smooth or not; one without renders as the
// baseline does.
const arrowDrawing = (arrow, smooth) => ({
  width: 1600, height: 1000, background: { fill: "#f1e9d6", grain: 0 },
  layers: [{ id: "layer-a", name: "Drawing", kind: "vector", visible: true, locked: false, shapes: [
    { id: "shape-a", type: "stroke", points: [[100, 100], [300, 120], [500, 300]], fill: null, stroke: "#6b4e2e", strokeWidth: 4, smooth, arrow },
  ] }],
});
let checks = 0, failed = 0;
const check = (name, ok, detail) => { checks++; if (!ok) { failed++; console.log(`FAIL ${name}${detail ? `: ${detail}` : ""}`); } };
for (const smooth of [false, true]) {
  const none = cand.mapTreeToString(cand.buildMapDrawingTree(arrowDrawing("none", smooth), { id: "arrows" }));
  const noneBase = base.mapTreeToString(base.buildMapDrawingTree(arrowDrawing("none", smooth), { id: "arrows" }));
  check(`no arrow, smooth ${smooth}: as the baseline`, none === noneBase);
  const end = cand.mapTreeToString(cand.buildMapDrawingTree(arrowDrawing("end", smooth), { id: "arrows" }));
  const both = cand.mapTreeToString(cand.buildMapDrawingTree(arrowDrawing("both", smooth), { id: "arrows" }));
  const d = (svg) => { const m = svg.match(/data-shape="shape-a" d="([^"]*)"/); return m ? m[1] : null; };
  const heads = (p) => (p ? p.split(" M").slice(1).filter(part => (part.match(/L/g) || []).length === 2).length : -1);
  check(`arrow end, smooth ${smooth}: a path with one head`, d(end) !== null && heads(d(end)) === 1, d(end));
  check(`arrow both, smooth ${smooth}: a path with two heads`, d(both) !== null && heads(d(both)) === 2, d(both));
  check(`arrow end, smooth ${smooth}: the line before the head is the plain line`, d(end) !== null && (smooth ? d(end).startsWith(d(none) ? d(none) : "M100 100") : d(end).startsWith("M100 100 L300 120 L500 300")), d(end));
  check(`arrow end, smooth ${smooth}: the head's tip is the line's end`, d(end) !== null && / L500 300 L/.test(d(end)), d(end));
  check(`arrow both, smooth ${smooth}: the start head's tip is the first point`, d(both) !== null && / L100 100 L/.test(d(both)), d(both));
  const baseEnd = base.mapTreeToString(base.buildMapDrawingTree(arrowDrawing("end", smooth), { id: "arrows" }));
  check(`arrow end, smooth ${smooth}: the baseline drew no head`, heads(d(baseEnd)) <= 0);
}
// the normalizer: a stroke takes arrow, anything else reads as none, and no other type carries it
const norm = cand.ensureDrawingShape(arrowDrawing("bogus", false));
check("ensureMapShape: a bogus arrow reads as none", norm.layers[0].shapes[0].arrow === "none");
check("ensureMapShape: end stays end", cand.ensureDrawingShape(arrowDrawing("end", false)).layers[0].shapes[0].arrow === "end");
const poly = cand.ensureDrawingShape({ layers: [{ id: "l", kind: "vector", shapes: [{ id: "p", type: "polygon", points: [[0, 0], [10, 0], [0, 10]], arrow: "end" }] }] });
check("ensureMapShape: a polygon carries no arrow", !("arrow" in poly.layers[0].shapes[0]));
console.log(`arrow checks: ${checks - failed} of ${checks} hold`);
process.exit(differ === 0 && failed === 0 ? 0 : 1);
