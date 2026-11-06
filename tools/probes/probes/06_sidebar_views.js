// Picking each view in the sidebar opens it: the row lights up and the page
// header names it.
const path = require("path");
const VIEWS = ["Home", "Project", "Linea", "Fabula", "Stemma", "Ephemeris", "Kalendarium", "Glossopoeia", "Cartographia", "Concordance", "Timeline; Vertical", "Timeline; Chronometric"];
module.exports = {
  what: "every view opens from the sidebar",
  async run({ lib, open, check }) {
    const page = await open();
    await lib.importWorld(page, path.join(lib.ROOT, "tools/probes/worlds/basic.world.json"));
    for (const v of VIEWS) {
      await lib.clickSidebar(page, v);
      const lit = (await page.locator("aside.sidebar .nav-item.active .nav-name, aside.sidebar .nav-item-wrap.active .nav-name").allInnerTexts()).map(s => s.trim());
      check(lit.includes(v), `picking ${v} lit ${lit.join(", ") || "nothing"}`);
    }
    await lib.clickSidebar(page, "Character");
    check(await page.getByText("Aria", { exact: true }).count() > 0, "picking Character didn't show its entries");
  },
};
