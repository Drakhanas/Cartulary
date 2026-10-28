#!/usr/bin/env node
// Stemma parity: does a build save and show the same stemma, step by step,
// as the last passed build did? Written for v1.7's r026, which turned the
// radial's edits into pure transforms committed through a history, and had to
// change nothing but undo. Any later cut that touches the edit path and must
// change nothing on screen runs it again. Two commands:
//
//   node parity.js record <build.html> <outdir> [--libs DIR] [--fixtures DIR] [--undo]
//   node parity.js compare <baseline outdir> <candidate outdir>
//
// record opens the build in Chromium (Playwright), seeds a new world with four
// Character entries, opens Stemma, makes a stemma, and drives the edit
// sequence in drive() below: adds, a drill-in, the inspector's label, icon and
// color, convert both ways, re-link, a subtree's delete, the rename, and a
// trip to the index and back. After every step it writes down the stemmas as
// saved (ids numbered by first appearance, times of saving aside) and what the
// canvas shows: the name, the breadcrumb, the nodes, the inspector. With
// --undo it then walks the whole sequence back with Ctrl+Z, checking the saved
// stemma against each earlier step, forward again with Ctrl+Y, and checks that
// leaving the canvas clears the stack; that walk is the candidate's alone,
// since the build before r026 has no undo. The first build recorded writes the
// seeded world to <outdir>/fixtures; pass --fixtures to load the same world
// into another build. compare prints each step's first difference.
// Exit codes: record 0, or 3 when a step failed (the failure is recorded), or
// 4 when the undo walk failed; compare 0 when every step matches, 1 when any
// differs.
//
// --libs names a folder holding the six libraries the page loads from the
// CDN, unpacked from deps/ as <name>-<version>/ (run.py does this). Fonts are
// answered empty.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const WIDTH = 1400, HEIGHT = 950;
const NAV = 'Stemma';
const SIZE = 720, CENTER = SIZE / 2, SLOTS = 16;
const ENTRIES = ['Arwen', 'Boromir', 'Celeborn', 'Denethor'];

// ------------------------------------------------------------------ the page

function libRouter(libs) {
  const dirs = fs.readdirSync(libs);
  return (rest) => {
    const [lib, , ...file] = rest.split('/');
    const dir = dirs.find(d => new RegExp(`^${lib.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d`).test(d));
    if (!dir) return null;
    for (const p of [path.join(libs, dir, ...file), path.join(libs, dir, 'dist', ...file)]) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  };
}

async function openContext(browser, libs) {
  const find = libRouter(libs);
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT } });
  await ctx.route(/^https?:\/\//, (route) => {
    const u = route.request().url();
    const m = u.match(/cdnjs\.cloudflare\.com\/ajax\/libs\/(.+)$/);
    const file = m ? find(m[1]) : null;
    if (file) return route.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(file) });
    if (/fonts\.(googleapis|gstatic)\.com/.test(u)) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    return route.abort();
  });
  return ctx;
}

const idb = (page, key, value) => page.evaluate(([key, value, write]) => new Promise((res, rej) => {
  const r = indexedDB.open('cartulary', 1);
  r.onsuccess = () => {
    const tx = r.result.transaction('data', write ? 'readwrite' : 'readonly');
    const st = tx.objectStore('data');
    if (write) { st.put(value, key); tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error); }
    else { const g = st.get(key); g.onsuccess = () => res(g.result); g.onerror = () => rej(g.error); }
  };
  r.onerror = () => rej(r.error);
}), [key, value === undefined ? null : value, value !== undefined]);

const settle = async (page) => { await page.waitForSelector('.world-hdr', { timeout: 180000 }); await page.waitForTimeout(1200); };

// The seeded world: the build's own new world with four Character entries.
function seed(fresh) {
  const tpl = fresh.templates.find(t => t.name === 'Character');
  if (!tpl) throw new Error('the new world has no Character template');
  const stamp = '2026-01-01T00:00:00.000Z';
  const entries = ENTRIES.map((name, i) => ({
    id: `ent-${name.toLowerCase()}-p${i + 1}`, templateId: tpl.id, name, calendarId: null, fields: {}, tags: [],
    createdAt: stamp, updatedAt: stamp,
  }));
  return { ...fresh, entries: [...fresh.entries, ...entries], stemmas: [] };
}

// The stemmas as saved, with every stemma and node id replaced by its number
// in order of first appearance (root first, children in array order) and the
// times of saving dropped. Two builds that made the same edits in the same
// order agree on this whatever ids genId dealt.
function canon(stemmas) {
  const ids = new Map();
  const num = (id, kind) => { if (!ids.has(id)) ids.set(id, `${kind}${ids.size + 1}`); return ids.get(id); };
  const node = (n) => {
    const out = { ...n, id: num(n.id, 'n') };
    out.children = (n.children || []).map(node);
    return out;
  };
  return (stemmas || []).map(s => {
    const { createdAt, updatedAt, ...rest } = s;
    return { ...rest, id: num(s.id, 'stem'), root: node(s.root) };
  });
}

