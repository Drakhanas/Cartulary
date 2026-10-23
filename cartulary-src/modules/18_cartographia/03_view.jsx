
// ─── Map view ──────────────────────────────────────────────────────────────────

function useMapImageUrl(filename, dirHandle, imageFolder) {
  const [url, setUrl] = useState(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setUrl(null);
    setErrored(false);
    if (!filename) return;

    if (filename.startsWith("data:")) {
      setUrl(filename);
      return;
    }

    if (dirHandle) {
      let objectUrl = null;
      let cancelled = false;
      (async () => {
        try {
          const fh = await dirHandle.getFileHandle(filename);
          const file = await fh.getFile();
          objectUrl = URL.createObjectURL(file);
          if (!cancelled) setUrl(objectUrl);
        } catch (e) {
          if (!cancelled) setErrored(true);
        }
      })();
      return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }

    setUrl(`${imageFolder || "world-images"}/${filename}`);
  }, [filename, dirHandle, imageFolder]);

  return { url, errored, setErrored };
}

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

// The map font for a downloaded file. An svg opened on its own, or loaded as
// an image to be drawn to a canvas, is a sealed document: it cannot see the
// page's web fonts, so a label would fall back to the viewer's serif. The
// download embeds Cormorant Garamond instead, copied from the page's own
// stylesheet: the release build inlines every font it uses as a data-URL
// @font-face, and the regular-weight rule is written into the file as it
// stands. Nothing is fetched; the application makes no network request
// (r051). Found once per session, cached on the function. A build whose
// fonts come from a stylesheet link (the development head) has no inline
// rule; the result is null and the file falls back silently.
function mapFontFaceCss() {
  if (mapFontFaceCss.css === undefined) {
    let found = null;
    try {
      const css = Array.from(document.querySelectorAll("style")).map(s => s.textContent || "").join("\n");
      const blocks = css.match(/@font-face\s*\{[^}]*\}/g) || [];
      found = blocks.find(b =>
        /font-family:\s*['"]?Cormorant Garamond['"]?\s*;/i.test(b)
        && /font-weight:\s*(400|normal)\s*[;}]/i.test(b)
        && !/font-style:\s*italic/i.test(b)
        && /src:\s*url\(["']?data:/i.test(b)) || null;
    } catch (err) {
      found = null;
    }
    mapFontFaceCss.css = found;
  }
  return mapFontFaceCss.css;
}

// The svg of a saved map as a standalone file: the drawing with the image
// inlined as a data URL when it can be read (a data URL passes through, a
// folder image is read through the folder handle, a filename with no folder
// cannot be read and the file is written without it, which the caller says),
// the world's stamps resolved, hidden layers omitted, no pins (pins are app
// data with their own renderer), the map font embedded from the page's own
// stylesheet, href doubled as xlink:href on image, use, and textPath so older
// viewers open it, and width and height on the root so a viewer, and Firefox
// drawing it to a canvas, know its size. Raster layers are read the same way
// (r043); one that cannot be read is left out and named in layersMissing.
// Returns { svg, width, height, imageMissing, layersMissing }.
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
  });
  const double = (node) => {
    if (!node || typeof node !== "object") return;
    if ((node.tag === "image" || node.tag === "use" || node.tag === "textPath") && node.attrs && node.attrs.href) node.attrs["xlink:href"] = node.attrs.href;
    (node.children || []).forEach(double);
  };
  double(tree);
  const fontCss = mapFontFaceCss();
  if (fontCss) tree.children.unshift({ tag: "style", raw: fontCss });
  const attrs = { ...tree.attrs, "xmlns:xlink": "http://www.w3.org/1999/xlink", width: mapNum(tree.width), height: mapNum(tree.height) };
  delete attrs.class;
  tree.attrs = attrs;
  return { svg: `<?xml version="1.0" encoding="UTF-8"?>\n${mapTreeToString(tree)}`, width: tree.width, height: tree.height, imageMissing, layersMissing };
}

// The svg drawn to a canvas: a PNG blob at `scale` times the canvas size.
// Everything the svg needs is inline (the image, the stamps, the font), so
// the canvas stays clean and can be read back. Rejects when the svg will not
// decode or the browser produces no image.
function rasterizeMapSvg(svg, width, height, scale) {
  return mapSvgToCanvas(svg, width, height, scale).then(canvas => new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error("the browser produced no image"))), "image/png");
  }));
}


// The camera (r045): what part of the canvas the box shows. `view` is the
// visible rect in canvas units, always the canvas's aspect, so the box never
// changes size; zoom is the canvas width over the view's, 1 (the whole
// canvas, Fit) to `max`. The svg and the overlay take the view as their
// viewBox, the pins and the paint overlay are placed in it, and the editor's
// pointer math maps through it. Inputs: Ctrl+wheel about the pointer (what a
// trackpad pinch sends), a two-finger pinch, the keys + - 0, the corner
// buttons; a pan by the middle button or Space held in any tool, by one
// finger or the left button in pan mode (the Pan tool, or the read-only
// view), by two fingers anywhere. A second finger cancels the one-finger
// gesture it lands on through `cancelGesture`; the wheel, the keys, and the
// buttons are ignored while `locked()` says a gesture is in progress, so
// nothing shifts under a pointer that is down. `panMode` and `locked` are
// functions, read at the event, because the editor's tool hook renders
// after the camera. Resets to Fit when the canvas size changes.
const MAP_CAMERA = { max: 8, step: 1.25, dragSlop: 3 };

