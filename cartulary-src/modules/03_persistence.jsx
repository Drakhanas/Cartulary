
// ─── IndexedDB ─────────────────────────────────────────────────────────────────

const DB_NAME = "cartulary";
const LEGACY_DB_NAME = "world-bible";  // Pre-rename DB; migrated on first load
const DB_STORE = "data";
const DB_KEY = "world";
const DB_PREFS_KEY = "user-prefs";

const openDB = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, 1);
  req.onupgradeneeded = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
  };
  req.onsuccess = (e) => resolve(e.target.result);
  req.onerror = () => reject(req.error);
});

// One-time migration: if the legacy DB exists and the new DB doesn't have data
// yet, copy world + prefs across. Runs on every startup; cheap if no legacy data.
const migrateLegacyDB = async () => {
  try {
    // Check legacy DB existence without forcing creation
    const databases = await (indexedDB.databases ? indexedDB.databases() : Promise.resolve([]));
    const hasLegacy = databases.some(db => db.name === LEGACY_DB_NAME);
    if (!hasLegacy) return;

    // Open legacy DB
    const legacyDb = await new Promise((resolve, reject) => {
      const req = indexedDB.open(LEGACY_DB_NAME, 1);
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = () => reject(req.error);
      req.onupgradeneeded = (e) => {
        // Don't create stores in legacy DB — if it's empty, just skip
        const db = e.target.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
      };
    });

    if (!legacyDb.objectStoreNames.contains(DB_STORE)) {
      legacyDb.close();
      return;
    }

    // Read everything
    const [legacyWorld, legacyPrefs] = await Promise.all([
      new Promise((resolve) => {
        const tx = legacyDb.transaction(DB_STORE, "readonly");
        const r = tx.objectStore(DB_STORE).get(DB_KEY);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => resolve(null);
      }),
      new Promise((resolve) => {
        const tx = legacyDb.transaction(DB_STORE, "readonly");
        const r = tx.objectStore(DB_STORE).get(DB_PREFS_KEY);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => resolve(null);
      }),
    ]);
    legacyDb.close();

    // Check whether new DB already has data
    const newDb = await openDB();
    const existingWorld = await new Promise((resolve) => {
      const tx = newDb.transaction(DB_STORE, "readonly");
      const r = tx.objectStore(DB_STORE).get(DB_KEY);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(null);
    });

    // Copy if new is empty and legacy has content
    if (!existingWorld && legacyWorld) {
      await new Promise((resolve, reject) => {
        const tx = newDb.transaction(DB_STORE, "readwrite");
        tx.objectStore(DB_STORE).put(legacyWorld, DB_KEY);
        if (legacyPrefs) tx.objectStore(DB_STORE).put(legacyPrefs, DB_PREFS_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      console.log("Migrated world data from legacy DB to Cartulary DB");
    }
    newDb.close();

    // Don't delete legacy DB — leave it as a backup. User can clean it up via
    // browser devtools if desired. Migration only runs if new DB is empty, so
    // it's idempotent: subsequent loads will see new DB has data and skip.
  } catch (e) {
    console.warn("Legacy DB migration skipped:", e);
  }
};

const dbGet = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const req = tx.objectStore(DB_STORE).get(DB_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
};

const dbSet = async (value) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(value, DB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const dbClear = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).delete(DB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const dbGetPrefs = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const req = tx.objectStore(DB_STORE).get(DB_PREFS_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
};

const dbSetPrefs = async (value) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(value, DB_PREFS_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const FSAA_SUPPORTED = typeof window !== "undefined" && "showDirectoryPicker" in window;
const DB_HANDLE_KEY = "imageDirHandle";
const DB_DRAFT_KEY = "draft";  // Persisted in-progress entry/template draft (Bug 2)

const dbGetExtra = async (key) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const req = tx.objectStore(DB_STORE).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
};

const dbSetExtra = async (key, value) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const dbDeleteExtra = async (key) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// ─── Version History (snapshots) ───────────────────────────────────────────────
// Snapshots are stored as regular keys in the existing `data` object store,
// prefixed with DB_SNAP_PREFIX. Single-world architecture means no worldId
// needed in the key. Sortable lexicographically because Date.now() in this
// epoch range is fixed-width decimal.

const DB_SNAP_PREFIX = "snap-";
const SNAPSHOT_THROTTLE_MS = 5 * 60 * 1000;       // 5-minute auto-snapshot gate
const SNAPSHOT_AUTO_CAP = 10;                      // Keep N most-recent auto-snapshots; pinned exempt
const SNAPSHOT_PRE_RESTORE_CAP = 3;                // Keep N most-recent "Before restore from..." snapshots; older evict to bound IndexedDB growth from repeat restores

// Generic prefix-range helpers. Used by snapshots, but written generically in
// case other prefix-keyed data shows up later (e.g. drafts-history).
const dbListByPrefix = async (prefix) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const store = tx.objectStore(DB_STORE);
    const range = IDBKeyRange.bound(prefix, prefix + "\uffff");
    const results = [];
    const req = store.openCursor(range);
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        results.push({ key: cursor.key, value: cursor.value });
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
};

const dbDeleteByPrefix = async (prefix) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    const store = tx.objectStore(DB_STORE);
    const range = IDBKeyRange.bound(prefix, prefix + "\uffff");
    const req = store.openCursor(range);
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// Snapshot value shape:
//   { timestamp, trigger: 'auto'|'manual', pinned: bool, label: string|null,
//     sizeBytes: number, worldJson: <world state> }
// Key shape: `${DB_SNAP_PREFIX}${timestamp}-{rand4}`. The timestamp is a
// fixed-width prefix (13 digits until year 2286), so prefix-range queries
// over the snapshot keyspace return all snapshots cleanly. The random
// suffix guards against the (near-zero probability) case where two
// snapshots fall in the same millisecond — without it, the second write
// would silently overwrite the first via duplicate key. List operations
// sort by `value.timestamp`, not by key, so the suffix doesn't affect
// ordering.
const snapshotKey = (timestamp) => `${DB_SNAP_PREFIX}${timestamp}-${Math.random().toString(36).slice(2, 6)}`;

const snapshotCreate = async ({ state, trigger, label = null, pinned = false, kind = null }) => {
  try {
    const timestamp = Date.now();
    const worldJson = state;
    // Snapshot size in actual bytes (UTF-8 encoded). Used for the UI display
    // only. JSON.stringify is the same path the export uses, so the cost is
    // comparable to a save. TextEncoder converts to true byte length —
    // .length on a string would return UTF-16 code units, which understates
    // size for worlds with heavy non-ASCII content.
    let sizeBytes = 0;
    try {
      const json = JSON.stringify(worldJson);
      sizeBytes = new TextEncoder().encode(json).length;
    } catch (e) { /* leave 0 */ }
    const snap = {
      timestamp,
      trigger,
      pinned: !!pinned,
      label: label || null,
      kind: kind || null,
      sizeBytes,
      worldJson,
    };
    await dbSetExtra(snapshotKey(timestamp), snap);
    // Auto-snapshots run the FIFO eviction. Manual/pinned snapshots don't —
    // they're exempt from the cap by design (Drak spec: pinned survive FIFO).
    if (trigger === "auto" && !pinned) {
      await snapshotEvictAuto();
    }
    // Pre-restore snapshots are pinned but capped separately so repeated
    // restores can't bloat IndexedDB indefinitely. Pre-reset / pre-import
    // are also pinned but those operations wipe prior history first, so
    // they don't accumulate the same way.
    if (kind === "pre-restore") {
      await snapshotEvictPreRestore();
    }
    return snap;
  } catch (e) {
    if (e && e.name === "QuotaExceededError") {
      console.warn("Snapshot skipped: IndexedDB quota exceeded");
    } else {
      console.error("Snapshot write failed:", e);
    }
    return null;
  }
};

const snapshotList = async () => {
  const entries = await dbListByPrefix(DB_SNAP_PREFIX);
  // Newest first. Defensive: filter out anything that doesn't look like a
  // snapshot (handles future schema drift or hand-edited DB).
  return entries
    .filter(e => e.value && typeof e.value === "object" && typeof e.value.timestamp === "number")
    .sort((a, b) => b.value.timestamp - a.value.timestamp);
};

// Most-recent timestamp across all snapshots (pinned or auto). Used to seed
// the auto-throttle gate on load so a fresh tab doesn't immediately re-snapshot.
const snapshotLatestTimestamp = async () => {
  const all = await snapshotList();
  return all.length > 0 ? all[0].value.timestamp : 0;
};

// Latest snapshot's full record (key + value). Used by the seed effect to
// populate both the throttle ref AND the content-change-detector ref. Uses
// a reverse cursor over the prefix range so we don't load every snapshot's
// worldJson into memory just to peek at the newest one — important for
// image-heavy users where a single snapshot can be hundreds of MB.
const snapshotLatest = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const store = tx.objectStore(DB_STORE);
    const range = IDBKeyRange.bound(DB_SNAP_PREFIX, DB_SNAP_PREFIX + "\uffff");
    const req = store.openCursor(range, "prev");
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      // Don't call cursor.continue() — we only want the first (newest) entry.
      resolve(cursor ? { key: cursor.key, value: cursor.value } : null);
    };
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
};

// FIFO eviction: keep newest SNAPSHOT_AUTO_CAP unpinned snapshots, drop older.
// Pinned snapshots are skipped entirely — they survive forever until manually
// deleted or wiped by Reset/Import.
const snapshotEvictAuto = async () => {
  const all = await snapshotList();
  const unpinned = all.filter(s => !s.value.pinned);
  if (unpinned.length <= SNAPSHOT_AUTO_CAP) return;
  const toEvict = unpinned.slice(SNAPSHOT_AUTO_CAP);  // already newest-first; everything past cap is older
  for (const s of toEvict) {
    try { await dbDeleteExtra(s.key); } catch (e) { console.error("Snapshot evict failed:", e); }
  }
};

// FIFO eviction for pre-restore snapshots specifically. These are pinned (so
// snapshotEvictAuto skips them) but accumulate indefinitely if the user
// restores often. Cap at SNAPSHOT_PRE_RESTORE_CAP — the user only needs the
// most recent restore-reversals; older ones drop quietly. Pre-reset and
// pre-import pinned snapshots are NOT subject to this cap because Reset and
// Import wipe prior history first, so only one of each ever exists at a time.
const snapshotEvictPreRestore = async () => {
  const all = await snapshotList();
  const preRestore = all.filter(s => s.value.kind === "pre-restore");
  if (preRestore.length <= SNAPSHOT_PRE_RESTORE_CAP) return;
  const toEvict = preRestore.slice(SNAPSHOT_PRE_RESTORE_CAP);  // newest-first; everything past cap is older
  for (const s of toEvict) {
    try { await dbDeleteExtra(s.key); } catch (e) { console.error("Pre-restore snapshot evict failed:", e); }
  }
};

const snapshotDelete = async (key) => {
  await dbDeleteExtra(key);
};

const snapshotDeleteAll = async () => {
  await dbDeleteByPrefix(DB_SNAP_PREFIX);
};

// ─── Version History panel (Settings sub-section) ───────────────────────────

// Lists snapshots for the current world, newest first. Provides a manual
// "Create restore point" button and per-row Restore / Export / Delete
// actions. All destructive actions (restore, delete) flow through an inline
// confirm modal — no native confirm(), per Drak spec. The list is local
// state inside the panel; operations call back into App-supplied handlers
// and refresh on completion.
function VersionHistoryPanel({ onCreateManual, onRestore, onExport, onDelete }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  // Pending action — drives the inline confirm modal. Shapes:
  //   { mode: 'create' }
  //   { mode: 'restore', snap, key }
  //   { mode: 'delete', snap, key }
  const [pending, setPending] = useState(null);
  const [manualLabel, setManualLabel] = useState("");
  const [busy, setBusy] = useState(false);
  // Sync double-click guard. React state isn't sufficient — two rapid clicks
  // within the same render cycle both capture busy=false from the prior
  // render's closure. The ref is mutated synchronously and gates re-entry.
  const busyRef = useRef(false);
  // Tracks mount state for post-unmount setState guards. The Restore flow
  // navigates away from Settings, which unmounts this panel; the onConfirm
  // finally-block would otherwise call setBusy/setPending on an unmounted
  // component (React 18 logs a warning).
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const refresh = async () => {
    try {
      const all = await snapshotList();
      if (mountedRef.current) setList(all);
    } catch (e) {
      console.error("Failed to load snapshots:", e);
      if (mountedRef.current) setList([]);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const all = await snapshotList();
        if (mountedRef.current) setList(all);
      } catch (e) {
        console.error("Failed to load snapshots:", e);
        if (mountedRef.current) setList([]);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();
  }, []);

  const closeModal = () => {
    if (busyRef.current) return;
    setPending(null);
    setManualLabel("");
  };

  const onConfirm = async () => {
    if (!pending || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      if (pending.mode === "create") {
        await onCreateManual(manualLabel);
        await refresh();
      } else if (pending.mode === "restore") {
        await onRestore(pending.snap);
        // Restore navigates away from Settings — list refresh not needed,
        // and the panel may have unmounted by the time we reach finally.
      } else if (pending.mode === "delete") {
        await onDelete(pending.key);
        await refresh();
      }
    } finally {
      busyRef.current = false;
      if (mountedRef.current) {
        setBusy(false);
        setPending(null);
        setManualLabel("");
      }
    }
  };

  return (
    <div className="settings-section">
      <div className="section-hdr">Version History</div>
      <div className="version-history-desc">
        Cartulary keeps automatic backups of your recent work. The last {SNAPSHOT_AUTO_CAP} automatic snapshots are retained, plus any restore points you create manually (those stay until you delete them).
      </div>
      <div className="version-history-actions">
        <button
          className="btn btn-accent"
          onClick={() => { setManualLabel(""); setPending({ mode: "create" }); }}
        >Create restore point</button>
      </div>

      {loading ? (
        <div className="snapshot-empty">Loading…</div>
      ) : list.length === 0 ? (
        <div className="snapshot-empty">
          No snapshots yet. Make some changes and they'll appear here, or use "Create restore point" to save the current state manually.
        </div>
      ) : (
        <div className="snapshot-list">
          {list.map(entry => {
            const s = entry.value;
            const isPinned = !!s.pinned;
            return (
              <div key={entry.key} className="snapshot-row">
                <div className="snapshot-row-info">
                  <div className="snapshot-row-primary">
                    <span className="snapshot-timestamp">{formatSnapshotTimestamp(s.timestamp)}</span>
                    <span className={`snapshot-badge snapshot-badge--${isPinned ? "manual" : "auto"}`}>
                      {isPinned ? "Manual" : "Auto"}
                    </span>
                    {isPinned && <span className="snapshot-pin-icon" title="Pinned — survives automatic eviction">📌</span>}
                  </div>
                  <div className="snapshot-row-secondary">
                    {s.label && <span className="snapshot-label" title={s.label}>"{s.label}"</span>}
                    <span className="snapshot-size">{formatSnapshotSize(s.sizeBytes)}</span>
                  </div>
                </div>
                <div className="snapshot-row-actions">
                  <button
                    className="btn btn-ghost"
                    onClick={() => setPending({ mode: "restore", snap: s, key: entry.key })}
                  >Restore</button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => onExport(s)}
                  >Export</button>
                  <button
                    className="btn btn-danger"
                    onClick={() => setPending({ mode: "delete", snap: s, key: entry.key })}
                  >Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pending && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {pending.mode === "create" && (
              <>
                <div className="modal-hdr">Create restore point</div>
                <div className="modal-body">
                  <div className="version-history-desc" style={{ marginBottom: 0 }}>
                    Saves a snapshot of the current world. Pinned automatically — it'll stay in history until you delete it.
                  </div>
                  <label className="snapshot-create-label">
                    <span className="snapshot-create-label-text">Label (optional)</span>
                    <input
                      type="text"
                      className="input"
                      autoFocus
                      placeholder="e.g. Before deity rename pass"
                      value={manualLabel}
                      onChange={e => setManualLabel(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !busy) onConfirm(); }}
                    />
                  </label>
                </div>
                <div className="modal-actions">
                  <button className="btn btn-ghost" onClick={closeModal} disabled={busy}>Cancel</button>
                  <button className="btn btn-accent" onClick={onConfirm} disabled={busy}>
                    {busy ? "Creating…" : "Create"}
                  </button>
                </div>
              </>
            )}
            {pending.mode === "restore" && (
              <>
                <div className="modal-hdr">Restore from {formatSnapshotTimestamp(pending.snap.timestamp)}?</div>
                <div className="modal-body">
                  <div className="modal-notice modal-notice-warning">
                    Your current work will be replaced with the snapshot's contents. A snapshot of the current state will be saved first as <em>"Before restore from {formatSnapshotTimestamp(pending.snap.timestamp)}"</em>, so this is reversible.
                  </div>
                  {pending.snap.label && (
                    <div className="modal-section">
                      <div className="modal-section-hdr">Snapshot label</div>
                      <div>"{pending.snap.label}"</div>
                    </div>
                  )}
                </div>
                <div className="modal-actions">
                  <button className="btn btn-ghost" onClick={closeModal} disabled={busy}>Cancel</button>
                  <button className="btn btn-danger" onClick={onConfirm} disabled={busy}>
                    {busy ? "Restoring…" : "Restore"}
                  </button>
                </div>
              </>
            )}
            {pending.mode === "delete" && (
              <>
                <div className="modal-hdr">Delete this snapshot?</div>
                <div className="modal-body">
                  <div className="modal-notice modal-notice-warning">
                    The snapshot from <strong>{formatSnapshotTimestamp(pending.snap.timestamp)}</strong> will be permanently removed. This cannot be undone.
                  </div>
                  {pending.snap.label && (
                    <div className="modal-section">
                      <div className="modal-section-hdr">Snapshot label</div>
                      <div>"{pending.snap.label}"</div>
                    </div>
                  )}
                </div>
                <div className="modal-actions">
                  <button className="btn btn-ghost" onClick={closeModal} disabled={busy}>Cancel</button>
                  <button className="btn btn-danger" onClick={onConfirm} disabled={busy}>
                    {busy ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}