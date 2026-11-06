// Runs every probe in probes/, or the ones named on the command line, each in
// its own browser profile. A probe fails on a thrown error, on a page error,
// or on any request the page made beyond the file, the routed libraries, and
// the fonts. Exits 1 if any probe fails.
//
//   node tools/probes/run.js                 every probe
//   node tools/probes/run.js save_reload     probes whose file names match
//
// PROBE_BROWSER=<path to chrome> picks the browser; without it, the installed
// Google Chrome is used (CI's runner has one). PROBE_BUILD=<html> picks the
// build; without it, inlining/out/cartulary-working.html.
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const lib = require("./lib");

(async () => {
  if (!fs.existsSync(lib.buildPath())) {
    console.error(`no build at ${lib.buildPath()}: run python3 inlining/build_inline.py working`);
    process.exit(2);
  }
  const want = process.argv.slice(2);
  const files = fs.readdirSync(path.join(__dirname, "probes")).filter(f => f.endsWith(".js")).sort()
    .filter(f => !want.length || want.some(w => f.includes(w)));
  const browser = await lib.launch();
  let failed = 0;
  for (const f of files) {
    const probe = require(path.join(__dirname, "probes", f));
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "probe-"));
    const contexts = [];
    const pages = [];
    const ctx = {
      lib, tmp,
      // A fresh profile and the app opened in it.
      open: async (extra) => {
        const c = await lib.newContext(browser, extra);
        contexts.push(c);
        const p = await lib.openApp(c);
        pages.push(p);
        return p;
      },
      check: (cond, msg) => { if (!cond) throw new Error(msg); },
    };
    const t0 = Date.now();
    let err = null;
    try {
      await probe.run(ctx);
      const stray = contexts.flatMap(c => c.stray);
      const errors = pages.flatMap(p => p.errors);
      if (stray.length) err = `the page asked the network for ${stray.join(", ")}`;
      else if (errors.length) err = `page error: ${errors[0]}`;
    } catch (e) {
      err = String(e && e.message || e).split("\n")[0];
    }
    for (const c of contexts) await c.close().catch(() => {});
    fs.rmSync(tmp, { recursive: true, force: true });
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    if (err) { failed++; console.log(`FAIL  ${f.replace(/\.js$/, "")}  (${secs}s)  ${err}`); }
    else console.log(`OK    ${f.replace(/\.js$/, "")}  (${secs}s)  ${probe.what}`);
  }
  await browser.close();
  console.log(failed ? `PROBES RED: ${failed} of ${files.length} failed` : `PROBES GREEN: ${files.length} of ${files.length}`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
