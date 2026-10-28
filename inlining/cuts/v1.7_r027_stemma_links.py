"""v1.7 r027: links past entries.

Stemma v2's second cut (docs/stemma-v2-spec.md, section 5; the plan's item
2, approved 2026-10-27). A linked node pointed at entries, and, since v1.5's
r078, at celestial bodies merged into the canvas's entry pool by the render
site. Now it points at entries and every registered record, and stemmas are
a registered source themselves.

- 22_trunk: the `__stemmas__` source in NODE_SOURCE_REGISTRY, eligible as
  maps are, its instances the documents (kind: the layout), its edges from
  each document to every record its linked nodes point at; Fabula's
  descriptors gain `label`, the kind's own name, for pickers that name a
  hit's source.
- 21_stemma: four helpers (the linked targets of a document, a source's
  label, whether a record opens, the delete message with its counts); the
  node draws a registered record's own color; both pickers name a hit's
  source after its name; the linked inspector says what the node is linked
  to and offers Open only where something opens; the index's delete counts
  the references first.
- 12_trunk: the canvas's pool is the entries and every registered record
  but the document itself, its templates the world's and the registry's
  synthetic ones; `openEntryFromAnywhere` opens a stemma on its canvas;
  import counts missing links against the same pool; deleting a stemma
  clears the references to it from entries and Fabula's records.
- 13_form-engine-display: a reference to a stemma opens.

Declared scope: 22_trunk, 21_stemma, 12_trunk, 13_form-engine-display.
Declarations added: SYNTH_TPL_STEMMA, STEMMA_REF_LABEL (22_trunk);
stemmaLinkedTargets, stemmaSourceLabel, stemmaTargetOpens,
stemmaDeleteMessage (21_stemma).

String-anchored edits; every anchor must occur exactly once. Run from
anywhere inside the repository:
    python3 inlining/cuts/v1.7_r027_stemma_links.py
"""
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())
MODULES = ROOT / "cartulary-src" / "modules"


def edit(path, pairs):
    text = path.read_text(encoding="utf-8")
    for pair in pairs:
        old, new = pair[0], pair[1]
        count = pair[2] if len(pair) > 2 else 1
        n = text.count(old)
        assert n == count, f"{path.name}: anchor occurs {n} times, not {count}:\n{old[:200]}"
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")


# ─── 22_trunk: the registry ───────────────────────────────────────────────────

MAP_CONSTS = 'const SYNTH_TPL_MAP = "__maps__";\nconst MAP_REF_LABEL = "Map";\n'
STEMMA_CONSTS = MAP_CONSTS + '''
// Stemma sentinel (v1.7 r027; docs/stemma-v2-spec.md, section 5). A stemma is
// a document in state.stemmas, radial (a rota) or, from r029, a board (a
// tabula). Registered, a stemma is a reference target in every template
// builder, a node in Concordance with an edge to each record its linked nodes
// point at, and what a linked node in another stemma can open.
const SYNTH_TPL_STEMMA = "__stemmas__";
const STEMMA_REF_LABEL = "Stemma";
'''

FABULA_REG_COMMENT = "  // v1.7 r007: Fabula's record kinds (FABULA_KINDS), one source each. Not\n"
STEMMA_SOURCE = '''  // v1.7 r027: stemmas, both layouts (docs/stemma-v2-spec.md, section 5).
  // Eligible on purpose, as maps are: a field can point at a stemma, a linked
  // node in another stemma can, and Fabula's Brainstorm field will (r028).
  // The kind is the document's layout. The edges run from the document to
  // every record its linked nodes point at, one per target: Concordance
  // draws them, and Pipes' backlinks will read them as the stemma's mentions.
  {
    id: SYNTH_TPL_STEMMA,
    name: STEMMA_REF_LABEL,
    color: "#c8a96e",
    icon: "\\u274b", // ❋
    refEligible: true,
    getInstances: (state) =>
      (Array.isArray(state.stemmas) ? state.stemmas : [])
        .filter(s => s && s.id)
        .map(s => ({ id: s.id, name: (s.name || "Untitled Stemma"), kind: s.layout === "tabula" ? "tabula" : "rota" })),
    getColor: () => "#c8a96e",
    getEdges: (state) => {
      const edges = [];
      (Array.isArray(state.stemmas) ? state.stemmas : []).forEach(s => {
        if (!s || !s.id) return;
        stemmaLinkedTargets(s).forEach(target => {
          if (target !== s.id) edges.push({ source: s.id, target, label: "links", kind: "directed" });
        });
      });
      return edges;
    },
  },
''' + FABULA_REG_COMMENT