function useMapCamera({ width, height, canvasRef, svgRef, panMode, locked, cancelGesture, enabled }) {
  const W = Number.isFinite(width) && width > 0 ? width : 1;
  const H = Number.isFinite(height) && height > 0 ? height : 1;
  const [view, setViewState] = useState({ x: 0, y: 0, w: W, h: H });
  const viewRef = useRef(view);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [dragging, setDragging] = useState(false);
  const spaceRef = useRef(false);
  const panRef = useRef(null);          // { pointerId, startX, startY, view, moved } while a pan drag runs
  const pinchRef = useRef(null);        // { dist, zoom, anchor } while two fingers are down
  const touchRef = useRef(new Map());   // the touch pointers down, id -> [clientX, clientY]
  const draggedRef = useRef(false);     // the last press moved the view: the click that follows is not a click
  const attachedRef = useRef(false);
  const cfg = useRef({});
  cfg.current = { panMode, locked, cancelGesture, W, H };
  const setView = (v) => { viewRef.current = v; setViewState(v); };
  const clampView = (x, y, w, h) => ({ x: Math.max(0, Math.min(W - w, x)), y: Math.max(0, Math.min(H - h, y)), w, h });
  const rectOf = () => { const el = (svgRef && svgRef.current) || canvasRef.current; return el ? el.getBoundingClientRect() : null; };
  const fractionOf = (rect, clientX, clientY) => [rect && rect.width ? (clientX - rect.left) / rect.width : 0.5, rect && rect.height ? (clientY - rect.top) / rect.height : 0.5];
  const zoomOf = (v) => W / v.w;
  const isLocked = () => (typeof cfg.current.locked === "function" ? !!cfg.current.locked() : false);
  useEffect(() => { setView({ x: 0, y: 0, w: W, h: H }); }, [W, H]);
  // a zoom that keeps the canvas point under the pointer where it is
  const zoomAt = (factor, clientX, clientY) => {
    const v = viewRef.current;
    const z = Math.max(1, Math.min(MAP_CAMERA.max, zoomOf(v) * factor));
    const w = W / z, h = H / z;
    const [fx, fy] = fractionOf(rectOf(), clientX, clientY);
    setView(clampView(v.x + fx * v.w - fx * w, v.y + fy * v.h - fy * h, w, h));
  };
  const zoomBy = (factor) => { const r = rectOf(); zoomAt(factor, r ? r.left + r.width / 2 : 0, r ? r.top + r.height / 2 : 0); };
  const fit = () => setView({ x: 0, y: 0, w: W, h: H });
  const panBy = (dx, dy) => { const v = viewRef.current; setView(clampView(v.x + dx, v.y + dy, v.w, v.h)); };
  // the window listeners of a drag or a pinch, one stable pair that reads the latest closures
  const handlersRef = useRef(null);
  if (!handlersRef.current) handlersRef.current = { move: (e) => cfg.current.onMove(e), up: (e) => cfg.current.onUp(e) };
  const attach = () => { if (attachedRef.current) return; attachedRef.current = true; const h = handlersRef.current; window.addEventListener("pointermove", h.move); window.addEventListener("pointerup", h.up); window.addEventListener("pointercancel", h.up); };
  const detach = () => { if (!attachedRef.current) return; attachedRef.current = false; const h = handlersRef.current; window.removeEventListener("pointermove", h.move); window.removeEventListener("pointerup", h.up); window.removeEventListener("pointercancel", h.up); };
  cfg.current.onMove = (e) => {
    if (e.pointerType === "touch" && touchRef.current.has(e.pointerId)) touchRef.current.set(e.pointerId, [e.clientX, e.clientY]);
    const pinch = pinchRef.current;
    if (pinch) {
      const pts = Array.from(touchRef.current.values());
      if (pts.length < 2) return;
      const [a, b] = pts;
      const dist = Math.max(1, Math.hypot(a[0] - b[0], a[1] - b[1]));
      const z = Math.max(1, Math.min(MAP_CAMERA.max, pinch.zoom * dist / pinch.dist));
      const w = W / z, h = H / z;
      const [fx, fy] = fractionOf(rectOf(), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      setView(clampView(pinch.anchor[0] - fx * w, pinch.anchor[1] - fy * h, w, h));
      return;
    }
    const pan = panRef.current;
    if (!pan || e.pointerId !== pan.pointerId) return;
    const rect = rectOf();
    if (!rect || !rect.width || !rect.height) return;
    const dx = e.clientX - pan.startX, dy = e.clientY - pan.startY;
    if (!pan.moved && Math.hypot(dx, dy) > MAP_CAMERA.dragSlop) pan.moved = true;
    if (!pan.moved) return;
    draggedRef.current = true;
    setView(clampView(pan.view.x - dx * pan.view.w / rect.width, pan.view.y - dy * pan.view.h / rect.height, pan.view.w, pan.view.h));
  };
  cfg.current.onUp = (e) => {
    if (e.pointerType === "touch") {
      touchRef.current.delete(e.pointerId);
      if (pinchRef.current && touchRef.current.size < 2) pinchRef.current = null;
    }
    if (panRef.current && e.pointerId === panRef.current.pointerId) { panRef.current = null; setDragging(false); }
    if (!panRef.current && !pinchRef.current && touchRef.current.size === 0) detach();
  };
  // The canvas div's capture-phase pointerdown: a pan or a pinch takes the
  // pointer before the svg, the pins, or the tools see it.
  const onPointerDownCapture = (e) => {
    const t = e.target;
    if (t && t.closest && t.closest(".map-zoom, .map-resize-handle")) return;
    if (e.pointerType === "touch") {
      touchRef.current.set(e.pointerId, [e.clientX, e.clientY]);
      attach();
      if (touchRef.current.size === 2) {
        if (panRef.current) { panRef.current = null; setDragging(false); }
        if (typeof cfg.current.cancelGesture === "function") cfg.current.cancelGesture();
        const [a, b] = Array.from(touchRef.current.values());
        const v = viewRef.current;
        const [fx, fy] = fractionOf(rectOf(), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        pinchRef.current = { dist: Math.max(1, Math.hypot(a[0] - b[0], a[1] - b[1])), zoom: zoomOf(v), anchor: [v.x + fx * v.w, v.y + fy * v.h] };
        draggedRef.current = true;
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      if (touchRef.current.size > 2) { e.stopPropagation(); e.preventDefault(); return; }
    }
    if (pinchRef.current) { e.stopPropagation(); return; }
    const mode = typeof cfg.current.panMode === "function" ? !!cfg.current.panMode() : !!cfg.current.panMode;
    const pan = e.button === 1 || (e.button === 0 && (spaceRef.current || mode));
    if (!pan) { draggedRef.current = false; return; }
    e.stopPropagation();
    e.preventDefault();
    draggedRef.current = false;
    panRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, view: viewRef.current, moved: false };
    setDragging(true);
    attach();
  };
  // Ctrl+wheel on the canvas, bound natively so the page does not zoom
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      if (isLocked() || pinchRef.current || panRef.current) return;
      zoomAt(e.deltaY < 0 ? MAP_CAMERA.step : 1 / MAP_CAMERA.step, e.clientX, e.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [enabled, W, H]);
  // Space held, and the zoom keys, document-wide, typing fields excluded
  useEffect(() => {
    const typing = (t) => { const tag = t && t.tagName ? t.tagName.toUpperCase() : ""; return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!(t && t.isContentEditable); };
    const down = (e) => {
      if (typing(e.target)) return;
      if (e.key === " ") {
        if (!spaceRef.current) { spaceRef.current = true; setSpaceHeld(true); }
        const el = canvasRef.current;
        if (el && typeof el.matches === "function" && el.matches(":hover")) e.preventDefault();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "+" || e.key === "=") { e.preventDefault(); if (!isLocked()) zoomBy(MAP_CAMERA.step); }
      else if (e.key === "-" || e.key === "_") { e.preventDefault(); if (!isLocked()) zoomBy(1 / MAP_CAMERA.step); }
      else if (e.key === "0") { e.preventDefault(); if (!isLocked()) fit(); }
    };
    const up = (e) => { if (e.key === " ") { spaceRef.current = false; setSpaceHeld(false); } };
    const blur = () => { spaceRef.current = false; setSpaceHeld(false); };
    document.addEventListener("keydown", down);
    document.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => { document.removeEventListener("keydown", down); document.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
  }, [W, H]);
  useEffect(() => () => { panRef.current = null; pinchRef.current = null; touchRef.current.clear(); detach(); }, []);
  const f = mapNum;
  return {
    view: { ...view, W, H },
    viewBox: `${f(view.x)} ${f(view.y)} ${f(view.w)} ${f(view.h)}`,
    zoom: zoomOf(view),
    zoomAt, zoomBy, fit, panBy,
    onPointerDownCapture,
    dragged: () => draggedRef.current,
    className: `${spaceHeld ? "pan-ready" : ""} ${dragging ? "pan-active" : ""}`.trim(),
  };
}

// The bar in the canvas's corner: zoom out, the zoom, zoom in, Fit, and the
// box's width when the grip has changed it. Its presses stay its own.
function MapZoomControls({ camera, sizePct }) {
  const z = camera.zoom;
  const stop = (e) => e.stopPropagation();
  return (
    <div className="map-zoom" onPointerDown={stop} onClick={stop} onDoubleClick={stop}>
      <button type="button" className="btn btn-small btn-ghost" disabled={z <= 1.0001} onClick={() => camera.zoomBy(1 / MAP_CAMERA.step)} title="Zoom out (-)">{"−"}</button>
      <span className="map-zoom-value" title="Zoom; Ctrl+wheel or a pinch zooms about the pointer">{Math.round(z * 100)}%</span>
      <button type="button" className="btn btn-small btn-ghost" disabled={z >= MAP_CAMERA.max - 0.0001} onClick={() => camera.zoomBy(MAP_CAMERA.step)} title="Zoom in (+)">+</button>
      <button type="button" className="btn btn-small btn-ghost" disabled={z <= 1.0001} onClick={camera.fit} title="Show the whole canvas (0)">Fit</button>
      {Number.isFinite(sizePct) && Math.round(sizePct) !== 100 && <span className="map-zoom-value" title="The box's width, from the corner grip">{Math.round(sizePct)}% wide</span>}
    </div>
  );
}

// Shared resize handler for the map canvas. Returns a pointerdown handler that
// the caller wires onto a resize-handle element. Drags the canvas width as a percentage
// of its parent, 25% to 150%. Past 100% the canvas grows out of its column on
// both sides (the caller centres it with a negative margin), but never past the
// scroll pane, which clips sideways and would take the handle with it; the
// handle stays under the cursor either way. Pin positions are 0-1 normalized so
// they track the canvas size.
function useResizeHandler(canvasRef, sizePct, setSizePct) {
  return (e) => {
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const startX = e.clientX;
    const startSize = sizePct;
    // The column's content width, from the canvas itself: the parent's
    // clientWidth includes its padding, which the percentage does not.
    const parentWidth = canvas.getBoundingClientRect().width * 100 / startSize || parent.clientWidth;
    const pane = canvas.closest(".body") || canvas.closest(".main");
    const room = pane ? pane.clientWidth - 48 : parentWidth;
    const maxPct = Math.max(100, Math.min(150, (room / parentWidth) * 100));
    // The handle rides the right edge, which moves 1:1 with the cursor below
    // 100% and at half the width change above it (the growth is centred).
    const edgeOf = (pct) => (pct <= 100 ? pct - 100 : (pct - 100) / 2);
    const pctOf = (edge) => (edge <= 0 ? 100 + edge : 100 + edge * 2);
    const startEdge = edgeOf(startSize);

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const deltaPct = (dx / parentWidth) * 100;
      const next = Math.max(25, Math.min(maxPct, pctOf(startEdge + deltaPct)));
      setSizePct(next);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };
}

function MapPin({ pin, entries, templates, asOfYear, timeMode, isSelected, onClick, onPointerDown, editable, view }) {
  // placed in the camera's view (r045): a pin outside it lands outside the box, which clips it
  const left = view ? (pin.x * view.W - view.x) / view.w : pin.x;
  const top = view ? (pin.y * view.H - view.y) / view.h : pin.y;
  const linkedEntry = pin.entryId ? entries.find(e => e.id === pin.entryId) : null;
  const color = pin.color || "#c8a96e";
  const linkBroken = pin.entryId && !linkedEntry;
  const initial = (pin.label || "•").trim().charAt(0).toUpperCase() || "•";
  // Resolve display name as of the map's current year if time mode is on
  // and the linked entry has name-history data covering that year. Falls
  // back to entry.name otherwise.
  const linkedDisplayName = useMemo(() => {
    if (!linkedEntry) return null;
    if (asOfYear == null || !Array.isArray(templates)) return linkedEntry.name;
    const tpl = templates.find(t => t.id === linkedEntry.templateId);
    if (!tpl) return linkedEntry.name; // bodies (and template-less entries) have no name-history
    return resolveEntryNameAtYear(linkedEntry, tpl, asOfYear);
  }, [linkedEntry, templates, asOfYear]);

  return (
    <div
      className={`map-pin ${editable ? "editable" : ""} ${isSelected ? "selected" : ""}`}
      style={{ left: `${left * 100}%`, top: `${top * 100}%` }}
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      <div className="map-pin-marker" style={{ background: color }}>
        <span className="map-pin-marker-inner">{initial}</span>
      </div>
      <div className="map-pin-label">
        <span className={linkBroken ? "map-pin-label-broken" : ""}>{pin.label || "(unnamed)"}</span>
        {linkedEntry && <span className="map-pin-label-arrow">→ {linkedDisplayName}</span>}
        {linkBroken && <span className="map-pin-label-arrow">(missing entry)</span>}
        {timeMode && pin.permanent && (
          <span className="map-pin-permanent-marker" title="Always visible (ignores time mode)">◇</span>
        )}
      </div>
    </div>
  );
}

function MapView({ entry, dirHandle, imageFolder, entries, templates, calendar, onOpenEntry, state, onUpdateViewPrefs }) {
  const mapData = useMemo(() => ensureMapData(entry.mapData), [entry.mapData]);
  const { url: imageUrl, errored, setErrored } = useMapImageUrl(mapData.image, dirHandle, imageFolder);
  const imageSize = useImageNaturalSize(mapData.image ? imageUrl : null, () => setErrored(true));
  // The canvas renders once the image, if there is one, has loaded with a
  // known natural size; an image-less map renders at once on its background.
  const canvasReady = !mapData.image || (!errored && !!imageUrl && !!imageSize);
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
  }), [mapData, entry.id, entry.name, imageUrl, imageSize, state ? state.mapStamps : null, layerImages]);
  // Download the saved map as a file: an svg, or a png at twice the canvas
  // size, capped at sixteen million pixels (Safari's canvas limit) so a huge
  // canvas writes a smaller file rather than a blank one. The note beside the
  // buttons says what was written, and when the image could not be read.
  const [downloadNote, setDownloadNote] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const downloadMap = async (kind) => {
    if (downloading) return;
    setDownloading(true);
    setDownloadNote(`Writing ${kind.toUpperCase()}\u2026`);
    try {
      const built = await buildMapDownloadSvg(entry, state, dirHandle);
      const base = slugify(entry.name) || "map";
      let blob;
      let note;
      if (kind === "svg") {
        blob = new Blob([built.svg], { type: "image/svg+xml;charset=utf-8" });
        note = `Wrote ${base}.svg (${mapNum(built.width)} \u00d7 ${mapNum(built.height)}).`;
      } else {
        const scale = Math.min(2, Math.sqrt(16000000 / Math.max(1, built.width * built.height)));
        blob = await rasterizeMapSvg(built.svg, built.width, built.height, scale);
        note = `Wrote ${base}.png (${Math.round(built.width * scale)} \u00d7 ${Math.round(built.height * scale)}, ${scale < 2 ? "scaled to fit sixteen million pixels" : "at 2x"}).`;
      }
      if (built.imageMissing) note += " The image could not be read, so the file has the drawing only.";
      if (built.layersMissing && built.layersMissing.length) note += ` The raster ${built.layersMissing.length === 1 ? "layer" : "layers"} ${built.layersMissing.map(n => `"${n}"`).join(", ")} could not be read and ${built.layersMissing.length === 1 ? "is" : "are"} left out.`;
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
  );
  const pins = mapData.pins || [];
  const canvasRef = useRef(null);
  const viewSvgRef = useRef(null);
  const [sizePct, setSizePct] = useState(100);
  // The camera (r045): in the view every drag pans, so a click on a pin
  // opens its entry only when the press did not move. `enabled` carries
  // canvasReady because the box is gated behind it while an image loads.
  const camera = useMapCamera({ width: canvasTree.width, height: canvasTree.height, canvasRef, svgRef: viewSvgRef, panMode: true, enabled: canvasReady });

  // View-level calendar selector. Scrubber bounds, year input, era buttons,
  // and the year label all render in viewCalendar's frame. Internally every
  // comparison happens on absoluteDay, so pins linked to entries from
  // different calendars filter correctly regardless of which calendar drives
  // the scrubber. Single-calendar worlds get no selector; behavior identical
  // to pre-v1.4.
  const { calendar: viewCalendar, Selector: ViewCalendarSelector, hasAdditional } = getViewCalendarContext(state, "mapCalendarId", onUpdateViewPrefs);

  // ── Time mode state (Map-integrated chronicles) ─────────────────────────────
  // Off by default — pins render normally, no temporal filtering.
  // When on, the year scrubber controls which pins show; pins linked to entries
  // whose first calendar-date-range field doesn't cover the current year are
  // either hidden (default) or rendered faded (toggle).
  const [timeMode, setTimeMode] = useState(false);
  const [showFaded, setShowFaded] = useState(false);
  const [timeYear, setTimeYear] = useState(null);

  // v1.5 r079: bodies merge into the map's resolution pool so pins resolve
  // (and the editor binds) to Astronomical Bodies. Memoized so entriesById and
  // the temporal/visibility passes don't rebuild every render.
  const mapEntriesWithBodies = useMemo(() => [
    ...(entries || []),
    ...(state?.celestialBodies || []).map(b => ({ id: b.id, name: b.name || "(unnamed)", templateId: BODY_REF_SENTINEL, _isBody: true })),
  ], [entries, state?.celestialBodies]);
  const entriesById = useMemo(() => Object.fromEntries(mapEntriesWithBodies.map(e => [e.id, e])), [mapEntriesWithBodies]);
  const templatesById = useMemo(() => Object.fromEntries((templates || []).map(t => [t.id, t])), [templates]);

  // Compute absoluteDay bounds from all pinned entries' temporal ranges
  // (each projected through its own bound calendar). Then convert to a
  // viewCalendar-frame year range for the scrubber UI. Pins from different
  // calendars co-exist on the same absolute axis, so a span from one
  // tradition correctly bounds a span from another even if their raw year
  // numbers don't overlap.
  const yearBounds = useMemo(() => {
    let loAbs = null, hiAbs = null;
    pins.forEach(p => {
      if (!p.entryId) return;
      const linked = entriesById[p.entryId];
      if (!linked) return;
      const tpl = templatesById[linked.templateId];
      if (!tpl) return;
      const r = getEntryTemporalRangeAbsDay(linked, tpl, state);
      if (!r) return;
      (r.absoluteDays || []).forEach(d => {
        if (loAbs === null || d < loAbs) loAbs = d;
        if (hiAbs === null || d > hiAbs) hiAbs = d;
      });
    });
    if (loAbs === null) return { min: 0, max: 100 };
    // Convert the absoluteDay bounds to viewCalendar years.
    const loYear = absoluteDayToCalendarDate(viewCalendar, loAbs)?.year ?? 0;
    const hiYear = absoluteDayToCalendarDate(viewCalendar, hiAbs)?.year ?? loYear;
    if (loYear === hiYear) return { min: loYear - 5, max: hiYear + 5 };
    return { min: loYear, max: hiYear };
  }, [pins, entriesById, templatesById, state, viewCalendar]);

  // Initialize / clamp timeYear into the bounds when the bounds change or
  // when entering time mode for the first time. Bounds shift when viewCalendar
  // changes (year numbers re-frame), so this also handles selector switches.
  useEffect(() => {
    if (!timeMode) return;
    if (timeYear == null) {
      setTimeYear(yearBounds.min);
      return;
    }
    if (timeYear < yearBounds.min) setTimeYear(yearBounds.min);
    else if (timeYear > yearBounds.max) setTimeYear(yearBounds.max);
  }, [timeMode, yearBounds.min, yearBounds.max]);

  const handleResizeStart = useResizeHandler(canvasRef, sizePct, setSizePct);

  // Era buttons rebound to viewCalendar.eras — the selected display calendar
  // owns which eras show up. Filters by viewCalendar's own year frame.
  const eras = (viewCalendar?.eras || []).filter(e => e.startYear != null && e.startYear >= yearBounds.min && e.startYear <= yearBounds.max);
  const hasAnyTemporalData = useMemo(() => {
    return pins.some(p => {
      if (!p.entryId) return false;
      const linked = entriesById[p.entryId];
      if (!linked) return false;
      const tpl = templatesById[linked.templateId];
      if (!tpl) return false;
      return !!getEntryTemporalRange(linked, tpl);
    });
  }, [pins, entriesById, templatesById]);

  // If all temporal data disappears (entries deleted, fields cleared, etc.)
  // while time mode is on, drop out of time mode. The toggle is hidden when
  // there's no data, so leaving timeMode=true would be a stuck state.
  useEffect(() => {
    if (timeMode && !hasAnyTemporalData) setTimeMode(false);
  }, [timeMode, hasAnyTemporalData]);

  if (mapData.image && errored) {
    return (
      <>
        {downloadRow}
        <div className="map-empty">
          <div className="map-empty-glyph">▣</div>
          <div>Image not found: <code>{mapData.image}</code></div>
          <div style={{ fontSize: 11, marginTop: 4 }}>
            {dirHandle ? "Check the connected image folder." : "No image folder connected — set one in Settings."}
          </div>
        </div>
      </>
    );
  }
  if (!canvasReady) return <div className="map-empty">Loading...</div>;

  const visiblePins = pins.map(p => {
    if (!timeMode) return { pin: p, state: "normal" };
    // Convert the scrubber's viewCalendar-frame year into an absoluteDay
    // so the comparison aligns with each pin entry's own-calendar bounds
    // through the universal axis.
    const yr = timeYear ?? yearBounds.min;
    const absDay = calendarDateToAbsoluteDay(viewCalendar, { year: yr, monthIndex: 0, day: 1 });
    const visible = isPinVisibleAtAbsDay(p, entriesById, templatesById, state, absDay);
    if (visible) return { pin: p, state: "normal" };
    if (showFaded) return { pin: p, state: "faded" };
    return { pin: p, state: "hidden" };
  });
  const hiddenCount = visiblePins.filter(v => v.state === "hidden").length;

  return (
    <>
      {hasAnyTemporalData && (
        <div className="map-time-controls">
          <button
            className={`btn btn-small ${timeMode ? "btn-accent" : "btn-ghost"}`}
            onClick={() => setTimeMode(m => !m)}
            title={timeMode
              ? "Leave time mode. All pins render normally again."
              : "Enter time mode. Pins with temporal range data filter by the chosen year."}
          >
            {timeMode ? "Time On" : "Time"}
          </button>
          {timeMode && (
            <>
              {hasAdditional && (
                <>
                  <ViewCalendarSelector />
                  <span style={{ width: 1, height: 18, background: "var(--border)", margin: "0 4px" }} />
                </>
              )}
              <button className="chrono-edit-stepbtn" onClick={() => setTimeYear(y => Math.max(yearBounds.min, (y ?? yearBounds.min) - 1))} title="Year −1">−</button>
              <input
                className="input"
                type="number"
                value={timeYear ?? yearBounds.min}
                min={yearBounds.min} max={yearBounds.max}
                onChange={e => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v)) setTimeYear(Math.max(yearBounds.min, Math.min(yearBounds.max, v)));
                }}
                style={{ width: 80, textAlign: "center" }}
              />
              <button className="chrono-edit-stepbtn" onClick={() => setTimeYear(y => Math.min(yearBounds.max, (y ?? yearBounds.min) + 1))} title="Year +1">+</button>
              <input
                className="map-time-slider"
                type="range"
                min={yearBounds.min} max={yearBounds.max}
                value={timeYear ?? yearBounds.min}
                onChange={e => setTimeYear(parseInt(e.target.value, 10))}
              />
              <span className="map-time-yearlabel">{formatYear(timeYear ?? yearBounds.min, viewCalendar)}</span>
              {eras.length > 0 && (
                <span className="map-time-eras">
                  {eras.map(era => (
                    <button
                      key={era.shortName + era.startYear}
                      className="btn btn-ghost btn-small"
                      onClick={() => setTimeYear(Math.max(yearBounds.min, Math.min(yearBounds.max, era.startYear)))}
                      title={`Jump to ${era.name}`}
                    >
                      {era.shortName || era.name}
                    </button>
                  ))}
                </span>
              )}
              <label className="chrono-edit-approx" title="Show pins outside the current year as faded instead of hiding them">
                <input type="checkbox" checked={showFaded} onChange={e => setShowFaded(e.target.checked)} />
                <span style={{ fontFamily: "inherit", fontSize: "calc(12px * var(--font-scale))" }}>show faded</span>
              </label>
            </>
          )}
        </div>
      )}
      {downloadRow}
      <div className={`map-canvas view-mode ${camera.className}`} ref={canvasRef} onPointerDownCapture={camera.onPointerDownCapture} style={{ width: `${sizePct}%`, marginLeft: sizePct > 100 ? `${(100 - sizePct) / 2}%` : undefined }}>
        <div style={{ position: "relative" }}>
          {mapTreeToReact(canvasTree, "canvas", { ref: viewSvgRef, viewBox: camera.viewBox })}
          {visiblePins.map(({ pin, state }) => {
            if (state === "hidden") return null;
            return (
              <div key={pin.id} className={state === "faded" ? "map-pin-faded" : ""}>
                <MapPin
                  pin={pin}
                  entries={mapEntriesWithBodies}
                  templates={templates}
                  asOfYear={timeMode ? timeYear : null}
                  timeMode={timeMode}
                  editable={false}
                  view={camera.view}
                  onClick={() => { if (!camera.dragged() && pin.entryId) onOpenEntry(pin.entryId); }}
                />
              </div>
            );
          })}
        </div>
        <MapZoomControls camera={camera} sizePct={sizePct} />
        <div className="map-resize-handle" onPointerDown={handleResizeStart} title="Drag to resize · double-click to reset" onDoubleClick={() => setSizePct(100)} />
      </div>
      {pins.length > 0 && (
        <div className="map-stats">
          <span>{pins.length} {pins.length === 1 ? "pin" : "pins"}</span>
          <span>{pins.filter(p => p.entryId).length} linked to entries</span>
          {timeMode && pins.some(p => p.permanent) && (
            <span>{pins.filter(p => p.permanent).length} always visible</span>
          )}
          {timeMode && hiddenCount > 0 && !showFaded && (
            <span className="map-stats-hidden">{hiddenCount} hidden by time filter</span>
          )}
        </div>
      )}
    </>
  );
}

