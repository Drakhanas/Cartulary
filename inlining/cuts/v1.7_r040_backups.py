"""
v1.7 r040: backups into the images folder, Pipes' second cut.

docs/pipes-spec.md, section 3, with the four details Drak settled at the cut
(2026-10-29, one per message: a, a, a, b):

1. The names. A subfolder `cartulary-backups` inside the images folder, each
   file named as Export names its own, then the local date and time to the
   minute: <world-slug>-YYYY-MM-DD-HHMM.world.json. The newest ten are kept
   per world name, so another world sharing the folder never loses its
   backups, and a renamed world starts a new series and leaves the old one.
2. The first backup at connect. Connecting a folder, changing it, or
   reconnecting a lapsed one writes a backup at once, unless the folder holds
   a backup of this world newer than the world's last change; the ten-minute
   wait counts from that backup.
3. When editing stops. At most one backup every ten minutes while the world
   changes, the changes after a backup written ten minutes after it if the
   tab is still open; an idle tab writes nothing. Edits a closed tab left out
   go in with the next session's catch-up, when the folder connects at load
   or on Reconnect.
4. Where Reconnect shows. Settings' Images row and its Backups row, and a
   banner at the top of the app while the folder's permission has lapsed,
   naming what stops (images stored in it may not show, new images are
   stored inside the world, backups stop), with Reconnect and Not now, which
   hides it until the next load.

With them, Claude's defaults, said before the first call and not stopped: a
backup is the text Export writes, so Import reads it as is, and the
automatic ones are written only when the world changed since the newest
backup; pruning deletes only files with a backup's name, and of this world;
at load the folder's permission is only read, never requested, since a
request outside a click throws in Chrome, so a lapsed folder is kept and
shown as needing a reconnect instead of "No folder connected", and Reconnect
requests it inside the click (where Chrome 122 and later can offer Allow on
every visit); a failed backup says so in the Backups row with its error, a
permission the browser took back turns into Reconnect, and a try counts
toward the ten minutes whether or not it lands, so the next change after
the wait, Back up now, or Reconnect tries again, with no retry loop; a
backup resets the backup reminder, and the reminder says "backup or JSON
export"; where showDirectoryPicker doesn't exist, the Backups row says
backups need a folder this browser can't give; the pass covers Chrome or
Edge for the folder and Firefox for a browser without one. And, said before
the build: the roadmap's long title cut off in the header bar rides along,
the title's text in a span of its own that the shell's ellipsis reaches.
Found at the build and forced: an automatic backup waits until two seconds
pass without a change, each change starting the two over, and a renamed
world keeps the wait it had; before that, typing a new world name wrote a
backup under every name along the way, a series each, since each name is a
world's part of a file name. And a write that fails removes the empty file
it opened, which would otherwise read as a backup and count toward the ten.

- 11_io-utils: a section of its own, Backups into the images folder:
  BACKUP_FOLDER, BACKUP_KEEP, BACKUP_EVERY_MS, BACKUP_SETTLE_MS,
  queryHandlePermission, backupSlugOf, backupFileName, backupSlugOfFile,
  listWorldBackups, writeWorldBackup.
- 12_trunk: App keeps a lapsed folder (lapsedHandle) and its banner, reads
  the permission at load without asking, adds Reconnect, runs the backups
  (runBackup, scheduleBackup, and the effect that reads the folder's
  backups when it connects and when the world's name changes, catching up
  at a connect), Back up now, the reminder's words, the header title's span,
  and Settings' new props.
- 16_trunk: the Images row's lapsed state with Reconnect; the Save File
  section's Folder backups row; the Reminders row's words.
- shell.html: the status dot for a lapsed folder and a failed backup, and
  the header title's text.

Declared scope: 11_io-utils, 12_trunk, 16_trunk, and the shell.
Declarations added: BACKUP_FOLDER, BACKUP_KEEP, BACKUP_EVERY_MS,
BACKUP_SETTLE_MS, queryHandlePermission, backupSlugOf, backupFileName,
backupSlugOfFile, listWorldBackups, writeWorldBackup. None removed. One header added:
`Backups into the images folder (v1.7 r040)`.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given), and nothing is written unless every anchor in
every file holds. Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r040_backups.py
"""
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())
MODULES = ROOT / "cartulary-src" / "modules"
SHELL = ROOT / "cartulary-src" / "shell.html"

PLAN = []


def B(s):
    """A block written with its opening newline, which isn't part of it."""
    return s[1:] if s.startswith("\n") else s


def edit(path, pairs):
    PLAN.append((path, pairs))