FABULA_LABEL_OLD = "  ...FABULA_KINDS.map(k => ({\n    id: k.id,\n    name: k.name,\n    color: k.color,\n"
FABULA_LABEL_NEW = "  ...FABULA_KINDS.map(k => ({\n    id: k.id,\n    name: k.name,\n    label: k.label,\n    color: k.color,\n"

# ─── 21_stemma: helpers, the node, the pickers, the inspector, the index ──────

HELPERS_ANCHOR = """const countStemmaDescendants = (node) => {
  if (!node || !Array.isArray(node.children)) return 0;
  return node.children.reduce((acc, c) => acc + 1 + countStemmaDescendants(c), 0);
};
"""
HELPERS_NEW = HELPERS_ANCHOR + """
// The ids every linked node of a document points at, each once (v1.7 r027).
// The registry's stemma source reads it for Concordance's edges, and the
// delete message for the nodes elsewhere that would orphan. Walks the radial
// tree; r029 teaches it a board's items.
const stemmaLinkedTargets = (stemma) => {
  const out = new Set();
  const walk = (node) => {
    if (!node) return;
    if (node.type === "linked" && node.entryId) out.add(node.entryId);
    (node.children || []).forEach(walk);
  };
  walk(stemma && stemma.root);
  return out;
};

// A registered source's label for a picker's hit or the inspector: the
// source's own label where it has one (a Fabula kind's), else its name.
const stemmaSourceLabel = (sourceId) => {
  const src = getRegisteredSourceById(sourceId);
  return src ? (src.label || src.name) : "";
};

// Whether a click can open what a linked node points at: an entry always;
// a registered record where the app has a page for it (a body, a map, a
// stemma, a Fabula record with a page), the rule resolveRefTarget applies to
// a reference chip. A Glossopoeia record resolves but opens nowhere yet.
const stemmaTargetOpens = (record) => {
  if (!record) return false;
  if (!record.synthetic) return true;
  const t = record.templateId;
  return t === SYNTH_TPL_MAP || t === BODY_REF_SENTINEL || t === SYNTH_TPL_STEMMA || fabulaRecordOpens(t);
};

// The index's delete confirmation (v1.7 r027), the map's pattern: it counts
// the references to the stemma from entries and from Fabula's records, which
// the delete clears, and the linked nodes in other stemmas, which orphan.
const stemmaDeleteMessage = (stemma, state) => {
  const entries = countInboundEntryRefs(state.entries, state.templates, stemma.id);
  const fab = fabulaInboundCounts(state, stemma.id).reduce((n, [, c]) => n + c, 0);
  const nodes = (state.stemmas || []).reduce((n, s) => (s && s.id !== stemma.id && stemmaLinkedTargets(s).has(stemma.id) ? n + 1 : n), 0);
  const parts = [];
  if (entries > 0) parts.push(`${entries} ${entries === 1 ? "entry" : "entries"}`);
  if (fab > 0) parts.push(`${fab} Fabula ${fab === 1 ? "record" : "records"}`);
  let refs = "";
  if (parts.length > 0) refs += ` Referenced by ${parts.join(" and ")}. Deleting this stemma removes ${entries + fab === 1 ? "that reference" : "those references"}; ${entries + fab === 1 ? "the record stays" : "the records stay"} intact.`;
  if (nodes > 0) refs += ` ${nodes} other ${nodes === 1 ? "stemma links" : "stemmas link"} to it; ${nodes === 1 ? "its node becomes an orphan" : "their nodes become orphans"}.`;
  return `Delete stemma "${stemma.name}"?${refs} This cannot be undone.`;
};
"""

NODE_COLOR_OLD = """    if (entry) {
      const tpl = (templates || []).find(t => t.id === entry.templateId);
      displayLabel = entry.name || "(unnamed)";
      displayColor = tpl?.color || "#888";
      displayIcon = tpl?.icon || "◈";
    } else {"""
NODE_COLOR_NEW = """    if (entry) {
      const tpl = (templates || []).find(t => t.id === entry.templateId);
      displayLabel = entry.name || "(unnamed)";
      // v1.7 r027: a registered record carries its own color (a body's by its
      // kind); its source's synthetic template gives the icon and the rest.
      displayColor = (entry.synthetic && entry.color) || tpl?.color || "#888";
      displayIcon = tpl?.icon || "◈";
    } else {"""

