// Probe harness: opens the working build from a file:// URL, as a user does,
// answers its CDN requests from deps/, and fails any probe whose page asks the
// network for anything else.
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const DEPS = path.join(ROOT, "deps");
const CACHE = path.join(__dirname, ".deps");

function extract(tgz, dest) {
  if (fs.existsSync(path.join(dest, "package.json"))) return;
  fs.mkdirSync(dest, { recursive: true });
  execFileSync("tar", ["-xzf", path.join(DEPS, tgz), "-C", dest, "--strip-components=1"]);
}

function loadPlaywright() {
  const dir = path.join(CACHE, "playwright-core");
  const tgz = fs.readdirSync(DEPS).find(f => /^playwright-core-.*\.tgz$/.test(f));
  extract(tgz, dir);
  return require(dir);
}

// CDN path (from the shell's script tags) -> file inside a deps tarball.
const CDN = [
  [/\/react\/[^/]+\/umd\/react\.production\.min\.js$/, "react-18.2.0.tgz", "umd/react.production.min.js"],
  [/\/react-dom\/[^/]+\/umd\/react-dom\.production\.min\.js$/, "react-dom-18.2.0.tgz", "umd/react-dom.production.min.js"],
  [/\/babel-standalone\/[^/]+\/babel\.min\.js$/, "babel-standalone-7.29.4.tgz", "babel.min.js"],
  [/\/d3\/[^/]+\/d3\.min\.js$/, "d3-7.9.0.tgz", "dist/d3.min.js"],
  [/\/jszip\/[^/]+\/jszip\.min\.js$/, "jszip-3.10.1.tgz", "dist/jszip.min.js"],
  [/\/marked\/[^/]+\/marked\.min\.js$/, "marked-4.3.0.tgz", "marked.min.js"],
];

function cdnBody(url) {
  for (const [re, tgz, file] of CDN) {
    if (re.test(url)) {
      const dir = path.join(CACHE, tgz.replace(/\.tgz$/, ""));
      extract(tgz, dir);
      return fs.readFileSync(path.join(dir, file));
    }
  }
  return null;
}

async function launch() {
  const pw = loadPlaywright();
  const opts = { headless: true, args: ["--disable-background-networking", "--disable-component-update", "--no-first-run", "--disable-sync"] };
  if (process.env.PROBE_BROWSER) opts.executablePath = process.env.PROBE_BROWSER;
  else opts.channel = "chrome";
  return pw.chromium.launch(opts);
}

// A fresh browser profile with the routes in place. stray collects every
// request the page made that isn't the file itself, a routed library, or the
// fonts (answered empty, as the finals inline them).
async function newContext(browser, extra = {}) {
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1400, height: 900 }, ...extra });
  context.stray = [];
  await context.route("**/*", async (route) => {
    const url = route.request().url();
    if (url.startsWith("file:") || url.startsWith("data:") || url.startsWith("blob:")) return route.continue();
    const body = cdnBody(url);
    if (body) return route.fulfill({ status: 200, contentType: "application/javascript", body });
    if (/fonts\.(googleapis|gstatic)\.com/.test(url)) return route.fulfill({ status: 200, contentType: "text/css", body: "" });
    context.stray.push(url);
    return route.abort();
  });
  return context;
}

function buildPath() {
  return process.env.PROBE_BUILD || path.join(ROOT, "inlining", "out", "cartulary-working.html");
}

// Open the app and wait for React to have drawn the sidebar.
async function openApp(context) {
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(String(e)));
  await page.goto("file://" + buildPath());
  await page.waitForSelector("aside.sidebar .world-name", { timeout: 60000 });
  return page;
}

// The saved world, read straight from IndexedDB the way the app stores it.
async function readWorld(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const req = indexedDB.open("cartulary", 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const names = Array.from(db.objectStoreNames);
      const out = {};
      const tx = db.transaction(names, "readonly");
      let left = names.length;
      if (!left) return resolve(out);
      for (const n of names) {
        const all = tx.objectStore(n).getAll();
        const keys = tx.objectStore(n).getAllKeys();
        tx.objectStore(n).getAllKeys().onsuccess = () => {};
        all.onsuccess = () => { out[n] = { values: all.result, keys: null }; };
        keys.onsuccess = () => { out[n].keys = keys.result; if (--left === 0) resolve(out); };
      }
    };
  }));
}

module.exports = { ROOT, launch, newContext, openApp, readWorld, buildPath };

// ---- app helpers ------------------------------------------------------------

async function worldState(page) {
  const w = await readWorld(page);
  return w.data.values[w.data.keys.indexOf("world")];
}

// Wait until IndexedDB's world satisfies pred (the app saves on a debounce).
async function waitForSaved(page, pred, what, timeout = 15000) {
  const t0 = Date.now();
  let st;
  while (Date.now() - t0 < timeout) {
    st = await worldState(page);
    if (st && pred(st)) return st;
    await page.waitForTimeout(250);
  }
  throw new Error(`timed out waiting for the save: ${what}`);
}

async function openSettings(page) {
  await page.click("aside.sidebar .world-hdr");
  await page.waitForSelector(".settings-row");
}

// Import a world file through Settings, the way a user replaces a world.
// A blank world imports without the confirm modal; a world with entries gets
// the destructive-op modal, which this answers with Import.
async function importWorld(page, file) {
  await openSettings(page);
  await page.setInputFiles(".settings-row input[type=file]", file);
  const modal = page.locator(".modal-hdr", { hasText: "Import world" });
  if (await modal.count()) await page.locator(".modal button", { hasText: /^Import/ }).last().click();
  await page.locator(".toast, .flash, body", { hasText: "World imported" }).first().waitFor({ timeout: 15000 });
}

// Export the world through Settings and return the downloaded file's text.
async function exportWorld(page) {
  await openSettings(page);
  const [dl] = await Promise.all([
    page.waitForEvent("download"),
    page.click(".settings-row button:has-text('Export .json')"),
  ]);
  const fs2 = require("fs");
  return fs2.readFileSync(await dl.path(), "utf8");
}

async function clickSidebar(page, name) {
  await page.locator("aside.sidebar .nav-name", { hasText: new RegExp("^" + name.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&") + "$") }).first().click();
}

module.exports.worldState = worldState;
module.exports.waitForSaved = waitForSaved;
module.exports.openSettings = openSettings;
module.exports.importWorld = importWorld;
module.exports.exportWorld = exportWorld;
module.exports.clickSidebar = clickSidebar;

// A mouse drag in steps, the way a hand moves: press at (x0, y0), move to
// (x1, y1), release.
async function drag(page, x0, y0, x1, y1, steps = 12) {
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) await page.mouse.move(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps);
  await page.mouse.up();
}

// What an svg draws, to tell whether a pan moved it.
async function svgSignature(locator) {
  return locator.evaluate(el => el.innerHTML);
}

module.exports.drag = drag;
module.exports.svgSignature = svgSignature;