# ---------------------------------------------------------------- 11: the backups' helpers
edit(MODULES / "11_io-utils.jsx", [
    (
        B(r'''
const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(r.error);
  r.readAsDataURL(file);
});'''),
        B(r'''
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
};'''),
    ),
])


# ---------------------------------------------------------------- 12: App
edit(MODULES / "12_trunk.jsx", [
    (
        B(r'''
  const [dirHandle, setDirHandle] = useState(null);
'''),
        B(r'''
  const [dirHandle, setDirHandle] = useState(null);
  // v1.7 r040, backups into the images folder (docs/pipes-spec.md, section 3).
  // lapsedHandle: the stored folder whose permission has lapsed, kept for
  // Reconnect instead of being dropped, with a banner Not now hides until the
  // next load (folderBannerHidden). backupInfo: the folder's newest backup of
  // this world, { name, at }; backupError: the last try's failure, { name,
  // message }. The backups run on refs (runBackup, scheduleBackup):
  // lastBackupTryAtRef is when the last try began, which the ten minutes
  // count from; backedUpRef the world's updatedAt that the newest backup
  // holds; connectCatchUpRef a connect whose catch-up is owed.
  const [lapsedHandle, setLapsedHandle] = useState(null);
  const [folderBannerHidden, setFolderBannerHidden] = useState(false);
  const [backupInfo, setBackupInfo] = useState(null);
  const [backupError, setBackupError] = useState(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const dirHandleRef = useRef(null);
  dirHandleRef.current = dirHandle;
  const backupReadyRef = useRef(false);
  const backupBusyRef = useRef(false);
  const backupAgainRef = useRef(false);
  const backupTimerRef = useRef(null);
  const lastBackupTryAtRef = useRef(0);
  const backedUpRef = useRef({ updatedAt: null });
  const connectCatchUpRef = useRef(false);
'''),
    ),
    (
        B(r'''
  // Restore image folder handle on mount, verify permission
  useEffect(() => {
    if (!FSAA_SUPPORTED) return;
    (async () => {
      try {
        const stored = await dbGetExtra(DB_HANDLE_KEY);
        if (stored) {
          const ok = await verifyHandlePermission(stored, "readwrite");
          if (ok) setDirHandle(stored);
        }
      } catch (e) { console.error("dirHandle restore failed", e); }
    })();
  }, []);
'''),
        B(r'''
  // Restore image folder handle on mount. v1.7 r040: its permission is only
  // read, since a request outside a click throws in Chrome; a folder whose
  // permission has lapsed is kept for Reconnect, and one that connects is
  // caught up with a backup (the backups' effect, below).
  useEffect(() => {
    if (!FSAA_SUPPORTED) return;
    (async () => {
      try {
        const stored = await dbGetExtra(DB_HANDLE_KEY);
        if (stored) {
          if ((await queryHandlePermission(stored, "readwrite")) === "granted") {
            connectCatchUpRef.current = true;
            setDirHandle(stored);
          } else {
            setLapsedHandle(stored);
          }
        }
      } catch (e) { console.error("dirHandle restore failed", e); }
    })();
  }, []);
'''),
    ),
    (
        B(r'''
      if (ok) {
        setDirHandle(handle);
        await dbSetExtra(DB_HANDLE_KEY, handle);
        flash("Image folder connected");
'''),
        B(r'''
      if (ok) {
        connectCatchUpRef.current = true;
        setLapsedHandle(null);
        setBackupError(null);
        setDirHandle(handle);
        await dbSetExtra(DB_HANDLE_KEY, handle);
        flash("Image folder connected");
'''),
    ),
    (
        B(r'''
  const disconnectImageFolder = async () => {
    setDirHandle(null);
    await dbDeleteExtra(DB_HANDLE_KEY);
    flash("Image folder disconnected");
  };
'''),
        B(r'''
  const disconnectImageFolder = async () => {
    setDirHandle(null);
    setLapsedHandle(null);
    setBackupError(null);
    await dbDeleteExtra(DB_HANDLE_KEY);
    flash("Image folder disconnected");
  };

  // v1.7 r040: Reconnect, the click that lets the browser ask for the stored
  // folder again (Chrome 122 and later can offer Allow on every visit here).
  const reconnectImageFolder = async () => {
    const handle = lapsedHandle;
    if (!handle) return;
    const ok = await verifyHandlePermission(handle, "readwrite");
    if (!ok) {
      flash("The browser didn't allow the folder. Change, in Settings, picks it again.", "error");
      return;
    }
    connectCatchUpRef.current = true;
    setLapsedHandle(null);
    setBackupError(null);
    setDirHandle(handle);
    flash("Image folder reconnected");
  };
'''),
    ),
    (
        B(r'''
    stateRef.current = state;
    clearTimeout(saveTimerRef.current);
    savePendingRef.current = true;
'''),
        B(r'''
    stateRef.current = state;
    // v1.7 r040: and the folder's backup, at most every BACKUP_EVERY_MS.
    scheduleBackup(state);
    clearTimeout(saveTimerRef.current);
    savePendingRef.current = true;
'''),
    ),
    (
        B(r'''
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  // ── Derived data ─'''),
        B(r'''
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  // v1.7 r040: backups into the images folder (docs/pipes-spec.md, section 3,
  // and Drak's calls 1 to 3). The world is written as Export's file at most
  // every BACKUP_EVERY_MS while it changes: the first change after the wait
  // at once, once BACKUP_SETTLE_MS pass without another, the changes after a
  // backup when the wait is up, if the tab is still open, and nothing while
  // the world doesn't change. A try counts
  // toward the wait whether or not it lands, so a folder that fails isn't
  // tried at every save; the next change after the wait, Back up now, or
  // Reconnect tries again. A try writes the world as it stands then.
  const runBackup = async ({ force = false } = {}) => {
    const handle = dirHandleRef.current;
    const st = stateRef.current;
    if (!handle || !st) return null;
    if (backupBusyRef.current) { backupAgainRef.current = true; return null; }
    if (!force && st.world.updatedAt === backedUpRef.current.updatedAt) return null;
    clearTimeout(backupTimerRef.current);
    backupTimerRef.current = null;
    backupBusyRef.current = true;
    setBackupBusy(true);
    lastBackupTryAtRef.current = Date.now();
    let result;
    try {
      const made = await writeWorldBackup(handle, st);
      backedUpRef.current = { updatedAt: st.world.updatedAt };
      setBackupInfo(made);
      setBackupError(null);
      // A backup counts as one for the backup reminder.
      setPrefs(p => ({ ...p, lastExportAt: isoNow() }));
      result = { made };
    } catch (e) {
      console.error("Backup failed:", e);
      const error = { name: (e && e.name) || "Error", message: (e && e.message) || "" };
      setBackupError(error);
      result = { error };
      // A permission the browser took back: the folder has lapsed.
      if (dirHandleRef.current === handle && (await queryHandlePermission(handle)) !== "granted") {
        setDirHandle(null);
        setLapsedHandle(handle);
        setFolderBannerHidden(false);
      }
    }
    backupBusyRef.current = false;
    setBackupBusy(false);
    if (backupAgainRef.current) {
      backupAgainRef.current = false;
      scheduleBackup(stateRef.current);
    }
    return result;
  };

  const scheduleBackup = (st) => {
    if (!st || !dirHandleRef.current || !backupReadyRef.current) return;
    if (backupBusyRef.current) { backupAgainRef.current = true; return; }
    if (st.world.updatedAt === backedUpRef.current.updatedAt) return;
    const now = Date.now();
    const due = Math.max(lastBackupTryAtRef.current + BACKUP_EVERY_MS, now + BACKUP_SETTLE_MS);
    clearTimeout(backupTimerRef.current);
    backupTimerRef.current = setTimeout(() => { backupTimerRef.current = null; runBackup(); }, due - now);
  };

  // The folder's backups of this world, read when the folder connects and
  // when the world's name changes. A connect (at load, Connect Folder,
  // Change, or Reconnect) writes one at once unless the newest is newer than
  // the world's last change (Drak's call 2), and the wait counts from the
  // newest.
  const backupSlug = state && state.world ? backupSlugOf(state.world.name) : null;
  useEffect(() => {
    backupReadyRef.current = false;
    clearTimeout(backupTimerRef.current);
    backupTimerRef.current = null;
    if (!loaded || loadError || !backupSlug) return;
    if (!dirHandle) { setBackupInfo(null); return; }
    let cancelled = false;
    (async () => {
      let newest = null;
      try { newest = (await listWorldBackups(dirHandle, backupSlug))[0] || null; }
      catch (e) { console.error("Backup listing failed:", e); }
      if (cancelled) return;
      setBackupInfo(newest);
      const st = stateRef.current;
      const changedAt = Date.parse((st && st.world && st.world.updatedAt) || "") || 0;
      const covered = !!newest && newest.at >= changedAt;
      backedUpRef.current = { updatedAt: covered && st ? st.world.updatedAt : null };
      // The wait counts from the newest backup here or the last try, whichever
      // came later, so a renamed world keeps the wait it had.
      lastBackupTryAtRef.current = Math.max(lastBackupTryAtRef.current, newest ? newest.at : 0);
      backupReadyRef.current = true;
      if (connectCatchUpRef.current) {
        connectCatchUpRef.current = false;
        if (!covered) { runBackup(); return; }
      }
      scheduleBackup(stateRef.current);
    })();
    return () => { cancelled = true; };
  }, [dirHandle, loaded, loadError, backupSlug]);

  // ── Derived data ─'''),
    ),
    (
        B(r'''
  const flash = (text, type = "success") => setNotice({ text, type });
'''),
        B(r'''
  const flash = (text, type = "success") => setNotice({ text, type });

  // v1.7 r040: Back up now (Settings), a backup at once, changed or not.
  const backupNow = async () => {
    const result = await runBackup({ force: true });
    if (result && result.made) flash(`Backed up: ${result.made.name}`);
    else if (result && result.error) flash(`Backup failed: ${result.error.name}${result.error.message ? `: ${result.error.message}` : ""}`, "error");
  };
'''),
    ),
    (
        B(r'''
        {backupReminderActive && (
'''),
        B(r'''
        {lapsedHandle && !folderBannerHidden && (
          <div className="backup-banner" role="alert">
            <div className="backup-banner-text">
              <strong>Images folder not connected.</strong>
              <span className="backup-banner-detail">{`The browser wants your OK again before Cartulary can use "${lapsedHandle.name}". Until then, images stored in it may not show, new images are stored inside the world, and backups stop.`}</span>
            </div>
            <div className="backup-banner-actions">
              <button className="btn btn-accent btn-small" onClick={reconnectImageFolder}>Reconnect</button>
              <button className="btn btn-ghost btn-small" onClick={() => setFolderBannerHidden(true)} title="Hide this until the next load">Not now</button>
            </div>
          </div>
        )}
        {backupReminderActive && (
'''),
    ),
    (
        "since your last JSON export, and you have unsaved changes.`",
        "since your last backup or JSON export, and you have unsaved changes.`",
    ),
    (
        ': "You have unsaved changes since your last JSON export."}',
        ': "You have unsaved changes since your last backup or JSON export."}',
    ),
    (
        B(r'''
              {headerTitle}
            </h1>
'''),
        B(r'''
              <span className="page-title-text" title={headerTitle}>{headerTitle}</span>
            </h1>
'''),
    ),
    (
        B(r'''
              snapshotRefusedAt={snapshotRefusedAt}
            />
'''),
        B(r'''
              snapshotRefusedAt={snapshotRefusedAt}
              lapsedHandle={lapsedHandle}
              onReconnectFolder={reconnectImageFolder}
              backupInfo={backupInfo}
              backupError={backupError}
              backupBusy={backupBusy}
              onBackupNow={backupNow}
            />
'''),
    ),
])


