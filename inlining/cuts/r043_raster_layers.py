"""r043: raster layers (Cartographia+ cut 13 of the amendment).

A layer gains `kind`: "vector" (absent means vector, so every old world loads
unchanged and gains the key on its next save) or "raster". A raster layer
holds one bitmap instead of shapes: `image` (a filename in the image folder,
or a data URL of a PNG, JPEG, or WebP), `width` and `height` (the canvas
units it covers; a canvas resize clips it, as shapes keep their coordinates),
`shapes` always empty. The renderer draws it as one <image> in stack order,
stretched to its units, so the HTML export, the SVG download, the PNG
download, and the bucket fill's trace carry it; a file the export or the
download cannot read leaves the layer out with a note naming it.

The Layers panel gains "+ Add raster layer", a `raster` badge on the row,
"Load image…" (a bitmap scaled to cover the canvas width with its aspect
kept, capped at 4096 on the long side; a JPEG stays a JPEG unless the cap
scales it; written to the image folder as <map id>-<layer id>.<ext> when one
is connected, inline otherwise with Set Image's 1 MB warning) and "Clear".
With a raster layer active the shape tools refuse, as a locked layer does,
and the hint says paint tools come with the next cut; a selected shape
cannot be moved onto a raster layer.

Decided (Drak, 2026-10-22): every recommendation.

Declared scope: 16_trunk (+MAP_RASTER_LAYER, +mapRasterLayerCheck,
+mapDecodeImage, +useMapLayerImages), 08_export-layer (refs and the map
render), 12_trunk (the editor's recordId), shell.html (the badge).

String-anchored edits; every anchor must occur exactly once. Run from the
repository root against the r042 tree: python3 inlining/cuts/r043_raster_layers.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
MOD = ROOT / "cartulary-src" / "modules"
SHELL = ROOT / "cartulary-src" / "shell.html"


def edit(path, pairs):
    s = path.read_text(encoding="utf-8")
    for old, new in pairs:
        c = s.count(old)
        assert c == 1, f"{path.name}: anchor occurs {c} times: {old[:80]!r}"
        s = s.replace(old, new)
    path.write_text(s, encoding="utf-8")


def replace_span(path, start, end, new):
    s = path.read_text(encoding="utf-8")
    assert s.count(start) == 1, f"{path.name}: start anchor occurs {s.count(start)} times"
    assert s.count(end) == 1, f"{path.name}: end anchor occurs {s.count(end)} times"
    a = s.index(start)
    b = s.index(end) + len(end)
    assert a < b
    path.write_text(s[:a] + new + s[b:], encoding="utf-8")


LAYER_PANEL = r'''function MapLayerPanel({ drawing, onLoadImage, missing }) {
  const { layers, activeLayerId, setActiveLayerId, addLayer, renameLayer, toggleLayerVisible, toggleLayerLocked, moveLayer, deleteLayer, clearLayerImage } = drawing;
  const rows = [...layers].reverse();
  const lost = Array.isArray(missing) ? missing : [];
  return (
    <div className="map-layers">
      <div className="map-layers-head">
        <span className="map-tools-label">Layers</span>
        <span className="map-layers-note">Top of the stack first. Shapes go to the active layer.</span>
        <span style={{ flex: 1 }} />
        <button type="button" className="btn btn-small btn-ghost" onClick={() => addLayer("vector")}>+ Add layer</button>
        <button type="button" className="btn btn-small btn-ghost" onClick={() => addLayer("raster")} title="A layer that holds one bitmap: load a scan or a painting into it">+ Add raster layer</button>
      </div>
      {rows.map((l, i) => {
        const idx = layers.length - 1 - i;
        const active = l.id === activeLayerId;
        const raster = l.kind === "raster";
        const count = raster
          ? (l.image ? (lost.includes(l.image) ? "file missing" : "image") : "empty")
          : `${l.shapes.length} ${l.shapes.length === 1 ? "shape" : "shapes"}`;
        return (
          <div key={l.id} className={`map-layer-row ${active ? "active" : ""} ${l.visible ? "" : "hidden-layer"}`}>
            <button type="button" className={`map-layer-pick ${active ? "active" : ""}`} title={active ? "Active layer" : "Make this the active layer"} onClick={() => setActiveLayerId(l.id)}>{active ? "◉" : "○"}</button>
            <input
              className="input map-layer-name"
              value={l.name}
              onChange={e => renameLayer(l.id, e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") e.target.blur(); }}
              title="Layer name"
            />
            {raster && <span className="map-layer-kind" title="A raster layer holds one bitmap; the shape tools draw on vector layers">raster</span>}
            <span className="map-layer-count" title={raster && l.image && !l.image.startsWith("data:") ? l.image : undefined}>{count}</span>
            {raster && <button type="button" className="btn btn-small btn-ghost" onClick={() => onLoadImage && onLoadImage(l.id)} title="Load a PNG, JPEG, or WebP into this layer, scaled to the canvas width">Load image…</button>}
            {raster && <button type="button" className="btn btn-small btn-ghost" disabled={!l.image} onClick={() => clearLayerImage(l.id)} title="Empty this layer (undo brings the image back)">Clear</button>}
            <button type="button" className={`btn btn-small ${l.visible ? "btn-ghost" : "btn-accent"}`} onClick={() => toggleLayerVisible(l.id)} title={l.visible ? "Hide this layer (it stays out of the export too)" : "Show this layer"}>{l.visible ? "Hide" : "Hidden"}</button>
            <button type="button" className={`btn btn-small ${l.locked ? "btn-accent" : "btn-ghost"}`} onClick={() => toggleLayerLocked(l.id)} title={l.locked ? "Unlock this layer" : "Lock this layer (nothing on it can be selected or drawn)"}>{l.locked ? "Locked" : "Lock"}</button>
            <button type="button" className="btn btn-small btn-ghost" disabled={idx === layers.length - 1} onClick={() => moveLayer(l.id, 1)} title="Move up the stack">↑</button>
            <button type="button" className="btn btn-small btn-ghost" disabled={idx === 0} onClick={() => moveLayer(l.id, -1)} title="Move down the stack">↓</button>
            <button type="button" className="btn btn-small btn-danger" disabled={layers.length === 1} onClick={() => deleteLayer(l.id)} title={layers.length === 1 ? "The last layer stays" : "Delete this layer"}>×</button>
          </div>
        );
      })}
    </div>
  );
}
'''

LAYER_IMAGES_HOOK = r'''
// The urls of a drawing's raster layers whose image is a file in the image
// folder, keyed by filename: a blob url through the folder handle, or the
// relative path when no folder is connected (as useMapImageUrl does for the
// map image); a data URL needs no lookup and is not here. `missing` lists the
// filenames the handle could not open. Re-resolved when the set of files
// changes, the blob urls revoked then.
function useMapLayerImages(layers, dirHandle, imageFolder) {
  const refs = (Array.isArray(layers) ? layers : []).filter(l => l && l.kind === "raster" && typeof l.image === "string" && l.image && !l.image.startsWith("data:")).map(l => l.image);
  const key = refs.join("\n");
  const [state, setState] = useState({ urls: {}, missing: [] });
  useEffect(() => {
    let cancelled = false;
    const made = [];
    if (refs.length === 0) { setState({ urls: {}, missing: [] }); return undefined; }
    if (!dirHandle) {
      const urls = {};
      refs.forEach(r => { urls[r] = `${imageFolder || "world-images"}/${r}`; });
      setState({ urls, missing: [] });
      return undefined;
    }
    (async () => {
      const urls = {}, missing = [];
      for (const r of refs) {
        try {
          const fh = await dirHandle.getFileHandle(r);
          const file = await fh.getFile();
          const u = URL.createObjectURL(file);
          made.push(u);
          urls[r] = u;
        } catch (err) {
          missing.push(r);
        }
      }
      if (!cancelled) setState({ urls, missing });
    })();
    return () => { cancelled = true; made.forEach(u => URL.revokeObjectURL(u)); };
  }, [key, dirHandle, imageFolder]);
  return state;
}
'''

edit(MOD / "16_trunk.jsx", [
    # ---- model: the layer defaults and the raster constants
    ("""function makeDefaultMapLayer(name) {
  return { id: `layer-${genId().slice(-6)}`, name: name || "Drawing", visible: true, locked: false, shapes: [] };
}""",
     """function makeDefaultMapLayer(name, kind, width, height) {
  const base = { id: `layer-${genId().slice(-6)}`, name: name || "Drawing", visible: true, locked: false, shapes: [] };
  if (kind === "raster") {
    const pos = (v, d) => (Number.isFinite(v) && v > 0 ? Math.round(v) : d);
    return { ...base, kind: "raster", image: null, width: pos(width, MAP_DRAWING_DEFAULT_SIZE.width), height: pos(height, MAP_DRAWING_DEFAULT_SIZE.height) };
  }
  return { ...base, kind: "vector" };
}