// What the canvas shows, once two reads in a row agree. Undo and Redo are
// the candidate's own and are left out of the top bar's text.
async function snapshot(page) {
  const read = () => page.evaluate(() => {
    const back = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '← Stemmas');
    if (!back) {
      const rows = [...document.querySelectorAll('.stemma-index-row')].map(r => r.innerText.replace(/\s+/g, ' ').trim());
      return { index: rows };
    }
    const bar = back.parentElement;
    const barText = [...bar.children].map(el => el.innerText || el.value || '')
      .map(t => t.replace(/\b(Undo|Redo)\b/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean).join(' | ');
    const canvas = document.querySelector('div[style*="transform: scale("]');
    const nodes = canvas ? [...canvas.querySelectorAll('div[style*="cursor: pointer"]')].map(el => {
      const label = el.lastElementChild ? el.lastElementChild.textContent.trim() : '';
      const face = el.firstElementChild;
      return { left: el.style.left, top: el.style.top, label, bg: face ? face.style.background : '', icon: face ? face.firstChild && face.firstChild.textContent.trim() : '' };
    }) : null;
    const plus = canvas ? canvas.querySelectorAll('button[title="Add child node"]').length : null;
    const insp = [...document.querySelectorAll('div')].find(d => d.style.width === '320px' && d.style.borderLeft);
    const inspector = insp ? {
      text: insp.innerText.replace(/\s+/g, ' ').trim(),
      values: [...insp.querySelectorAll('input')].map(i => i.value),
      selected: [...insp.querySelectorAll('.sel')].map(el => el.textContent.trim() || el.style.background),
    } : null;
    return { bar: barText, nodes, plus, inspector };
  });
  let prev = JSON.stringify(await read());
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(80);
    const cur = JSON.stringify(await read());
    if (cur === prev) return JSON.parse(cur);
    prev = cur;
  }
  return JSON.parse(prev);
}

// ------------------------------------------------------------------ driving

const slotOf = (left, top, r) => {
  const cx = parseFloat(left) + r, cy = parseFloat(top) + r;
  const a = Math.atan2(cy - CENTER, cx - CENTER) + Math.PI / 2;
  return ((Math.round(a / (2 * Math.PI / SLOTS)) % SLOTS) + SLOTS) % SLOTS;
};

async function clickPlus(page, slot) {
  const handles = await page.$$('button[title="Add child node"]');
  for (const h of handles) {
    const [l, t] = await h.evaluate(el => [el.style.left, el.style.top]);
    if (slotOf(l, t, 14) === slot) { await h.click(); return; }
  }
  throw new Error(`no + at slot ${slot}`);
}

async function clickChild(page, slot) {
  const canvas = await page.$('div[style*="transform: scale("]');
  const handles = await canvas.$$('div[style*="cursor: pointer"][style*="width: 60px"]');
  for (const h of handles) {
    const [l, t] = await h.evaluate(el => [el.style.left, el.style.top]);
    if (slotOf(l, t, 30) === slot) { await h.click(); return; }
  }
  throw new Error(`no child at slot ${slot}`);
}

async function clickFocal(page) {
  const canvas = await page.$('div[style*="transform: scale("]');
  const h = await canvas.$('div[style*="cursor: pointer"][style*="width: 76px"]');
  if (!h) throw new Error('no focal node');
  await h.click();
}

async function smartInput(page, text, pick) {
  const input = page.locator('div[style*="transform: scale("] input[type="text"]');
  await input.waitFor();
  await input.fill(text);
  if (pick) { await page.waitForTimeout(150); await input.press('ArrowDown'); }
  await input.press('Enter');
}

const inspector = (page) => page.locator('div[style*="width: 320px"][style*="border-left"]');

async function inspectorPick(page, name) {
  const box = inspector(page).locator('input[placeholder="Type a name…"]');
  await box.waitFor();
  await box.fill(name.slice(0, 3));
  await page.waitForTimeout(150);
  await box.press('ArrowDown');
  await box.press('Enter');
}

