// Proves the probes can fail: each mutation plants one defect in a copy of
// the working build, runs the probe meant to catch it, and expects that probe
// to fail. A probe that passes on a planted defect is a blind spot: fix the
// probe. Exits 1 on any MISS, or on an anchor that isn't in the build exactly
// once (the build moved; update the mutation).
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const lib = require("./lib");

const MUTATIONS = [
  ["the world export drops an entry", "02_world_roundtrip",
    'const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });',
    'const blob = new Blob([JSON.stringify({ ...state, entries: state.entries.slice(1) }, null, 2)], { type: "application/json" });'],
  ["a rename rewrites no links", "04_rename_links",
    "const renameText = (text, key, name) => {",
    "const renameText = (text, key, name) => { return text;"],
  ["← Back from an entry does nothing", "07_back",
    "onClick={navigateBackFromEntry}>← Back</button>",
    "onClick={() => {}}>← Back</button>"],
  ["a drag reorder never reorders", "08_sidebar_reorder",
    "if (targetIdx !== draggedIdx) onReorder(draggedIdx, targetIdx);",
    ""],
  ["Chronometric's pan doesn't move", "09_chronometric_drags",
    "setPan(dragRef.current.startPan - dx * yearsPerPx);",
    "setPan(dragRef.current.startPan);"],
  ["Compute's split doesn't follow the drag", "10_ephemeris_drags",
    "setLiveSplit(Math.max(0.15, Math.min(0.85, r)));",
    ""],
  ["Fabula's timeline doesn't pan", "11_fabula_timeline_drag",
    "setPan(dragRef.current.startPan - (e.clientX - dragRef.current.startX) * yearsPerPx);",
    "setPan(dragRef.current.startPan);"],
  ["the page asks the network for something", "01_save_reload",
    'const DB_KEY = "world";',
    'const DB_KEY = "world"; try { fetch("https://example.invalid/probe"); } catch (_) {}'],
];

const html = fs.readFileSync(lib.buildPath(), "utf8");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "teeth-"));
let bad = 0;
for (const [what, probe, find, replace] of MUTATIONS) {
  const n = html.split(find).length - 1;
  if (n !== 1) { bad++; console.log(`ANCHOR  ${what}: found ${n} times`); continue; }
  const file = path.join(tmp, probe + ".html");
  fs.writeFileSync(file, html.replace(find, replace));
  const r = spawnSync(process.execPath, [path.join(__dirname, "run.js"), probe], { env: { ...process.env, PROBE_BUILD: file }, encoding: "utf8" });
  const failed = r.status === 1 && new RegExp(`^FAIL  ${probe}`, "m").test(r.stdout);
  if (!failed) bad++;
  console.log(`${failed ? "OK    " : "MISS  "}${what} -> ${probe}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(bad ? `TEETH RED: ${bad} of ${MUTATIONS.length}` : `TEETH GREEN: ${MUTATIONS.length} of ${MUTATIONS.length}`);
process.exit(bad ? 1 : 0);