function MapEditor({ mapData, onChange, dirHandle, imageFolder, entries, bodies, flash, stamps, recordId, onStampsChange, stripLayout, onStripLayout, api }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [selectedPinId, setSelectedPinId] = useState(null);
  const [draggingPinId, setDraggingPinId] = useState(null);
  const [dragMoved, setDragMoved] = useState(false);
  const [sizePct, setSizePct] = useState(100);
  const data = useMemo(() => ensureMapData(mapData), [mapData]);
  const pins = data.pins || [];
  const { url: imageUrl, errored, setErrored } = useMapImageUrl(data.image, dirHandle, imageFolder);
  const imageSize = useImageNaturalSize(data.image ? imageUrl : null, () => setErrored(true));
  const canvasReady = !data.image || (!errored && !!imageUrl && !!imageSize);
  const layerImages = useMapLayerImages(data.drawing.layers, dirHandle, imageFolder);
  // Bitmaps written this session (r044): a paint stroke or Load image lands
  // in the image folder under the layer's own file, and the folder hook only
  // re-reads when the set of filenames changes, so the editor keeps the data
  // URL of what each such file now holds and draws from it. diskRef is what
  // each file holds; originalRef what it held before the session's first
  // write to it (null for a file the session made), for undo.
  const [liveUrls, setLiveUrls] = useState({});
  const mergedUrls = useMemo(() => ({ ...layerImages.urls, ...liveUrls }), [layerImages, liveUrls]);
  const diskRef = useRef({});
  const originalRef = useRef({});
  const writeChainRef = useRef(Promise.resolve());
  const paintOverlayRef = useRef(null);
  const canvasTree = useMemo(() => buildMapDrawingTree(data.drawing, {
    id: "editor",
    className: "map-image",
    imageHref: data.image ? imageUrl : null,
    imageWidth: imageSize ? imageSize.width : null,
    imageHeight: imageSize ? imageSize.height : null,
    stamps,
    placeholder: true,
    layerImages: mergedUrls,
  }), [data, imageUrl, imageSize, stamps, mergedUrls]);
  // A folder file written in order, one write at a time per editor; a data
  // URL or a blob.
  const writeLayerFile = (filename, src) => {
    const run = async () => {
      const blob = typeof src === "string" ? await (await fetch(src)).blob() : src;
      const fh = await dirHandle.getFileHandle(filename, { create: true });
      const writable = await fh.createWritable();
      await writable.write(blob);
      await writable.close();
    };
    const p = writeChainRef.current.then(run, run);
    writeChainRef.current = p.catch(() => {});
    return p;
  };
  // Undo or redo in folder mode: the record names the same file before and
  // after a stroke, so each file this session wrote is put back to what the
  // restored step held (its side table, else what the file held before the
  // session touched it) and the editor draws that at once.
  const restoreFolderBitmaps = (side) => {
    if (!dirHandle) return;
    const want = { ...originalRef.current, ...(side || {}) };
    const changed = {};
    Object.keys(diskRef.current).forEach(name => {
      const desired = want[name];
      if (!desired || desired === diskRef.current[name]) return;
      diskRef.current[name] = desired;
      changed[name] = desired;
      writeLayerFile(name, desired).catch(err => console.error("FSAA write failed", err));
    });
    if (Object.keys(changed).length > 0) setLiveUrls(prev => ({ ...prev, ...changed }));
  };
  // Every write to the record goes through the history (one step per gesture;
  // pins included, by decision at session 19). The hook writes through it too.
  const history = useMapHistory(data, onChange, undefined, restoreFolderBitmaps);
  const commit = history.commit;
  const [layersOpen, setLayersOpen] = useState(false);
  // What the bucket fill rasterizes besides the drawing: the image and every
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
      const v = await inlineUrl(mergedUrls[l.image]);
      if (v) inlined[l.image] = v;
    }
    return { imageHref, imageWidth: imageSize ? imageSize.width : null, imageHeight: imageSize ? imageSize.height : null, stamps, layerImages: inlined };
  };
  // Where a raster layer's bitmap is kept (r044, shared by Load image and the
  // paint engine): the image folder when one is connected, under the layer's
  // own file when it has one of this type, else <map id>-<layer id>.<ext>,
  // with what the file held before the session's first write remembered for
  // undo; inline as a data URL otherwise (under the byte cap; `warn` asks
  // past a megabyte, as Set Image does). Returns { image, sidePatch },
  // { error }, or { cancelled }.
  const storeBitmap = async (layer, blob, dataUrl, ext, warn) => {
    if (dirHandle) {
      const ok = await verifyHandlePermission(dirHandle);
      if (ok) {
        const current = layer.image && !layer.image.startsWith("data:") ? layer.image : null;
        const name = current && current.toLowerCase().endsWith(`.${ext}`) ? current : `${recordId || "map"}-${layer.id}.${ext}`;
        try {
          if (!(name in diskRef.current)) {
            let before = null;
            if (current === name) { try { before = await inlineUrl(mergedUrls[name]); } catch (err) { before = null; } }
            originalRef.current[name] = before;
            diskRef.current[name] = before;
          }
          await writeLayerFile(name, blob);
          diskRef.current[name] = dataUrl;
          setLiveUrls(prev => ({ ...prev, [name]: dataUrl }));
          return { image: name, sidePatch: { [name]: dataUrl } };
        } catch (err) {
          console.error("FSAA write failed", err);
        }
      }
    }
    if (warn && blob.size > MAP_RASTER_LAYER.inlineWarn) {
      const proceed = confirm(`This image is ${(blob.size / 1024 / 1024).toFixed(1)} MB. Without an image folder set up, it will be embedded directly in your save file. Continue?\n\nTip: cancel and connect an image folder in Settings to keep saves small.`);
      if (!proceed) return { cancelled: true };
    }
    if (!mapRasterLayerCheck(dataUrl)) return { error: "too large to embed; connect an image folder in Settings" };
    return { image: dataUrl };
  };
  // Cancel (r046): 12_trunk calls this through `api` before dropping the
  // draft, so the folder holds what it held when the draft opened: every
  // file the session overwrote goes back to what it held, every file the
  // session made goes. Save leaves the files as they are.
  const restoreOriginals = async () => {
    if (!dirHandle) return;
    const names = Object.keys(diskRef.current);
    const held = { ...originalRef.current }, now = { ...diskRef.current };
    diskRef.current = {};
    originalRef.current = {};
    for (const name of names) {
      try {
        if (held[name]) { if (now[name] !== held[name]) await writeLayerFile(name, held[name]); }
        else if (typeof dirHandle.removeEntry === "function") await dirHandle.removeEntry(name);
      } catch (err) {
        console.warn("Cancel could not put back", name, err);
      }
    }
  };
  useEffect(() => {
    if (!api) return undefined;
    api.current = { restoreOriginals };
    return () => { api.current = null; };
  });
  // What the paint engine starts a stroke from: the layer's bitmap as a data
  // URL (inline as it is; a folder file read once through the fill cache).
  const loadBase = async (layer) => {
    if (!layer.image) return null;
    if (layer.image.startsWith("data:")) return layer.image;
    const url = mergedUrls[layer.image];
    return url ? inlineUrl(url) : null;
  };
  const painter = { overlayRef: paintOverlayRef, loadBase, store: (layer, blob, dataUrl) => storeBitmap(layer, blob, dataUrl, "png", false) };
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
      if (k < 1 || !/^image\/(png|jpeg|webp)$/.test(file.type)) {
        const bw = Math.max(1, Math.round(w0 * k)), bh = Math.max(1, Math.round(h0 * k));
        const canvas = document.createElement("canvas");
        canvas.width = bw; canvas.height = bh;
        canvas.getContext("2d").drawImage(img, 0, 0, bw, bh);
        blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
        if (!blob) { flash && flash("That image could not be re-encoded", "error"); return; }
        ext = "png";
      }
      const units = { width: data.drawing.width, height: Math.max(1, Math.round(h0 * data.drawing.width / w0)) };
      let dataUrl;
      try { dataUrl = await fileToDataUrl(blob); } catch (err) { flash && flash("Failed to read image", "error"); return; }
      const stored = await storeBitmap(layer, blob, dataUrl, ext, true);
      if (stored.cancelled) return;
      if (stored.error) { flash && flash(`That image is ${stored.error}`, "error"); return; }
      drawing.setLayerImage(layerId, stored.image, units.width, units.height, { sidePatch: stored.sidePatch });
    };
    input.click();
  };
  // The camera (r045) renders after the tool hook, which reads its view at
  // the event; the camera reads the tool hook's state at the event too.
  const cameraViewRef = useRef(null);
  const drawingRef = useRef(null);
  const drawing = useMapDrawing({ data, onChange: commit, svgRef: imgRef, canvasRef, width: canvasTree.width, height: canvasTree.height, fillContext, stamps, layerImages: { urls: mergedUrls, missing: layerImages.missing }, painter, getView: () => cameraViewRef.current });
  drawingRef.current = drawing;
  // Canvas size presets for image-less maps. With shapes or pins on the map
  // the switch warns first, because nothing is transformed: shapes keep their
  // coordinates (anything beyond the new edges is cut off) and pins keep their
  // 0-1 positions, so they shift against the drawing. An image map's canvas is
  // the image's size and has no picker.
  const showPresets = !data.image;
  const [customSizeOpen, setCustomSizeOpen] = useState(false); // Custom picked while the size still matches a preset
  const presetValue = customSizeOpen ? "custom" : (MAP_CANVAS_PRESETS.find(p => p.width === data.drawing.width && p.height === data.drawing.height) || { id: "custom" }).id;
  const applyCanvasSize = (width, height, label) => {
    if (width === data.drawing.width && height === data.drawing.height) return;
    const hasWork = pins.length > 0 || mapDrawingHasContent(data.drawing);
    if (hasWork && !confirm(`Change the canvas to ${label}? Shapes keep their coordinates and anything beyond the new edges is cut off; pins keep their relative positions and will shift against the drawing. Undo restores it.`)) return;
    commit({ ...data, drawing: { ...data.drawing, width, height } });
  };
  const applyPreset = (id) => {
    if (id === "custom") { setCustomSizeOpen(true); return; }
    setCustomSizeOpen(false);
    const p = MAP_CANVAS_PRESETS.find(x => x.id === id);
    if (p) applyCanvasSize(p.width, p.height, p.label);
  };
  // Custom: whole units, 100 to 10000 a side; out-of-range entries are clamped.
  const applyCustomSize = (w, h) => {
    const clamp = (v, d) => (Number.isFinite(v) ? Math.max(100, Math.min(10000, Math.round(v))) : d);
    const width = clamp(w, data.drawing.width), height = clamp(h, data.drawing.height);
    setCustomSizeOpen(false);
    applyCanvasSize(width, height, `${width} × ${height}`);
  };

  // Size heal, once: the first time an image loads while the drawing is still
  // empty, record its natural size as the drawing's size (the renderer already
  // draws at that size; this keeps the units if the image is removed later).
  // Once the drawing has content the size is fixed and this never fires.
  useEffect(() => {
    if (!data.image || !imageSize) return;
    const d = data.drawing;
    if (mapDrawingHasContent(d)) return;
    if (d.width === imageSize.width && d.height === imageSize.height) return;
    commit({ ...data, drawing: { ...d, width: imageSize.width, height: imageSize.height } }, { silent: true });
  }, [data, imageSize, onChange]);

  // The camera: pan mode is the Pan tool; the wheel and the keys wait while a
  // stroke, a drag, or a pin drag is in progress; a second finger cancels
  // whichever of those it lands on. The view's pointer math and the pins
  // go through camera.view.
  const camera = useMapCamera({
    width: canvasTree.width, height: canvasTree.height, canvasRef, svgRef: imgRef, enabled: canvasReady,
    panMode: () => !!drawingRef.current && drawingRef.current.tool === "pan",
    locked: () => (!!drawingRef.current && drawingRef.current.isBusy()) || !!draggingPinId,
    cancelGesture: () => { if (drawingRef.current) drawingRef.current.cancelGesture(); setDraggingPinId(null); },
  });
  cameraViewRef.current = camera.view;
  // a screen point as a 0-1 fraction of the canvas, through the view (pins are stored that way)
  const pinFraction = (clientX, clientY) => {
    const rect = imgRef.current ? imgRef.current.getBoundingClientRect() : null;
    if (!rect || !rect.width || !rect.height) return null;
    const v = camera.view;
    return [(v.x + (clientX - rect.left) / rect.width * v.w) / v.W, (v.y + (clientY - rect.top) / rect.height * v.h) / v.H];
  };
  const handleResizeStart = useResizeHandler(canvasRef, sizePct, setSizePct);

  const setImage = async () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (dirHandle) {
        const ok = await verifyHandlePermission(dirHandle);
        if (ok) {
          try {
            const filename = await generateUniqueFilename(dirHandle, file.name);
            const fh = await dirHandle.getFileHandle(filename, { create: true });
            const writable = await fh.createWritable();
            await writable.write(file);
            await writable.close();
            commit({ ...data, image: filename });
            return;
          } catch (err) {
            console.error("FSAA write failed", err);
          }
        }
      }

      // base64 fallback - warn for big files since maps tend to be large
      if (file.size > 1024 * 1024) {
        const proceed = confirm(`This image is ${(file.size / 1024 / 1024).toFixed(1)} MB. Without an image folder set up, it will be embedded directly in your save file. Continue?\n\nTip: cancel and connect an image folder in Settings to keep saves small.`);
        if (!proceed) return;
      }
      try {
        const dataUrl = await fileToDataUrl(file);
        commit({ ...data, image: dataUrl });
      } catch (err) {
        flash && flash("Failed to read image", "error");
      }
    };
    fileInput.click();
  };

  const removeImage = () => {
    if (!confirm("Remove the map image? The drawing and the pins stay on the canvas.")) return;
    commit({ ...data, image: null });
  };

  const handleCanvasClick = (e) => {
    if (drawing.tool !== "pin") return;
    if (e.target && e.target.closest && e.target.closest(".map-resize-handle, .map-zoom")) return; // a click on the resize grip or the zoom bar is not a pin
    if (camera.dragged()) return; // the press panned the view
    if (draggingPinId) return;
    if (dragMoved) { setDragMoved(false); return; }
    if (selectedPinId) { setSelectedPinId(null); return; }
    const frac = pinFraction(e.clientX, e.clientY);
    if (!frac) return;
    const [x, y] = frac;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;

    const newPin = {
      id: `pin-${genId().slice(0, 6)}`,
      x, y, label: "", entryId: null, color: null, notes: "",
    };
    commit({ ...data, pins: [...pins, newPin] });
    setSelectedPinId(newPin.id);
  };

  const pinDragSeq = useRef(0);
  const handlePinPointerDown = (e, pinId) => {
    if (e.button !== 0 || e.isPrimary === false) return;
    e.stopPropagation();
    pinDragSeq.current += 1;
    setDraggingPinId(pinId);
    setDragMoved(false);
  };

  // Drag handling
  useEffect(() => {
    if (!draggingPinId) return;
    const startX = pins.find(p => p.id === draggingPinId)?.x ?? 0;
    const startY = pins.find(p => p.id === draggingPinId)?.y ?? 0;
    let moved = false;

    const handleMove = (e) => {
      const frac = pinFraction(e.clientX, e.clientY);
      if (!frac) return;
      const x = Math.max(0, Math.min(1, frac[0]));
      const y = Math.max(0, Math.min(1, frac[1]));
      if (Math.abs(x - startX) > 0.002 || Math.abs(y - startY) > 0.002) {
        moved = true;
      }
      commit({ ...data, pins: pins.map(p => p.id === draggingPinId ? { ...p, x, y } : p) }, { coalesce: `pin-drag-${draggingPinId}-${pinDragSeq.current}` });
    };
    const handleUp = () => {
      if (!moved) {
        // It was a click, not a drag - select the pin
        setSelectedPinId(draggingPinId);
      } else {
        setDragMoved(true);
      }
      setDraggingPinId(null);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [draggingPinId, data, pins, onChange]);

  // Pin field edits coalesce per field, so a label typed in one go is one
  // undo step; a different field, or a drag in between, starts a new one.
  const updatePin = (pinId, patch) => {
    const field = Object.keys(patch)[0] || "field";
    commit({ ...data, pins: pins.map(p => p.id === pinId ? { ...p, ...patch } : p) }, { coalesce: `pin-${pinId}-${field}` });
  };
  const deletePin = (pinId) => {
    commit({ ...data, pins: pins.filter(p => p.id !== pinId) });
    setSelectedPinId(null);
  };

  const selectedPin = pins.find(p => p.id === selectedPinId);
  // v1.5 r079: bodies join the pin-link picker pool so a pin can target an
  // Astronomical Body. Body synth-entries carry the body sentinel as templateId.
  const sortedEntries = useMemo(() => [
    ...entries,
    ...(bodies || []).map(b => ({ id: b.id, name: b.name || "(unnamed)", templateId: BODY_REF_SENTINEL, _isBody: true })),
  ].sort((a, b) => a.name.localeCompare(b.name)), [entries, bodies]);

  return (
    <div className="map-editor">
      <div className="map-editor-toolbar">
        <button className="btn btn-ghost" onClick={setImage}>{data.image ? "Change Image" : "Set Image"}</button>
        {data.image && <button className="btn btn-danger" onClick={removeImage}>Remove Image</button>}
        <span style={{ flex: 1 }} />
        <span className="map-editor-hint">{drawing.hint}</span>
      </div>
      <MapToolStrip drawing={drawing} history={history} showPresets={showPresets} presetValue={presetValue} onPreset={applyPreset} canvasSize={{ width: data.drawing.width, height: data.drawing.height }} onCustomSize={applyCustomSize} layersOpen={layersOpen} onToggleLayers={() => setLayersOpen(o => !o)} stamps={stamps} onStampsChange={onStampsChange} layout={stripLayout} onLayout={onStripLayout} flash={flash} />
      {layersOpen && <MapLayerPanel drawing={drawing} onLoadImage={loadLayerImage} missing={layerImages.missing} />}

      {data.image && errored ? (
        <div className="map-empty" style={{ borderTop: "none", borderRadius: "0 0 3px 3px" }}>
          <div>Image not found: <code>{data.image}</code></div>
          <button className="btn btn-ghost" onClick={setImage}>Pick a different image</button>
        </div>
      ) : !canvasReady ? (
        <div className="map-empty" style={{ borderTop: "none" }}>Loading image...</div>
      ) : (
          <div
            className={`map-canvas tool-${drawing.tool} ${drawing.tool !== "pin" ? "draw-mode" : ""} ${camera.className}`}
            ref={canvasRef}
            onClick={handleCanvasClick}
            onPointerDownCapture={camera.onPointerDownCapture}
            tabIndex={0}
            style={{ borderRadius: "0 0 3px 3px", width: `${sizePct}%`, marginLeft: sizePct > 100 ? `${(100 - sizePct) / 2}%` : undefined }}
          >
            <div style={{ position: "relative" }}>
              {mapTreeToReact(canvasTree, "canvas", {
                ref: imgRef,
                viewBox: camera.viewBox,
                onPointerDown: drawing.onSvgPointerDown,
                onPointerMove: drawing.onSvgPointerMove,
                onPointerLeave: drawing.onSvgPointerLeave,
                onClick: drawing.onSvgClick,
                onDoubleClick: drawing.onSvgDoubleClick,
                onContextMenu: drawing.onSvgContextMenu,
              })}
              <canvas className="map-paint-overlay" ref={paintOverlayRef} aria-hidden="true" />
              {pins.map(pin => (
                <MapPin
                  key={pin.id}
                  pin={pin}
                  entries={entries}
                  editable
                  isSelected={pin.id === selectedPinId}
                  view={camera.view}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => handlePinPointerDown(e, pin.id)}
                />
              ))}
              <MapEditorOverlay width={canvasTree.width} height={canvasTree.height} drawing={drawing} view={camera.view} />
            </div>
            <MapZoomControls camera={camera} sizePct={sizePct} />
            <div className="map-resize-handle" onPointerDown={handleResizeStart} title="Drag to resize · double-click to reset" onDoubleClick={() => setSizePct(100)} />
          </div>
      )}

      {selectedPin && (
        <div className="pin-editor-panel">
          <div className="pin-editor-title">
            <span>Edit Pin</span>
            <span className="pin-editor-coords">{(selectedPin.x * 100).toFixed(1)}%, {(selectedPin.y * 100).toFixed(1)}%</span>
          </div>
          <div className="form-field">
            <label className="form-label">Label</label>
            <input
              className="input"
              value={selectedPin.label || ""}
              onChange={e => updatePin(selectedPin.id, { label: e.target.value })}
              placeholder="Pin label..."
              autoFocus
            />
          </div>
          <div className="form-field">
            <label className="form-label">Linked Entry</label>
            <select className="input" value={selectedPin.entryId || ""} onChange={e => updatePin(selectedPin.id, { entryId: e.target.value || null })}>
              <option value="">— None —</option>
              {sortedEntries.map(e => <option key={e.id} value={e.id}>{e.name}{e._isBody ? " (Astronomical Body)" : ""}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="pin-permanent-toggle">
              <input
                type="checkbox"
                checked={!!selectedPin.permanent}
                onChange={e => updatePin(selectedPin.id, { permanent: e.target.checked })}
              />
              <span>Always visible (ignore time mode)</span>
            </label>
            <div className="pin-permanent-hint">
              {selectedPin.permanent
                ? "This pin will show on the map regardless of the time scrubber, even if its linked entry has a date range."
                : "When time mode is on, this pin filters by its linked entry's date range. Pins linked to entries with no date range are hidden."}
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Color</label>
            <div className="input-row">
              <input type="color" className="input" value={selectedPin.color || "#c8a96e"} onChange={e => updatePin(selectedPin.id, { color: e.target.value })} />
              {selectedPin.color && <button className="btn btn-ghost" onClick={() => updatePin(selectedPin.id, { color: null })}>Reset to default</button>}
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Notes</label>
            <textarea
              className="input"
              value={selectedPin.notes || ""}
              onChange={e => updatePin(selectedPin.id, { notes: e.target.value })}
              placeholder="Notes about this pin..."
              rows={2}
            />
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <button className="btn btn-danger" onClick={() => deletePin(selectedPin.id)}>Delete Pin</button>
            <span style={{ flex: 1 }} />
            <button className="btn btn-ghost" onClick={() => setSelectedPinId(null)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}