# ---------------------------------------------------------------- 16: Settings
edit(MODULES / "16_trunk.jsx", [
    (
        "onDeleteSnapshot, storageKept, snapshotRefusedAt }) {\n  const fileRef = useRef(null);\n",
        "onDeleteSnapshot, storageKept, snapshotRefusedAt, lapsedHandle, onReconnectFolder, backupInfo, backupError, backupBusy, onBackupNow }) {\n"
        "  const fileRef = useRef(null);\n"
        "  // v1.7 r040: the Folder backups row's line under its text.\n"
        "  const backupStatus = dirHandle\n"
        "    ? (backupError\n"
        "        ? `Last backup failed: ${backupError.name}${backupError.message ? `: ${backupError.message}` : \"\"}`\n"
        "        : backupInfo\n"
        "          ? `Last backup ${formatSnapshotTimestamp(backupInfo.at)}: ${backupInfo.name}`\n"
        "          : \"No backup of this world yet\")\n"
        "    : lapsedHandle\n"
        "      ? `Stopped until \"${lapsedHandle.name}\" is reconnected`\n"
        "      : \"No folder connected\";\n",
    ),
    (
        B(r'''
            <div className={`fsaa-status ${dirHandle ? "connected" : ""}`} style={{ marginTop: 8 }}>
              <div className="fsaa-status-dot" />
              <span>{dirHandle ? `Connected: ${dirHandle.name}` : (fsaaSupported ? "No folder connected" : "Not supported in this browser")}</span>
            </div>
          </div>
          <div className="settings-row-action" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {fsaaSupported && (
              dirHandle
                ? <>
                    <button className="btn btn-ghost" onClick={onSetupFolder}>Change</button>
                    <button className="btn btn-danger" onClick={onDisconnectFolder}>Disconnect</button>
                  </>
                : <button className="btn btn-accent" onClick={onSetupFolder}>Connect Folder</button>
            )}
          </div>
'''),
        B(r'''
            <div className={`fsaa-status ${dirHandle ? "connected" : lapsedHandle ? "lapsed" : ""}`} style={{ marginTop: 8 }}>
              <div className="fsaa-status-dot" />
              <span>{dirHandle ? `Connected: ${dirHandle.name}` : lapsedHandle ? `Needs reconnecting: ${lapsedHandle.name}` : (fsaaSupported ? "No folder connected" : "Not supported in this browser")}</span>
            </div>
          </div>
          <div className="settings-row-action" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {fsaaSupported && (
              dirHandle
                ? <>
                    <button className="btn btn-ghost" onClick={onSetupFolder}>Change</button>
                    <button className="btn btn-danger" onClick={onDisconnectFolder}>Disconnect</button>
                  </>
                : lapsedHandle
                  ? <>
                      <button className="btn btn-accent" onClick={onReconnectFolder}>Reconnect</button>
                      <button className="btn btn-ghost" onClick={onSetupFolder}>Change</button>
                      <button className="btn btn-danger" onClick={onDisconnectFolder}>Disconnect</button>
                    </>
                  : <button className="btn btn-accent" onClick={onSetupFolder}>Connect Folder</button>
            )}
          </div>
'''),
    ),
    (
        B(r'''
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-title">Export world</div>
'''),
        B(r'''
        {/* v1.7 r040: backups into the images folder */}
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-title">Folder backups</div>
            <div className="settings-row-desc">
              {fsaaSupported
                ? `With an images folder connected, Cartulary writes the world into a ${BACKUP_FOLDER} folder inside it as you edit, at most every ten minutes, as the same .json file Export writes, and keeps this world's newest ${BACKUP_KEEP}. Import reads them back.`
                : "Backups need a folder, and this browser can't give Cartulary one. An exported .json is the copy outside the browser."}
            </div>
            {fsaaSupported && (
              <div className={`fsaa-status ${dirHandle ? (backupError ? "failed" : backupInfo ? "connected" : "") : lapsedHandle ? "lapsed" : ""}`} style={{ marginTop: 8 }}>
                <div className="fsaa-status-dot" />
                <span>{backupStatus}</span>
              </div>
            )}
          </div>
          {fsaaSupported && (
            <div className="settings-row-action">
              {dirHandle
                ? <button className="btn btn-accent" onClick={onBackupNow} disabled={backupBusy}>Back up now</button>
                : lapsedHandle
                  ? <button className="btn btn-accent" onClick={onReconnectFolder}>Reconnect</button>
                  : <button className="btn btn-ghost" onClick={onSetupFolder}>Connect Folder</button>}
            </div>
          )}
        </div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-title">Export world</div>
'''),
    ),
    (
        "once it's been more than 2 hours since your last JSON export and you have unsaved changes.",
        "once it's been more than 2 hours since your last JSON export or folder backup and you have unsaved changes.",
    ),
])


