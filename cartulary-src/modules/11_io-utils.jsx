
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

// ─── Backups into the images folder (v1.7 r040) ────────────────────────────────
// docs/pipes-spec.md, section 3, with Drak's calls at the cut: with the images
// folder connected, the world is written into BACKUP_FOLDER inside it as the
// file Export writes, at most every BACKUP_EVERY_MS while it changes (App's
// scheduleBackup), each named for the world and the local time to the minute,
// and each world's newest BACKUP_KEEP are kept. Only files with a backup's
// name, and of the world being written, are ever deleted.
const BACKUP_FOLDER = "cartulary-backups";
const BACKUP_KEEP = 10;
const BACKUP_EVERY_MS = 10 * 60 * 1000;
// And never sooner than this after the latest change, which each change
// restarts, so a world name typed letter by letter is backed up under the
// name it ends with, not under every name on the way.
const BACKUP_SETTLE_MS = 2000;

// The folder's permission as the browser reports it, without asking for it:
// a request outside a click throws in Chrome, so a load only reads what's
// granted, and Reconnect's click asks for the rest (verifyHandlePermission).
const queryHandlePermission = async (handle, mode = "readwrite") => {
  if (!handle || typeof handle.queryPermission !== "function") return "denied";
  try { return await handle.queryPermission({ mode }); }
  catch (e) { console.error("permission query failed", e); return "denied"; }
};

// A world's part of a backup's name, as Export names its file.
const backupSlugOf = (name) => slugify(name) || "world";

// <slug>-YYYY-MM-DD-HHMM.world.json, in local time.
const backupFileName = (slug, date) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${slug}-${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}.world.json`;
};

// The world's part of a backup's name, or null for any other file.
const backupSlugOfFile = (name) => {
  const m = /^(.+)-\d{4}-\d{2}-\d{2}-\d{4}\.world\.json$/.exec(typeof name === "string" ? name : "");
  return m ? m[1] : null;
};

// A world's backups in the folder, newest first, as { name, at }, at being
// when the file was last written; none while the folder has no BACKUP_FOLDER.
const listWorldBackups = async (dirHandle, slug) => {
  let sub;
  try { sub = await dirHandle.getDirectoryHandle(BACKUP_FOLDER); }
  catch (e) {
    if (e && (e.name === "NotFoundError" || e.name === "TypeMismatchError")) return [];
    throw e;
  }
  const out = [];
  for await (const [name, handle] of sub.entries()) {
    if (handle.kind !== "file" || backupSlugOfFile(name) !== slug) continue;
    const file = await handle.getFile();
    out.push({ name, at: file.lastModified });
  }
  return out.sort((a, b) => (b.at - a.at) || (a.name < b.name ? 1 : a.name > b.name ? -1 : 0));
};

// Writes the world into the folder's BACKUP_FOLDER as Export's text, then
// deletes the world's backups past its newest BACKUP_KEEP, and returns the
// new one's { name, at }. A write that fails is discarded, never left half
// written, and the empty file it opened is removed, so a failure never
// reads as a backup; a backup of the same minute it was replacing stays as
// it was. A prune that fails leaves a backup too many, for the next to take.
const writeWorldBackup = async (dirHandle, state) => {
  const slug = backupSlugOf(state.world && state.world.name);
  const sub = await dirHandle.getDirectoryHandle(BACKUP_FOLDER, { create: true });
  const name = backupFileName(slug, new Date());
  let existed = true;
  try { await sub.getFileHandle(name); } catch (e) { existed = false; }
  const fileHandle = await sub.getFileHandle(name, { create: true });
  let writable = null;
  try {
    writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(state, null, 2));
    await writable.close();
  } catch (e) {
    if (writable) { try { await writable.abort(); } catch (e2) { /* the write's own error is the one to report */ } }
    if (!existed) { try { await sub.removeEntry(name); } catch (e3) { /* as above */ } }
    throw e;
  }
  try {
    const kept = await listWorldBackups(dirHandle, slug);
    for (const old of kept.slice(BACKUP_KEEP)) await sub.removeEntry(old.name);
  } catch (e) { console.error("Backup pruning failed:", e); }
  return { name, at: Date.now() };
};