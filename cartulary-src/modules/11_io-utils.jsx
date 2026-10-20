
// ─── File System Access API helpers ────────────────────────────────────────────

const verifyHandlePermission = async (handle, mode = "readwrite") => {
  if (!handle) return false;
  const opts = { mode };
  try {
    if ((await handle.queryPermission(opts)) === "granted") return true;
    if ((await handle.requestPermission(opts)) === "granted") return true;
  } catch (e) { console.error("permission check failed", e); }
  return false;
};

const sanitizeFilename = (name) => {
  const base = (name || "").replace(/.*[\\\/]/, "").replace(/[^a-zA-Z0-9._-]/g, "_");
  return base || `image-${Date.now()}.png`;
};

const generateUniqueFilename = async (dirHandle, originalName) => {
  let candidate = sanitizeFilename(originalName);
  const dot = candidate.lastIndexOf(".");
  const stem = dot > 0 ? candidate.substring(0, dot) : candidate;
  const ext = dot > 0 ? candidate.substring(dot) : "";
  let n = 1;
  while (true) {
    try {
      await dirHandle.getFileHandle(candidate);
      n++;
      candidate = `${stem}-${n}${ext}`;
      if (n > 999) return `${stem}-${Date.now()}${ext}`;
    } catch {
      return candidate;
    }
  }
};

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(r.error);
  r.readAsDataURL(file);
});