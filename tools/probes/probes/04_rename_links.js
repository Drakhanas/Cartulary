// Renaming an entry that [[links]] reach by its old name asks first; Rename
// and update links rewrites both links, and the reference by id stays.
const path = require("path");
module.exports = {
  what: "a rename offers to update the links, and updates them",
  async run({ lib, open, check }) {
    const page = await open();
    await lib.importWorld(page, path.join(lib.ROOT, "tools/probes/worlds/basic.world.json"));
    await lib.clickSidebar(page, "Location");
    await page.getByText("Eastwatch", { exact: true }).first().click();
    await page.locator("button", { hasText: /^Edit$/ }).first().click();
    await page.fill("input.form-title-input", "Eastwatch Keep");
    await page.locator("button", { hasText: /^Save$/ }).first().click();
    const modal = page.locator(".modal.record-rename");
    await modal.waitFor({ timeout: 10000 });
    const line = (await modal.innerText()).replace(/\s+/g, " ");
    check(/\[\[Links\]\] in 2 places lead to it by the old name/.test(line), `the rename modal says: "${line.slice(0, 160)}"`);
    await modal.locator("button", { hasText: /^Rename and update links$/ }).click();
    const st = await lib.waitForSaved(page, s => s.entries.some(e => e.name === "Eastwatch Keep"), "the rename");
    const texts = st.entries.flatMap(e => Object.values(e.fields).filter(v => typeof v === "string"));
    check(texts.filter(t => t.includes("[[Eastwatch Keep]]")).length === 2, "the two links weren't both rewritten");
    check(!texts.some(t => t.includes("[[Eastwatch]]")), "a link still names Eastwatch");
    const aria = st.entries.find(e => e.name === "Aria");
    check(Object.values(aria.fields).includes("ent-eastwatch-0001"), "Aria's Current Whereabouts lost Eastwatch");
  },
};
