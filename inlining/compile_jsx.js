/**
 * compile_jsx.js — Node helper for precompiling Cartulary's JSX block.
 *
 * Reads JSX source from the file path passed as argv[2], runs it through
 * preset-react with the classic runtime (targets the React global, no
 * JSX-runtime imports), and writes the compiled JS to stdout.
 *
 * Tries @babel/core first; falls back to @babel/standalone when core
 * isn't installed (the offline tarball set ships standalone only).
 *
 * Called by build_inline.py during the precompiled build.
 */

const fs = require("fs");

let babel;
let usingStandalone = false;
try {
  babel = require("@babel/core");
} catch (e) {
  babel = require("@babel/standalone");
  usingStandalone = true;
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node compile_jsx.js <input.jsx>");
  process.exit(1);
}

const source = fs.readFileSync(inputPath, "utf8");

let result;
try {
  if (usingStandalone) {
    // @babel/standalone bundles preset-react under the short name "react".
    result = babel.transform(source, {
      presets: [["react", { runtime: "classic" }]],
      compact: true,
    });
  } else {
    result = babel.transformSync(source, {
      presets: [["@babel/preset-react", { runtime: "classic" }]],
      babelrc: false,
      configFile: false,
      compact: true,
    });
  }
} catch (e) {
  console.error("Babel transform failed:", e.message);
  process.exit(1);
}

process.stdout.write(result.code);
