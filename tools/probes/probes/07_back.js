// ← Back steps back: from an entry to the list it was opened from, and from
// an entry reached by a [[link]] to the entry the link was in.
const path = require("path");
module.exports = {
  what: "← Back returns to the list and along a link chain",
  async run({ lib, open, check }) {
    const page = await open();
    await lib.importWorld(page, path.join(lib.ROOT, "tools/probes/worlds/basic.world.json"));
    await lib.clickSidebar(page, "Character");
    await page.getByText("Aria", { exact: true }).first().click();
    await page.locator(".wiki-link, a, span", { hasText: /^Eastwatch$/ }).last().click();
    const title = async () => (await page.locator("h1").first().innerText()).split("\n").pop().trim();
    check(await title() === "Eastwatch", `the link opened "${await title()}"`);
    await page.locator("button", { hasText: /Back$/ }).first().click();
    check(await title() === "Aria", `Back from Eastwatch landed on "${await title()}"`);
    await page.locator("button", { hasText: /Back$/ }).first().click();
    check(await page.locator("button", { hasText: /^\+ New Entry$/ }).count() > 0 && await page.getByText("Borin", { exact: true }).count() > 0, "Back from Aria didn't return to the Character list");
  },
};
