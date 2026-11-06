// A template's entries exported as JSON and as CSV: imported back into the
// same world they change nothing, and into a world where one entry was edited
// they put it back.
const fs = require("fs");
const path = require("path");

async function exportEntries(page, fmt, tmp) {
  await page.click("button:has-text('Export ↓')");
  await page.click(".export-menu-wrap button:has-text('Export entries')");
  await page.locator(".modal button", { hasText: new RegExp("^" + fmt + "$") }).click();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.locator(".modal button", { hasText: /^Export$/ }).click()]);
  const file = path.join(tmp, dl.suggestedFilename());
  fs.copyFileSync(await dl.path(), file);
  return file;
}

async function startImport(page, file) {
  const [fc] = await Promise.all([page.waitForEvent("filechooser"), page.click("button:has-text('Import entries')")]);
  await fc.setFiles(file);
  return (await page.locator(".entries-import-counts").innerText()).replace(/\s+/g, " ").trim();
}

module.exports = {
  what: "a template's entries round-trip as JSON and as CSV",
  async run({ lib, open, check, tmp }) {
    const world = path.join(lib.ROOT, "tools/probes/worlds/basic.world.json");
    const edited = JSON.parse(fs.readFileSync(world, "utf8"));
    const aria = edited.entries.find(e => e.name === "Aria");
    const descId = Object.keys(aria.fields).find(k => typeof aria.fields[k] === "string" && aria.fields[k].startsWith("Captain"));
    const original = aria.fields[descId];
    aria.fields[descId] = "Overwritten.";
    const editedFile = path.join(tmp, "edited.world.json");
    fs.writeFileSync(editedFile, JSON.stringify(edited));

    const page = await open();
    await lib.importWorld(page, world);
    await lib.clickSidebar(page, "Character");
    for (const fmt of ["JSON", "CSV"]) {
      const file = await exportEntries(page, fmt, tmp);
      const same = await startImport(page, file);
      check(/^0 new · 0 updated · 2 unchanged/.test(same), `${fmt} into the same world: "${same}"`);
      check(await page.locator(".entries-import-go").isDisabled(), `${fmt}: Import is enabled with nothing to change`);
      await page.locator(".modal button", { hasText: /^Cancel$/ }).click();

      const fresh = await open();
      await lib.importWorld(fresh, editedFile);
      await lib.clickSidebar(fresh, "Character");
      const one = await startImport(fresh, file);
      check(/^0 new · 1 updated · 1 unchanged/.test(one), `${fmt} into the edited world: "${one}"`);
      await fresh.locator(".entries-import-go").click();
      const ariaIn = (s) => (s.entries.find(e => e.name === "Aria") || { fields: {} }).fields[descId];
      const st = await lib.waitForSaved(fresh, s => ariaIn(s) !== undefined && ariaIn(s) !== "Overwritten.", `${fmt}: Aria put back`);
      check(ariaIn(st) === original, `${fmt}: Aria's description came back as "${ariaIn(st)}"`);
      check(st.entries.length === 3, `${fmt}: ${st.entries.length} entries after the import`);
    }
  },
};
