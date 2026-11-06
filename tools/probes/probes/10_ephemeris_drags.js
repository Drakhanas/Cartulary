// Ephemeris: Observe's sky pans under a drag, and Compute's Query / Results
// split moves under a drag on its separator and saves.
const path = require("path");
module.exports = {
  what: "Ephemeris pans its sky and resizes Compute's split",
  async run({ lib, open, check }) {
    const page = await open();
    await lib.importWorld(page, path.join(lib.ROOT, "tools/probes/worlds/basic.world.json"));
    await lib.clickSidebar(page, "Ephemeris");
    await page.click("button:has-text('+ New Body')");
    await page.fill("input[placeholder='Body name']", "Sun");
    await page.locator("button", { hasText: /^Save$/ }).first().click();
    await page.locator("button", { hasText: /^Observe$/ }).click();
    const sky = page.locator("svg").first();
    await sky.waitFor();
    const box = await sky.boundingBox();
    const sig = await lib.svgSignature(sky);
    await lib.drag(page, box.x + box.width * 0.25, box.y + box.height * 0.25, box.x + box.width * 0.25 + 100, box.y + box.height * 0.25 + 60);
    check(await lib.svgSignature(sky) !== sig, "a drag didn't pan Observe's sky");

    await page.locator("button", { hasText: /^Compute$/ }).click();
    const sep = page.locator("[role=separator][aria-orientation=horizontal]");
    await sep.waitFor();
    // Two drags, down then up: the second ratio must sit well above the
    // first, which a split that ignores the pointer can't manage.
    const ratio = () => lib.worldState(page).then(st => st.ephemeris.compute.querySplitRatio);
    let s = await sep.boundingBox();
    await lib.drag(page, s.x + s.width / 2, s.y + s.height / 2, s.x + s.width / 2, s.y + s.height / 2 + 120);
    await page.waitForTimeout(800);
    const r1 = await ratio();
    s = await sep.boundingBox();
    await lib.drag(page, s.x + s.width / 2, s.y + s.height / 2, s.x + s.width / 2, s.y + s.height / 2 - 200);
    await lib.waitForSaved(page, st => st.ephemeris.compute.querySplitRatio !== r1, "Compute's split after the second drag").catch(() => {});
    const r2 = await ratio();
    check(typeof r1 === "number" && typeof r2 === "number" && r1 - r2 > 0.05, `the split didn't follow the drags (${r1} then ${r2})`);
  },
};
