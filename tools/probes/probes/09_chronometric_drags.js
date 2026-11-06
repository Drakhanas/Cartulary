// Chronometric: a drag on the background pans the axis; with Edit on, a drag
// on a bar's middle moves that entry's dates and saves them.
const path = require("path");
module.exports = {
  what: "Chronometric pans, and moves a bar's dates in Edit",
  async run({ lib, open, check }) {
    const page = await open();
    await lib.importWorld(page, path.join(lib.ROOT, "tools/probes/worlds/basic.world.json"));
    await lib.clickSidebar(page, "Timeline; Chronometric");
    const svg = page.locator("svg").first();
    await svg.waitFor();
    const box = await svg.boundingBox();
    const t0 = await lib.svgSignature(svg);
    const y = box.y + box.height - 12;
    await lib.drag(page, box.x + box.width * 0.6, y, box.x + box.width * 0.3, y);
    check(await lib.svgSignature(svg) !== t0, "a background drag didn't move the axis");

    await page.locator("button", { hasText: /^Edit$/ }).first().click();
    const lifespans = (s) => s.entries.filter(e => e.name !== "Eastwatch").map(e => JSON.stringify(Object.values(e.fields).find(v => v && typeof v === "object" && v.start))).join("|");
    const before = lifespans(await lib.worldState(page));
    const bar = svg.locator('g.chrono-event rect[fill-opacity="0.65"]').first();
    const b = await bar.boundingBox();
    check(b, "no bar to drag");
    await lib.drag(page, b.x + b.width / 2, b.y + b.height / 2, b.x + b.width / 2 + 120, b.y + b.height / 2);
    await lib.waitForSaved(page, s => lifespans(s) !== before, "the dragged bar's dates");
  },
};