// The steps. rec(name, undoSteps) records after a step; undoSteps is how many
// history steps the step made, for the walk.
async function drive(page, rec) {
  await page.click('button.btn-accent:has-text("+ New Stemma")');
  await page.waitForSelector('button[title="Add child node"]');
  await rec('new stemma', 0);
  await clickPlus(page, 0); await smartInput(page, 'Alpha', false); await rec('freeform at 0', 1);
  await clickPlus(page, 4); await smartInput(page, 'Bor', true); await rec('linked Boromir at 4', 1);
  await clickPlus(page, 8); await smartInput(page, 'Gamma', false); await rec('freeform at 8', 1);
  await clickChild(page, 0);
  await clickPlus(page, 2); await smartInput(page, 'Alpha One', false);
  await clickPlus(page, 6); await smartInput(page, 'Cel', true); await rec('drilled into Alpha, two children', 2);
  await page.click('button:has-text("Back to root")'); await rec('back to root', 0);
  await clickFocal(page);
  const label = inspector(page).locator('input.input');
  await label.waitFor();
  await label.fill('');
  await label.type('Trunk');  // key by key, so the label's run of typing is one history step
  await inspector(page).locator('.icon-opt').nth(3).click();
  await inspector(page).locator('.color-opt').nth(2).click();
  await rec('root relabeled, icon, color', 3);
  await inspector(page).locator('button[title="Close inspector"]').click();
  await clickChild(page, 8);
  await clickFocal(page);
  await inspector(page).locator('button:has-text("Convert to linked entry")').click();
  await inspectorPick(page, 'Denethor'); await rec('Gamma converted to Denethor', 1);
  await inspector(page).locator('button:has-text("Re-link to different entry")').click();
  await inspectorPick(page, 'Arwen'); await rec('re-linked to Arwen', 1);
  await inspector(page).locator('button:has-text("Convert to freeform")').click(); await rec('converted to freeform', 1);
  await page.click('button:has-text("Back to root")');
  await clickChild(page, 0);
  await clickFocal(page);
  await inspector(page).locator('button:has-text("Delete node")').click(); await rec('Alpha deleted with its two', 1);
  const name = page.locator('span[title="Click to rename"]');
  await name.click();
  const nameBox = page.locator('input[type="text"][style*="min-width: 200px"]');
  await nameBox.fill('Parity Tree');
  await nameBox.press('Enter');
  await rec('renamed', 1);
}

async function undoWalk(page, steps, read) {
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const findings = [];
  // back: each recorded step's history steps, newest first, must land on the
  // step before it
  for (let i = steps.length - 1; i >= 1; i--) {
    for (let k = 0; k < steps[i].undo; k++) { await page.keyboard.press('Control+z'); await page.waitForTimeout(120); }
    if (steps[i].undo === 0) continue;
    const got = await read();
    if (process.env.PARITY_TRACE) console.log(`    undo ${steps[i].undo} through "${steps[i].step}": ${JSON.stringify(got[0] && got[0].root && [got[0].root.label, got[0].root.icon, got[0].root.children.length, got[0].name])}`);
    if (!same(got, steps[i - 1].saved)) findings.push(`undo through "${steps[i].step}" didn't land on "${steps[i - 1].step}"`);
  }
  // forward again
  for (let i = 1; i < steps.length; i++) {
    for (let k = 0; k < steps[i].undo; k++) { await page.keyboard.press('Control+y'); await page.waitForTimeout(120); }
    if (steps[i].undo === 0) continue;
    const got = await read();
    if (!same(got, steps[i].saved)) findings.push(`redo through "${steps[i].step}" didn't land on it`);
  }
  // the stack goes with the canvas
  await page.click('button:has-text("← Stemmas")');
  await page.waitForSelector('.stemma-index-row');
  await page.locator('.stemma-index-row').first().click();
  await page.waitForSelector('button[title="Undo (Ctrl+Z)"]');
  const disabled = await page.locator('button[title="Undo (Ctrl+Z)"]').evaluate(b => b.disabled);
  if (!disabled) findings.push('Undo is live after leaving the canvas and coming back');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(200);
  if (!same(await read(), steps[steps.length - 1].saved)) findings.push('Ctrl+Z after coming back changed the stemma');
  return findings;
}

// ------------------------------------------------------------------ record

