const babel = require('@babel/parser');
const fs = require('fs');
const path = require('path');
// argv[2] or the assembled working HTML; nothing hard-codes /home/claude any more
const target = process.argv[2] || path.join(__dirname, '..', 'inlining', 'out', 'cartulary-working.html');
const html = fs.readFileSync(target, 'utf8');
const m = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/);
if (!m) { console.error('NO SCRIPT FOUND'); process.exit(1); }
try {
  babel.parse(m[1], { sourceType: 'module', plugins: ['jsx'] });
  console.log('PARSE OK');
} catch (e) {
  console.error('PARSE FAIL:', e.message);
  const lines = m[1].split('\n');
  const errLine = e.loc?.line || 0;
  const start = Math.max(0, errLine - 3);
  const end = Math.min(lines.length, errLine + 3);
  for (let i = start; i < end; i++) { console.error(`${i+1}: ${lines[i]}`); }
  process.exit(1);
}
