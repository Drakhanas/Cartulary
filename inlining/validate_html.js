// Pulls every <script>…</script> block out of an HTML file and parses each
// one with @babel/parser. Verifies the inlined libs and our compiled output
// are syntactically valid before we ship.
//
// Usage: node validate_html.js <path-to-html>
//
// Note: HTML <script> blocks can technically contain anything until the
// literal </script> closing sequence — so this matches non-greedy.
const parser = require('@babel/parser');
const fs = require('fs');

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node validate_html.js <html-file>');
  process.exit(1);
}

const html = fs.readFileSync(filePath, 'utf8');

// Match every <script> block. Non-greedy across newlines.
// We accept type="text/babel" too (for the readable build); both are
// parsed as JS+JSX; the one without type is plain JS in our case.
const re = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/g;

let blockIdx = 0;
let totalSize = 0;
let m;
let allOk = true;

while ((m = re.exec(html)) !== null) {
  blockIdx += 1;
  const content = m[1];
  totalSize += content.length;
  // Some blocks (e.g. the favicon's data URI <svg> SHOULDN'T match here
  // because it's not in a <script> block — but if it does for any reason,
  // skip empty bodies)
  if (!content.trim()) continue;

  // Determine if this is a JSX block (readable build only).
  const tagText = html.substring(m.index, m.index + 200);
  const isJsx = /type=["']text\/babel["']/.test(tagText);

  try {
    parser.parse(content, {
      sourceType: 'script',
      allowReturnOutsideFunction: false,
      allowAwaitOutsideFunction: false,
      plugins: isJsx ? ['jsx'] : [],
      // Modern features that may appear in compiled output or libs
      errorRecovery: false,
    });
    process.stdout.write(`  ✓ block #${blockIdx} (${content.length.toLocaleString()} bytes${isJsx ? ', JSX' : ''})\n`);
  } catch (err) {
    process.stdout.write(`  ✗ block #${blockIdx}: ${err.message}\n`);
    allOk = false;
  }
}

if (allOk) {
  console.log(`\nALL OK · ${blockIdx} blocks, ${totalSize.toLocaleString()} bytes total`);
  process.exit(0);
} else {
  console.log(`\nFAILED — see ✗ blocks above`);
  process.exit(1);
}
