#!/usr/bin/env node
// Chronometric parity: does a build draw Chronometric the way the last passed
// build did? A cut that moves or touches Chronometric's math must leave every
// step below drawing the same SVG, text for text, as the build Drak last
// passed. Two commands:
//
//   node parity.js record <build.html> <outdir> [--libs DIR] [--fixtures DIR] [--only NAME@WIDTH,...]
//   node parity.js compare <baseline outdir> <candidate outdir>
//
// record opens the build in Chromium (Playwright), loads each of the four
// worlds in worlds.js at each width, opens Timeline; Chronometric, and drives
// the steps in drive() below, writing after every step what Chronometric
// shows: the SVG's markup, the controls' state, the edit panel, the hint, and
// after a step that saves, the world's entries as saved (updatedAt aside).
// The first build recorded writes the worlds to <outdir>/fixtures from its
// own new world; pass --fixtures to load those same files into another build.
// compare reads two outdirs and prints the first difference in each run.
// Exit codes: record 0, or 3 when a step failed (the failure is recorded);
// compare 0 when every step matches, 1 when any differs.
//
// --libs names a folder holding the six libraries the page loads from the
// CDN, unpacked from deps/ as <name>-<version>/ (run.py does this). Fonts are
// answered empty, so both builds draw in the same fallback face.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { WORLDS, TARGETS, makeWorlds } = require('./worlds');

const WIDTHS = [1400, 900];
const HEIGHT = 950;
const NAV = 'Timeline; Chronometric';

// ------------------------------------------------------------------ the page

