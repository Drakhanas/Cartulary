// A world exported, imported into a fresh browser, and exported again comes
// back the same file.
const fs = require("fs");
const path = require("path");
module.exports = {
  what: "a world's JSON export imports back unchanged",
  async run({ lib, open, check, tmp }) {
    const a = await open();
    await lib.importWorld(a, path.join(lib.ROOT, "tools/probes/worlds/basic.world.json"));
    const first = await lib.exportWorld(a);
    const file = path.join(tmp, "probe-world.world.json");
    fs.writeFileSync(file, first);
    const b = await open();
    await lib.importWorld(b, file);
    const second = await lib.exportWorld(b);
    const x = JSON.parse(first), y = JSON.parse(second);
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
      check(JSON.stringify(x[k]) === JSON.stringify(y[k]), `the round trip changed "${k}"`);
    }
  },
};
