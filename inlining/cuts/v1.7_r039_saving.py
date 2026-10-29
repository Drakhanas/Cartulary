"""v1.7 r039: saving, Pipes' first cut.

docs/pipes-spec.md, section 3, with the five details Drak settled at the cut
(2026-10-29, one per message, option a each time but the fifth, b):

1. An import or a reset clears the automatic snapshots only. Every pinned one
   stays: the user's restore points, Before restore, and Before import and
   Before reset, which from r039 carry kinds of their own (pre-import,
   pre-reset), each kind keeping its newest three as Before restore did. The
   kindless Before import and Before reset ones made before r039 stay until
   deleted, as the user's would. Claude's default, not stopped: a row whose
   snapshot holds another world names that world, told apart by when the
   world was made where both say, by name where neither does.
2. The browser is asked to keep Cartulary's storage after the session's first
   edit, once a session, inside the user's own action, while it says it may
   clear it; Settings' Save File section opens with a Browser storage row,
   the image folder's status dot and the answer's words, with a note for a
   page opened from a file.
3. A failed save shows a banner (Not saved, in the danger color, Try now and
   Export now) and retries after 2, 5, 15, and 30 seconds, then every minute,
   the waits starting over only after a success; an edit tries on its own
   too; when one lands the banner goes and "Saved" flashes; while it's up,
   leaving the page asks first. Version History says when an automatic
   snapshot was refused for a full storage, and a refused restore point's
   flash says why. Found at the cut and forced: a write past the quota
   aborts its transaction with QuotaExceededError and fires no error event,
   so every write helper now rejects on abort too; before r039 the save's
   promise never settled and a full storage lost work without a word.
4. A load, an import, or a restore that finds an entry, a template, or a
   template's field sharing an id with an earlier one, or without one, gives
   it a new id first in migrate(), the earlier keeping its own, and says so
   in a banner that stays until dismissed, naming up to five. Claude's
   defaults: missing ids are repaired the same way, an entry whose template
   is gone still refuses, the repair runs before every other pass.
5. The pass covers Chrome or Edge, and Firefox.

With them, Claude's defaults, said before the build and not stopped: a Save
that closes an editor (an entry, a template, a map, a corpus, a story, a
Fabula record, a Fabula kind's template, and both template resets) writes the
world at once, the stored draft deleted only once that write lands; other
edits keep the 250 ms wait, and a pending save, and the draft's pending
write, go out when the page is hidden and on pagehide; the world's writes
share one connection kept open and ask their transactions to commit at once;
every id built from a name and four random characters is drawn again while
it's taken (freshNameId), a field's against its template's other fields. The
roadmap row on a disabled danger button rides along, since the cut touches
the shell's CSS, and the unload handler's comment that said 500 ms is fixed.

- 02_trunk: freshNameId, collectFieldIds.
- 03_persistence: txAborted and onabort on every write; dbConnect, dbPutKey,
  dbPut, under dbSet and dbSetExtra; storageIsKept, storageAskToKeep;
  SAVE_RETRY_WAITS_MS; SNAPSHOT_KIND_CAP, SNAPSHOT_CAPPED_KINDS,
  snapshotEvictKind (for snapshotEvictPreRestore and its cap),
  snapshotDeleteAuto (for snapshotDeleteAll), snapshotCreate's onError;
  snapshotFromOtherWorld and VersionHistoryPanel's world and refusedAt.
- 01_builtin-templates: makeTemplateFromBuiltin takes the ids taken.
- 10_migrate: the Id repair section (lastIdRepairs, takeIdRepairs,
  repairRecordIds, idRepairMessage), run first in migrate() and filtered at
  its end; the built-in backfill, the field backfill, and the Region
  entries through freshNameId; validateMigrated's comment.
- 12_trunk: App's save path (runSave, saveNow, the flush on hide, the
  banner, the retry, the leave warning), the persistence ask, the repair
  banner, the snapshot kinds, every name-built id through freshNameId.
- 16_trunk: the Browser storage row; Version History's two props.
- 28_fabula/05_plot, 07_meaning: + New Thread's and + New Theme's ids.
- shell.html: the failed save's banner, the other world's name in a
  snapshot row, and a disabled danger button.

Declared scope: 01_builtin-templates, 02_trunk, 03_persistence, 10_migrate,
12_trunk, 16_trunk, 28_fabula/05_plot, 28_fabula/07_meaning, and the shell.
Declarations added: freshNameId, collectFieldIds, txAborted, dbConnection,
dbConnecting, dbConnect, dbPutKey, dbPut, storageIsKept, storageAskToKeep,
SAVE_RETRY_WAITS_MS, SNAPSHOT_KIND_CAP, SNAPSHOT_CAPPED_KINDS,
snapshotEvictKind, snapshotDeleteAuto, snapshotFromOtherWorld,
lastIdRepairs, takeIdRepairs, repairRecordIds, idRepairMessage. Removed:
SNAPSHOT_PRE_RESTORE_CAP, snapshotEvictPreRestore, snapshotDeleteAll. One
header added: `Id repair (v1.7 r039)`.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given), and nothing is written unless every anchor in
every file holds. Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r039_saving.py
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


# ---------------------------------------------------------------- 02: ids
edit(MODULES / "02_trunk.jsx", [
    (
        B(r'''
const slugify = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
'''),
        B(r'''
const slugify = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// v1.7 r039: an id built from a name and four random characters, drawn again
// while `taken` holds it, so no two records get one id: an entry's
// (ent-<slug>-xxxx), a template's (tpl-), a template's field's (fld-). The
// slug falls back to `fallback` where the name gives none, as each caller's
// did (docs/pipes-spec.md, section 3).
const freshNameId = (prefix, name, taken, fallback = "") => {
  const slug = slugify(typeof name === "string" ? name : "") || fallback;
  const has = taken && typeof taken.has === "function" ? taken : new Set();
  let id = `${prefix}-${slug}-${genId().slice(-4)}`;
  while (has.has(id)) id = `${prefix}-${slug}-${genId().slice(-4)}`;
  return id;
};

// Every field id in a list of fields, group subfields at any depth included:
// the set a template's field ids are unique within.
const collectFieldIds = (fields, into = new Set()) => {
  (Array.isArray(fields) ? fields : []).forEach(f => {
    if (!f || typeof f !== "object") return;
    if (f.id) into.add(f.id);
    if (Array.isArray(f.subfields)) collectFieldIds(f.subfields, into);
  });
  return into;
};
'''),
    ),
])


# ---------------------------------------------------------------- 03: persistence
edit(MODULES / "03_persistence.jsx", [
    (
        B(r'''
  req.onsuccess = (e) => resolve(e.target.result);
  req.onerror = () => reject(req.error);
});

// One-time migration: if the legacy DB exists and the new DB doesn't have data
'''),
        B(r'''
  req.onsuccess = (e) => resolve(e.target.result);
  req.onerror = () => reject(req.error);
});

// v1.7 r039: a write rejects when its transaction aborts as well as when it
// errs. A write past the quota aborts its transaction with QuotaExceededError
// and fires no error event, so until r039 the promise never settled and a
// failed save went unseen (docs/pipes-spec.md, section 3).
const txAborted = (tx) => tx.error || new DOMException("The write was aborted", "AbortError");

// One-time migration: if the legacy DB exists and the new DB doesn't have data
'''),
    ),
    (
        B(r'''
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      console.log("Migrated world data from legacy DB to Cartulary DB");
'''),
        B(r'''
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(txAborted(tx));
      });
      console.log("Migrated world data from legacy DB to Cartulary DB");
'''),
    ),
    (
        B(r'''
const dbSet = async (value) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(value, DB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};
'''),
        B(r'''
// v1.7 r039: the world's writes, and the other keys' (dbSetExtra), share one
// connection kept open for the session (dbConnect), so a write the page's
// hiding asks for starts in that same task, and each asks its transaction to
// commit at once where commit() exists rather than when the task ends; both
// help a write made as the page closes land. A connection the browser
// closes is opened again at the next write.
let dbConnection = null;
let dbConnecting = null;
const dbConnect = () => {
  if (dbConnection) return Promise.resolve(dbConnection);
  if (!dbConnecting) {
    dbConnecting = openDB().then(db => {
      db.onversionchange = () => { db.close(); if (dbConnection === db) dbConnection = null; };
      db.onclose = () => { if (dbConnection === db) dbConnection = null; };
      dbConnection = db;
      dbConnecting = null;
      return db;
    }, e => { dbConnecting = null; throw e; });
  }
  return dbConnecting;
};

const dbPutKey = (db, key, value) => new Promise((resolve, reject) => {
  const tx = db.transaction(DB_STORE, "readwrite");
  tx.objectStore(DB_STORE).put(value, key);
  tx.oncomplete = () => resolve();
  tx.onerror = () => reject(tx.error);
  tx.onabort = () => reject(txAborted(tx));
  if (typeof tx.commit === "function") tx.commit();
});

const dbPut = async (key, value) => {
  if (dbConnection) {
    try { return await dbPutKey(dbConnection, key, value); }
    catch (e) { if (!e || e.name !== "InvalidStateError") throw e; dbConnection = null; }
  }
  return dbPutKey(await dbConnect(), key, value);
};

const dbSet = (value) => dbPut(DB_KEY, value);
'''),
    ),
    (
        B(r'''
    tx.objectStore(DB_STORE).delete(DB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
'''),
        B(r'''
    tx.objectStore(DB_STORE).delete(DB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(txAborted(tx));
'''),
    ),
    (
        B(r'''
    tx.objectStore(DB_STORE).put(value, DB_PREFS_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
'''),
        B(r'''
    tx.objectStore(DB_STORE).put(value, DB_PREFS_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(txAborted(tx));
'''),
    ),
    (
        B(r'''
const dbSetExtra = async (key, value) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};
'''),
        B(r'''
const dbSetExtra = (key, value) => dbPut(key, value);
'''),
    ),
    (
        B(r'''
    tx.objectStore(DB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};
'''),
        B(r'''
    tx.objectStore(DB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(txAborted(tx));
  });
};

// v1.7 r039: whether the browser keeps Cartulary's storage (true), may clear
// it when it needs room (false), or can't say (null), from the Storage API.
// storageAskToKeep asks it to keep the storage while the answer is no, which
// Chromium and Safari decide by signals of their own and Firefox puts to the
// user in a popup (docs/pipes-spec.md, section 3).
const storageIsKept = async () => {
  try {
    if (typeof navigator === "undefined" || !navigator.storage || typeof navigator.storage.persisted !== "function") return null;
    return !!(await navigator.storage.persisted());
  } catch (e) { return null; }
};

const storageAskToKeep = async () => {
  const kept = await storageIsKept();
  if (kept !== false || typeof navigator.storage.persist !== "function") return kept;
  try { return !!(await navigator.storage.persist()); } catch (e) { return false; }
};

// v1.7 r039: the waits between a failed save's tries, the last repeating
// until a save lands (App's runSave).
const SAVE_RETRY_WAITS_MS = [2000, 5000, 15000, 30000, 60000];
'''),
    ),
    (
        B(r'''
const SNAPSHOT_PRE_RESTORE_CAP = 3;                // Keep N most-recent "Before restore from..." snapshots; older evict to bound IndexedDB growth from repeat restores
'''),
        B(r'''
// v1.7 r039: the snapshots the app pins before a restore, an import, or a
// reset each keep their newest SNAPSHOT_KIND_CAP, older ones evicted, since
// an import or a reset no longer clears the pinned snapshots.
const SNAPSHOT_KIND_CAP = 3;
const SNAPSHOT_CAPPED_KINDS = ["pre-restore", "pre-import", "pre-reset"];
'''),
    ),
    (
        B(r'''
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// Snapshot value shape:
//   { timestamp, trigger: 'auto'|'manual', pinned: bool, label: string|null,
//     sizeBytes: number, worldJson: <world state> }
'''),
        B(r'''
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(txAborted(tx));
  });
};

// Snapshot value shape:
//   { timestamp, trigger: 'auto'|'manual', pinned: bool, label: string|null,
//     kind: null|'pre-restore'|'pre-import'|'pre-reset', sizeBytes: number,
//     worldJson: <world state> }
// kind marks the app's own pinned snapshots; a restore point the user makes
// has none, nor do the Before import and Before reset ones from before r039.
'''),
    ),
    (
        B(r'''
const snapshotCreate = async ({ state, trigger, label = null, pinned = false, kind = null }) => {
'''),
        B(r'''
const snapshotCreate = async ({ state, trigger, label = null, pinned = false, kind = null, onError = null }) => {
'''),
    ),
    (
        B(r'''
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
'''),
        B(r'''
    // The snapshots pinned before a restore, an import, or a reset are capped
    // per kind (SNAPSHOT_KIND_CAP), so repeated restores and imports can't
    // fill the storage the world needs; since v1.7's r039 an import or a
    // reset clears only the automatic snapshots, so these accumulate too.
    if (SNAPSHOT_CAPPED_KINDS.includes(kind)) {
      await snapshotEvictKind(kind);
    }
    return snap;
  } catch (e) {
    if (e && e.name === "QuotaExceededError") {
      console.warn("Snapshot skipped: IndexedDB quota exceeded");
    } else {
      console.error("Snapshot write failed:", e);
    }
    // v1.7 r039: the caller hears why, for Version History's note and a
    // restore point's flash.
    if (typeof onError === "function") onError(e);
    return null;
  }
};
'''),
    ),
    (
        B(r'''
// FIFO eviction: keep newest SNAPSHOT_AUTO_CAP unpinned snapshots, drop older.
// Pinned snapshots are skipped entirely — they survive forever until manually
// deleted or wiped by Reset/Import.
'''),
        B(r'''
// FIFO eviction: keep newest SNAPSHOT_AUTO_CAP unpinned snapshots, drop older.
// Pinned snapshots are skipped entirely: they stay until they're deleted by
// hand, or evicted by their kind's cap (snapshotEvictKind), since an import
// or a reset clears only the automatic ones (v1.7 r039).
'''),
    ),
    (
        B(r'''
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
'''),
        B(r'''
// FIFO eviction for one kind of the app's pinned snapshots: Before restore,
// Before import, or Before reset. They're pinned (so snapshotEvictAuto skips
// them) but accumulate if the user restores or imports often, so each kind
// keeps its newest SNAPSHOT_KIND_CAP and older ones drop quietly. Before
// restore had the cap alone until v1.7's r039, when an import and a reset
// stopped clearing the pinned snapshots.
const snapshotEvictKind = async (kind) => {
  const all = await snapshotList();
  const ofKind = all.filter(s => s.value.kind === kind);
  if (ofKind.length <= SNAPSHOT_KIND_CAP) return;
  const toEvict = ofKind.slice(SNAPSHOT_KIND_CAP);  // newest-first; everything past cap is older
  for (const s of toEvict) {
    try { await dbDeleteExtra(s.key); } catch (e) { console.error("Pinned snapshot evict failed:", e); }
  }
};
'''),
    ),
    (
        B(r'''
const snapshotDeleteAll = async () => {
  await dbDeleteByPrefix(DB_SNAP_PREFIX);
};
'''),
        B(r'''
// v1.7 r039: an import or a reset clears the automatic snapshots only; the
// user's restore points and the app's pinned snapshots stay
// (docs/pipes-spec.md, section 3).
const snapshotDeleteAuto = async () => {
  const all = await snapshotList();
  for (const s of all) {
    if (s.value.pinned) continue;
    try { await dbDeleteExtra(s.key); } catch (e) { console.error("Snapshot delete failed:", e); }
  }
};

// v1.7 r039: the name of the world a snapshot holds when it isn't the one
// open, for its row in Version History, since a restore point now outlives
// the world it was made in. Worlds are told apart by when they were made
// where both say, so a renamed world's snapshots stay its own; where neither
// says, by name.
const snapshotFromOtherWorld = (snapWorld, world) => {
  if (!snapWorld || !world) return null;
  const made = snapWorld.createdAt || null, open = world.createdAt || null;
  const other = (made || open) ? made !== open : (snapWorld.name || "") !== (world.name || "");
  return other ? (snapWorld.name || "Untitled World") : null;
};
'''),
    ),
    (
        B(r'''
function VersionHistoryPanel({ onCreateManual, onRestore, onExport, onDelete }) {
'''),
        B(r'''
function VersionHistoryPanel({ onCreateManual, onRestore, onExport, onDelete, world, refusedAt }) {
'''),
    ),
    (
        B(r'''
      <div className="version-history-actions">
'''),
        B(r'''
      {refusedAt && (
        <div className="modal-notice modal-notice-warning">
          The automatic snapshot at {formatSnapshotTimestamp(refusedAt).slice(11)} wasn't kept: the browser's storage for Cartulary is full. Deleting old snapshots makes room.
        </div>
      )}
      <div className="version-history-actions">
'''),
    ),
    (
        B(r'''
            const isPinned = !!s.pinned;
'''),
        B(r'''
            const isPinned = !!s.pinned;
            const otherWorld = snapshotFromOtherWorld(s.worldJson && s.worldJson.world, world);
'''),
    ),
    (
        B(r'''
                  <div className="snapshot-row-secondary">
                    {s.label && <span className="snapshot-label" title={s.label}>"{s.label}"</span>}
'''),
        B(r'''
                  <div className="snapshot-row-secondary">
                    {otherWorld && <span className="snapshot-world" title="This snapshot holds a different world from the one open">Another world: {otherWorld}</span>}
                    {s.label && <span className="snapshot-label" title={s.label}>"{s.label}"</span>}
'''),
    ),
])


# ---------------------------------------------------------------- 01: built-ins
edit(MODULES / "01_builtin-templates.jsx", [
    (
        B(r'''
const makeTemplateFromBuiltin = (bt) => ({
  id: `tpl-${slugify(bt.name)}-${genId().slice(-4)}`,
  name: bt.name,
  icon: bt.icon,
  color: bt.color,
  kind: bt.kind || "standard",
  origin: TEMPLATE_ORIGIN.BUILTIN,
  // v1.7 r016: Plot Thread and Theme / Motif belong to Fabula, which finds
  // them by this flag (docs/fabula-spec.md, section 4).
  ...(bt.fabulaRole ? { fabulaRole: bt.fabulaRole } : {}),
  fields: bt.fields.map(f => ({
    id: `fld-${slugify(f.label)}-${genId().slice(-4)}`,
    ...f,
  })),
});

const seedBuiltinTemplates = () => {
  const tmpls = BUILTIN_TEMPLATES.map(makeTemplateFromBuiltin);
'''),
        B(r'''
// v1.7 r039: the template's id is new to takenTemplateIds, and each field's to
// takenFieldIds and the fields made before it (freshNameId); both optional.
const makeTemplateFromBuiltin = (bt, takenTemplateIds, takenFieldIds) => {
  const fieldIds = new Set(takenFieldIds instanceof Set ? takenFieldIds : []);
  return {
    id: freshNameId("tpl", bt.name, takenTemplateIds),
    name: bt.name,
    icon: bt.icon,
    color: bt.color,
    kind: bt.kind || "standard",
    origin: TEMPLATE_ORIGIN.BUILTIN,
    // v1.7 r016: Plot Thread and Theme / Motif belong to Fabula, which finds
    // them by this flag (docs/fabula-spec.md, section 4).
    ...(bt.fabulaRole ? { fabulaRole: bt.fabulaRole } : {}),
    fields: bt.fields.map(f => {
      const id = freshNameId("fld", f.label, fieldIds);
      fieldIds.add(id);
      return { id, ...f };
    }),
  };
};

const seedBuiltinTemplates = () => {
  const taken = new Set();
  const tmpls = BUILTIN_TEMPLATES.map(bt => {
    const t = makeTemplateFromBuiltin(bt, taken);
    taken.add(t.id);
    return t;
  });
'''),
    ),
])


# ---------------------------------------------------------------- 10: migrate
edit(MODULES / "10_migrate.jsx", [
    (
        B(r'''
  if (!Array.isArray(state.templates)) state.templates = [];
  if (!Array.isArray(state.entries)) state.entries = [];
  if (!Array.isArray(state.stemmas)) state.stemmas = [];
'''),
        B(r'''
  if (!Array.isArray(state.templates)) state.templates = [];
  if (!Array.isArray(state.entries)) state.entries = [];
  if (!Array.isArray(state.stemmas)) state.stemmas = [];
  // v1.7 r039: an entry, a template, or a template's field that shares its
  // id with an earlier one, or has none, gets a new id before anything else
  // reads them (repairRecordIds); what changed is kept for the caller.
  lastIdRepairs = repairRecordIds(state);
'''),
    ),
    (
        B(r'''
      insertAtCanonicalPosition(makeTemplateFromBuiltin(bt), builtinIndex);
'''),
        B(r'''
      insertAtCanonicalPosition(makeTemplateFromBuiltin(bt, new Set(state.templates.map(t => t && t.id))), builtinIndex);
'''),
    ),
    (
        B(r'''
          userTpl.fields.push({
            id: `fld-${slugify(bf.label)}-${genId().slice(-4)}`,
            ...bf,
          });
'''),
        B(r'''
          userTpl.fields.push({
            id: freshNameId("fld", bf.label, collectFieldIds(userTpl.fields)),
            ...bf,
          });
'''),
    ),
    (
        B(r'''
          const newId = `ent-${slugify(newName)}-${genId().slice(-4)}`;
'''),
        B(r'''
          const newId = freshNameId("ent", newName, new Set(state.entries.map(e => e && e.id)));
'''),
    ),
    (
        B(r'''
  // v1.7 r006: Fabula's slice and its seeded schemas (docs/fabula-spec.md,
  // section 3). Last, so the templates the schemas point at are final.
  ensureFabulaSlice(state);

  return state;
};

// ─── Migration validation ──────────────────────────────────────────────────────
// Run after migrate() to catch corrupt input that the migration didn't reject.
// Returns null on success, an error string describing the first violation on failure (Bug 10).
'''),
        B(r'''
  // v1.7 r006: Fabula's slice and its seeded schemas (docs/fabula-spec.md,
  // section 3). Last, so the templates the schemas point at are final.
  ensureFabulaSlice(state);

  // v1.7 r039: the repairs reported are the ones whose record is still here,
  // since the merge of same-named templates above folds a renumbered copy
  // into the earlier one.
  {
    const tplById = new Map(state.templates.filter(t => t && t.id).map(t => [t.id, t]));
    const held = new Set([...state.entries, ...state.cartographia].filter(x => x && x.id).map(x => x.id));
    lastIdRepairs = lastIdRepairs.filter(r => r.kind === "entry" ? held.has(r.id)
      : r.kind === "template" ? tplById.has(r.id)
      : tplById.has(r.templateId) && collectFieldIds(tplById.get(r.templateId).fields).has(r.id));
  }

  return state;
};

// ─── Id repair (v1.7 r039) ─────────────────────────────────────────────────────
// A world whose entries, templates, or a template's fields share an id, or
// lack one, loads with each later copy given a new id (freshNameId), the
// earlier in storage order keeping its own, instead of being refused, so a
// reference to the shared id stays with the earlier copy: nothing records
// which copy a reference meant (docs/pipes-spec.md, section 3). Field ids are
// unique within their template, at any depth, as validateMigrated checks.
// migrate() runs it first, so every pass after it sees one record per id,
// and leaves what it changed in lastIdRepairs, never stored, for the load,
// the import, or the restore to take (takeIdRepairs) and say in a banner
// (idRepairMessage).
let lastIdRepairs = [];

const takeIdRepairs = () => {
  const out = lastIdRepairs;
  lastIdRepairs = [];
  return out;
};

const repairRecordIds = (state) => {
  const repairs = [];
  const text = (v) => (typeof v === "string" ? v : "");
  const templates = state.templates.filter(t => t && typeof t === "object");
  const tplIds = new Set(templates.map(t => t.id).filter(Boolean));
  const seenTpl = new Set();
  templates.forEach(t => {
    if (t.id && !seenTpl.has(t.id)) { seenTpl.add(t.id); return; }
    const why = t.id ? "duplicate" : "missing";
    t.id = freshNameId("tpl", t.name, tplIds);
    tplIds.add(t.id);
    seenTpl.add(t.id);
    repairs.push({ kind: "template", why, id: t.id, name: text(t.name) });
  });
  templates.forEach(t => {
    if (!Array.isArray(t.fields)) return;
    const fieldIds = collectFieldIds(t.fields);
    const seen = new Set();
    const walk = (fields) => fields.forEach(f => {
      if (!f || typeof f !== "object") return;
      if (f.id && !seen.has(f.id)) {
        seen.add(f.id);
      } else {
        const why = f.id ? "duplicate" : "missing";
        f.id = freshNameId("fld", f.label, fieldIds);
        fieldIds.add(f.id);
        seen.add(f.id);
        repairs.push({ kind: "field", why, id: f.id, templateId: t.id, name: text(f.label), template: text(t.name) });
      }
      if (Array.isArray(f.subfields)) walk(f.subfields);
    });
    walk(t.fields);
  });
  const tplName = new Map();
  templates.forEach(t => { if (!tplName.has(t.id)) tplName.set(t.id, text(t.name)); });
  const entries = state.entries.filter(e => e && typeof e === "object");
  const entryIds = new Set(entries.map(e => e.id).filter(Boolean));
  const seenEnt = new Set();
  entries.forEach(e => {
    if (e.id && !seenEnt.has(e.id)) { seenEnt.add(e.id); return; }
    const why = e.id ? "duplicate" : "missing";
    e.id = freshNameId("ent", e.name, entryIds);
    entryIds.add(e.id);
    seenEnt.add(e.id);
    repairs.push({ kind: "entry", why, id: e.id, name: text(e.name), template: tplName.get(e.templateId) || "" });
  });
  return repairs;
};

// The banner's words for what repairRecordIds changed: a sentence for each
// kind, naming up to five and then how many more.
const idRepairMessage = (repairs) => {
  const words = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  const listOf = (labels) => {
    const shown = labels.slice(0, 5);
    const more = labels.length - shown.length;
    if (more > 0) return `${shown.join(", ")} and ${more} more`;
    return shown.length <= 1 ? (shown[0] || "") : `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
  };
  const nameOf = (r) => r.name || "(unnamed)";
  const entryList = (items) => {
    const tpls = [...new Set(items.map(r => r.template || ""))];
    if (tpls.length === 1 && tpls[0]) return `${listOf(items.map(nameOf))} (${tpls[0]})`;
    return listOf(items.map(r => (r.template ? `${nameOf(r)} (${r.template})` : nameOf(r))));
  };
  const fieldOf = (r) => `the field ${nameOf(r)}${r.template ? ` in ${r.template}` : ""}`;
  const shared = (kind) => repairs.filter(r => r.kind === kind && r.why === "duplicate");
  const out = [];
  const entries = shared("entry");
  if (entries.length > 0) {
    const n = entries.length, one = n === 1;
    out.push(`${n} ${one ? "entry was" : "entries were"} using an id an earlier entry already had, so ${one ? "it" : "they"} got ${one ? "a new one" : "new ones"}: ${entryList(entries)}. Anything that pointed at ${one ? "the" : "a"} shared id now points at the earlier entry; links meant for ${one ? "it" : `these ${words[n] || n}`} need checking.`);
  }
  const templates = shared("template");
  if (templates.length > 0) {
    const n = templates.length, one = n === 1;
    out.push(`${n} ${one ? "template was" : "templates were"} using an id an earlier template already had, so ${one ? "it" : "they"} got ${one ? "a new one" : "new ones"}: ${listOf(templates.map(nameOf))}. The entries that named ${one ? "the" : "a"} shared id stay with the earlier template.`);
  }
  const fields = shared("field");
  if (fields.length > 0) {
    const n = fields.length, one = n === 1;
    out.push(`${n} ${one ? "field was" : "fields were"} using an id an earlier field of ${one ? "its" : "their"} template already had, so ${one ? "it" : "they"} got ${one ? "a new one" : "new ones"}: ${listOf(fields.map(fieldOf))}. Values saved under ${one ? "the" : "a"} shared id stay with the earlier field.`);
  }
  const missing = repairs.filter(r => r.why === "missing");
  if (missing.length > 0) {
    const n = missing.length, one = n === 1;
    const label = (r) => r.kind === "field" ? fieldOf(r) : r.kind === "template" ? `the template ${nameOf(r)}` : (r.template ? `${nameOf(r)} (${r.template})` : nameOf(r));
    out.push(`${n} ${one ? "record" : "records"} had no id and got one: ${listOf(missing.map(label))}.`);
  }
  return out.join(" ");
};

// ─── Migration validation ──────────────────────────────────────────────────────
// Run after migrate() to catch corrupt input that the migration didn't reject.
// Returns null on success, an error string describing the first violation on failure (Bug 10).
// Since v1.7's r039 migrate() gives a shared or missing id a new one first
// (repairRecordIds), so the id checks here are the backstop, and what's
// refused is what can't be repaired.
'''),
    ),
])


# ---------------------------------------------------------------- 28: Fabula's new entries
edit(MODULES / "28_fabula" / "05_plot.jsx", [
    (
        B(r'''
  const entry = { id: `ent-${slugify(title) || "thread"}-${genId().slice(-4)}`, templateId: tplId,'''),
        B(r'''
  const entry = { id: freshNameId("ent", title, new Set((state.entries || []).map(e => e && e.id)), "thread"), templateId: tplId,'''),
    ),
])
edit(MODULES / "28_fabula" / "07_meaning.jsx", [
    (
        B(r'''
  const entry = { id: `ent-${slugify(title) || "theme"}-${genId().slice(-4)}`, templateId: tplId,'''),
        B(r'''
  const entry = { id: freshNameId("ent", title, new Set((state.entries || []).map(e => e && e.id)), "theme"), templateId: tplId,'''),
    ),
])


# ---------------------------------------------------------------- 16: Settings
edit(MODULES / "16_trunk.jsx", [
    (
        "onCreateManualSnapshot, onRestoreSnapshot, onExportSnapshot, onDeleteSnapshot }) {\n",
        "onCreateManualSnapshot, onRestoreSnapshot, onExportSnapshot, onDeleteSnapshot, storageKept, snapshotRefusedAt }) {\n",
    ),
    (
        B(r'''
        <div className="section-hdr">Save File</div>
'''),
        B(r'''
        <div className="section-hdr">Save File</div>
        {/* v1.7 r039: what the browser says about keeping Cartulary's storage */}
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-title">Browser storage</div>
            <div className="settings-row-desc">
              {storageKept === true
                ? "This browser keeps Cartulary's storage and won't clear it to make room. Clearing its site data still erases it, so keep exporting."
                : storageKept === false
                  ? "This browser may clear Cartulary's storage when it needs room, and clearing its site data erases it too. An exported .json is the copy that lasts."
                  : storageKept === null
                    ? "This browser doesn't say whether it keeps Cartulary's storage. An exported .json is the copy that lasts."
                    : ""}
              {storageKept !== undefined && typeof location !== "undefined" && location.protocol === "file:"
                ? " Opened from a file, this page's storage follows the browser's rules for local files, which vary from browser to browser (Help: Working With Multiple Worlds)."
                : ""}
            </div>
            <div className={`fsaa-status ${storageKept === true ? "connected" : ""}`} style={{ marginTop: 8 }}>
              <div className="fsaa-status-dot" />
              <span>{storageKept === true ? "Kept by this browser" : storageKept === false ? "May be cleared" : storageKept === null ? "No answer from this browser" : "Checking"}</span>
            </div>
          </div>
        </div>
'''),
    ),
    (
        B(r'''
        onDelete={onDeleteSnapshot}
      />
'''),
        B(r'''
        onDelete={onDeleteSnapshot}
        world={world}
        refusedAt={snapshotRefusedAt}
      />
'''),
    ),
])


# ---------------------------------------------------------------- 12: App
edit(MODULES / "12_trunk.jsx", [
    # -- state and refs
    (
        B(r'''
  // Auto-save debounce timer (Bug 1)
  const saveTimerRef = useRef(null);
'''),
        B(r'''
  // Auto-save debounce timer (Bug 1)
  const saveTimerRef = useRef(null);
  // v1.7 r039, saving (docs/pipes-spec.md, section 3). saveNowRef: the next
  // write goes out at once rather than after the 250 ms wait, set by a Save
  // that closes an editor (saveNow). savePendingRef: a change is waiting for
  // its write, which the page's hiding sends at once. saveSeqRef numbers the
  // writes; draftClearArmedRef and draftClearSeqRef delete the stored draft
  // only once the write carrying its Save lands. A failure: saveFailure is
  // the banner's, { name, message, quota, nextAt }, saveAttemptRef picks the
  // next wait (SAVE_RETRY_WAITS_MS), and the retry timer makes the try.
  const saveNowRef = useRef(false);
  const savePendingRef = useRef(false);
  const saveSeqRef = useRef(0);
  const draftClearArmedRef = useRef(false);
  const draftClearSeqRef = useRef(null);
  const saveAttemptRef = useRef(0);
  const saveRetryTimerRef = useRef(null);
  const saveFailingRef = useRef(false);
  const [saveFailure, setSaveFailure] = useState(null);
  const [, setSaveTick] = useState(0);
  // The browser's answer on keeping Cartulary's storage (storageIsKept):
  // undefined until it comes, null where it can't say. It's asked to keep
  // the storage after the session's first edit (askPersistOnce).
  const [storageKept, setStorageKept] = useState(undefined);
  const persistAskedRef = useRef(false);
  // When an automatic snapshot was refused for a full storage, for Version
  // History's note; the next one kept clears it.
  const [snapshotRefusedAt, setSnapshotRefusedAt] = useState(null);
  // What the last load, import, or restore repaired (repairRecordIds), for a
  // banner that stays until it's dismissed: { title, text }.
  const [idRepair, setIdRepair] = useState(null);
'''),
    ),
    (
        B(r'''
  const draftSaveTimerRef = useRef(null);
'''),
        B(r'''
  const draftSaveTimerRef = useRef(null);
  const pendingDraftRef = useRef(null); // v1.7 r039: the draft write its timer holds, which the page's hiding sends at once
'''),
    ),
    # -- the load's repair banner
    (
        B(r'''
          setState(migrated);
        }
      } catch (e) {
        console.error(e);
        setLoadError({
'''),
        B(r'''
          setState(migrated);
          // v1.7 r039: what the load repaired, if anything (repairRecordIds).
          const repairs = takeIdRepairs();
          if (repairs.length > 0) setIdRepair({ title: "Repaired on load.", text: idRepairMessage(repairs) });
        }
      } catch (e) {
        console.error(e);
        setLoadError({
'''),
    ),
    # -- the save effect and runSave
    (
        B(r'''
  useEffect(() => {
    if (!loaded || !state || loadError) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await dbSet(state);
      } catch (e) {
        console.error("Save failed:", e);
        return;
      }
      if (!snapshotSeedReadyRef.current) return;
      const currentUpdatedAt = state.world?.updatedAt || null;
      if (currentUpdatedAt === lastSnapshotedUpdatedAtRef.current) return;
      const now = Date.now();
      if (now - (lastSnapshotAtRef.current || 0) >= SNAPSHOT_THROTTLE_MS) {
        // Claim the slot before the async write to prevent a parallel save
        // from racing through the gate. If the write fails, the next save
        // attempt will retry once the throttle window opens again.
        lastSnapshotAtRef.current = now;
        const snap = await snapshotCreate({ state, trigger: "auto" });
        if (snap) {
          lastSnapshotAtRef.current = snap.timestamp;
          lastSnapshotedUpdatedAtRef.current = currentUpdatedAt;
        }
      }
    }, 250);
    return () => clearTimeout(saveTimerRef.current);
  }, [state, loaded, loadError]);
'''),
        B(r'''
  // v1.7 r039: the write is runSave's, which a Save that closes an editor
  // makes at once (saveNowRef) and the page's hiding makes early
  // (savePendingRef).
  useEffect(() => {
    if (!loaded || !state || loadError) return;
    stateRef.current = state;
    clearTimeout(saveTimerRef.current);
    savePendingRef.current = true;
    // A Save's draft deletion waits for the next write, which carries it.
    if (draftClearArmedRef.current) {
      draftClearArmedRef.current = false;
      draftClearSeqRef.current = saveSeqRef.current + 1;
    }
    if (saveNowRef.current) {
      saveNowRef.current = false;
      runSave(state);
      return;
    }
    saveTimerRef.current = setTimeout(() => runSave(state), 250);
    return () => clearTimeout(saveTimerRef.current);
  }, [state, loaded, loadError]);

  // v1.7 r039: an automatic snapshot refused for a full storage, for Version
  // History's note.
  const noteSnapshotRefused = (e) => { if (e && e.name === "QuotaExceededError") setSnapshotRefusedAt(Date.now()); };

  // v1.7 r039: one write of the world (docs/pipes-spec.md, section 3). On a
  // success the stored draft goes if a Save asked for that, a failure's
  // banner goes with a flash, and the automatic snapshot runs as it did. On
  // a failure the banner shows, and the next try comes after the next of the
  // waits (SAVE_RETRY_WAITS_MS), which start over only after a success; an
  // edit tries on its own as well. A try writes the world as it stands then.
  const runSave = async (st) => {
    const seq = ++saveSeqRef.current;
    clearTimeout(saveRetryTimerRef.current);
    try {
      await dbSet(st);
    } catch (e) {
      console.error("Save failed:", e);
      const wait = SAVE_RETRY_WAITS_MS[Math.min(saveAttemptRef.current, SAVE_RETRY_WAITS_MS.length - 1)];
      saveAttemptRef.current += 1;
      saveFailingRef.current = true;
      setSaveFailure({ name: (e && e.name) || "Error", message: (e && e.message) || "", quota: !!(e && e.name === "QuotaExceededError"), nextAt: Date.now() + wait });
      clearTimeout(saveRetryTimerRef.current);
      saveRetryTimerRef.current = setTimeout(() => { if (stateRef.current) runSave(stateRef.current); }, wait);
      return;
    }
    if (st === stateRef.current) savePendingRef.current = false;
    saveAttemptRef.current = 0;
    if (draftClearSeqRef.current != null && seq >= draftClearSeqRef.current) {
      draftClearSeqRef.current = null;
      dbDeleteExtra(DB_DRAFT_KEY).catch(e => console.error("draft clear failed", e));
    }
    if (saveFailingRef.current) {
      saveFailingRef.current = false;
      setSaveFailure(null);
      setNotice({ text: "Saved", type: "success" });
    }
    if (!snapshotSeedReadyRef.current) return;
    const currentUpdatedAt = st.world?.updatedAt || null;
    if (currentUpdatedAt === lastSnapshotedUpdatedAtRef.current) return;
    const now = Date.now();
    if (now - (lastSnapshotAtRef.current || 0) >= SNAPSHOT_THROTTLE_MS) {
      // Claim the slot before the async write to prevent a parallel save
      // from racing through the gate. If the write fails, the next save
      // attempt will retry once the throttle window opens again.
      lastSnapshotAtRef.current = now;
      const snap = await snapshotCreate({ state: st, trigger: "auto", onError: noteSnapshotRefused });
      if (snap) {
        lastSnapshotAtRef.current = snap.timestamp;
        lastSnapshotedUpdatedAtRef.current = currentUpdatedAt;
        setSnapshotRefusedAt(null);
      }
    }
  };
'''),
    ),
    # -- the periodic snapshot hears a refusal
    (
        B(r'''
        const snap = await snapshotCreate({ state: stateRef.current, trigger: "auto" });
        if (snap) {
          lastSnapshotAtRef.current = snap.timestamp;
          lastSnapshotedUpdatedAtRef.current = currentUpdatedAt;
        }
'''),
        B(r'''
        const snap = await snapshotCreate({ state: stateRef.current, trigger: "auto", onError: noteSnapshotRefused });
        if (snap) {
          lastSnapshotAtRef.current = snap.timestamp;
          lastSnapshotedUpdatedAtRef.current = currentUpdatedAt;
          setSnapshotRefusedAt(null);
        }
'''),
    ),
    # -- the storage answer at load, and the banner's countdown
    (
        B(r'''
  // Backup-reminder ticker: re-evaluate the reminder condition every minute
'''),
        B(r'''
  // v1.7 r039: what the browser says about keeping Cartulary's storage, read
  // once at load for Settings; askPersistOnce asks after the first edit.
  useEffect(() => { storageIsKept().then(setStorageKept); }, []);

  // v1.7 r039: the failed save's banner counts down to its next try.
  useEffect(() => {
    if (!saveFailure) return;
    const id = setInterval(() => setSaveTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [saveFailure]);

  // Backup-reminder ticker: re-evaluate the reminder condition every minute
'''),
    ),
    # -- the draft's write, flushable
    (
        B(r'''
  useEffect(() => {
    if (!loaded || loadError) return;
    if (!entryDraft && !tplDraft) return;
    if (draftRestoredRef.current) {
'''),
        B(r'''
  useEffect(() => {
    pendingDraftRef.current = null;
    if (!loaded || loadError) return;
    if (!entryDraft && !tplDraft) return;
    if (draftRestoredRef.current) {
'''),
    ),
    (
        B(r'''
    clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = setTimeout(() => {
      dbSetExtra(DB_DRAFT_KEY, payload).catch(e => console.error("draft save failed", e));
    }, 500);
    return () => clearTimeout(draftSaveTimerRef.current);
  }, [entryDraft, tplDraft, loaded, loadError, view, activeTemplateId, activeEntryId]);

  // Warn before tab close / refresh if a draft is dirty (Bug 3).
  // Auto-save's 500ms debounce means a recent edit may not yet be persisted.
  const draftDirtyRef = useRef(() => false); // the latest isDraftDirty, declared further down; the loading renders never reach it
  useEffect(() => {
    const handler = (e) => {
      if (draftDirtyRef.current()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
'''),
        B(r'''
    clearTimeout(draftSaveTimerRef.current);
    pendingDraftRef.current = payload;
    draftSaveTimerRef.current = setTimeout(writeDraft, 500);
    return () => clearTimeout(draftSaveTimerRef.current);
  }, [entryDraft, tplDraft, loaded, loadError, view, activeTemplateId, activeEntryId]);

  // v1.7 r039: the draft's write, from its timer or from the page's hiding.
  // A draft written since a Save takes the place of the deletion that Save
  // left for its world write to make.
  const writeDraft = () => {
    const payload = pendingDraftRef.current;
    pendingDraftRef.current = null;
    if (!payload) return;
    draftClearArmedRef.current = false;
    draftClearSeqRef.current = null;
    dbSetExtra(DB_DRAFT_KEY, payload).catch(e => console.error("draft save failed", e));
  };

  // Warn before tab close / refresh if a draft is dirty (Bug 3), or, since
  // v1.7's r039, while the world's saves are failing (saveFailingRef): either
  // way the change exists only on screen. A pending save needs no warning,
  // since the page's hiding writes it (below).
  const draftDirtyRef = useRef(() => false); // the latest isDraftDirty, declared further down; the loading renders never reach it
  useEffect(() => {
    const handler = (e) => {
      if (draftDirtyRef.current() || saveFailingRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // v1.7 r039: a pending save, and a pending draft, are written as soon as
  // the page is hidden, and on pagehide, instead of waiting out their timers;
  // the hidden write is the one to count on, since a browser may cut a write
  // short as the page unloads (docs/pipes-spec.md, section 3).
  const flushRef = useRef(() => {});
  flushRef.current = () => {
    if (savePendingRef.current && stateRef.current) {
      clearTimeout(saveTimerRef.current);
      runSave(stateRef.current);
    }
    if (pendingDraftRef.current) {
      clearTimeout(draftSaveTimerRef.current);
      writeDraft();
    }
  };
  useEffect(() => {
    const flush = () => flushRef.current();
    const onVisibility = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, []);
'''),
    ),
    # -- the failed save's banner text
    (
        B(r'''
  const backupReminderHours = prefs.lastExportAt
    ? Math.floor((Date.now() - new Date(prefs.lastExportAt).getTime()) / 3600000)
    : 0;
'''),
        B(r'''
  const backupReminderHours = prefs.lastExportAt
    ? Math.floor((Date.now() - new Date(prefs.lastExportAt).getTime()) / 3600000)
    : 0;

  // v1.7 r039: the failed save's banner, counting down to the next try.
  const saveFailureDetail = (() => {
    if (!saveFailure) return "";
    const secs = Math.max(0, Math.ceil((saveFailure.nextAt - Date.now()) / 1000));
    const next = secs > 0 ? `Trying again in ${secs} s.` : "Trying again now.";
    if (saveFailure.quota) return `The browser's storage for Cartulary is full, so your recent changes exist only on this screen. ${next} Export now keeps a copy; deleting old snapshots in Settings, Version History, makes room.`;
    const why = saveFailure.message ? `${saveFailure.name}: ${saveFailure.message}` : saveFailure.name;
    return `The browser wouldn't store your world (${why}), so your recent changes exist only on this screen. ${next}`;
  })();
'''),
    ),
    # -- the ask, the save-now flag, and updateState
    (
        B(r'''
  const updateState = (updater) => {
    setState(prev => {
'''),
        B(r'''
  // v1.7 r039: after the session's first edit, ask the browser to keep
  // Cartulary's storage while it says it may clear it: once a session, and
  // only inside the user's own action, since Firefox asks with a popup
  // (docs/pipes-spec.md, section 3).
  const askPersistOnce = () => {
    if (persistAskedRef.current) return;
    if (typeof navigator !== "undefined" && navigator.userActivation && !navigator.userActivation.isActive) return;
    persistAskedRef.current = true;
    storageAskToKeep().then(setStorageKept);
  };

  // v1.7 r039: a Save that closes an editor writes the world at once rather
  // than after the auto-save's 250 ms wait (the save effect's saveNowRef).
  const saveNow = () => { saveNowRef.current = true; };

  const updateState = (updater) => {
    askPersistOnce();
    setState(prev => {
'''),
    ),
    (
        B(r'''
  const clearDraftAndStorage = () => {
'''),
        B(r'''
  // v1.7 r039: after a Save (afterSave) the stored draft is deleted once the
  // world's write carrying the Save lands, not before, so a reload in between
  // finds the draft; otherwise at once, as before.
  const clearDraftAndStorage = (afterSave = false) => {
'''),
    ),
    (
        B(r'''
    clearTimeout(draftSaveTimerRef.current);
    dbDeleteExtra(DB_DRAFT_KEY).catch(e => console.error("draft clear failed", e));
  };
'''),
        B(r'''
    clearTimeout(draftSaveTimerRef.current);
    pendingDraftRef.current = null;
    if (afterSave) {
      draftClearArmedRef.current = true;
      return;
    }
    draftClearArmedRef.current = false;
    draftClearSeqRef.current = null;
    dbDeleteExtra(DB_DRAFT_KEY).catch(e => console.error("draft clear failed", e));
  };
'''),
    ),
    # -- ids built from names
    (
        B(r'''
    const newId = `ent-${slugify(name) || "event"}-${genId().slice(-4)}`;
'''),
        B(r'''
    const newId = freshNameId("ent", name, new Set(state.entries.map(e => e.id)), "event");
'''),
    ),
    # -- saves that close an editor write at once
    (
        B(r'''
      updatedAt: isoNow(),
    };
    updateState(s => {
      const arr = Array.isArray(s.cartographia) ? s.cartographia : [];
'''),
        B(r'''
      updatedAt: isoNow(),
    };
    saveNow();
    updateState(s => {
      const arr = Array.isArray(s.cartographia) ? s.cartographia : [];
'''),
    ),
    (
        B(r'''
    const now = isoNow();
    updateFabula(fab => {
      const arr = fabArr(fab, "corpora");
'''),
        B(r'''
    const now = isoNow();
    saveNow();
    updateFabula(fab => {
      const arr = fabArr(fab, "corpora");
'''),
    ),
    (
        B(r'''
    const draft = schemaDraft;
    updateState(s => ({ ...s, fabula: fabulaSchemaSave(s, draft.kind, draft) }));
    clearDraftAndStorage();
'''),
        B(r'''
    const draft = schemaDraft;
    saveNow();
    updateState(s => ({ ...s, fabula: fabulaSchemaSave(s, draft.kind, draft) }));
    clearDraftAndStorage(true);
'''),
    ),
    (
        B(r'''
    updateState(s => ({ ...s, fabula: fabulaResetSchema(s, kind) }));
    clearDraftAndStorage();
'''),
        B(r'''
    saveNow();
    updateState(s => ({ ...s, fabula: fabulaResetSchema(s, kind) }));
    clearDraftAndStorage(true);
'''),
    ),
    (
        B(r'''
    const now = isoNow();
    updateFabula(fab => ({ ...fab, stories: fabArr(fab, "stories").map(st => st.id === storyDraft.id ?'''),
        B(r'''
    const now = isoNow();
    saveNow();
    updateFabula(fab => ({ ...fab, stories: fabArr(fab, "stories").map(st => st.id === storyDraft.id ?'''),
    ),
    (
        B(r'''
    const now = isoNow();
    updateFabula(fab => {
      const arr = fabArr(fab, slice);
'''),
        B(r'''
    const now = isoNow();
    saveNow();
    updateFabula(fab => {
      const arr = fabArr(fab, slice);
'''),
    ),
    (
        B(r'''
    if (view === "entry-new") {
      newId = `ent-${slugify(entryDraft.name)}-${genId().slice(-4)}`;
'''),
        B(r'''
    saveNow();
    if (view === "entry-new") {
      newId = freshNameId("ent", entryDraft.name, new Set(state.entries.map(e => e.id)));
'''),
    ),
    (
        B(r'''
    setActiveEntryId(newId); clearDraftAndStorage(); setView("entry");
'''),
        B(r'''
    setActiveEntryId(newId); clearDraftAndStorage(true); setView("entry");
'''),
    ),
    (
        B(r'''
    // Ensure every field at every depth has an id.
    const ensureIds = (fields) => fields.forEach(f => {
      if (!f.id) f.id = `fld-${slugify(f.label)}-${genId().slice(-4)}`;
      if (f.type === "group" && Array.isArray(f.subfields)) ensureIds(f.subfields);
    });
    if (view === "tpl-build") {
      cleaned.id = `tpl-${slugify(cleaned.name)}-${genId().slice(-4)}`;
'''),
        B(r'''
    // Ensure every field at every depth has an id, each one new to the
    // template (v1.7 r039, freshNameId).
    const takenFieldIds = collectFieldIds(cleaned.fields);
    const ensureIds = (fields) => fields.forEach(f => {
      if (!f.id) { f.id = freshNameId("fld", f.label, takenFieldIds); takenFieldIds.add(f.id); }
      if (f.type === "group" && Array.isArray(f.subfields)) ensureIds(f.subfields);
    });
    saveNow();
    if (view === "tpl-build") {
      cleaned.id = freshNameId("tpl", cleaned.name, new Set(state.templates.map(t => t.id)));
'''),
    ),
    (
        B(r'''
    clearDraftAndStorage(); setView("list");
    flash("Template saved");
'''),
        B(r'''
    clearDraftAndStorage(true); setView("list");
    flash("Template saved");
'''),
    ),
    (
        B(r'''
    const seenFieldIds = new Set();

    // Recursive cleanup — drops empty-label fields like saveTemplate does.
'''),
        B(r'''
    const seenFieldIds = new Set();
    let takenFieldIds = new Set(); // v1.7 r039: every id the template holds, for the de-dupe below

    // Recursive cleanup — drops empty-label fields like saveTemplate does.
'''),
    ),
    (
        B(r'''
      // De-dupe field ids: if a hand-edit duplicates an id, regenerate the dup.
      if (f.id && seenFieldIds.has(f.id)) {
        f.id = `fld-${slugify(f.label || "field")}-${genId().slice(-4)}`;
      }
'''),
        B(r'''
      // De-dupe field ids: if a hand-edit duplicates an id, regenerate the dup,
      // with an id new to the template (v1.7 r039).
      if (f.id && seenFieldIds.has(f.id)) {
        f.id = freshNameId("fld", f.label || "field", takenFieldIds);
        takenFieldIds.add(f.id);
      }
'''),
    ),
    (
        B(r'''
    cloned.fields = cleanFields(cloned.fields || []);
'''),
        B(r'''
    cloned.fields = cleanFields(cloned.fields || []);
    takenFieldIds = collectFieldIds(cloned.fields);
'''),
    ),
    (
        B(r'''
    const ensureIds = (fields) => fields.forEach(f => {
      if (!f.id) f.id = `fld-${slugify(f.label || "field")}-${genId().slice(-4)}`;
      if (f.type === "group" && Array.isArray(f.subfields)) ensureIds(f.subfields);
    });
'''),
        B(r'''
    // v1.7 r039: a field given an id here gets one new to the template.
    let takenFieldIds = new Set();
    const ensureIds = (fields) => fields.forEach(f => {
      if (!f.id) { f.id = freshNameId("fld", f.label || "field", takenFieldIds); takenFieldIds.add(f.id); }
      if (f.type === "group" && Array.isArray(f.subfields)) ensureIds(f.subfields);
    });
'''),
    ),
    (
        B(r'''
    ensureIds(newTpl.fields);
'''),
        B(r'''
    takenFieldIds = collectFieldIds(newTpl.fields);
    ensureIds(newTpl.fields);
'''),
    ),
    (
        B(r'''
      newTpl.id = `tpl-${slugify(newTpl.name) || "imported"}-${genId().slice(-4)}`;
'''),
        B(r'''
      newTpl.id = freshNameId("tpl", newTpl.name, new Set(state.templates.map(t => t.id)), "imported");
'''),
    ),
    # -- import: take the repairs with the migrated world
    (
        B(r'''
      const isBlank = !state || !(state.entries) || state.entries.length === 0;
      if (isBlank) {
        executeImport(migrated);
        return;
      }
      setDestructiveOp({
        type: "import",
        migrated,
        sourceName: migrated.world?.name || "imported world",
      });
'''),
        B(r'''
      // v1.7 r039: what the import's load repaired, for its banner.
      const repairs = takeIdRepairs();
      const isBlank = !state || !(state.entries) || state.entries.length === 0;
      if (isBlank) {
        executeImport(migrated, repairs);
        return;
      }
      setDestructiveOp({
        type: "import",
        migrated,
        repairs,
        sourceName: migrated.world?.name || "imported world",
      });
'''),
    ),
    # -- reset and import keep the pinned snapshots
    (
        B(r'''
  // Actual reset execution. Called either directly (blank-world bypass) or
  // by DestructiveOpModal after the user confirms. Always wipes prior
  // snapshots — they were for the world about to be discarded. Takes a
  // pinned "Before reset" snapshot first if the world was non-blank, giving
  // the user an in-app rollback path even after the wipe.
  const executeReset = async () => {
    const isBlank = !state || !(state.entries) || state.entries.length === 0;
    try { await snapshotDeleteAll(); } catch (e) { console.error("Failed to wipe snapshots:", e); }
    if (!isBlank) {
      try {
        await snapshotCreate({
          state,
          trigger: "manual",
          pinned: true,
          label: "Before reset",
        });
      } catch (e) { console.error("Pre-reset snapshot failed:", e); }
    }
    const fresh = makeInitialState();
    setState(fresh);
'''),
        B(r'''
  // Actual reset execution. Called either directly (blank-world bypass) or
  // by DestructiveOpModal after the user confirms. Clears the automatic
  // snapshots, which were for the world about to be discarded; since v1.7's
  // r039 the user's restore points and the app's pinned snapshots stay
  // (snapshotDeleteAuto). Takes a pinned "Before reset" snapshot first if the
  // world was non-blank, of kind pre-reset, whose newest three are kept,
  // giving the user an in-app rollback path.
  const executeReset = async () => {
    const isBlank = !state || !(state.entries) || state.entries.length === 0;
    try { await snapshotDeleteAuto(); } catch (e) { console.error("Failed to clear automatic snapshots:", e); }
    if (!isBlank) {
      try {
        await snapshotCreate({
          state,
          trigger: "manual",
          pinned: true,
          kind: "pre-reset",
          label: "Before reset",
        });
      } catch (e) { console.error("Pre-reset snapshot failed:", e); }
    }
    const fresh = makeInitialState();
    setState(fresh);
    setIdRepair(null);
'''),
    ),
    (
        B(r'''
  // Actual import execution. Same shape as executeReset: wipe prior history,
  // capture a pre-import pinned snapshot of the world being replaced (if
  // non-blank), then swap state to the imported world.
  const executeImport = async (migrated) => {
    const isBlank = !state || !(state.entries) || state.entries.length === 0;
    try { await snapshotDeleteAll(); } catch (e) { console.error("Failed to wipe snapshots:", e); }
    if (!isBlank) {
      try {
        await snapshotCreate({
          state,
          trigger: "manual",
          pinned: true,
          label: "Before import",
        });
      } catch (e) { console.error("Pre-import snapshot failed:", e); }
    }
    setState(migrated);
'''),
        B(r'''
  // Actual import execution. Same shape as executeReset: clear the automatic
  // snapshots, capture a pre-import pinned snapshot of the world being
  // replaced (if non-blank, of kind pre-import, whose newest three are kept),
  // then swap state to the imported world, with the banner for what its load
  // repaired (v1.7 r039).
  const executeImport = async (migrated, repairs = []) => {
    const isBlank = !state || !(state.entries) || state.entries.length === 0;
    try { await snapshotDeleteAuto(); } catch (e) { console.error("Failed to clear automatic snapshots:", e); }
    if (!isBlank) {
      try {
        await snapshotCreate({
          state,
          trigger: "manual",
          pinned: true,
          kind: "pre-import",
          label: "Before import",
        });
      } catch (e) { console.error("Pre-import snapshot failed:", e); }
    }
    setState(migrated);
    setIdRepair(repairs.length > 0 ? { title: "Repaired on import.", text: idRepairMessage(repairs) } : null);
'''),
    ),
    # -- a refused restore point says why
    (
        B(r'''
    const trimmedLabel = (label || "").trim();
    const snap = await snapshotCreate({
      state,
      trigger: "manual",
      pinned: true,
      label: trimmedLabel || null,
    });
'''),
        B(r'''
    const trimmedLabel = (label || "").trim();
    let refusal = null;
    const snap = await snapshotCreate({
      state,
      trigger: "manual",
      pinned: true,
      label: trimmedLabel || null,
      onError: (e) => { refusal = e; },
    });
'''),
    ),
    (
        B(r'''
    } else {
      flash("Failed to create restore point", "error");
    }
'''),
        B(r'''
    } else {
      // v1.7 r039: a full storage says so.
      flash(refusal && refusal.name === "QuotaExceededError"
        ? "The restore point wasn't kept: the browser's storage for Cartulary is full. Deleting old snapshots makes room."
        : "Failed to create restore point", "error");
    }
'''),
    ),
    # -- a restore's repairs
    (
        B(r'''
    if (!migrated) {
      const versionTooNew = snap.worldJson && typeof snap.worldJson === "object" && snap.worldJson.schemaVersion > SCHEMA_VERSION;
'''),
        B(r'''
    const repairs = takeIdRepairs(); // v1.7 r039: what the restore's load repaired, for its banner
    if (!migrated) {
      const versionTooNew = snap.worldJson && typeof snap.worldJson === "object" && snap.worldJson.schemaVersion > SCHEMA_VERSION;
'''),
    ),
    (
        B(r'''
    setState(migrated);
    setActiveTemplateId(null); setActiveTagFilter(null); setActiveEntryId(null);
    clearDraftAndStorage(); setView("home");
    lastSnapshotAtRef.current = Date.now();
    lastSnapshotedUpdatedAtRef.current = migrated.world?.updatedAt || null;
    flash("Snapshot restored");
'''),
        B(r'''
    setState(migrated);
    setIdRepair(repairs.length > 0 ? { title: "Repaired on restore.", text: idRepairMessage(repairs) } : null);
    setActiveTemplateId(null); setActiveTagFilter(null); setActiveEntryId(null);
    clearDraftAndStorage(); setView("home");
    lastSnapshotAtRef.current = Date.now();
    lastSnapshotedUpdatedAtRef.current = migrated.world?.updatedAt || null;
    flash("Snapshot restored");
'''),
    ),
    # -- the built-ins made again take the ids taken
    (
        B(r'''
        const fresh = makeTemplateFromBuiltin(BUILTIN_TEMPLATES[builtinIdx]);
'''),
        B(r'''
        const fresh = makeTemplateFromBuiltin(BUILTIN_TEMPLATES[builtinIdx], new Set(newTemplates.map(t => t && t.id)));
'''),
    ),
    (
        B(r'''
      const fresh = makeTemplateFromBuiltin(builtin);
      fresh.id = userTpl.id;
'''),
        B(r'''
      const fresh = makeTemplateFromBuiltin(builtin, null, collectFieldIds(userTpl.fields));
      fresh.id = userTpl.id;
'''),
    ),
    # -- the banners
    (
        B(r'''
      <main className="main">
        {backupReminderActive && (
'''),
        B(r'''
      <main className="main">
        {saveFailure && (
          <div className="backup-banner save-failed" role="alert">
            <div className="backup-banner-text">
              <strong>Not saved.</strong>
              <span className="backup-banner-detail">{saveFailureDetail}</span>
            </div>
            <div className="backup-banner-actions">
              <button className="btn btn-ghost btn-small" onClick={() => { if (stateRef.current) runSave(stateRef.current); }}>Try now</button>
              <button className="btn btn-accent btn-small" onClick={exportWorld}>Export now</button>
            </div>
          </div>
        )}
        {idRepair && (
          <div className="backup-banner" role="status">
            <div className="backup-banner-text">
              <strong>{idRepair.title}</strong>
              <span className="backup-banner-detail">{idRepair.text}</span>
            </div>
            <div className="backup-banner-actions">
              <button className="btn btn-ghost btn-small" onClick={() => setIdRepair(null)}>Dismiss</button>
            </div>
          </div>
        )}
        {backupReminderActive && (
'''),
    ),
    # -- Settings hears the storage answer and the refused snapshot
    (
        B(r'''
              onDeleteSnapshot={removeSnapshot}
            />
'''),
        B(r'''
              onDeleteSnapshot={removeSnapshot}
              storageKept={storageKept}
              snapshotRefusedAt={snapshotRefusedAt}
            />
'''),
    ),
    # -- the template reset writes at once
    (
        B(r'''
            setResetTplId(null);
            resetTemplate(tplId);
            // If the user was editing this template, bounce back to the list view;
            // they can re-enter the editor to see the freshly reset state.
            if (wasEditingThis) {
              clearDraftAndStorage();
'''),
        B(r'''
            setResetTplId(null);
            saveNow();
            resetTemplate(tplId);
            // If the user was editing this template, bounce back to the list view;
            // they can re-enter the editor to see the freshly reset state.
            if (wasEditingThis) {
              clearDraftAndStorage(true);
'''),
    ),
    (
        B(r'''
              executeImport(op.migrated);
'''),
        B(r'''
              executeImport(op.migrated, op.repairs);
'''),
    ),
])


# ---------------------------------------------------------------- shell: CSS
edit(SHELL, [
    (
        B(r'''
.btn-danger:hover:not(:disabled){background:var(--danger-bg)}
'''),
        B(r'''
.btn-danger:hover:not(:disabled){background:var(--danger-bg)}
.btn-danger:disabled{opacity:.35}
'''),
    ),
    (
        B(r'''
.snapshot-size{flex-shrink:0;font-variant-numeric:tabular-nums}
'''),
        B(r'''
.snapshot-size{flex-shrink:0;font-variant-numeric:tabular-nums}
.snapshot-world{color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:320px}
'''),
    ),
    (
        B(r'''
.backup-banner-actions{display:flex;gap:8px;flex-shrink:0}
'''),
        B(r'''
.backup-banner-actions{display:flex;gap:8px;flex-shrink:0}
/* A save that failed (v1.7 r039): the banner in the danger color */
.backup-banner.save-failed{background:var(--danger-bg);border-bottom-color:rgba(184,92,76,.45)}
.backup-banner.save-failed .backup-banner-text strong{color:var(--danger)}
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
    print(f"r039 applied to {len(staged)} files")


if __name__ == "__main__":
    main()
