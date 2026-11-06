// A view dragged by its handle in the sidebar moves, and stays moved after a
// reload.
module.exports = {
  what: "a sidebar view drags to a new place and keeps it",
  async run({ lib, open, check }) {
    const page = await open();
    const names = () => page.locator("aside.sidebar .sidebar-scroll .nav-item-wrap .nav-name").allInnerTexts();
    const before = await names();
    const rows = page.locator("aside.sidebar .sidebar-scroll .nav-item-wrap");
    const r0 = await rows.nth(0).boundingBox(), r2 = await rows.nth(2).boundingBox();
    await page.mouse.move(r0.x + r0.width / 2, r0.y + r0.height / 2);
    const h = await rows.nth(0).locator(".nav-drag-handle").boundingBox();
    check(h, "the first view's drag handle isn't there");
    await lib.drag(page, h.x + h.width / 2, h.y + h.height / 2, h.x + h.width / 2, r2.y + r2.height * 0.75);
    const after = await names();
    const want = [before[1], before[2], before[0], ...before.slice(3)];
    check(after.join("|") === want.join("|"), `after the drag: ${after.slice(0, 4).join(", ")}`);
    await page.waitForTimeout(1500);
    await page.reload();
    await page.waitForSelector("aside.sidebar .world-name");
    check((await names()).join("|") === want.join("|"), "the new order didn't survive a reload");
  },
};