// Raster layers (r043): a layer may hold one bitmap instead of shapes. The
// bitmap is capped at 4096 on the long side; inline (no image folder) it is
// a data URL of a PNG, JPEG, or WebP under the byte cap, with a warning past
// one megabyte as Set Image gives.
const MAP_RASTER_LAYER = { maxSide: 4096, maxBytes: 50331648, inlineWarn: 1048576 };

// The load-time check of an inline raster layer image: a PNG, JPEG, or WebP
// data URL, plain base64, under the byte cap. A filename is checked for shape
// too: no path separators, no scheme.
function mapRasterLayerCheck(v) {
  if (typeof v !== "string" || !v) return false;
  if (v.startsWith("data:")) return v.length <= MAP_RASTER_LAYER.maxBytes * 4 / 3 + 64 && /^data:image\\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(v);
  return v.length <= 255 && !/[\\/\\\\:]/.test(v);
}

// A File, Blob, or URL decoded into an HTMLImageElement, for its size and
// for drawing it to a canvas. Rejects when the browser will not decode it.
function mapDecodeImage(src) {
  return new Promise((resolve, reject) => {
    const url = typeof src === "string" ? src : URL.createObjectURL(src);
    const done = (fn, v) => { if (typeof src !== "string") URL.revokeObjectURL(url); fn(v); };
    const img = new Image();
    img.onload = () => done(resolve, img);
    img.onerror = () => done(reject, new Error("the image would not decode"));
    img.src = url;
  });
}"""),
    ("""  const layersSrc = (Array.isArray(src.layers) ? src.layers : []).filter(l => l && typeof l === "object");
  const layers = layersSrc.map((l, i) => ({
    id: (typeof l.id === "string" && l.id) ? l.id : `layer-${genId().slice(-6)}`,
    name: (typeof l.name === "string" && l.name.trim()) ? l.name : `Layer ${i + 1}`,
    visible: l.visible !== false,
    locked: l.locked === true,
    shapes: (Array.isArray(l.shapes) ? l.shapes : []).map(ensureMapShape).filter(Boolean),
  }));
  if (layers.length === 0) layers.push(makeDefaultMapLayer("Drawing"));
  return {
    width: Math.max(1, Math.round(num(src.width, MAP_DRAWING_DEFAULT_SIZE.width))),
    height: Math.max(1, Math.round(num(src.height, MAP_DRAWING_DEFAULT_SIZE.height))),
    background: {""",
     """  const width = Math.max(1, Math.round(num(src.width, MAP_DRAWING_DEFAULT_SIZE.width)));
  const height = Math.max(1, Math.round(num(src.height, MAP_DRAWING_DEFAULT_SIZE.height)));
  const layersSrc = (Array.isArray(src.layers) ? src.layers : []).filter(l => l && typeof l === "object");
  const layers = layersSrc.map((l, i) => {
    const base = {
      id: (typeof l.id === "string" && l.id) ? l.id : `layer-${genId().slice(-6)}`,
      name: (typeof l.name === "string" && l.name.trim()) ? l.name : `Layer ${i + 1}`,
      visible: l.visible !== false,
      locked: l.locked === true,
    };
    if (l.kind === "raster") {
      // one bitmap, no shapes (r043); a bad image reference loads as an empty layer
      const pos = (v, d) => (Number.isFinite(v) && v > 0 ? Math.round(v) : d);
      return { ...base, kind: "raster", image: mapRasterLayerCheck(l.image) ? l.image : null, width: pos(l.width, width), height: pos(l.height, height), shapes: [] };
    }
    return { ...base, kind: "vector", shapes: (Array.isArray(l.shapes) ? l.shapes : []).map(ensureMapShape).filter(Boolean) };
  });
  if (layers.length === 0) layers.push(makeDefaultMapLayer("Drawing"));
  return {
    width,
    height,
    background: {"""),
    ("""function mapDrawingHasContent(drawing) {
  const d = ensureDrawingShape(drawing);
  return d.layers.some(l => l.shapes.length > 0);
}""",
     """function mapDrawingHasContent(drawing) {
  const d = ensureDrawingShape(drawing);
  return d.layers.some(l => (l.kind === "raster" ? !!l.image : l.shapes.length > 0));
}"""),
    # ---- the renderer: a raster layer is one <image> in stack order
    ("""// opts: { id, className, label, imageHref, imageWidth, imageHeight, stamps,
// placeholder }. stamps is the world's imported stamps (state.mapStamps), which
// the built-ins come before; placeholder is the editor's, see mapShapeNode.""",
     """// opts: { id, className, label, imageHref, imageWidth, imageHeight, stamps,
// placeholder, layerImages }. stamps is the world's imported stamps
// (state.mapStamps), which the built-ins come before; placeholder is the
// editor's, see mapShapeNode; layerImages maps a raster layer's filename to
// the url that draws it (a data URL draws as it is), and a raster layer with
// no url is left out (r043)."""),
    ("""  d.layers.forEach(layer => {
    if (!layer.visible) return;
    children.push({ tag: "g", attrs: { "data-layer": layer.id }, children: layer.shapes.map(s => mapShapeNode(s, ctx)).filter(Boolean) });
  });
  ctx.stampsUsed.forEach(def => {
    const id = `${idBase}-stamp-${String(def.id).replace(/[^A-Za-z0-9_-]/g, "")}`;""",
     """  const layerHref = (layer) => {
    if (!layer.image) return null;
    if (layer.image.startsWith("data:")) return layer.image;
    const m = o.layerImages;
    const v = m ? (m instanceof Map ? m.get(layer.image) : m[layer.image]) : null;
    return typeof v === "string" && v ? v : null;
  };
  d.layers.forEach(layer => {
    if (!layer.visible) return;
    if (layer.kind === "raster") {
      // the bitmap stretched to the units it covers; past the canvas it is clipped
      const href = layerHref(layer);
      if (href) children.push({ tag: "image", attrs: { "data-layer": layer.id, "data-kind": "raster", href, x: "0", y: "0", width: f(layer.width), height: f(layer.height), preserveAspectRatio: "none" } });
      return;
    }
    children.push({ tag: "g", attrs: { "data-layer": layer.id }, children: layer.shapes.map(s => mapShapeNode(s, ctx)).filter(Boolean) });
  });
  ctx.stampsUsed.forEach(def => {
    const id = `${idBase}-stamp-${String(def.id).replace(/[^A-Za-z0-9_-]/g, "")}`;"""),
    # ---- the hook: a raster layer refuses the shape tools, holds no selectable shape
    ("""  const activeLayer = layers.find(l => l.id === activeLayerId) || layers.find(l => l.visible && !l.locked) || layers[0] || null;
  const targetLayer = activeLayer && activeLayer.visible && !activeLayer.locked ? activeLayer : null;
  const allShapes = layers.flatMap(l => l.shapes);
  const selectable = layers.filter(l => l.visible && !l.locked).flatMap(l => l.shapes);""",
     """  const activeLayer = layers.find(l => l.id === activeLayerId) || layers.find(l => l.visible && !l.locked && l.kind !== "raster") || layers[0] || null;
  const targetLayer = activeLayer && activeLayer.visible && !activeLayer.locked && activeLayer.kind !== "raster" ? activeLayer : null;
  const allShapes = layers.flatMap(l => l.shapes);
  const selectable = layers.filter(l => l.visible && !l.locked && l.kind !== "raster").flatMap(l => l.shapes);"""),
    ("""  const addLayer = () => {
    const layer = makeDefaultMapLayer(`Layer ${layers.length + 1}`);
    setLayers([...layers, layer]);
    setActiveLayerId(layer.id);
  };""",
     """  const addLayer = (kind) => {
    const raster = kind === "raster";
    const name = raster ? `Raster ${layers.filter(l => l.kind === "raster").length + 1}` : `Layer ${layers.length + 1}`;
    const layer = makeDefaultMapLayer(name, raster ? "raster" : "vector", drawing.width, drawing.height);
    setLayers([...layers, layer]);
    setActiveLayerId(layer.id);
  };
  // A raster layer's bitmap (r043): the image reference with the canvas units
  // it covers, one history step; Clear keeps the layer and its units.
  const setLayerImage = (id, image, w, h) => setLayers(layers.map(l => (l.id === id && l.kind === "raster" ? { ...l, image, width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) } : l)));
  const clearLayerImage = (id) => setLayers(layers.map(l => (l.id === id && l.kind === "raster" ? { ...l, image: null } : l)));"""),
    ("""    if (l.shapes.length > 0 && !confirm(`Delete layer "${l.name}" and its ${l.shapes.length} ${l.shapes.length === 1 ? "shape" : "shapes"}? Undo brings it back.`)) return;""",
     """    if (l.kind === "raster" && l.image && !confirm(`Delete the raster layer "${l.name}" and its image? Undo brings it back.`)) return;
    if (l.shapes.length > 0 && !confirm(`Delete layer "${l.name}" and its ${l.shapes.length} ${l.shapes.length === 1 ? "shape" : "shapes"}? Undo brings it back.`)) return;"""),
    ("""    const shape = from ? from.shapes.find(s => s.id === shapeId) : null;
    if (!shape || !layers.some(l => l.id === layerId) || from.id === layerId) return;""",
     """    const shape = from ? from.shapes.find(s => s.id === shapeId) : null;
    if (!shape || !layers.some(l => l.id === layerId && l.kind !== "raster") || from.id === layerId) return;"""),
    ("""  if (tool !== "pin" && !targetLayer) {
    hint = activeLayer
      ? `The active layer "${activeLayer.name}" is ${activeLayer.visible ? "locked" : "hidden"}; pick another in Layers, or ${activeLayer.visible ? "unlock" : "show"} it`
      : "No layer to draw on; add one in Layers";
  }""",
     """  if (tool !== "pin" && !targetLayer) {
    hint = activeLayer
      ? (activeLayer.kind === "raster"
        ? `"${activeLayer.name}" is a raster layer; paint tools come with the next cut. Pick a vector layer in Layers to draw shapes`
        : `The active layer "${activeLayer.name}" is ${activeLayer.visible ? "locked" : "hidden"}; pick another in Layers, or ${activeLayer.visible ? "unlock" : "show"} it`)
      : "No layer to draw on; add one in Layers";
  }"""),
    ("""    addLayer, renameLayer, toggleLayerVisible, toggleLayerLocked, moveLayer, deleteLayer, moveShapeToLayer,
    onSvgMouseDown, onSvgClick, onSvgDoubleClick, onSvgMouseMove, onSvgContextMenu,
  };
}""",
     """    addLayer, renameLayer, toggleLayerVisible, toggleLayerLocked, moveLayer, deleteLayer, moveShapeToLayer, setLayerImage, clearLayerImage,
    onSvgMouseDown, onSvgClick, onSvgDoubleClick, onSvgMouseMove, onSvgContextMenu,
  };
}"""),
    # the bucket fill traces raster layers too
    ("""      const tree = buildMapDrawingTree({ ...drawing, background: { ...drawing.background, grain: 0 } }, {
        id: "fill", imageHref: fc.imageHref, imageWidth: fc.imageWidth, imageHeight: fc.imageHeight, stamps: fc.stamps,
      });""",
     """      const tree = buildMapDrawingTree({ ...drawing, background: { ...drawing.background, grain: 0 } }, {
        id: "fill", imageHref: fc.imageHref, imageWidth: fc.imageWidth, imageHeight: fc.imageHeight, stamps: fc.stamps, layerImages: fc.layerImages,
      });"""),
    # ---- the strip: the layer selects
    ("""          {layers.map(l => <option key={l.id} value={l.id}>{l.name}{l.visible ? "" : " (hidden)"}{l.locked ? " (locked)" : ""}</option>)}""",
     """          {layers.map(l => <option key={l.id} value={l.id}>{l.name}{l.kind === "raster" ? " (raster)" : ""}{l.visible ? "" : " (hidden)"}{l.locked ? " (locked)" : ""}</option>)}"""),
    ("""          {selectedShape && layers.length > 1 && (
            <>
              <span className="map-tools-label">Layer</span>
              <select className="input map-tools-select" value={shapeLayer ? shapeLayer.id : ""} onChange={e => moveShapeToLayer(selectedShape.id, e.target.value)} title="Move this shape to another layer">
                {layers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </>
          )}""",
     """          {selectedShape && layers.filter(l => l.kind !== "raster").length > 1 && (
            <>
              <span className="map-tools-label">Layer</span>
              <select className="input map-tools-select" value={shapeLayer ? shapeLayer.id : ""} onChange={e => moveShapeToLayer(selectedShape.id, e.target.value)} title="Move this shape to another vector layer">
                {layers.filter(l => l.kind !== "raster").map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </>
          )}"""),
    # ---- the hook for folder-held layer images, after useMapImageUrl
    ("""  return { url, errored, setErrored };
}

// The map font for a downloaded file.""",
     """  return { url, errored, setErrored };
}
""" + LAYER_IMAGES_HOOK + """
// The map font for a downloaded file."""),
    # ---- the download: raster layers read through the handle, missing ones named
    ("""// fetched, href doubled as xlink:href on image, use, and textPath so older
// viewers open it, and width and height on the root so a viewer, and Firefox
// drawing it to a canvas, know its size. Returns { svg, width, height,
// imageMissing }.""",
     """// fetched, href doubled as xlink:href on image, use, and textPath so older
// viewers open it, and width and height on the root so a viewer, and Firefox
// drawing it to a canvas, know its size. Raster layers are read the same way
// (r043); one that cannot be read is left out and named in layersMissing.
// Returns { svg, width, height, imageMissing, layersMissing }."""),
    ("""  const size = imageHref ? await loadImageNaturalSizeForExport(imageHref) : null;
  if (imageHref && !size) { imageHref = null; imageMissing = true; }
  const tree = buildMapDrawingTree(mapData.drawing, {
    id: rec.id,
    label: rec.name,
    imageHref,
    imageWidth: size ? size.width : null,
    imageHeight: size ? size.height : null,
    stamps: state ? state.mapStamps : [],
  });""",
     """  const size = imageHref ? await loadImageNaturalSizeForExport(imageHref) : null;
  if (imageHref && !size) { imageHref = null; imageMissing = true; }
  const layerImages = {};
  const layersMissing = [];
  for (const l of mapData.drawing.layers) {
    if (l.kind !== "raster" || !l.image || !l.visible || l.image.startsWith("data:")) continue;
    let got = false;
    if (dirHandle) {
      try {
        const fh = await dirHandle.getFileHandle(l.image);
        layerImages[l.image] = await fileToDataUrl(await fh.getFile());
        got = true;
      } catch (err) {
        got = false;
      }
    }
    if (!got) layersMissing.push(l.name);
  }
  const tree = buildMapDrawingTree(mapData.drawing, {
    id: rec.id,
    label: rec.name,
    imageHref,
    imageWidth: size ? size.width : null,
    imageHeight: size ? size.height : null,
    stamps: state ? state.mapStamps : [],
    layerImages,
  });"""),
    ("""  return { svg: `<?xml version="1.0" encoding="UTF-8"?>\\n${mapTreeToString(tree)}`, width: tree.width, height: tree.height, imageMissing };
}""",
     """  return { svg: `<?xml version="1.0" encoding="UTF-8"?>\\n${mapTreeToString(tree)}`, width: tree.width, height: tree.height, imageMissing, layersMissing };
}"""),
    ("""      if (built.imageMissing) note += " The image could not be read, so the file has the drawing only.";""",
     """      if (built.imageMissing) note += " The image could not be read, so the file has the drawing only.";
      if (built.layersMissing && built.layersMissing.length) note += ` The raster ${built.layersMissing.length === 1 ? "layer" : "layers"} ${built.layersMissing.map(n => `"${n}"`).join(", ")} could not be read and ${built.layersMissing.length === 1 ? "is" : "are"} left out.`;"""),
    # ---- the view: folder-held layer images resolved
    ("""  const canvasReady = !mapData.image || (!errored && !!imageUrl && !!imageSize);
  const canvasTree = useMemo(() => buildMapDrawingTree(mapData.drawing, {
    id: entry.id,
    className: "map-image",
    label: entry.name,
    imageHref: mapData.image ? imageUrl : null,
    imageWidth: imageSize ? imageSize.width : null,
    imageHeight: imageSize ? imageSize.height : null,
    stamps: state ? state.mapStamps : [],
  }), [mapData, entry.id, entry.name, imageUrl, imageSize, state ? state.mapStamps : null]);""",
     """  const canvasReady = !mapData.image || (!errored && !!imageUrl && !!imageSize);
  const layerImages = useMapLayerImages(mapData.drawing.layers, dirHandle, imageFolder);
  const canvasTree = useMemo(() => buildMapDrawingTree(mapData.drawing, {
    id: entry.id,
    className: "map-image",
    label: entry.name,
    imageHref: mapData.image ? imageUrl : null,
    imageWidth: imageSize ? imageSize.width : null,
    imageHeight: imageSize ? imageSize.height : null,
    stamps: state ? state.mapStamps : [],
    layerImages: layerImages.urls,
  }), [mapData, entry.id, entry.name, imageUrl, imageSize, state ? state.mapStamps : null, layerImages]);"""),
    # ---- the editor: recordId, layer images, the fill context, Load image, the panel
    ("""function MapEditor({ mapData, onChange, dirHandle, imageFolder, entries, bodies, flash, stamps }) {""",
     """function MapEditor({ mapData, onChange, dirHandle, imageFolder, entries, bodies, flash, stamps, recordId }) {"""),
    ("""  const canvasReady = !data.image || (!errored && !!imageUrl && !!imageSize);
  const canvasTree = useMemo(() => buildMapDrawingTree(data.drawing, {
    id: "editor",
    className: "map-image",
    imageHref: data.image ? imageUrl : null,
    imageWidth: imageSize ? imageSize.width : null,
    imageHeight: imageSize ? imageSize.height : null,
    stamps,
    placeholder: true,
  }), [data, imageUrl, imageSize, stamps]);""",
     """  const canvasReady = !data.image || (!errored && !!imageUrl && !!imageSize);
  const layerImages = useMapLayerImages(data.drawing.layers, dirHandle, imageFolder);
  const canvasTree = useMemo(() => buildMapDrawingTree(data.drawing, {
    id: "editor",
    className: "map-image",
    imageHref: data.image ? imageUrl : null,
    imageWidth: imageSize ? imageSize.width : null,
    imageHeight: imageSize ? imageSize.height : null,
    stamps,
    placeholder: true,
    layerImages: layerImages.urls,
  }), [data, imageUrl, imageSize, stamps, layerImages]);"""),
    ("""  // What the bucket fill rasterizes besides the drawing: the image as a data
  // URL (a folder image's blob URL cannot be loaded inside a sealed svg, so it
  // is read once per image and kept), its natural size, and the stamps.
  const fillImageRef = useRef({ url: null, data: null });
  const fillContext = async () => {
    let imageHref = null;
    if (data.image && imageUrl && imageSize) {
      if (imageUrl.startsWith("data:")) {
        imageHref = imageUrl;
      } else {
        if (fillImageRef.current.url !== imageUrl) {
          try {
            fillImageRef.current = { url: imageUrl, data: await fileToDataUrl(await (await fetch(imageUrl)).blob()) };
          } catch (err) {
            fillImageRef.current = { url: imageUrl, data: null };
          }
        }
        imageHref = fillImageRef.current.data;
      }
    }
    return { imageHref, imageWidth: imageSize ? imageSize.width : null, imageHeight: imageSize ? imageSize.height : null, stamps };
  };""",
     """  // What the bucket fill rasterizes besides the drawing: the image and every
  // raster layer as data URLs (a folder file's blob URL cannot be loaded
  // inside a sealed svg, so each is read once and kept by its url), the
  // image's natural size, and the stamps.
  const fillImageRef = useRef(new Map());
  const inlineUrl = async (url) => {
    if (!url) return null;
    if (url.startsWith("data:")) return url;
    const cache = fillImageRef.current;
    if (!cache.has(url)) {
      try { cache.set(url, await fileToDataUrl(await (await fetch(url)).blob())); } catch (err) { cache.set(url, null); }
    }
    return cache.get(url);
  };
  const fillContext = async () => {
    let imageHref = null;
    if (data.image && imageUrl && imageSize) imageHref = await inlineUrl(imageUrl);
    const inlined = {};
    for (const l of data.drawing.layers) {
      if (l.kind !== "raster" || !l.image || l.image.startsWith("data:")) continue;
      const v = await inlineUrl(layerImages.urls[l.image]);
      if (v) inlined[l.image] = v;
    }
    return { imageHref, imageWidth: imageSize ? imageSize.width : null, imageHeight: imageSize ? imageSize.height : null, stamps, layerImages: inlined };
  };
  // Load a bitmap into a raster layer (r043): decoded for its size, scaled to
  // cover the canvas width with its aspect kept (what runs past the bottom is
  // clipped), the bitmap capped at 4096 on the long side and re-encoded as a
  // PNG only then (a JPEG scan stays a JPEG otherwise), written to the image
  // folder as <map id>-<layer id>.<ext> when one is connected, inline
  // otherwise with the same warning Set Image gives.
  const loadLayerImage = (layerId) => {
    const layer = data.drawing.layers.find(l => l.id === layerId && l.kind === "raster");
    if (!layer) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp,image/*";
    input.onchange = async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      let img;
      try { img = await mapDecodeImage(file); } catch (err) { flash && flash("That image could not be decoded", "error"); return; }
      const w0 = img.naturalWidth, h0 = img.naturalHeight;
      if (!(w0 > 0 && h0 > 0)) { flash && flash("That image is empty", "error"); return; }
      const k = Math.min(1, MAP_RASTER_LAYER.maxSide / Math.max(w0, h0));
      let blob = file;
      let ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/webp" ? "webp" : "png";
      if (k < 1 || !/^image\\/(png|jpeg|webp)$/.test(file.type)) {
        const bw = Math.max(1, Math.round(w0 * k)), bh = Math.max(1, Math.round(h0 * k));
        const canvas = document.createElement("canvas");
        canvas.width = bw; canvas.height = bh;
        canvas.getContext("2d").drawImage(img, 0, 0, bw, bh);
        blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
        if (!blob) { flash && flash("That image could not be re-encoded", "error"); return; }
        ext = "png";
      }
      const units = { width: data.drawing.width, height: Math.max(1, Math.round(h0 * data.drawing.width / w0)) };
      if (dirHandle) {
        const ok = await verifyHandlePermission(dirHandle);
        if (ok) {
          try {
            const filename = `${recordId || "map"}-${layerId}.${ext}`;
            const fh = await dirHandle.getFileHandle(filename, { create: true });
            const writable = await fh.createWritable();
            await writable.write(blob);
            await writable.close();
            drawing.setLayerImage(layerId, filename, units.width, units.height);
            return;
          } catch (err) {
            console.error("FSAA write failed", err);
          }
        }
      }
      if (blob.size > MAP_RASTER_LAYER.inlineWarn) {
        const proceed = confirm(`This image is ${(blob.size / 1024 / 1024).toFixed(1)} MB. Without an image folder set up, it will be embedded directly in your save file. Continue?\\n\\nTip: cancel and connect an image folder in Settings to keep saves small.`);
        if (!proceed) return;
      }
      try {
        const dataUrl = await fileToDataUrl(blob);
        if (!mapRasterLayerCheck(dataUrl)) { flash && flash("That image is too large to embed; connect an image folder in Settings", "error"); return; }
        drawing.setLayerImage(layerId, dataUrl, units.width, units.height);
      } catch (err) {
        flash && flash("Failed to read image", "error");
      }
    };
    input.click();
  };"""),
    ("""      {layersOpen && <MapLayerPanel drawing={drawing} />}""",
     """      {layersOpen && <MapLayerPanel drawing={drawing} onLoadImage={loadLayerImage} missing={layerImages.missing} />}"""),
])

replace_span(
    MOD / "16_trunk.jsx",
    """function MapLayerPanel({ drawing }) {
  const { layers, activeLayerId, setActiveLayerId, addLayer, renameLayer, toggleLayerVisible, toggleLayerLocked, moveLayer, deleteLayer } = drawing;""",
    """            <button type="button" className="btn btn-small btn-danger" disabled={layers.length === 1} onClick={() => deleteLayer(l.id)} title={layers.length === 1 ? "The last layer stays" : "Delete this layer"}>×</button>
          </div>
        );
      })}
    </div>
  );
}
""",
    LAYER_PANEL,
)

edit(MOD / "08_export-layer.jsx", [
    ("""  // Map canvas backgrounds now live in the cartographia slice, not on entries.
  (Array.isArray(state.cartographia) ? state.cartographia : []).forEach(rec => {
    if (rec && rec.mapData && typeof rec.mapData.image === "string" && rec.mapData.image) {
      refs.add(rec.mapData.image);
    }
  });
  return refs;""",
     """  // Map canvas backgrounds now live in the cartographia slice, not on entries;
  // raster layers' images (r043) sit beside them in the drawing.
  (Array.isArray(state.cartographia) ? state.cartographia : []).forEach(rec => {
    if (rec && rec.mapData && typeof rec.mapData.image === "string" && rec.mapData.image) {
      refs.add(rec.mapData.image);
    }
    const layers = rec && rec.mapData && rec.mapData.drawing && Array.isArray(rec.mapData.drawing.layers) ? rec.mapData.drawing.layers : [];
    layers.forEach(l => {
      if (l && l.kind === "raster" && typeof l.image === "string" && l.image) refs.add(l.image);
    });
  });
  return refs;"""),
    ("""  const imageDataUrl = (mapData.image && ctx.imageManifest) ? ctx.imageManifest.get(mapData.image) : null;
  const imageSize = (imageDataUrl && ctx.imageSizes) ? ctx.imageSizes.get(mapData.image) : null;

  let imgHtml;
  if (imageDataUrl) {
    imgHtml = mapTreeToString(buildMapDrawingTree(mapData.drawing, {
      id: entry.id,
      className: "map-image",
      label: entry.name,
      imageHref: imageDataUrl,
      imageWidth: imageSize ? imageSize.width : null,
      imageHeight: imageSize ? imageSize.height : null,
      stamps: state.mapStamps,
    }));
  } else if (mapData.image) {
    imgHtml = `<div class="map-image-placeholder">(map image not embedded: ${htmlEscape(mapData.image)})</div>`;
  } else if (visiblePins.length === 0 && !mapDrawingHasContent(mapData.drawing)) {
    return `<div class="map-empty">(empty map: no image, no drawing, no pins)</div>`;
  } else {
    imgHtml = mapTreeToString(buildMapDrawingTree(mapData.drawing, { id: entry.id, className: "map-image", label: entry.name, stamps: state.mapStamps }));
  }""",
     """  const imageDataUrl = (mapData.image && ctx.imageManifest) ? ctx.imageManifest.get(mapData.image) : null;
  const imageSize = (imageDataUrl && ctx.imageSizes) ? ctx.imageSizes.get(mapData.image) : null;
  // Raster layers (r043) resolve through the same manifest; one the manifest
  // could not read is left out of the drawing and named under it.
  const layerImages = {};
  const layersMissing = [];
  ensureDrawingShape(mapData.drawing).layers.forEach(l => {
    if (l.kind !== "raster" || !l.image || !l.visible) return;
    const v = l.image.startsWith("data:") ? l.image : (ctx.imageManifest ? ctx.imageManifest.get(l.image) : null);
    if (v) layerImages[l.image] = v; else layersMissing.push(l);
  });
  const layerNotes = layersMissing.map(l => `<div class="map-image-placeholder">(raster layer "${htmlEscape(l.name)}" not embedded: ${htmlEscape(l.image)})</div>`).join("");

  let imgHtml;
  if (imageDataUrl) {
    imgHtml = mapTreeToString(buildMapDrawingTree(mapData.drawing, {
      id: entry.id,
      className: "map-image",
      label: entry.name,
      imageHref: imageDataUrl,
      imageWidth: imageSize ? imageSize.width : null,
      imageHeight: imageSize ? imageSize.height : null,
      stamps: state.mapStamps,
      layerImages,
    })) + layerNotes;
  } else if (mapData.image) {
    imgHtml = `<div class="map-image-placeholder">(map image not embedded: ${htmlEscape(mapData.image)})</div>` + layerNotes;
  } else if (visiblePins.length === 0 && !mapDrawingHasContent(mapData.drawing)) {
    return `<div class="map-empty">(empty map: no image, no drawing, no pins)</div>`;
  } else {
    imgHtml = mapTreeToString(buildMapDrawingTree(mapData.drawing, { id: entry.id, className: "map-image", label: entry.name, stamps: state.mapStamps, layerImages })) + layerNotes;
  }"""),
])

edit(MOD / "12_trunk.jsx", [
    ("""                <MapEditor
                  mapData={mapDraft.mapData || { image: null, pins: [] }}
                  onChange={(md) => setMapDraft(d => ({ ...d, mapData: md }))}
                  dirHandle={dirHandle}""",
     """                <MapEditor
                  mapData={mapDraft.mapData || { image: null, pins: [] }}
                  onChange={(md) => setMapDraft(d => ({ ...d, mapData: md }))}
                  recordId={mapDraft.id}
                  dirHandle={dirHandle}"""),
])

edit(SHELL, [
    (""".map-layer-count{font-size:calc(11px * var(--font-scale));color:var(--text-dim);min-width:60px}""",
     """.map-layer-count{font-size:calc(11px * var(--font-scale));color:var(--text-dim);min-width:60px}
.map-layer-kind{font-size:calc(10px * var(--font-scale));letter-spacing:.08em;text-transform:uppercase;color:var(--text-dim);border:1px solid var(--border);border-radius:3px;padding:1px 5px}"""),
])

print("r043 applied")