# ---------------------------------------------------------------- shell: CSS
edit(SHELL, [
    (
        B(r'''
.fsaa-status.connected .fsaa-status-dot{background:var(--accent);box-shadow:0 0 6px var(--accent)}
'''),
        B(r'''
.fsaa-status.connected .fsaa-status-dot{background:var(--accent);box-shadow:0 0 6px var(--accent)}
/* A folder whose permission lapsed, and a backup that failed (v1.7 r040) */
.fsaa-status.lapsed{color:var(--warn)}
.fsaa-status.lapsed .fsaa-status-dot{background:var(--warn)}
.fsaa-status.failed{color:var(--danger)}
.fsaa-status.failed .fsaa-status-dot{background:var(--danger)}
'''),
    ),
    (
        B(r'''
.title-icon{font-size:calc(16px * var(--font-scale));margin-right:10px;flex-shrink:0}
'''),
        B(r'''
.title-icon{font-size:calc(16px * var(--font-scale));margin-right:10px;flex-shrink:0}
/* The title's text in a span of its own, which the ellipsis reaches (v1.7 r040) */
.page-title-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
'''),
    ),
])


def main():
    staged = []
    for path, pairs in PLAN:
        text = path.read_text(encoding="utf-8")
        for pair in pairs:
            old, new = pair[0], pair[1]
            count = pair[2] if len(pair) > 2 else 1
            n = text.count(old)
            assert n == count, f"{path.name}: anchor occurs {n} times, not {count}:\n{old[:300]}"
            text = text.replace(old, new)
        staged.append((path, text))
    for path, text in staged:
        path.write_text(text, encoding="utf-8")
    print(f"r040 applied to {len(staged)} files")


if __name__ == "__main__":
    main()