SMART_ROW_OLD = """              <span style={{ marginRight: 8, opacity: 0.7 }}>⛓</span>
              {e.name}
            </div>
          ))}
          <div style={{"""
SMART_ROW_NEW = """              <span style={{ marginRight: 8, opacity: 0.7 }}>⛓</span>
              {e.name}
              {e.synthetic && <span style={{ color: "var(--text-dim)" }}>{` (${stemmaSourceLabel(e.templateId)})`}</span>}
            </div>
          ))}
          <div style={{"""

PICKER_ROW_OLD = """              <span style={{ marginRight: 8, opacity: 0.7 }}>⛓</span>
              {e.name}
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>"""
PICKER_ROW_NEW = """              <span style={{ marginRight: 8, opacity: 0.7 }}>⛓</span>
              {e.name}
              {e.synthetic && <span style={{ color: "var(--text-dim)" }}>{` (${stemmaSourceLabel(e.templateId)})`}</span>}
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>"""

INSPECTOR_HEAD_OLD = """          <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>Linked to entry</div>"""
INSPECTOR_HEAD_NEW = """          <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>Linked to {entry && entry.synthetic ? stemmaSourceLabel(entry.templateId) : "entry"}</div>"""

INSPECTOR_OPEN_OLD = """          <button
            className="btn btn-ghost"
            style={{ fontSize: 12, width: "100%" }}
            onClick={() => entry && onOpenEntry(entry.id)}
          >Open entry →</button>
        </>"""
INSPECTOR_OPEN_NEW = """          {stemmaTargetOpens(entry) ? (
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12, width: "100%" }}
              onClick={() => entry && onOpenEntry(entry.id)}
            >Open {entry && entry.synthetic ? stemmaSourceLabel(entry.templateId) : "entry"} →</button>
          ) : (
            <div style={{ fontSize: 11, color: "var(--text-dim)", fontStyle: "italic" }}>
              Nothing opens a {stemmaSourceLabel(entry.templateId)} yet.
            </div>
          )}
        </>"""

INDEX_DELETE_OLD = """                        if (confirm(`Delete stemma "${s.name}"? This cannot be undone.`)) {"""
INDEX_DELETE_NEW = """                        if (confirm(stemmaDeleteMessage(s, state))) {"""

# ─── 12_trunk: App ────────────────────────────────────────────────────────────

OPEN_OLD = """    // v1.7 r009: a cast record, an arc, or a relationship opens on its own
    // page over its story's (Drak, 2026-10-25), since r011 an act, a chapter,
    // or a scene, since r013 a plot point or a promise, and since r014 a
    // research note."""
OPEN_NEW = """    // v1.7 r027: a stemma opens on its canvas, from a reference chip, a
    // wiki-link, Concordance, or a linked node in another stemma; the canvas
    // is keyed by document, so its history starts fresh.
    const stemRec = (state.stemmas || []).find(st => st && st.id === id);
    if (stemRec) {
      setActiveTagFilter(null);
      setActiveStemmaId(id);
      setFocalNodeId(stemRec.root ? stemRec.root.id : null);
      setView("stemma");
      return;
    }
    // v1.7 r009: a cast record, an arc, or a relationship opens on its own
    // page over its story's (Drak, 2026-10-25), since r011 an act, a chapter,
    // or a scene, since r013 a plot point or a promise, and since r014 a
    // research note."""

RENDER_OLD = """            // v1.5 r078: merge celestial bodies into the entry pool the Stemma
            // canvas/inspector/picker resolve against, so nodes can link to
            // bodies — the picker lists them, the breadcrumb/canvas resolve
            // their live name, and click routes into Ephemeris via
            // openEntryFromAnywhere. Body synth-entries carry the body sentinel
            // as templateId; the canvas falls back to a generic swatch (bodies
            // have no template) and the inspector shows "(no template)". If a
            // linked body is later deleted, the node orphans to _cachedName,
            // same graceful path as a deleted entry.
            const stemmaEntriesWithBodies = [
              ...state.entries,
              ...(state.celestialBodies || []).map(b => ({ id: b.id, name: b.name || "(unnamed)", templateId: BODY_REF_SENTINEL, _isBody: true })),
            ];
            return (
              <StemmaCanvasView
                key={`${stem.id}:${isLocked ? "locked" : "open"}`}
                stemma={stem}
                focalNodeId={focalNodeId}
                entries={stemmaEntriesWithBodies}
                templates={state.templates}"""