function libRouter(libs) {
  const dirs = fs.readdirSync(libs);
  return (rest) => {
    // rest: "<lib>/<version>/<file path>" as the CDN URL has it.
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
  const ctx = await browser.newContext({ viewport: { width: WIDTHS[0], height: HEIGHT }, acceptDownloads: true });
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

const stripStamps = (x) => {
  if (Array.isArray(x)) return x.map(stripStamps);
  if (x && typeof x === 'object') {
    const o = {};
    for (const k of Object.keys(x)) if (k !== 'updatedAt') o[k] = stripStamps(x[k]);
    return o;
  }
  return x;
};

// What Chronometric shows, once two reads in a row agree.
async function snapshot(page) {
  const read = () => page.evaluate(() => {
    const view = document.querySelector('.chrono-view');
    if (!view) return { missing: true };
    const svg = view.querySelector('.chrono-svg-wrap svg');
    const panel = view.querySelector('.chrono-edit-panel');
    const controls = view.querySelector('.chrono-controls');
    const hint = view.querySelector('.chrono-hint');
    const value = (el) => (el.type === 'checkbox' ? el.checked : el.value);
    return {
      svg: svg ? svg.outerHTML : null,
      controls: controls ? [...controls.querySelectorAll('input, select, button, a')].map(el =>
        [el.tagName.toLowerCase(), el.type || '', 'value' in el ? value(el) : '', el.textContent.trim(), el.className]) : null,
      panel: panel ? { html: panel.outerHTML, values: [...panel.querySelectorAll('input, select')].map(value) } : null,
      hint: hint ? hint.textContent : null,
    };
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

// ------------------------------------------------------------------ the steps

async function drive(page, world, rec) {
  const T = TARGETS[world];
  const controls = page.locator('.chrono-controls');
  const press = (name) => controls.getByRole('button', { name, exact: true }).click();
  const svgBox = async () => {
    await page.locator('.chrono-svg-wrap svg').evaluate(el => el.scrollIntoView({ block: 'start' }));
    return page.locator('.chrono-svg-wrap svg').boundingBox();
  };
  // A point on the axis band, above every lane: x at fraction fx of the chart,
  // the chart measured with r017's 140-pixel title column and 24-pixel
  // margin, so both builds are pressed at the same place on the screen.
  const axisPoint = async (fx) => {
    const b = await svgBox();
    const chart = b.width - 140 - 24;
    return { x: b.x + 140 + fx * chart, y: b.y + 25 };
  };
  const wheel = async (p, dy) => {
    await page.mouse.move(p.x, p.y);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, dy);
    await page.keyboard.up('Control');
  };
  const drag = async (from, dx, mid) => {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + dx / 4, from.y, { steps: 3 });
    await page.mouse.move(from.x + dx / 2, from.y, { steps: 3 });
    if (mid) await mid();
    await page.mouse.move(from.x + dx, from.y, { steps: 3 });
    await page.mouse.up();
  };
  // An event's group, found by its tooltip: "<name> (<field>)" for a span,
  // "<name> ... (<field>)" for a point.
  const eventAt = async ([name, field], part) => {
    const idx = await page.evaluate(([name, field]) =>
      [...document.querySelectorAll('.chrono-svg-wrap g.chrono-event')].findIndex(g => {
        const t = g.querySelector('title');
        const s = t ? t.textContent : '';
        return s.startsWith(name + ' ') && s.includes(`(${field})`);
      }), [name, field]);
    if (idx < 0) throw new Error(`no event for ${name} (${field})`);
    const g = page.locator('.chrono-svg-wrap g.chrono-event').nth(idx);
    const el = part === 'start' ? g.locator('rect[fill="var(--accent)"]').first()
      : part === 'point' ? g.locator('circle[r="5"]')
      : g.locator('rect[fill-opacity="0.65"]');
    if (await el.count() === 0) throw new Error(`${name} (${field}) draws no ${part || 'middle'} to grab`);
    await el.scrollIntoViewIfNeeded();
    const b = await el.boundingBox();
    if (!b || b.width < 2) throw new Error(`${name} (${field}) has no ${part || 'middle'} wide enough to grab`);
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };

  await rec('load');
  if (T.brief) {
    for (let i = 1; i <= 3; i++) { await press('−'); await rec(`zoom out ${i}`); }
    for (let i = 1; i <= 3; i++) { await press('+'); await rec(`zoom in ${i}`); }
    const p = await axisPoint(0.5);
    for (let i = 1; i <= 2; i++) { await wheel(p, -100); await rec(`wheel in at 0.5, ${i}`); }
    await press('Reset'); await rec('reset');
    await press('Edit'); await rec('edit on');
    await drag(await eventAt(T.point, 'point'), 60); await rec(`drag ${T.point[0]}`, { saved: true });
    await press('Editing'); await rec('edit off');
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), press('SVG')]);
    await rec('svg export', { exported: fs.readFileSync(await download.path(), 'utf8') });
    return;
  }
  // The zoom buttons, to the least zoom and one press past it, a wheel turn
  // there, then to the most zoom, a wheel turn there, and back.
  for (let i = 1; i <= 7; i++) { await press('−'); await rec(`zoom out ${i}`); }
  await wheel(await axisPoint(0.5), 100); await rec('wheel out at the least zoom');
  for (let i = 1; i <= 23; i++) { await press('+'); await rec(`zoom in ${i}`); }
  await wheel(await axisPoint(0.5), -100); await rec('wheel in at the most zoom');
  await press('Reset'); await rec('reset');
  // Wheel zoom around three points.
  for (const fx of [0.15, 0.5, 0.85]) {
    const p = await axisPoint(fx);
    for (let i = 1; i <= 4; i++) { await wheel(p, -100); await rec(`wheel in at ${fx}, ${i}`); }
    for (let i = 1; i <= 6; i++) { await wheel(p, 100); await rec(`wheel out at ${fx}, ${i}`); }
    await press('Reset'); await rec(`reset after the wheel at ${fx}`);
  }
  // Pan, zoomed in a little so there's somewhere to go.
  await press('+'); await press('+'); await rec('zoom in twice to pan');
  await drag(await axisPoint(0.6), -150); await rec('pan left');
  await drag(await axisPoint(0.3), 400); await rec('pan right');
  await press('Reset'); await rec('reset after the pan');
  // The range boxes.
  const bounds = await page.evaluate(() => [...document.querySelectorAll('.chrono-svg-wrap svg text')]
    .map(t => t.textContent).filter(s => /^-?\d+/.test(s)).map(s => parseInt(s, 10)));
  const lo = Math.min(...bounds), hi = Math.max(...bounds);
  const from = String(Math.round(lo + (hi - lo) * 0.25)), to = String(Math.round(lo + (hi - lo) * 0.7));
  const boxes = controls.locator('input.chrono-bound-input');
  await boxes.nth(0).fill(from); await rec(`range from ${from}`);
  await boxes.nth(1).fill(to); await rec(`range to ${to}`);
  await boxes.nth(0).fill(''); await boxes.nth(1).fill(''); await rec('range cleared');
  // The lane filter: none, one, all.
  await controls.locator('a.chrono-link', { hasText: 'none' }).click(); await rec('lanes: none');
  await controls.locator('.chrono-filter-row input[type="checkbox"]').nth(1).check(); await rec('lanes: the second');
  await controls.locator('a.chrono-link', { hasText: 'all' }).click(); await rec('lanes: all');
  // Secrets hidden and shown again.
  if (world === 'centuries') {
    await page.locator('.hdr-actions .btn-icon-toggle').click(); await rec('secrets hidden');
    await page.locator('.hdr-actions .btn-icon-toggle').click(); await rec('secrets shown');
  }
  // Edit mode: select a span, step its year in the panel, drag it with a
  // look mid-drag, drag its start, drag a point.
  const edit = async (span, point, tag) => {
    await press('Edit'); await rec(`${tag}edit on`);
    let p = await eventAt(span);
    await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.up();
    if (await page.locator('.chrono-edit-panel').count() === 0) throw new Error(`pressing ${span[0]} selected nothing`);
    await rec(`${tag}select ${span[0]}`);
    await page.locator('.chrono-edit-panel button[title="Year +1"]').first().click();
    await rec(`${tag}panel: year +1`, { saved: true });
    p = await eventAt(span);
    await drag(p, 120, () => rec(`${tag}mid-drag ${span[0]}`));
    await rec(`${tag}drag ${span[0]}`, { saved: true });
    p = await eventAt(span, 'start');
    await drag(p, -40);
    await rec(`${tag}drag the start of ${span[0]}`, { saved: true });
    p = await eventAt(point, 'point');
    await drag(p, 50);
    await rec(`${tag}drag ${point[0]}`, { saved: true });
    await page.keyboard.press('Escape'); await rec(`${tag}escape`);
    await press('Editing'); await rec(`${tag}edit off`);
  };
  await edit(T.span, T.point, '');
  // The second calendar: draw in it, zoom in it with the buttons and the
  // wheel, drag an entry bound to each calendar in it, and come back.
  if (T.calendar) {
    await controls.locator('select').selectOption(T.calendar); await rec('display in the second calendar', { saved: true });
    for (let i = 1; i <= 3; i++) { await press('−'); await rec(`second calendar: zoom out ${i}`); }
    for (let i = 1; i <= 12; i++) { await press('+'); await rec(`second calendar: zoom in ${i}`); }
    const p = await axisPoint(0.4);
    for (let i = 1; i <= 3; i++) { await wheel(p, -100); await rec(`second calendar: wheel in ${i}`); }
    await press('Reset'); await rec('second calendar: reset');
    await edit(T.second.span, T.second.point, 'second calendar: ');
    await controls.locator('select').selectOption(''); await rec('display in the primary calendar', { saved: true });
  }
  // The SVG export's text.
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), press('SVG')]);
  await rec('svg export', { exported: fs.readFileSync(await download.path(), 'utf8') });
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

  let worlds;
  if (Object.keys(WORLDS).every(n => fs.existsSync(path.join(fixtures, `${n}.json`)))) {
    worlds = Object.fromEntries(Object.keys(WORLDS).map(n => [n, JSON.parse(fs.readFileSync(path.join(fixtures, `${n}.json`), 'utf8'))]));
  } else {
    worlds = makeWorlds(await idb(page, 'world'));
    fs.mkdirSync(fixtures, { recursive: true });
    for (const [n, w] of Object.entries(worlds)) fs.writeFileSync(path.join(fixtures, `${n}.json`), JSON.stringify(w, null, 1));
  }

  let failed = 0;
  const runs = [];
  for (const name of Object.keys(WORLDS)) {
    for (const width of WIDTHS) {
      const run = `${name}@${width}`;
      if (opts.only && !opts.only.includes(run)) continue;
      await page.setViewportSize({ width, height: HEIGHT });
      errors.length = 0;
      for (let attempt = 0; ; attempt++) {
        await page.waitForTimeout(1500);
        await idb(page, 'world', worlds[name]);
        await page.reload();
        await settle(page);
        const w = await idb(page, 'world');
        if (w && w.world && w.world.name === worlds[name].world.name && w.entries.length === worlds[name].entries.length) break;
        if (attempt === 2) throw new Error(`${run}: the world didn't load`);
      }
      await page.click(`button.nav-item:has(.nav-name:text-is("${NAV}"))`);
      await page.waitForSelector('.chrono-view');
      const records = [];
      const rec = async (step, extra = {}) => {
        const r = { step, ...(await snapshot(page)) };
        if (extra.saved) {
          await page.waitForTimeout(600);
          const w = await idb(page, 'world');
          r.saved = { entries: stripStamps(w.entries), viewPrefs: w.viewPrefs || null };
        }
        if (extra.exported !== undefined) r.exported = extra.exported;
        records.push(r);
      };
      try {
        await drive(page, name, rec);
      } catch (e) {
        failed++;
        const msg = String(e.message || e).split('\n')[0];
        records.push({ step: 'failed', error: msg });
        console.log(`  ${run}: a step failed after "${records.length > 1 ? records[records.length - 2].step : 'start'}": ${msg}`);
        await page.mouse.up().catch(() => {});
        await page.keyboard.up('Control').catch(() => {});
      }
      records.push({ step: 'page errors', errors: [...errors] });
      const body = '[\n' + records.map(r => JSON.stringify(r)).join(',\n') + '\n]\n';
      fs.writeFileSync(path.join(outdir, `${run}.json.gz`), zlib.gzipSync(body));
      const taken = records.filter(r => r.step !== 'failed' && r.step !== 'page errors').length;
      runs.push([run, taken]);
      console.log(`  ${run}: ${taken} steps recorded${errors.length ? `, ${errors.length} page error(s)` : ''}`);
    }
  }
  fs.writeFileSync(path.join(outdir, 'run.json'), JSON.stringify({
    build: html, sha256_16: sha, fixtures: path.resolve(fixtures), widths: WIDTHS, runs,
    playwright: (() => { try { return require('playwright/package.json').version; } catch (e) { return null; } })(),
    chromium: browser.version(), when: new Date().toISOString(),
  }, null, 1));
  await browser.close();
  console.log(`recorded ${path.basename(html)} (${sha}) into ${outdir}${failed ? `; ${failed} run(s) stopped at a failed step` : ''}`);
  return failed ? 3 : 0;
}

