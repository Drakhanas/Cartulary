// A world imported, the page reloaded: the world is still there, in storage
// and on screen.
const path = require("path");
module.exports = {
  what: "a world survives a reload",
  async run({ lib, open, check }) {
    const page = await open();
    await lib.importWorld(page, path.join(lib.ROOT, "tools/probes/worlds/basic.world.json"));
    await lib.waitForSaved(page, s => s.world.name === "Probe World" && s.entries.length === 3, "the imported world");
    await page.reload();
    await page.waitForSelector("aside.sidebar .world-name");
    check((await page.locator("aside.sidebar .world-name").innerText()).trim() === "Probe World", "the sidebar lost the world's name on reload");
    const st = await lib.worldState(page);
    check(st.entries.map(e => e.name).sort().join() === "Aria,Borin,Eastwatch", `entries after reload: ${st.entries.map(e => e.name)}`);
    await lib.clickSidebar(page, "All entries");
    for (const n of ["Aria", "Borin", "Eastwatch"]) {
      check(await page.getByText(n, { exact: true }).count() > 0, `All entries doesn't show ${n} after reload`);
    }
  },
};
