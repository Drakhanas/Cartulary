"""r037: per-map SVG and PNG download (Cartographia+ cut 7).

A Download row above the canvas in the map view: SVG writes the saved map as
a standalone file (the drawing with the image inlined as a data URL when it
can be read, the world's stamps resolved, hidden layers omitted, no pins, the
map font embedded when it can be fetched, href doubled as xlink:href so older
viewers open it); PNG draws that svg to a canvas at twice the canvas size,
capped at sixteen million pixels so a huge canvas writes a smaller file
rather than a blank one. A note under the buttons says what was written and
when the image could not be read. View only: the file is the saved record.

Decided at the fork (Drak, 2026-10-21): every recommendation. The buttons
above the canvas, not in the header (scope stays in 16_trunk); no pins in
the file; 2x with the area cap and no dialog; the font embedded with a silent
fallback; a disconnected folder writes the drawing alone and says so.

Declared scope: 16_trunk, shell.html.

String-anchored edits; every anchor must occur exactly once. Run from the
repository root against the r036 tree: python3 inlining/cuts/r037_map_download.py
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


HELPERS = r'''// The map font for a downloaded file. An svg opened on its own, or loaded as
// an image to be drawn to a canvas, is a sealed document: it cannot see the
// page's web fonts, so a label would fall back to the viewer's serif. The
// download embeds Cormorant Garamond instead: the Google Fonts stylesheet
// names the latin woff2, which is fetched and written in as a data URL. One
// fetch per session, cached on the function; offline, or on any failure,
// null, and the file falls back silently.
function mapFontFaceCss() {
  if (!mapFontFaceCss.promise) {
    mapFontFaceCss.promise = (async () => {
      try {
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 8000);
        const css = await (await fetch("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400&display=swap", { signal: ctl.signal })).text();
        const blocks = css.match(/@font-face\s*\{[^}]*\}/g) || [];
        const latin = blocks.find(b => /unicode-range:\s*U\+0000-00FF/i.test(b)) || blocks[0];
        const m = latin ? /url\((https:[^)\s"']+\.woff2)\)/.exec(latin) : null;
        if (!m) throw new Error("no woff2 url");
        const bytes = new Uint8Array(await (await fetch(m[1], { signal: ctl.signal })).arrayBuffer());
        clearTimeout(timer);
        let bin = "";
        for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
        return `@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:400;src:url(data:font/woff2;base64,${btoa(bin)}) format('woff2');}`;
      } catch (err) {
        return null;
      }
    })();
  }
  return mapFontFaceCss.promise;
}

// The svg of a saved map as a standalone file: the drawing with the image
// inlined as a data URL when it can be read (a data URL passes through, a
// folder image is read through the folder handle, a filename with no folder
// cannot be read and the file is written without it, which the caller says),
// the world's stamps resolved, hidden layers omitted, no pins (pins are app
// data with their own renderer), the map font embedded when it can be
// fetched, href doubled as xlink:href on image, use, and textPath so older
// viewers open it, and width and height on the root so a viewer, and Firefox
// drawing it to a canvas, know its size. Returns { svg, width, height,
// imageMissing }.
async function buildMapDownloadSvg(rec, state, dirHandle) {
  const mapData = ensureMapData(rec.mapData);
  let imageHref = null;
  let imageMissing = false;
  if (mapData.image) {
    if (mapData.image.startsWith("data:")) {
      imageHref = mapData.image;
    } else if (dirHandle) {
      try {
        const fh = await dirHandle.getFileHandle(mapData.image);
        imageHref = await fileToDataUrl(await fh.getFile());
      } catch (err) {
        imageMissing = true;
      }
    } else {
      imageMissing = true;
    }
  }
  const size = imageHref ? await loadImageNaturalSizeForExport(imageHref) : null;
  if (imageHref && !size) { imageHref = null; imageMissing = true; }
  const tree = buildMapDrawingTree(mapData.drawing, {
    id: rec.id,
    label: rec.name,
    imageHref,
    imageWidth: size ? size.width : null,
    imageHeight: size ? size.height : null,
    stamps: state ? state.mapStamps : [],
  });
  const double = (node) => {
    if (!node || typeof node !== "object") return;
    if ((node.tag === "image" || node.tag === "use" || node.tag === "textPath") && node.attrs && node.attrs.href) node.attrs["xlink:href"] = node.attrs.href;
    (node.children || []).forEach(double);
  };
  double(tree);
  const fontCss = await mapFontFaceCss();
  if (fontCss) tree.children.unshift({ tag: "style", raw: fontCss });
  const attrs = { ...tree.attrs, "xmlns:xlink": "http://www.w3.org/1999/xlink", width: mapNum(tree.width), height: mapNum(tree.height) };
  delete attrs.class;
  tree.attrs = attrs;
  return { svg: `<?xml version="1.0" encoding="UTF-8"?>\n${mapTreeToString(tree)}`, width: tree.width, height: tree.height, imageMissing };
}

// The svg drawn to a canvas: a PNG blob at `scale` times the canvas size.
// Everything the svg needs is inline (the image, the stamps, the font), so
// the canvas stays clean and can be read back. Rejects when the svg will not
// decode or the browser produces no image.
function rasterizeMapSvg(svg, width, height, scale) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error("the browser produced no image"))), "image/png");
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("the svg would not decode")); };
    img.src = url;
  });
}

'''

edit(MOD / "16_trunk.jsx", [
    ("""// Shared resize handler for the map canvas. Returns a mousedown handler that the""",
     HELPERS + """// Shared resize handler for the map canvas. Returns a mousedown handler that the"""),
    ("""  }), [mapData, entry.id, entry.name, imageUrl, imageSize, state ? state.mapStamps : null]);""",
     """  }), [mapData, entry.id, entry.name, imageUrl, imageSize, state ? state.mapStamps : null]);
  // Download the saved map as a file: an svg, or a png at twice the canvas
  // size, capped at sixteen million pixels (Safari's canvas limit) so a huge
  // canvas writes a smaller file rather than a blank one. The note beside the
  // buttons says what was written, and when the image could not be read.
  const [downloadNote, setDownloadNote] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const downloadMap = async (kind) => {
    if (downloading) return;
    setDownloading(true);
    setDownloadNote(`Writing ${kind.toUpperCase()}\\u2026`);
    try {
      const built = await buildMapDownloadSvg(entry, state, dirHandle);
      const base = slugify(entry.name) || "map";
      let blob;
      let note;
      if (kind === "svg") {
        blob = new Blob([built.svg], { type: "image/svg+xml;charset=utf-8" });
        note = `Wrote ${base}.svg (${mapNum(built.width)} \\u00d7 ${mapNum(built.height)}).`;
      } else {
        const scale = Math.min(2, Math.sqrt(16000000 / Math.max(1, built.width * built.height)));
        blob = await rasterizeMapSvg(built.svg, built.width, built.height, scale);
        note = `Wrote ${base}.png (${Math.round(built.width * scale)} \\u00d7 ${Math.round(built.height * scale)}, ${scale < 2 ? "scaled to fit sixteen million pixels" : "at 2x"}).`;
      }
      if (built.imageMissing) note += " The image could not be read, so the file has the drawing only.";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${base}.${kind}`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setDownloadNote(note);
    } catch (err) {
      setDownloadNote(`Could not write the ${kind.toUpperCase()}: ${err && err.message ? err.message : err}.`);
    } finally {
      setDownloading(false);
    }
  };
  const downloadRow = (
    <div className="map-download-row">
      <span className="map-tools-label">Download</span>
      <button type="button" className="btn btn-small btn-ghost" disabled={downloading} onClick={() => downloadMap("svg")} title="The drawing and the image as a standalone svg, with the map font embedded; pins are not in it">SVG</button>
      <button type="button" className="btn btn-small btn-ghost" disabled={downloading} onClick={() => downloadMap("png")} title="The same, drawn at twice the canvas size">PNG</button>
      {downloadNote && <span className="map-download-note">{downloadNote}</span>}
    </div>
  );"""),
    # the image-not-found state keeps the row: the drawing can still be written, and the note says the image is missing
    ("""  if (mapData.image && errored) {
    return (
      <div className="map-empty">
        <div className="map-empty-glyph">\u25a3</div>
        <div>Image not found: <code>{mapData.image}</code></div>
        <div style={{ fontSize: 11, marginTop: 4 }}>
          {dirHandle ? "Check the connected image folder." : "No image folder connected \u2014 set one in Settings."}
        </div>
      </div>
    );
  }
  if (!canvasReady) return <div className="map-empty">Loading...</div>;""",
     """  if (mapData.image && errored) {
    return (
      <>
        {downloadRow}
        <div className="map-empty">
          <div className="map-empty-glyph">\u25a3</div>
          <div>Image not found: <code>{mapData.image}</code></div>
          <div style={{ fontSize: 11, marginTop: 4 }}>
            {dirHandle ? "Check the connected image folder." : "No image folder connected \u2014 set one in Settings."}
          </div>
        </div>
      </>
    );
  }
  if (!canvasReady) return <div className="map-empty">Loading...</div>;"""),
    ("""      <div className={`map-canvas view-mode ${mapZoom > 1 ? "zoomed" : ""}`} ref={canvasRef}""",
     """      {downloadRow}
      <div className={`map-canvas view-mode ${mapZoom > 1 ? "zoomed" : ""}`} ref={canvasRef}"""),
])

edit(SHELL, [
    (""".map-time-controls{
  display:flex;align-items:center;gap:8px;flex-wrap:wrap;
  padding:8px 12px;background:var(--surf2);
  border-radius:3px;margin-bottom:10px;
}
""",
     """.map-time-controls{
  display:flex;align-items:center;gap:8px;flex-wrap:wrap;
  padding:8px 12px;background:var(--surf2);
  border-radius:3px;margin-bottom:10px;
}
.map-download-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px}
.map-download-note{font-size:calc(12px * var(--font-scale));color:var(--text-dim)}
"""),
])

print("r037 applied")