// ------------------------------------------------------------------ compare

function firstDifference(a, b, where = '') {
  if (typeof a === 'string' && typeof b === 'string') {
    if (a === b) return null;
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    const cut = (s) => JSON.stringify(s.slice(Math.max(0, i - 60), i + 60));
    return `${where || 'value'} differs at character ${i}:\n      baseline  ${cut(a)}\n      candidate ${cut(b)}`;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    for (const k of keys) {
      const d = firstDifference(a[k], b[k], where ? `${where}.${k}` : k);
      if (d) return d;
    }
    return null;
  }
  return JSON.stringify(a) === JSON.stringify(b) ? null
    : `${where || 'value'}: baseline ${JSON.stringify(a)}, candidate ${JSON.stringify(b)}`;
}

function compare(dirA, dirB) {
  const load = (dir, f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, f))).toString('utf8'));
  const files = fs.readdirSync(dirA).filter(f => f.endsWith('.json.gz')).sort();
  const meta = (dir) => { try { return JSON.parse(fs.readFileSync(path.join(dir, 'run.json'), 'utf8')); } catch (e) { return {}; } };
  const [ma, mb] = [meta(dirA), meta(dirB)];
  console.log(`chrono-parity: baseline ${path.basename(ma.build || dirA)} (${ma.sha256_16 || '?'}), candidate ${path.basename(mb.build || dirB)} (${mb.sha256_16 || '?'})`);
  let differing = 0, steps = 0;
  for (const f of files) {
    const run = f.replace(/\.json\.gz$/, '');
    if (!fs.existsSync(path.join(dirB, f))) { differing++; console.log(`  ${run}: the candidate has no record`); continue; }
    const [A, B] = [load(dirA, f), load(dirB, f)];
    // The steps, a failed step's record among them, and apart from them the
    // page errors each run met.
    const [SA, SB] = [A, B].map(R => R.filter(r => r.step !== 'page errors'));
    const [EA, EB] = [A, B].map(R => (R.find(r => r.step === 'page errors') || { errors: [] }).errors);
    const diffs = [];
    for (let i = 0; i < Math.max(SA.length, SB.length); i++) {
      const [a, b] = [SA[i], SB[i]];
      if (!a || !b) { diffs.push(`step ${i + 1}: ${a ? `"${a.step}"` : 'nothing'} against ${b ? `"${b.step}"` : 'nothing'}`); continue; }
      const d = firstDifference(a, b);
      if (d) diffs.push(`step ${i + 1}, "${a.step}": ${d}`);
    }
    const errorsDiffer = JSON.stringify(EA) !== JSON.stringify(EB);
    steps += SA.length;
    const failedA = SA.find(r => r.step === 'failed'), failedB = SB.find(r => r.step === 'failed');
    if (diffs.length || errorsDiffer) {
      differing++;
      const notes = [];
      if (failedB && !failedA) notes.push(`the candidate stopped at a failed step: ${failedB.error}`);
      if (errorsDiffer) notes.push(`page errors: baseline ${EA.length}, candidate ${EB.length}${EB[0] ? ` (${EB[0].split('\n')[0]})` : ''}`);
      console.log(`  ${run}: ${diffs.length} of ${SA.length} steps differ${notes.length ? `; ${notes.join('; ')}` : ''}${diffs.length ? `; the first, ${diffs[0]}` : ''}`);
    } else {
      console.log(`  ${run}: ${SA.length} steps, identical${failedA ? ` (both stopped at a failed step: ${failedA.error})` : ''}`);
    }
  }
  if (differing) console.log(`PARITY: DIFFERENT (${differing} of ${files.length} runs)`);
  else console.log(`PARITY: IDENTICAL (${files.length} runs, ${steps} steps)`);
  return differing ? 1 : 0;
}

// ------------------------------------------------------------------ main

(async () => {
  const [cmd, ...rest] = process.argv.slice(2);
  const pos = rest.filter((a, i) => !a.startsWith('--') && !(i > 0 && rest[i - 1].startsWith('--')));
  const opt = (name) => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : null; };
  if (cmd === 'record' && pos.length === 2) {
    const libs = opt('libs') || path.join(__dirname, '..', '..', 'inlining', 'out', 'chrono-parity', 'libs');
    const only = opt('only') ? opt('only').split(',') : null;
    process.exit(await record(pos[0], pos[1], { libs, fixtures: opt('fixtures'), only }));
  } else if (cmd === 'compare' && pos.length === 2) {
    process.exit(compare(pos[0], pos[1]));
  } else {
    console.log('usage: node parity.js record <build.html> <outdir> [--libs DIR] [--fixtures DIR] [--only NAME@WIDTH,...]\n'
      + '       node parity.js compare <baseline outdir> <candidate outdir>');
    process.exit(2);
  }
})().catch(e => { console.error(e); process.exit(2); });