RENDER_NEW = """            // v1.7 r027: the pool the canvas, its pickers, and its inspector
            // resolve a linked node against is the entries and every registered
            // record (bodies, maps, Glossopoeia's and Fabula's records, and the
            // other stemmas), each registered record carrying its source's id as
            // its templateId and its own color; the templates are the world's and
            // the registry's synthetic ones, which give a record's icon and name.
            // Until r027 the pool was the entries and the bodies alone (v1.5
            // r078). A record that goes orphans its node to _cachedName.
            const stemmaPool = [
              ...state.entries,
              ...getRegisteredGraphNodes(state).filter(n => n.id !== stem.id),
            ];
            const stemmaTemplates = [...state.templates, ...getRegisteredSyntheticTemplates()];
            return (
              <StemmaCanvasView
                key={`${stem.id}:${isLocked ? "locked" : "open"}`}
                stemma={stem}
                focalNodeId={focalNodeId}
                entries={stemmaPool}
                templates={stemmaTemplates}"""

IMPORT_OLD = "      const missingRefs = collectStemmaMissingRefs(regenerated, state.entries);\n"
IMPORT_NEW = "      const missingRefs = collectStemmaMissingRefs(regenerated, [...state.entries, ...getRegisteredGraphNodes(state)]);\n"

DELETE_OLD = """  const deleteStemma = (stemmaId) => {
    if (isLocked) return;
    updateState(s => ({ ...s, stemmas: (s.stemmas || []).filter(st => st.id !== stemmaId) }));"""
DELETE_NEW = """  const deleteStemma = (stemmaId) => {
    if (isLocked) return;
    // v1.7 r027: a stemma is a reference target, so its delete clears the
    // references to it from every entry's fields and from Fabula's records,
    // as a map's and a body's do; the index's confirmation counts them first
    // (stemmaDeleteMessage). Linked nodes in other stemmas orphan.
    updateState(s => ({
      ...s,
      stemmas: (s.stemmas || []).filter(st => st.id !== stemmaId),
      entries: scrubEntryRefs(s.entries, s.templates, new Set([stemmaId])),
      fabula: scrubFabulaRefs(s, new Set([stemmaId])),
    }));"""

# ─── 13_form-engine-display: a reference to a stemma opens ────────────────────

RESOLVE_OLD = "open: n.templateId === SYNTH_TPL_MAP || n.templateId === BODY_REF_SENTINEL || fabulaRecordOpens(n.templateId), kind: src ? src.name : \"\" };"
RESOLVE_NEW = "open: n.templateId === SYNTH_TPL_MAP || n.templateId === BODY_REF_SENTINEL || n.templateId === SYNTH_TPL_STEMMA || fabulaRecordOpens(n.templateId), kind: src ? src.name : \"\" };"


def main():
    edit(MODULES / "22_trunk.jsx", [
        (MAP_CONSTS, STEMMA_CONSTS),
        (FABULA_REG_COMMENT, STEMMA_SOURCE),
        (FABULA_LABEL_OLD, FABULA_LABEL_NEW),
    ])
    edit(MODULES / "21_stemma.jsx", [
        (HELPERS_ANCHOR, HELPERS_NEW),
        (NODE_COLOR_OLD, NODE_COLOR_NEW),
        (SMART_ROW_OLD, SMART_ROW_NEW),
        (PICKER_ROW_OLD, PICKER_ROW_NEW),
        (INSPECTOR_HEAD_OLD, INSPECTOR_HEAD_NEW),
        (INSPECTOR_OPEN_OLD, INSPECTOR_OPEN_NEW),
        (INDEX_DELETE_OLD, INDEX_DELETE_NEW),
    ])
    edit(MODULES / "12_trunk.jsx", [
        (OPEN_OLD, OPEN_NEW),
        (RENDER_OLD, RENDER_NEW),
        (IMPORT_OLD, IMPORT_NEW),
        (DELETE_OLD, DELETE_NEW),
    ])
    edit(MODULES / "13_form-engine-display.jsx", [(RESOLVE_OLD, RESOLVE_NEW)])
    trunk = (MODULES / "12_trunk.jsx").read_text(encoding="utf-8")
    assert "stemmaEntriesWithBodies" not in trunk and "_isBody: true })),\n            ];" not in trunk
    print("r027 applied: the registry gains the stemma source; the canvas's pool is every registered record; a stemma opens from anywhere; its delete counts and clears")


if __name__ == "__main__":
    main()
