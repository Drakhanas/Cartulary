
// ─── Stemma Markdown (v1.7 r035) ──────────────────────────────────────────────
// The Markdown export (docs/stemma-v2-spec.md, section 9), one text for
// either layout, pure, lines ending in "\n": the name as a heading, the
// description, then a rota's tree as a nested list in slot order from 12
// o'clock, the root the first item (a freeform node its label, a linked
// node a [[wiki-link]] to the record's name in the pool, so a paste into a
// longform field links, an orphan its cached name marked unlinked), or a
// tabula's board: its free cards in reading order (top to bottom, then
// left to right) as a list, each column a heading with its cards as a
// list, a laned column (r033) its lanes as headings below it, a sub-board
// a nested section, its own content a heading deeper, headings capped at
// six; a note its title with its body indented under it, an image its file
// name with its caption, a board card in a list its title marked as a
// board with its section following its holder's; a card's stacks (r033)
// nested lists under the card, a titled stack an item of its own, an
// untitled one its cards directly, a row the same; shapes don't export.
const stemmaMarkdown = (stemma, pool) => {
  const lines = [];
  const name = (stemma && stemma.name) || "Untitled";
  lines.push(`# ${name}`, "");
  const desc = typeof stemma.description === "string" ? stemma.description.trim() : "";
  if (desc) lines.push(desc, "");
  const nameOf = (entryId, cached) => {
    const rec = (pool || []).find(e => e.id === entryId);
    return rec ? `[[${rec.name || "(unnamed)"}]]` : `${cached || "(unlinked)"} (unlinked)`;
  };
  if (stemma.layout !== "tabula") {
    const walk = (node, depth) => {
      const text = node.type === "linked" ? nameOf(node.entryId, node._cachedName) : (node.label || "(empty)");
      lines.push(`${"  ".repeat(depth)}- ${text}`);
      (node.children || []).slice().sort((a, b) => (a.slot || 0) - (b.slot || 0)).forEach(c => walk(c, depth + 1));
    };
    if (stemma.root) walk(stemma.root, 0);
    return lines.join("\n") + "\n";
  }
  const heading = (level, text) => `${"#".repeat(Math.min(6, level))} ${text}`;
  const indent = (depth) => "  ".repeat(depth);
  const laned = (col) => (col.items || []).some(c => c && c.type === "column");
  // one card as list lines at a depth, its stacks nested under it
  const cardLines = (it, depth) => {
    const out = [];
    if (it.type === "note") {
      out.push(`${indent(depth)}- ${it.title || "Untitled"}`);
      const body = (it.body || "").replace(/\s+$/, "");
      if (body) { out.push(""); body.split("\n").forEach(l => out.push(l ? `${indent(depth + 1)}${l}` : "")); out.push(""); }
    } else if (it.type === "linked") out.push(`${indent(depth)}- ${nameOf(it.entryId, it._cachedName)}`);
    else if (it.type === "image") out.push(`${indent(depth)}- ${it.image && !/^data:/.test(it.image) ? it.image : "(embedded image)"}${it.caption ? `: ${it.caption}` : ""}`);
    else if (it.type === "board") out.push(`${indent(depth)}- ${it.title || "Untitled board"} (board)`);
    else if (it.type === "column") { out.push(`${indent(depth)}- ${it.title || "Untitled column"}`); out.push(...stackLines(it, depth + 1)); return out; }
    else return out;
    if (it.type !== "board" && Array.isArray(it.items)) it.items.forEach(st => {
      if (st.title) { out.push(`${indent(depth + 1)}- ${st.title}`); out.push(...stackLines(st, depth + 2)); }
      else out.push(...stackLines(st, depth + 1));
    });
    return out;
  };
  // a stack's or a lane's cards as list lines; lanes within it as items of their own
  const stackLines = (col, depth) => {
    const out = [];
    (col.items || []).forEach(c => {
      if (c.type === "column") { out.push(`${indent(depth)}- ${c.title || "Untitled lane"}`); out.push(...stackLines(c, depth + 1)); }
      else out.push(...cardLines(c, depth));
    });
    return out;
  };
  const tidy = (arr) => { const out = []; arr.forEach(l => { if (l === "" && (out.length === 0 || out[out.length - 1] === "")) return; out.push(l); }); while (out.length && out[out.length - 1] === "") out.pop(); return out; };
  // the sub-boards below a board, in reading order where placed and in stack order inside columns and stacks, never a sub-board's own
  const boardsBelow = (node) => { const out = []; const walk = (n, sort) => (sort ? (n.items || []).slice().sort((a, b) => (a.y - b.y) || (a.x - b.x)) : (n.items || [])).forEach(it => { if (it.type === "board") out.push(it); else if (Array.isArray(it.items)) walk(it, false); }); walk(node, true); return out; };
  const column = (col, level) => {
    lines.push(heading(level, col.title || "Untitled column"), "");
    if (laned(col)) { col.items.forEach(l => column(l, level + 1)); return; }
    const body = tidy(col.items.flatMap(c => cardLines(c, 0)));
    lines.push(...(body.length ? body : ["_(empty)_"]), "");
  };
  const section = (board, level) => {
    const placed = (board.items || []).slice().sort((a, b) => (a.y - b.y) || (a.x - b.x));
    const free = tidy(placed.filter(it => it.type !== "column" && it.type !== "board").flatMap(c => cardLines(c, 0)));
    if (free.length) lines.push(...free, "");
    placed.filter(it => it.type === "column").forEach(col => column(col, level));
    boardsBelow(board).forEach(b => { lines.push(heading(level, b.title || "Untitled board"), ""); section(b, level + 1); });
  };
  if (stemma.root) section(stemma.root, 2);
  const out = tidy(lines);
  return out.join("\n") + "\n";
};