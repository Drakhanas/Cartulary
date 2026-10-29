"""v1.7 r035: the Markdown export, both layouts.

Stemma v2's plan, item 10 (docs/stemma-v2-spec.md, section 11; section 9,
Exports). `<slug>.stemma.md` from the index row and the canvas bar, beside
the JSON export: the name as a heading, the description, then a rota's
tree as a nested list in slot order from 12 o'clock (the root the first
item; a freeform node its label, a linked node a [[wiki-link]] to the
record's name, an orphan its cached name marked unlinked), or a tabula's
board: its free cards in reading order (top to bottom, then left to
right) as a list, each column a heading with its cards as a list, a
laned column its lanes as headings below it, a sub-board a nested
section with its own content a heading deeper, headings capped at six; a
note its title with its body indented under it, an image its file name
with its caption, a board card in a list its title marked as a board with
its section following; a card's stacks (r033) nested lists under the
card, a titled stack an item of its own, an untitled one its cards
directly, a row the same; shapes don't export.

- 21_stemma: the Stemma Markdown section (stemmaMarkdown) before the
  index view; the index row's Markdown button; the two canvas bars'
  Markdown button (onExportMarkdown).
- 12_trunk: App's exportStemmaMarkdown, the pool built as the canvas's,
  passed to the index and both canvases.

Declared scope: 21_stemma.jsx, 12_trunk.jsx. Declarations added:
stemmaMarkdown. One header added: `Stemma Markdown (v1.7 r035)`.

String-anchored edits; every anchor must occur exactly once. Run from
anywhere inside the repository:
    python3 inlining/cuts/v1.7_r035_markdown_export.py
"""
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())
MODULES = ROOT / "cartulary-src" / "modules"


def edit(path, pairs):
    text = path.read_text(encoding="utf-8")
    for old, new in pairs:
        n = text.count(old)
        assert n == 1, f"{path.name}: anchor occurs {n} times, not 1:\n{old[:200]}"
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")


# ═══════════════════════════════════════════════════════════════════════════════
# 21_stemma: the writer, before the index view
# ═══════════════════════════════════════════════════════════════════════════════

WRITER_OLD = r"""// ─── Stemma index view ───────────────────────────────────────────────────────
// The Views-section landing page when the user clicks "Stemma" in the sidebar."""
WRITER_NEW = r"""// ─── Stemma Markdown (v1.7 r035) ──────────────────────────────────────────────
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

// ─── Stemma index view ───────────────────────────────────────────────────────
// The Views-section landing page when the user clicks "Stemma" in the sidebar."""

INDEX_SIG_OLD = r"""function StemmaIndexView({ state, isLocked, onOpen, onCreate, onImport, onExport, onDelete }) {"""
INDEX_SIG_NEW = r"""function StemmaIndexView({ state, isLocked, onOpen, onCreate, onImport, onExport, onExportMarkdown, onDelete }) {"""

INDEX_ROW_OLD = r"""                    onClick={ev => { ev.stopPropagation(); onExport(s); }}
                    title="Export this stemma as JSON"
                  >Export</button>"""
INDEX_ROW_NEW = r"""                    onClick={ev => { ev.stopPropagation(); onExport(s); }}
                    title="Export this stemma as JSON"
                  >Export</button>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: "3px 8px", fontSize: 12 }}
                    onClick={ev => { ev.stopPropagation(); onExportMarkdown && onExportMarkdown(s); }}
                    title="Export this stemma as Markdown"
                  >Markdown</button>"""

ROTA_SIG_OLD = r"""function StemmaCanvasView({ stemma, focalNodeId, entries, templates, isLocked, flash, onFocalChange, onBackToIndex, onReplace, onOpenEntry, onExport }) {"""
ROTA_SIG_NEW = r"""function StemmaCanvasView({ stemma, focalNodeId, entries, templates, isLocked, flash, onFocalChange, onBackToIndex, onReplace, onOpenEntry, onExport, onExportMarkdown }) {"""

ROTA_BAR_OLD = r"""          <button
            className="btn btn-ghost"
            onClick={onExport}
            style={{ padding: "4px 10px", fontSize: 13 }}
            title="Export this stemma as JSON"
          >Export</button>
        </div>
      </div>"""
ROTA_BAR_NEW = r"""          <button
            className="btn btn-ghost"
            onClick={onExport}
            style={{ padding: "4px 10px", fontSize: 13 }}
            title="Export this stemma as JSON"
          >Export</button>
          <button
            className="btn btn-ghost"
            onClick={onExportMarkdown}
            style={{ padding: "4px 10px", fontSize: 13 }}
            title="Export this stemma as Markdown"
          >Markdown</button>
        </div>
      </div>"""

