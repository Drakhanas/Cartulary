// Fabula's timeline pans under a drag on its background.
const path = require("path");
module.exports = {
  what: "Fabula's timeline pans",
  async run({ lib, open, check }) {
    const page = await open();
    await lib.importWorld(page, path.join(lib.ROOT, "tools/probes/worlds/basic.world.json"));
    await lib.clickSidebar(page, "Fabula");
    await page.getByText("The Coast", { exact: true }).first().click();
    await page.locator("button", { hasText: /^Timeline$/ }).first().click();
    const svg = page.locator(".fabula-timeline svg").first();
    await svg.waitFor();
    const box = await svg.boundingBox();
    const sig = await lib.svgSignature(svg);
    const y = box.y + Math.min(box.height - 6, 30);
    await lib.drag(page, box.x + box.width * 0.7, y, box.x + box.width * 0.3, y);
    check(await lib.svgSignature(svg) !== sig, "a drag didn't pan Fabula's timeline");
  },
};
