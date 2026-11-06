// Deleting an entry says what it reaches, clears the reference, and leaves
// the [[links]] as typed.
const path = require("path");
module.exports = {
  what: "a delete counts what it reaches and leaves the links as typed",
  async run({ lib, open, check }) {
    const page = await open();
    await lib.importWorld(page, path.join(lib.ROOT, "tools/probes/worlds/basic.world.json"));
    await lib.clickSidebar(page, "Location");
    await page.getByText("Eastwatch", { exact: true }).first().click();
    await page.locator("button", { hasText: /^Delete$/ }).first().click();
    const modal = page.locator(".modal");
    await modal.waitFor({ timeout: 10000 });
    const line = (await modal.innerText()).replace(/\s+/g, " ");
    check(line.includes("Removes it from 1 entry, which stays."), `the delete modal says: "${line.slice(0, 200)}"`);
    check(line.includes("[[Links]] to it in 2 places stay as typed and show as broken."), `the delete modal says: "${line.slice(0, 200)}"`);
    await modal.locator("button", { hasText: /^Delete$/ }).click();
    const st = await lib.waitForSaved(page, s => s.entries.length === 2, "the delete");
    const aria = st.entries.find(e => e.name === "Aria");
    check(!Object.values(aria.fields).includes("ent-eastwatch-0001"), "Aria still points at the deleted Eastwatch");
    const texts = st.entries.flatMap(e => Object.values(e.fields).filter(v => typeof v === "string"));
    check(texts.filter(t => t.includes("[[Eastwatch]]")).length === 2, "the links weren't left as typed");
  },
};