TABULA_SIG_OLD = r"""function TabulaCanvasView({ stemma, boardId, entries, templates, isLocked, flash, onFocalChange, onBackToIndex, onReplace, onOpenEntry, onExport, viewPref, onViewPref, dirHandle, imageFolder }) {"""
TABULA_SIG_NEW = r"""function TabulaCanvasView({ stemma, boardId, entries, templates, isLocked, flash, onFocalChange, onBackToIndex, onReplace, onOpenEntry, onExport, onExportMarkdown, viewPref, onViewPref, dirHandle, imageFolder }) {"""

TABULA_BAR_OLD = r"""          <button className="btn btn-ghost" onClick={onExport} style={{ padding: "4px 10px", fontSize: 13 }} title="Export this tabula as JSON">Export</button>"""
TABULA_BAR_NEW = r"""          <button className="btn btn-ghost" onClick={onExport} style={{ padding: "4px 10px", fontSize: 13 }} title="Export this tabula as JSON">Export</button>
          <button className="btn btn-ghost" onClick={onExportMarkdown} style={{ padding: "4px 10px", fontSize: 13 }} title="Export this tabula as Markdown">Markdown</button>"""

# ═══════════════════════════════════════════════════════════════════════════════
# 12_trunk: App's export and the three sites
# ═══════════════════════════════════════════════════════════════════════════════

APP_EXPORT_OLD = r"""  // Read an imported stemma file. Either inserts directly (no name clash) or"""
APP_EXPORT_NEW = r"""  // v1.7 r035: the Markdown export, `<slug>.stemma.md`, the writer's text
  // over the pool the canvas draws on (the entries and every registered
  // record but the document itself), so a linked node names its record.
  const exportStemmaMarkdown = (stemma) => {
    if (!stemma) return;
    const pool = [...state.entries, ...getRegisteredGraphNodes(state).filter(n => n.id !== stemma.id)];
    const blob = new Blob([stemmaMarkdown(stemma, pool)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(stemma.name) || "stemma"}.stemma.md`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flash(`Exported stemma "${stemma.name}" as Markdown.`);
  };

  // Read an imported stemma file. Either inserts directly (no name clash) or"""

APP_INDEX_OLD = r"""              onImport={handleImportStemmaFile}
              onExport={exportStemmaJson}
              onDelete={deleteStemma}"""
APP_INDEX_NEW = r"""              onImport={handleImportStemmaFile}
              onExport={exportStemmaJson}
              onExportMarkdown={exportStemmaMarkdown}
              onDelete={deleteStemma}"""

APP_TABULA_OLD = r"""                  onExport={() => exportStemmaJson(stem)}
                  viewPref={(prefs.tabulaViews || {})[boardId] || null}"""
APP_TABULA_NEW = r"""                  onExport={() => exportStemmaJson(stem)}
                  onExportMarkdown={() => exportStemmaMarkdown(stem)}
                  viewPref={(prefs.tabulaViews || {})[boardId] || null}"""

APP_ROTA_OLD = r"""                onOpenEntry={openEntryFromAnywhere}
                onExport={() => exportStemmaJson(stem)}
              />
            );
          })()}"""
APP_ROTA_NEW = r"""                onOpenEntry={openEntryFromAnywhere}
                onExport={() => exportStemmaJson(stem)}
                onExportMarkdown={() => exportStemmaMarkdown(stem)}
              />
            );
          })()}"""


def main():
    edit(MODULES / "21_stemma.jsx", [
        (WRITER_OLD, WRITER_NEW),
        (INDEX_SIG_OLD, INDEX_SIG_NEW),
        (INDEX_ROW_OLD, INDEX_ROW_NEW),
        (ROTA_SIG_OLD, ROTA_SIG_NEW),
        (ROTA_BAR_OLD, ROTA_BAR_NEW),
        (TABULA_SIG_OLD, TABULA_SIG_NEW),
        (TABULA_BAR_OLD, TABULA_BAR_NEW),
    ])
    edit(MODULES / "12_trunk.jsx", [
        (APP_EXPORT_OLD, APP_EXPORT_NEW),
        (APP_INDEX_OLD, APP_INDEX_NEW),
        (APP_TABULA_OLD, APP_TABULA_NEW),
        (APP_ROTA_OLD, APP_ROTA_NEW),
    ])
    print("r035 applied: the Markdown export")


if __name__ == "__main__":
    main()