async function record(build, outdir, opts) {
  const { chromium } = require('playwright');
  fs.mkdirSync(outdir, { recursive: true });
  const fixtures = opts.fixtures || path.join(outdir, 'fixtures');
  const html = path.resolve(build);
  const sha = crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex').slice(0, 16);
  const browser = await chromium.launch();
  const ctx = await openContext(browser, path.resolve(opts.libs));
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  page.setDefaultNavigationTimeout(180000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('dialog', d => d.accept());
  await page.goto(require('url').pathToFileURL(html).href);
  await settle(page);

  let world;
  const fixture = path.join(fixtures, 'world.json');
  if (fs.existsSync(fixture)) {
    world = JSON.parse(fs.readFileSync(fixture, 'utf8'));
  } else {
    world = seed(await idb(page, 'world'));
    fs.mkdirSync(fixtures, { recursive: true });
    fs.writeFileSync(fixture, JSON.stringify(world, null, 1));
  }
  for (let attempt = 0; ; attempt++) {
    await page.waitForTimeout(1500);
    await idb(page, 'world', world);
    await page.reload();
    await settle(page);
    const w = await idb(page, 'world');
    if (w && w.entries.length === world.entries.length) break;
    if (attempt === 2) throw new Error('the world didn\'t load');
  }
  await page.click(`button.nav-item:has(.nav-name:text-is("${NAV}"))`);
  await page.waitForSelector('button.btn-accent:has-text("+ New Stemma")');

  const read = async () => { await page.waitForTimeout(700); const w = await idb(page, 'world'); return canon(w.stemmas); };
  const steps = [];
  const rec = async (step, undo) => { steps.push({ step, undo, saved: await read(), screen: await snapshot(page) }); };
  let code = 0;
  try {
    await drive(page, rec);
  } catch (e) {
    code = 3;
    const msg = String(e.message || e).split('\n')[0];
    steps.push({ step: 'failed', error: msg });
    console.log(`  a step failed after "${steps.length > 1 ? steps[steps.length - 2].step : 'start'}": ${msg}`);
  }
  let undo = null;
  if (opts.undo && code === 0) {
    try {
      undo = await undoWalk(page, steps, read);
    } catch (e) {
      undo = [`the walk broke: ${String(e.message || e).split('\n')[0]}`];
    }
    if (undo.length) { code = 4; undo.forEach(f => console.log(`  undo: ${f}`)); }
    else console.log(`  undo: the walk retraced ${steps.reduce((n, s) => n + (s.undo || 0), 0)} steps both ways, and the stack went with the canvas`);
  }
  fs.writeFileSync(path.join(outdir, 'steps.json'), JSON.stringify({
    build: html, sha256_16: sha, fixtures: path.resolve(fixtures), steps, undo, errors,
    playwright: (() => { try { return require('playwright/package.json').version; } catch (e) { return null; } })(),
    chromium: browser.version(), when: new Date().toISOString(),
  }, null, 1));
  console.log(`  ${steps.filter(s => s.step !== 'failed').length} steps recorded${errors.length ? `, ${errors.length} page error(s)` : ''}`);
  await browser.close();
  return code;
}

// ------------------------------------------------------------------ compare

function firstDiff(a, b, p = '') {
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b)) return `${p || '/'}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`;
  if (a && typeof a === 'object') {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    for (const k of keys) {
      const d = firstDiff(a[k], b[k], `${p}/${k}`);
      if (d) return d;
    }
    return null;
  }
  return a === b ? null : `${p || '/'}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`;
}

function compare(baseDir, candDir) {
  const base = JSON.parse(fs.readFileSync(path.join(baseDir, 'steps.json'), 'utf8'));
  const cand = JSON.parse(fs.readFileSync(path.join(candDir, 'steps.json'), 'utf8'));
  let bad = 0;
  const n = Math.max(base.steps.length, cand.steps.length);
  for (let i = 0; i < n; i++) {
    const a = base.steps[i], b = cand.steps[i];
    if (!a || !b || a.step !== b.step) { console.log(`  step ${i}: ${a ? a.step : '(none)'} vs ${b ? b.step : '(none)'}`); bad++; continue; }
    const d = firstDiff({ saved: a.saved, screen: a.screen }, { saved: b.saved, screen: b.screen });
    if (d) { console.log(`  ${a.step}: ${d}`); bad++; }
    else console.log(`  ${a.step}: same`);
  }
  if (base.errors.length || cand.errors.length) console.log(`  page errors: ${base.errors.length} vs ${cand.errors.length}`);
  console.log(bad ? `${bad} step(s) differ` : 'every step matches');
  return bad ? 1 : 0;
}

// ------------------------------------------------------------------ main

(async () => {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const pos = argv.slice(1).filter((a, i, arr) => !a.startsWith('--') && !(arr[i - 1] || '').match(/^--(libs|fixtures)$/));
  const opt = (name) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : null; };
  if (cmd === 'record' && pos.length === 2) {
    process.exit(await record(pos[0], pos[1], { libs: opt('libs') || 'libs', fixtures: opt('fixtures'), undo: argv.includes('--undo') }));
  } else if (cmd === 'compare' && pos.length === 2) {
    process.exit(compare(pos[0], pos[1]));
  } else {
    console.log('usage: node parity.js record <build.html> <outdir> [--libs DIR] [--fixtures DIR] [--undo]\n'
      + '       node parity.js compare <baseline outdir> <candidate outdir>');
    process.exit(2);
  }
})().catch(e => { console.error(e); process.exit(2); });
