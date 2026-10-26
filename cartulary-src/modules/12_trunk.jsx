
// ─── App ───────────────────────────────────────────────────────────────────────

function App() {
  const [state, setState] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);  // {reason, rawData} — Bug 9 recovery surface

  // UI state
  const [view, setView] = useState("home");  // home | project | list | entry | entry-edit | entry-new | tpl-build | tpl-edit | settings | graph | timeline | family | kalendarium
  const [activeTemplateId, setActiveTemplateId] = useState(null);
  const [activeTagFilter, setActiveTagFilter] = useState(null);  // when set, list view shows entries with this tag
  const [activeEntryId, setActiveEntryId] = useState(null);
  const [activePackId, setActivePackId] = useState(null);  // v1.5: which pack the detail pane shows
  // Where the entry view's "← Back" button should return to. Captured every
  // time we navigate INTO entry view from any non-entry context (list, graph,
  // family, stemma, timeline, chronometrics, home, project). Entry → wiki-link
  // → entry chains do NOT update this, so back always returns to wherever
  // the chain started rather than ping-ponging between linked entries.
  const [entryNavStack, setEntryNavStack] = useState([]);
  const [activeStemmaId, setActiveStemmaId] = useState(null);  // null = index view; id = canvas view for that stemma
  const [focalNodeId, setFocalNodeId] = useState(null);  // current focal node within the active stemma; null when no stemma open
  // Cartographia session state (v1.6 r001), mirroring the stemma pattern.
  // activeMapId: null = index; id = per-map view for that record. mapDraft:
  // null = view mode; object = edit mode (a working copy, committed on Save).
  // A mapDraft whose id is not yet in state.cartographia is a brand-new,
  // uncommitted map (the entry-new analogue).
  const [activeMapId, setActiveMapId] = useState(null);
  const [mapDraft, setMapDraft] = useState(null);
  const mapEditorApiRef = useRef(null); // what the open map editor lets this component call (r046: Cancel's restore)
  const initialMapDraftRef = useRef(null);
  // Fabula session state (v1.7 r007), the map pattern: activeCorpusId null =
  // the index, an id = that corpus's page; corpusDraft null = view mode, an
  // object = its fields in edit (a working copy, committed on Save). A
  // corpusDraft whose id isn't in state.fabula.corpora is a new corpus.
  const [activeCorpusId, setActiveCorpusId] = useState(null);
  const [corpusDraft, setCorpusDraft] = useState(null);
  const initialCorpusDraftRef = useRef(null);
  // v1.7 r008: a story's page. activeStoryId null = no story open, an id =
  // that story's page, drawn over the Fabula page it was opened from
  // (activeCorpusId: a corpus's page, or the index), which its Back returns
  // to. storyDraft is the Story record in edit, committed on Save.
  const [activeStoryId, setActiveStoryId] = useState(null);
  const [storyDraft, setStoryDraft] = useState(null);
  const initialStoryDraftRef = useRef(null);
  // v1.7 r009: People. storyTab is the story page's open tab; activeRecord
  // ({ kind, id }) is a cast record's, an arc's, or a relationship's page,
  // drawn over its story's page; recordDraft is that record in edit (one
  // whose id isn't in its slice is new); fabulaBack holds the pages the
  // record was opened from, a story's tab or another record, for Back.
  const [storyTab, setStoryTab] = useState("story");
  const [activeRecord, setActiveRecord] = useState(null);
  const [recordDraft, setRecordDraft] = useState(null);
  const initialRecordDraftRef = useRef(null);
  // v1.7 r011: an act or a chapter whose Delete is asking what happens to
  // what it holds ({ kind, id }), while its modal is open.
  const [fabulaHoldsAsk, setFabulaHoldsAsk] = useState(null);
  const [fabulaBack, setFabulaBack] = useState([]);
  // v1.7 r016: the section of Fabula's index to scroll to, Plot Threads or
  // Themes & Motifs, set where a page of theirs lands there.
  const [fabulaFocus, setFabulaFocus] = useState(null);
  // Kalendarium session state (v1.4). activeCalendarId follows the stemma
  // pattern: null = index view; non-null = editor for that calendar. Special
  // value "__primary__" routes the editor to state.world.calendar without
  // requiring primary to carry an id field. referenceCalendarId drives the
  // index-view comparison strip — null means primary, otherwise looks up in
  // state.calendars. Set by either editing a calendar (literal-edit) or
  // clicking its pin button. Session-local, not persisted to world JSON.
  const [activeCalendarId, setActiveCalendarId] = useState(null);
  const [referenceCalendarId, setReferenceCalendarId] = useState(null);
  // Pre-deletion conversion modal state: { calendar, affectedEntryIds, targetId }
  // null when no deletion is being walked through. The affectedEntryIds is
  // pre-computed at modal-open so the count stays stable through the
  // confirmation flow even if the user pops back to a different view first.
  const [calendarDeletionPending, setCalendarDeletionPending] = useState(null);
  const [entryDraft, setEntryDraft] = useState(null);
  const [tplDraft, setTplDraft] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  const [showSecrets, setShowSecrets] = useState(true);
  const [notice, setNotice] = useState(null);  // { type, text }
  const [resetTplId, setResetTplId] = useState(null);  // Template being considered for reset
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);  // Built-in restore modal
  // Destructive-op confirmation modal for Reset / Import. Replaces the native
  // window.confirm() flow so we can offer "Export world first" and the
  // explicit skip-export acknowledgment checkbox. null when no op is pending.
  // Shape: { type: 'reset' } | { type: 'import', migrated, sourceName }
  const [destructiveOp, setDestructiveOp] = useState(null);
  const [importCollision, setImportCollision] = useState(null);  // { imported, existing, missingRefs[] } when an imported template's name clashes
  const [packReconcile, setPackReconcile] = useState(null);  // v1.5: re-import reconciliation — { packId, packName, packDescription, toAdd[], conflicts[], memberWorldIds[], actions{} }
  const [collisionAction, setCollisionAction] = useState("rename");  // "skip" | "replace" | "rename"
  const [collisionRename, setCollisionRename] = useState("");
  const [crossKindAck, setCrossKindAck] = useState(false);  // Cross-kind Replace explicit acknowledgement
  const collisionConfirmInFlight = useRef(false);  // Debounce double-click on Confirm
  // Stemma import collision state (separate from template's — different content shape)
  const [stemmaImportCollision, setStemmaImportCollision] = useState(null);  // { imported, existing, missingRefs[] }
  const [stemmaCollisionAction, setStemmaCollisionAction] = useState("rename");
  const [stemmaCollisionRename, setStemmaCollisionRename] = useState("");
  const stemmaCollisionConfirmInFlight = useRef(false);
  // Calendar import collision state (separate from stemma's — different content shape).
  // Triggers when a Kalendarium import would clash with an existing calendar
  // name (case-insensitive). Skip/Replace/Rename mirrors stemma semantics.
  const [calendarImportCollision, setCalendarImportCollision] = useState(null);  // { imported, existing }
  const [calendarCollisionAction, setCalendarCollisionAction] = useState("rename");
  const [calendarCollisionRename, setCalendarCollisionRename] = useState("");
  const calendarCollisionConfirmInFlight = useRef(false);
  // v1.5 moon-unification: staged single-calendar import moon reconciliation.
  // { calendar, moons:[{name,synodicCycleDays,phaseAnchorDay,matches:[id],decision}] }
  const [moonReconcile, setMoonReconcile] = useState(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);  // Template export dropdown
  const [showHtmlExportModal, setShowHtmlExportModal] = useState(false);  // World-level HTML export modal
  // ChronometricsView's per-template enable filter. Lifted to App so toggling
  // off a lane and then navigating away and back doesn't reset the filter to
  // all-enabled. State is the SET OF DISABLED template ids; absent means enabled.
  // Survives view changes within a session; resets on page reload.
  const [chronoDisabledTemplates, setChronoDisabledTemplates] = useState(() => new Set());
  const [dirHandle, setDirHandle] = useState(null);

  // Auto-save debounce timer (Bug 1)
  const saveTimerRef = useRef(null);

  // Version History throttle gate. lastSnapshotAtRef holds the timestamp of
  // the most recent snapshot (auto OR pinned). Seeded asynchronously from IDB
  // on mount; the save useEffect skips snapshotting until seedReady so we
  // don't fire a redundant snapshot when a recent one already exists.
  const lastSnapshotAtRef = useRef(null);
  const snapshotSeedReadyRef = useRef(false);
  // Content-based change detector. Holds the world.updatedAt value at the
  // moment of the last snapshot. Every real edit flows through `updateState`,
  // which bumps world.updatedAt to isoNow(); comparing currentUpdatedAt to
  // this ref tells us whether anything has meaningfully changed since the
  // last snapshot. More reliable than tracking "save fired" because save
  // events can fire on identical content (React state references change for
  // reasons other than user edits).
  const lastSnapshotedUpdatedAtRef = useRef(null);
  // Mirror of `state` for use inside the periodic interval, whose closure
  // would otherwise capture whatever `state` was when the interval was
  // installed. Updated by a separate effect that runs on every state change.
  const stateRef = useRef(null);

  // Draft auto-save infrastructure (Bug 2 + 3)
  // Drafts persist to IndexedDB so they survive Cancel/navigation/refresh.
  // The draft record stores the draft itself plus the context needed to restore it
  // (which view, which template, which entry). Cleared on explicit save or
  // confirmed discard. Initial-state refs power the dirty check.
  const draftSaveTimerRef = useRef(null);
  const initialEntryDraftRef = useRef(null);
  const initialTplDraftRef = useRef(null);
  const draftRestoredRef = useRef(false);
  const draftRestoreAttemptedRef = useRef(false);

  // v1.3: Concordance zoom/pan transform. Hoisted to App so the user's
  // viewport survives navigation away from Concordance and back (entry view,
  // other views), not just sim rebuilds within GraphView's lifetime. Per-
  // session only — not persisted to world JSON, since viewport is per-device
  // ergonomic state rather than world content. Reset on page reload.
  const concordanceZoomRef = useRef(null);

  // User preferences (theme + font size + view order + backup reminder state).
  // Persisted separately from world state. lastExportAt is when the user last
  // downloaded a JSON backup; the backup reminder uses it as its anchor.
  // v1.7 r007 (Drak, 2026-10-25): Fabula after Linea, and Kalendarium below
  // Ephemeris.
  const DEFAULT_VIEW_ORDER = ["family", "fabula", "stemma", "ephemeris", "kalendarium", "glossopoeia", "cartographia", "graph", "timeline", "chronometrics"];
  // Prior canonical orderings of DEFAULT_VIEW_ORDER. When a user's stored
  // viewOrder matches any of these (after filter-to-known), they haven't
  // customized — uplift them to the current canonical order so default-order
  // changes between versions reach existing users instead of being stuck in
  // their saved prefs forever. Customized orders (don't match any prior
  // canonical) pass through to the splice-at-canonical-position migration so
  // they get new items without losing their custom arrangement.
  const PRIOR_CANONICAL_VIEW_ORDERS = [
    // pre-v1.4-Cartographia
    ["family", "stemma", "graph", "kalendarium", "timeline", "chronometrics"],
    // Cartographia inserted but before the kalendarium/cartographia uplift reorder
    ["family", "stemma", "graph", "kalendarium", "cartographia", "timeline", "chronometrics"],
    // v1.4-shipped order (pre-Ephemeris)
    ["family", "stemma", "kalendarium", "cartographia", "graph", "timeline", "chronometrics"],
    // v1.5 pre-Glossopoeia order (Ephemeris in, Glossopoeia not yet)
    ["family", "stemma", "kalendarium", "ephemeris", "cartographia", "graph", "timeline", "chronometrics"],
    // v1.5 through v1.7 r006 (Glossopoeia in, Fabula not yet)
    ["family", "stemma", "kalendarium", "ephemeris", "glossopoeia", "cartographia", "graph", "timeline", "chronometrics"],
  ];
  const [prefs, setPrefs] = useState({
    theme: "default",
    fontSize: "medium",
    viewOrder: DEFAULT_VIEW_ORDER,
    lastExportAt: null,
    disableBackupReminder: false,
    templatesCollapsed: false,
    sidebarWidth: 236,
    mapStrip: null, // the map editor's strip layout (r046), normalized where it is read
    fabulaFolds: {}, // v1.7 r008: the Story tab's folded panels, one set for every story
    fabulaOutlineFolds: {}, // v1.7 r011: the Outline tab's folded acts, chapters, and scenes, by id
  });

  // In-memory snooze for the backup reminder banner. Resets on tab reload.
  const [backupSnoozedUntil, setBackupSnoozedUntil] = useState(null);
  // Tick state to drive periodic re-evaluation of the backup-reminder condition.
  const [reminderTick, setReminderTick] = useState(0);

  // Load prefs on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await dbGetPrefs();
        if (stored && typeof stored === "object") {
          // Migrate viewOrder: drop unknown values, then either uplift to
          // current canonical (if the stored order matches a prior canonical
          // default, meaning the user never customized) or splice missing
          // defaults at their canonical position relative to neighbors the
          // user has (preserving custom ordering otherwise).
          let viewOrder = Array.isArray(stored.viewOrder) ? stored.viewOrder.filter(v => DEFAULT_VIEW_ORDER.includes(v)) : [];
          const matchesPriorCanonical = PRIOR_CANONICAL_VIEW_ORDERS.some(prior =>
            prior.length === viewOrder.length && prior.every((v, i) => v === viewOrder[i])
          );
          if (matchesPriorCanonical) {
            viewOrder = [...DEFAULT_VIEW_ORDER];
          } else {
            DEFAULT_VIEW_ORDER.forEach((v, defaultIdx) => {
              if (viewOrder.includes(v)) return;
              // Walk back through DEFAULT_VIEW_ORDER looking for the nearest
              // preceding canonical neighbor that the user has stored. Insert
              // right after it. If no preceding match (item is at the head of
              // DEFAULT_VIEW_ORDER), insert at position 0.
              let prevAnchor = -1;
              for (let i = defaultIdx - 1; i >= 0; i--) {
                const idx = viewOrder.indexOf(DEFAULT_VIEW_ORDER[i]);
                if (idx !== -1) { prevAnchor = idx; break; }
              }
              viewOrder.splice(prevAnchor + 1, 0, v);
            });
          }
          setPrefs({
            theme: stored.theme || "default",
            fontSize: stored.fontSize || "medium",
            viewOrder,
            // First-run users get lastExportAt set to now. The 2h reminder timer
            // counts from when they first encountered the world, not from epoch.
            lastExportAt: stored.lastExportAt || isoNow(),
            disableBackupReminder: !!stored.disableBackupReminder,
            templatesCollapsed: !!stored.templatesCollapsed,
            sidebarWidth: typeof stored.sidebarWidth === "number"
              ? Math.max(200, Math.min(500, stored.sidebarWidth))
              : 236,
            mapStrip: stored.mapStrip && typeof stored.mapStrip === "object" ? stored.mapStrip : null,
            fabulaFolds: stored.fabulaFolds && typeof stored.fabulaFolds === "object" && !Array.isArray(stored.fabulaFolds) ? stored.fabulaFolds : {},
            fabulaOutlineFolds: stored.fabulaOutlineFolds && typeof stored.fabulaOutlineFolds === "object" && !Array.isArray(stored.fabulaOutlineFolds) ? stored.fabulaOutlineFolds : {},
          });
        } else {
          // No prefs at all — initialize lastExportAt so a brand-new world
          // doesn't trigger the reminder immediately when 2h elapse without edits.
          setPrefs(p => ({ ...p, lastExportAt: isoNow() }));
        }
      } catch (e) { console.error("prefs load failed", e); }
    })();
  }, []);

  // Apply prefs to <html> data attributes
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", prefs.theme);
    document.documentElement.setAttribute("data-font-size", prefs.fontSize);
  }, [prefs.theme, prefs.fontSize]);

  // Persist prefs on change
  useEffect(() => {
    dbSetPrefs(prefs).catch(e => console.error("prefs save failed", e));
  }, [prefs]);

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

  const setupImageFolder = async () => {
    if (!FSAA_SUPPORTED) {
      flash("Your browser doesn't support direct folder access. Images will embed inline.", "error");
      return;
    }
    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      const ok = await verifyHandlePermission(handle, "readwrite");
      if (ok) {
        setDirHandle(handle);
        await dbSetExtra(DB_HANDLE_KEY, handle);
        flash("Image folder connected");
      } else {
        flash("Permission denied", "error");
      }
    } catch (e) {
      if (e.name !== "AbortError") flash("Folder selection failed: " + e.message, "error");
    }
  };

  const disconnectImageFolder = async () => {
    setDirHandle(null);
    await dbDeleteExtra(DB_HANDLE_KEY);
    flash("Image folder disconnected");
  };

  // Load on mount (Bug 9: surface errors instead of silently overwriting bad state)
  useEffect(() => {
    (async () => {
      try {
        await migrateLegacyDB();
        const stored = await dbGet();
        if (!stored) {
          setState(makeInitialState());
        } else {
          let migrated;
          try {
            migrated = migrate(stored);
          } catch (mErr) {
            setLoadError({
              reason: `Migration threw an error: ${mErr?.message || String(mErr)}`,
              rawData: stored,
            });
            setLoaded(true);
            return;
          }
          if (!migrated) {
            const versionTooNew = typeof stored === "object" && stored && stored.schemaVersion > SCHEMA_VERSION;
            setLoadError({
              reason: versionTooNew
                ? `This world was saved by a newer version of Cartulary (schema v${stored.schemaVersion}, this build is v${SCHEMA_VERSION}). Loading would lose data.`
                : "Stored data is malformed and could not be migrated.",
              rawData: stored,
            });
            setLoaded(true);
            return;
          }
          const validationError = validateMigrated(migrated);
          if (validationError) {
            setLoadError({
              reason: `Stored data failed validation: ${validationError}`,
              rawData: stored,
            });
            setLoaded(true);
            return;
          }
          setState(migrated);
        }
      } catch (e) {
        console.error(e);
        setLoadError({
          reason: `Failed to read stored data: ${e?.message || String(e)}`,
          rawData: null,
        });
      }
      setLoaded(true);
    })();
  }, []);

  // Auto-save on state changes (after initial load) — debounced (Bug 1)
  // Skipped when loadError is set so we don't clobber recoverable bad data.
  // After a successful save, an auto-snapshot is taken when (a) the throttle
  // gate permits AND (b) content has actually changed since the last
  // snapshot. The (b) gate is keyed on world.updatedAt — not on whether the
  // save useEffect fired — because React state references can change for
  // reasons that don't reflect a real edit, while updateState is the only
  // path that bumps updatedAt.
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

  // Seed the snapshot-throttle gate AND the content-change detector from the
  // most recent existing snapshot in IDB. Runs once after initial load
  // completes. Uses snapshotLatest (reverse cursor, returns one record) so
  // we don't pay the cost of loading every snapshot's worldJson at startup.
  useEffect(() => {
    if (!loaded || loadError) return;
    let cancelled = false;
    (async () => {
      try {
        const latest = await snapshotLatest();
        if (cancelled) return;
        if (latest) {
          lastSnapshotAtRef.current = latest.value.timestamp;
          lastSnapshotedUpdatedAtRef.current = latest.value.worldJson?.world?.updatedAt || null;
        } else {
          lastSnapshotAtRef.current = 0;
          lastSnapshotedUpdatedAtRef.current = null;
        }
        snapshotSeedReadyRef.current = true;
      } catch (e) {
        console.error("Snapshot seed failed:", e);
        if (!cancelled) {
          lastSnapshotAtRef.current = 0;
          lastSnapshotedUpdatedAtRef.current = null;
          snapshotSeedReadyRef.current = true;
        }
      }
    })();
    return () => { cancelled = true; };
  }, [loaded, loadError]);

  // Mirror `state` into a ref so the periodic interval below can read the
  // latest state without re-installing itself on every state change. Without
  // this, the interval's closure would freeze on whatever state was current
  // when the interval was set up.
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Periodic auto-snapshot. Catches the gap left by the save-event-based
  // path: if the user makes a save, the throttle gate is closed (< 5 min
  // since last snapshot), and then they stop editing — the throttle gate
  // eventually opens during idle, but no save fires to notice. Without this
  // interval, the snapshot wouldn't fire until the next save (which might
  // be after page refresh). With it, the interval picks up the change and
  // fires the snapshot ~30s after the throttle opens. Uses the same
  // updatedAt-based content gate as the save path, so it can't fire on
  // unchanged state.
  useEffect(() => {
    if (!loaded || loadError) return;
    const id = setInterval(async () => {
      if (!snapshotSeedReadyRef.current) return;
      if (!stateRef.current) return;
      const currentUpdatedAt = stateRef.current.world?.updatedAt || null;
      if (currentUpdatedAt === lastSnapshotedUpdatedAtRef.current) return;
      const now = Date.now();
      if (now - (lastSnapshotAtRef.current || 0) < SNAPSHOT_THROTTLE_MS) return;
      // Claim before the async write — same pattern as the save path.
      lastSnapshotAtRef.current = now;
      try {
        const snap = await snapshotCreate({ state: stateRef.current, trigger: "auto" });
        if (snap) {
          lastSnapshotAtRef.current = snap.timestamp;
          lastSnapshotedUpdatedAtRef.current = currentUpdatedAt;
        }
      } catch (e) {
        console.error("Periodic auto-snapshot failed:", e);
      }
    }, 30 * 1000);
    return () => clearInterval(id);
  }, [loaded, loadError]);

  // Notice auto-dismiss. Duration scales with text length so long warnings
  // ("4 other entries share this name; wiki-links will resolve to the
  // earliest-stored one.") get enough time to actually be read. Floor of
  // 3 seconds for short messages, ceiling of 8 seconds, ~55ms per character
  // in between (a comfortable reading pace).
  useEffect(() => {
    if (notice) {
      const len = (notice.text || "").length;
      const ms = Math.min(8000, Math.max(3000, len * 55));
      const t = setTimeout(() => setNotice(null), ms);
      return () => clearTimeout(t);
    }
  }, [notice]);

  // Backup-reminder ticker: re-evaluate the reminder condition every minute
  useEffect(() => {
    const id = setInterval(() => setReminderTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // Draft restore on mount, after main state has loaded (Bug 2)
  // If a saved draft references a template/entry that no longer exists, discard it.
  useEffect(() => {
    if (!loaded || !state || loadError) return;
    if (draftRestoreAttemptedRef.current) return;
    draftRestoreAttemptedRef.current = true;

    (async () => {
      try {
        const saved = await dbGetExtra(DB_DRAFT_KEY);
        if (!saved || typeof saved !== "object" || !saved.draft) return;
        const { kind, view: savedView, activeTemplateId: savedTplId, activeEntryId: savedEntryId, draft } = saved;

        if (kind === "entry") {
          const tpl = state.templates.find(t => t.id === savedTplId);
          if (!tpl) {
            await dbDeleteExtra(DB_DRAFT_KEY);
            setNotice({ text: "Discarded saved draft: template no longer exists", type: "error" });
            return;
          }
          if (savedView === "entry-edit") {
            const entry = state.entries.find(e => e.id === savedEntryId);
            if (!entry) {
              await dbDeleteExtra(DB_DRAFT_KEY);
              setNotice({ text: "Discarded saved draft: entry no longer exists", type: "error" });
              return;
            }
            setActiveEntryId(savedEntryId);
          } else {
            setActiveEntryId(null);
          }
          setActiveTemplateId(savedTplId);
          draftRestoredRef.current = true;
          setEntryDraft(draft);
          initialEntryDraftRef.current = JSON.stringify(draft);
          initialTplDraftRef.current = null;
          setView(savedView === "entry-new" ? "entry-new" : "entry-edit");
          setNotice({ text: "Restored unsaved draft", type: "success" });
        } else if (kind === "template") {
          if (savedView === "tpl-edit") {
            const tpl = state.templates.find(t => t.id === savedTplId);
            if (!tpl) {
              await dbDeleteExtra(DB_DRAFT_KEY);
              setNotice({ text: "Discarded saved draft: template no longer exists", type: "error" });
              return;
            }
            setActiveTemplateId(savedTplId);
          }
          draftRestoredRef.current = true;
          setTplDraft(draft);
          initialTplDraftRef.current = JSON.stringify(draft);
          initialEntryDraftRef.current = null;
          setView(savedView === "tpl-build" ? "tpl-build" : "tpl-edit");
          setNotice({ text: "Restored unsaved draft", type: "success" });
        }
      } catch (e) {
        console.error("draft restore failed", e);
      }
    })();
  }, [loaded, state, loadError]);

  // Draft auto-save (Bug 2). Debounced. Only fires when the draft is actually
  // dirty relative to the snapshot taken when the editor was opened.
  useEffect(() => {
    if (!loaded || loadError) return;
    if (!entryDraft && !tplDraft) return;
    if (draftRestoredRef.current) {
      draftRestoredRef.current = false;
      return;
    }

    let isDirty = false;
    let payload = null;
    if (entryDraft) {
      isDirty = JSON.stringify(entryDraft) !== initialEntryDraftRef.current;
      payload = { kind: "entry", view, activeTemplateId, activeEntryId, draft: entryDraft };
    } else if (tplDraft) {
      isDirty = JSON.stringify(tplDraft) !== initialTplDraftRef.current;
      payload = { kind: "template", view, activeTemplateId, draft: tplDraft };
    }
    if (!isDirty) return;

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

  // ── Derived data ──────────────────────────────────────────────────────────────
  // Hooks must come BEFORE any early return so the hook count stays stable across renders.

  const tagCounts = useMemo(() => {
    if (!state) return {};
    const counts = {};
    state.entries.forEach(e => (e.tags || []).forEach(tag => { counts[tag] = (counts[tag] || 0) + 1; }));
    return counts;
  }, [state]);

  const allTags = useMemo(() => Object.keys(tagCounts).sort(), [tagCounts]);

  const templateCounts = useMemo(() => {
    if (!state) return {};
    const counts = {};
    state.entries.forEach(e => { counts[e.templateId] = (counts[e.templateId] || 0) + 1; });
    return counts;
  }, [state]);

  // List of built-in template names that were deleted from this world. Computed
  // by checking each canonical built-in against the user's current templates.
  // Drives the "Restore Built-ins" affordance in the sidebar.
  const deletedBuiltinNames = useMemo(() => {
    if (!state) return [];
    // A built-in counts as "present" only if there's a builtin-origin template
    // with that name. A user-origin same-named template (e.g. user's custom
    // "Character") doesn't satisfy this — the built-in Character is genuinely
    // absent and should still appear in Restore Built-ins.
    const presentBuiltinNames = new Set(
      state.templates
        .filter(t => t.origin === TEMPLATE_ORIGIN.BUILTIN)
        .map(t => t.name)
    );
    // v1.7 r016: Plot Thread and Theme / Motif aren't offered here; Fabula's
    // index restores them.
    return BUILTIN_TEMPLATES
      .filter(b => !b.fabulaRole)
      .map(b => b.name)
      .filter(name => !presentBuiltinNames.has(name));
  }, [state]);

  // Variant filter (v1.5): resolve the world's variant axis config against
  // current templates. Matching is by case-insensitive trimmed field LABEL
  // because field ids differ per template — every template carrying a select
  // field whose label matches participates. `values` is the union of option
  // strings across all matching axis fields (first-seen order, so the pack's
  // authored order wins); `byTemplate` maps templateId -> { axisFieldId,
  // flagFieldId } for the filter clause. Returns null when unconfigured.
  const variantAxisInfo = useMemo(() => {
    const va = state?.world?.variantAxis;
    if (!va || !va.fieldLabel || !va.fieldLabel.trim()) return null;
    const axisLabel = va.fieldLabel.trim().toLowerCase();
    const flagLabel = (va.flagLabel || "").trim().toLowerCase();
    const byTemplate = {};
    const values = [];
    const seen = new Set();
    (state.templates || []).forEach(t => {
      let axisFieldId = null, flagFieldId = null;
      (t.fields || []).forEach(f => {
        if (f.type !== "select") return;
        const lbl = (f.label || "").trim().toLowerCase();
        if (lbl === axisLabel) {
          axisFieldId = f.id;
          (f.options || []).forEach(o => {
            const ov = typeof o === "string" ? o : (o && o.value) || "";
            if (ov && !seen.has(ov)) { seen.add(ov); values.push(ov); }
          });
        }
        if (flagLabel && lbl === flagLabel) flagFieldId = f.id;
      });
      if (axisFieldId) byTemplate[t.id] = { axisFieldId, flagFieldId };
    });
    return { active: va.active || "", values, byTemplate };
  }, [state]);

  const filteredEntries = useMemo(() => {
    if (!state) return [];
    let entries = state.entries;
    // Variant filter runs first: with an active variant picked, an entry is
    // hidden only when its template HAS the axis field, the entry has a
    // value in it, that value differs from the active variant, AND the
    // all-variants flag (if the template has one) isn't "Yes". Templates
    // without the axis field and entries with it unset always pass —
    // forgiving to content outside the variant system.
    if (variantAxisInfo && variantAxisInfo.active) {
      const { active, byTemplate } = variantAxisInfo;
      entries = entries.filter(e => {
        const m = byTemplate[e.templateId];
        if (!m) return true;
        const axisVal = selectValueOnly((e.fields || {})[m.axisFieldId]);
        if (!axisVal) return true;
        if (axisVal === active) return true;
        if (m.flagFieldId) {
          const flagVal = selectValueOnly((e.fields || {})[m.flagFieldId]);
          if (flagVal.trim().toLowerCase() === "yes") return true;
        }
        return false;
      });
    }
    if (activeTagFilter) entries = entries.filter(e => (e.tags || []).includes(activeTagFilter));
    else if (activeTemplateId) entries = entries.filter(e => e.templateId === activeTemplateId);
    if (search.trim()) {
      const q = search.toLowerCase();
      entries = entries.filter(e =>
        e.name.toLowerCase().includes(q)
        || (e.tags || []).some(t => t.toLowerCase().includes(q))
        || JSON.stringify(e.fields || {}).toLowerCase().includes(q)
      );
    }
    const [k, dir] = sortBy.split("-");
    const mult = dir === "desc" ? -1 : 1;
    entries = [...entries].sort((a, b) => {
      let av, bv;
      if (k === "name") { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (k === "created") { av = a.createdAt; bv = b.createdAt; }
      else { av = a.updatedAt; bv = b.updatedAt; }
      return av < bv ? -1 * mult : av > bv ? 1 * mult : 0;
    });
    return entries;
  }, [state, activeTagFilter, activeTemplateId, search, sortBy, variantAxisInfo]);

  // v1.7 r016: Plot Thread and Theme / Motif live under Fabula, so whatever
  // would land on one's list page (Back with nothing behind it, Delete, a new
  // entry's Cancel, the builder's Save and Cancel, the home page's row) lands
  // on its section of Fabula's index instead (docs/fabula-spec.md, section
  // 4). Before the paint, so the list page never shows.
  React.useLayoutEffect(() => {
    if (view !== "list" || activeTagFilter || !state) return;
    const t = (state.templates || []).find(x => x && x.id === activeTemplateId);
    if (!t || !t.fabulaRole) return;
    setActiveTemplateId(null); setActiveEntryId(null);
    setActiveCorpusId(null); setActiveStoryId(null); setActiveRecord(null); setFabulaBack([]);
    setFabulaFocus(t.fabulaRole); setView("fabula");
  }, [view, activeTemplateId, activeTagFilter, state]);

  if (loaded && loadError) {
    const exportRaw = () => {
      if (!loadError.rawData) return;
      const blob = new Blob([JSON.stringify(loadError.rawData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cartulary-recovery-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    };
    const resetFresh = async () => {
      if (!confirm("This will permanently delete the stored data and start a fresh world. Export the raw data first if you may want to recover it. Continue?")) return;
      try { await dbClear(); } catch (e) { console.error(e); }
      setLoadError(null);
      setState(makeInitialState());
    };
    return (
      <div className="load-error-screen">
        <div className="load-error-card">
          <h1>Cartulary couldn't load your stored world</h1>
          <p className="load-error-reason">{loadError.reason}</p>
          <p>Your stored data hasn't been changed yet. You have two options:</p>
          <ul>
            <li><strong>Export raw data</strong> — download the stored JSON as-is so you can inspect it, repair it by hand, or send it elsewhere for recovery.</li>
            <li><strong>Reset to fresh world</strong> — wipe stored data and start over. This is permanent.</li>
          </ul>
          <div className="load-error-actions">
            <button className="btn btn-accent" onClick={exportRaw} disabled={!loadError.rawData}>Export raw data</button>
            <button className="btn btn-danger" onClick={resetFresh}>Reset to fresh world</button>
          </div>
        </div>
      </div>
    );
  }

  if (!loaded || !state) return <div className="loading">Loading...</div>;

  const isLocked = state.world.locked;
  const activeTemplate = state.templates.find(t => t.id === activeTemplateId);
  const activeEntry = state.entries.find(e => e.id === activeEntryId);
  // v1.7 r016: on an entry page, a new entry, or the builder of Plot Thread
  // or Theme / Motif, the sidebar lights Fabula, which holds them.
  const pageTemplate = (view === "entry" || view === "entry-edit")
    ? (activeEntry ? state.templates.find(t => t.id === activeEntry.templateId) : null)
    : (view === "entry-new" || view === "tpl-edit") ? activeTemplate : null;
  const sidebarView = pageTemplate && pageTemplate.fabulaRole ? "fabula" : view;

  // Backup-reminder gate: 2h since last JSON export AND there are unbacked edits.
  // reminderTick is included in the deps surface implicitly via render — every
  // tick triggers a re-render and re-runs this code.
  const BACKUP_REMINDER_HOURS = 2;
  const backupReminderActive = (() => {
    void reminderTick;  // dependency hint: this expression re-runs on tick changes
    if (prefs.disableBackupReminder) return false;
    if (backupSnoozedUntil && new Date(backupSnoozedUntil).getTime() > Date.now()) return false;
    const lastExport = prefs.lastExportAt ? new Date(prefs.lastExportAt).getTime() : 0;
    const lastEdit = state.world.updatedAt ? new Date(state.world.updatedAt).getTime() : 0;
    if (lastEdit <= lastExport) return false;  // no unbacked changes
    const hoursSinceExport = (Date.now() - lastExport) / 3600000;
    return hoursSinceExport >= BACKUP_REMINDER_HOURS;
  })();
  const backupReminderHours = prefs.lastExportAt
    ? Math.floor((Date.now() - new Date(prefs.lastExportAt).getTime()) / 3600000)
    : 0;

  // ── Actions ──────────────────────────────────────────────────────────────────

  const updateState = (updater) => {
    setState(prev => {
      const next = updater(prev);
      next.world = { ...next.world, updatedAt: isoNow() };
      return next;
    });
  };

  const flash = (text, type = "success") => setNotice({ text, type });

  // ── Draft dirty-check + storage helpers (Bug 2 + 3) ──────────────────────────
  const isDraftDirty = () => {
    if (entryDraft && JSON.stringify(entryDraft) !== initialEntryDraftRef.current) return true;
    if (tplDraft && JSON.stringify(tplDraft) !== initialTplDraftRef.current) return true;
    if (mapDraft && JSON.stringify(mapDraft) !== initialMapDraftRef.current) return true;
    if (corpusDraft && JSON.stringify(corpusDraft) !== initialCorpusDraftRef.current) return true;
    if (storyDraft && JSON.stringify(storyDraft) !== initialStoryDraftRef.current) return true;
    if (recordDraft && JSON.stringify(recordDraft) !== initialRecordDraftRef.current) return true;
    return false;
  };

  draftDirtyRef.current = isDraftDirty;
  const confirmDiscardDraft = () => {
    if (!isDraftDirty()) return true;
    const which = mapDraft ? "this map" : corpusDraft ? "this corpus" : storyDraft ? "this story" : recordDraft && activeRecord ? `this ${FABULA_NOUNS[activeRecord.kind].one}` : entryDraft ? "this entry" : "this template";
    return confirm(`Discard unsaved changes to ${which}?`);
  };

  const clearDraftAndStorage = () => {
    setEntryDraft(null); setTplDraft(null); setMapDraft(null); setCorpusDraft(null); setStoryDraft(null); setRecordDraft(null);
    initialEntryDraftRef.current = null;
    initialTplDraftRef.current = null;
    initialMapDraftRef.current = null;
    initialCorpusDraftRef.current = null;
    initialStoryDraftRef.current = null;
    initialRecordDraftRef.current = null;
    clearTimeout(draftSaveTimerRef.current);
    dbDeleteExtra(DB_DRAFT_KEY).catch(e => console.error("draft clear failed", e));
  };

  const selectTemplate = (id) => {
    if (!confirmDiscardDraft()) return;
    setActiveTemplateId(id); setActiveTagFilter(null); setActiveEntryId(null);
    clearDraftAndStorage(); setSearch(""); setView("list");
  };

  const selectTag = (tag) => {
    if (!confirmDiscardDraft()) return;
    setActiveTagFilter(tag); setActiveTemplateId(null); setActiveEntryId(null);
    clearDraftAndStorage(); setSearch(""); setView("list");
  };

  const selectView = (v) => {
    if (!confirmDiscardDraft()) return;
    setActiveTemplateId(null); setActiveTagFilter(null); setActiveEntryId(null);
    setActiveStemmaId(null); setFocalNodeId(null); setActiveMapId(null); setActiveCorpusId(null); setActiveStoryId(null);
    setActiveRecord(null); setFabulaBack([]);
    clearDraftAndStorage(); setSearch(""); setView(v);
  };

  const openEntryFromAnywhere = (id) => {
    if (!confirmDiscardDraft()) return;
    const entry = state.entries.find(e => e.id === id);
    if (entry) {
      // Browser-history-like navigation. Entry-from-entry (clicking a chip in
      // an entry view) pushes the current entry onto the stack so back returns
      // to the previous entry in the chain. Entry-from-non-entry (opening from
      // list, Concordance, etc.) starts a fresh stack with the source view as
      // the only return target.
      if (view === "entry" && activeEntryId) {
        setEntryNavStack(s => [...s, { view: "entry", entryId: activeEntryId }]);
      } else {
        setEntryNavStack([{ view, entryId: null }]);
      }
      setActiveTemplateId(entry.templateId); setActiveTagFilter(null);
      setActiveEntryId(id); clearDraftAndStorage(); setView("entry");
      return;
    }
    // v1.6 r001: map fallback. Maps are not entries; they live in
    // state.cartographia. A Concordance map-node click (or any id-stable
    // open) routes to the Cartographia per-map view. Mirrors the body
    // fallback below.
    const mapRec = (state.cartographia || []).find(m => m && m.id === id);
    if (mapRec) {
      setActiveTagFilter(null);
      setMapDraft(null); initialMapDraftRef.current = null;
      setActiveMapId(id);
      setView("cartographia");
      return;
    }
    // v1.7 r009: a cast record, an arc, or a relationship opens on its own
    // page over its story's (Drak, 2026-10-25), since r011 an act, a chapter,
    // or a scene, since r013 a plot point or a promise, and since r014 a
    // research note. From a Fabula page, Back returns to the page the click
    // came from, and since r016 from an entry's page to the entry; from
    // anywhere else, such as Concordance, to the story's tab that lists it
    // (fabulaTabOf).
    const fabRec = fabulaFindRecord(state, id);
    if (fabRec) {
      const onFabulaPage = view === "fabula" && activeStoryId && activeStoryId === fabRec.record.storyId;
      const from = onFabulaPage ? (activeRecord ? { kind: activeRecord.kind, id: activeRecord.id } : { kind: "story", tab: storyTab }) : null;
      setActiveTagFilter(null);
      setCorpusDraft(null); initialCorpusDraftRef.current = null;
      setStoryDraft(null); initialStoryDraftRef.current = null;
      setRecordDraft(null); initialRecordDraftRef.current = null;
      if (!onFabulaPage) {
        const home = ((state.fabula && state.fabula.corpora) || []).find(c => c && Array.isArray(c.storyIds) && c.storyIds.includes(fabRec.record.storyId));
        setActiveCorpusId(home ? home.id : null);
        setActiveStoryId(fabRec.record.storyId);
        setStoryTab(fabulaTabOf(fabRec.kind));
      }
      const fromEntry = (view === "entry" || view === "entry-edit") && activeEntryId ? { kind: "entry", id: activeEntryId } : null;
      setFabulaBack(b => from ? [...b, from] : [fromEntry || { kind: "story", tab: fabulaTabOf(fabRec.kind) }]);
      setActiveRecord({ kind: fabRec.kind, id });
      setView("fabula");
      return;
    }
    // v1.7 r007: Fabula fallback. A corpus opens on its page, and since r008
    // a story on its own, drawn over its corpus's page (or the index, when
    // it's in no corpus), which the story's Back returns to.
    const fabCorpora = (state.fabula && Array.isArray(state.fabula.corpora)) ? state.fabula.corpora : [];
    const fabStory = (state.fabula && Array.isArray(state.fabula.stories)) ? state.fabula.stories.find(st => st && st.id === id) : null;
    if (fabStory || fabCorpora.some(c => c && c.id === id)) {
      const home = fabStory ? fabCorpora.find(c => c && Array.isArray(c.storyIds) && c.storyIds.includes(id)) : null;
      setActiveTagFilter(null);
      setCorpusDraft(null); initialCorpusDraftRef.current = null;
      setStoryDraft(null); initialStoryDraftRef.current = null;
      setActiveCorpusId(fabStory ? (home ? home.id : null) : id);
      setActiveStoryId(fabStory ? id : null);
      setStoryTab("story"); setActiveRecord(null); setFabulaBack([]);
      setRecordDraft(null); initialRecordDraftRef.current = null;
      setView("fabula");
      return;
    }
    // v1.5 r004: body fallback. Bodies are not entries — they live in
    // state.celestialBodies. Route the click to Ephemeris with the body
    // selected in AsBo mode. Pre-r004 entry-refs to AstroBody entries
    // resolve via this fallback because migration preserved the entry id
    // on the body, so `entry-from-anywhere` calls remain id-stable.
    const body = (state.celestialBodies || []).find(b => b && b.id === id);
    if (body) {
      updateState(s => ({
        ...s,
        ephemeris: {
          ...(s.ephemeris || makeDefaultEphemerisState()),
          currentMode: "asbo",
          asbo: {
            ...((s.ephemeris && s.ephemeris.asbo) || {}),
            selectedBodyId: id,
          },
        },
      }));
      setView("ephemeris");
    }
  };

  const openEntry = (id) => {
    if (view === "entry" && activeEntryId) {
      setEntryNavStack(s => [...s, { view: "entry", entryId: activeEntryId }]);
    } else {
      setEntryNavStack([{ view, entryId: null }]);
    }
    setActiveEntryId(id); setView("entry");
  };

  // v1.5 r023: promote a computed Ephemeris event into a Festival /
  // Holiday entry. Called from EventModeContent's drawer. Pre-fills
  // Name, Calendar Date, Description, and Notes; leaves Type / Status /
  // Frequency / etc. blank so the user fills in worldbuilding context
  // after promotion. Date projects through the primary calendar
  // (entry.calendarId = null) since computed events live in absoluteDay
  // (primary calendar coords) and the user can rebind the entry to a
  // different calendar afterward through the standard entry editor.
  //
  // Returns the new entry id (caller uses this to navigate). Returns
  // null and flashes an error if the Festival / Holiday built-in
  // template is missing (user deleted it) — defensive but unlikely.
  const promoteComputedEventToEntry = (eventData) => {
    if (isLocked) return null;
    if (!eventData || !Number.isFinite(eventData.absoluteDay)) {
      flash("Cannot promote: event has no date.", "warning");
      return null;
    }
    const tpl = state.templates.find(
      t => t && t.name === "Festival / Holiday" && t.origin === "builtin"
    );
    if (!tpl) {
      flash("Cannot promote: Festival / Holiday template is missing.", "warning");
      return null;
    }
    const dateField = tpl.fields.find(f => f && f.label === "Calendar Date" && f.type === "calendar-date");
    const descField = tpl.fields.find(f => f && f.label === "Description" && f.type === "textarea");
    const notesField = tpl.fields.find(f => f && f.label === "Notes" && f.type === "textarea");

    const primaryCal = state.world && state.world.calendar;
    const calDate = absoluteDayToCalendarDate(primaryCal, eventData.absoluteDay);
    const dateLabel = (calDate && primaryCal) ? formatCalendarDate(calDate, primaryCal) : `day ${eventData.absoluteDay}`;

    // Build a friendly title and body summary based on the alignment type.
    const at = eventData.alignmentType || "phase";
    const meta = ALIGNMENT_TYPES.find(t => t.id === at);
    const typeLabel = meta?.label || at;
    const bodyNames = (eventData.bodies || []).map(b => b && b.name).filter(Boolean);
    const bodyList = bodyNames.length > 0 ? bodyNames.join(", ") : "(unnamed bodies)";
    const name = bodyNames.length > 0
      ? `${typeLabel}: ${bodyList}`
      : typeLabel;

    // Metric line for notes — alignment-type-specific.
    const raw = eventData.raw || {};
    let metricLine = "";
    if (at === "phase"       && Number.isFinite(raw.spreadDegrees))         metricLine = `Spread: ${raw.spreadDegrees.toFixed(2)}°`;
    if (at === "conjunction" && Number.isFinite(raw.separationDegrees))     metricLine = `Separation: ${raw.separationDegrees.toFixed(2)}°`;
    if (at === "eclipse"     && Number.isFinite(raw.magnitude))             metricLine = `Magnitude: ${raw.magnitude.toFixed(3)}`;
    if (at === "nodal"       && Number.isFinite(raw.maxNodeDistanceDegrees)) metricLine = `Max node distance: ${raw.maxNodeDistanceDegrees.toFixed(2)}°`;

    const descriptionText = `Computed ${typeLabel.toLowerCase()} of ${bodyList} on ${dateLabel}.`;
    const notesText = [
      "Auto-generated from Compute query.",
      "",
      `Alignment type: ${typeLabel}`,
      `Bodies involved: ${bodyList}`,
      `Date: ${dateLabel}`,
      metricLine ? `Metric: ${metricLine}` : null,
      "",
      "Recurrence: this entry represents a single computed occurrence. If this alignment recurs, describe the recurrence here in prose (Cartulary doesn't support recurrence natively).",
    ].filter(s => s !== null).join("\n");

    const fields = {};
    if (dateField && calDate)   fields[dateField.id]  = calDate;
    if (descField)              fields[descField.id]  = descriptionText;
    if (notesField)             fields[notesField.id] = notesText;

    const newId = `ent-${slugify(name) || "event"}-${genId().slice(-4)}`;
    const newEntry = {
      id: newId,
      templateId: tpl.id,
      name,
      calendarId: null, // bound to primary calendar (matches the projection)
      fields,
      tags: [],
      createdAt: isoNow(),
      updatedAt: isoNow(),
    };
    updateState(s => ({
      ...s,
      entries: [...s.entries, newEntry],
    }));
    // Navigate to the new entry directly here rather than returning the id
    // for the caller to route through openEntryFromAnywhere. That helper
    // reads state.entries to resolve the id, but the updateState above
    // hasn't flushed in this tick — the lookup would miss, fall through to
    // the body fallback, and silently no-op (leaving the user on the event
    // list). Setting the nav target directly avoids the stale-state read;
    // the entry view resolves the entry from state at render time, by which
    // point the update has committed.
    setEntryNavStack([{ view: "ephemeris", entryId: null }]);
    setActiveTemplateId(tpl.id);
    setActiveTagFilter(null);
    setActiveEntryId(newId);
    clearDraftAndStorage();
    setView("entry");
    flash(`Promoted to "${name}".`);
    return newId;
  };

  // v1.3: write Concordance node positions to state so they persist across
  // reload, export/import, and device transfer. Called from GraphView on
  // drag end (single-node patch) and on initial-layout settle (bulk patch
  // for newly-placed nodes). Bumps world.updatedAt via updateState, same as
  // any other persisted mutation — positions ARE world data once saved.
  //
  // Defensive: bails if world locked. GraphView doesn't receive isLocked so
  // drag handlers still fire when the world is in view-only mode; guarding
  // here keeps drag-induced position writes from mutating world data. UI
  // remains responsive (the node still moves visually during the drag) but
  // settle/end-drag patches no-op.
  const saveConcordancePositions = (patch) => {
    if (isLocked) return;
    if (!patch || Object.keys(patch).length === 0) return;
    updateState(s => ({
      ...s,
      concordance: {
        ...(s.concordance || {}),
        positions: { ...((s.concordance && s.concordance.positions) || {}), ...patch },
      },
    }));
  };

  // Back button on entry view. Pops the top of the nav stack and restores
  // its view + entryId. Empty stack — or stack-top pointing at a deleted
  // entry — falls back to "list". Setters are called outside the
  // setEntryNavStack updater so the updater stays pure (React strict mode
  // can invoke updaters twice; pulling side effects out keeps that safe).
  const navigateBackFromEntry = () => {
    if (entryNavStack.length === 0) {
      setView("list");
      return;
    }
    const top = entryNavStack[entryNavStack.length - 1];
    if (top.view === "entry" && top.entryId) {
      const ent = state.entries.find(e => e.id === top.entryId);
      if (ent) {
        setActiveTemplateId(ent.templateId);
        setActiveEntryId(top.entryId);
        setView("entry");
      } else {
        // Entry was deleted while we were navigating away. Fall through
        // to list rather than landing on a dead entry id.
        setView("list");
      }
    } else {
      setView(top.view);
    }
    setEntryNavStack(s => s.slice(0, -1));
  };

  // openNewEntry creates a fresh entry draft for the active template OR for an
  // explicitly-supplied template (Cartographia uses the override to bypass the
  // sidebar-selected activeTemplate). When override is provided, activeTemplateId
  // is also set so the post-save flow (entry list, header) lands on the right
  // template's surfaces.
  const openNewEntry = (templateOverride) => {
    // Defensive: if called from a React onClick without wrapping, the
    // SyntheticEvent gets passed as templateOverride. Filter to objects
    // that actually look like a template (have an id + fields array).
    const validOverride = templateOverride && typeof templateOverride === "object"
      && typeof templateOverride.id === "string"
      && Array.isArray(templateOverride.fields)
      ? templateOverride
      : null;
    const tmpl = validOverride || activeTemplate;
    if (!tmpl) return;
    if (!confirmDiscardDraft()) return;
    const draft = { name: "", tags: [], fields: {}, calendarId: null };
    tmpl.fields.forEach(f => {
      if (f.type === "group") draft.fields[f.id] = [];
      else if (f.type === "entry-ref" && f.multi) draft.fields[f.id] = [];
      else if (f.type === "name-history") draft.fields[f.id] = [];
      else if (f.type === "multiselect") draft.fields[f.id] = [];
      else if (f.type === "grid") draft.fields[f.id] = makeEmptyGrid();
      else draft.fields[f.id] = "";
    });
    if (validOverride) setActiveTemplateId(validOverride.id);
    setEntryDraft(draft);
    initialEntryDraftRef.current = JSON.stringify(draft);
    initialTplDraftRef.current = null;
    setActiveEntryId(null); setView("entry-new");
  };

  // Cartographia create-handler. Accepts an explicit templateId so users with
  // multiple map-kind templates can pick (the index UI gates on count: single
  // template → direct create, multiple → picker menu).
  // ── Cartographia per-map handlers (v1.6 r001) ────────────────────────────
  // Mirror the Stemma open/close/create/delete plus the entry view/edit/save
  // flow. A new map is held as an uncommitted mapDraft until Save, the
  // entry-new analogue.
  const openMap = (id) => {
    if (!confirmDiscardDraft()) return;
    setMapDraft(null); initialMapDraftRef.current = null;
    setActiveMapId(id);
    setView("cartographia");
  };

  const closeMapToIndex = () => {
    if (!confirmDiscardDraft()) return;
    setMapDraft(null); initialMapDraftRef.current = null;
    setActiveMapId(null);
  };

  const createMap = () => {
    if (isLocked) return;
    if (!confirmDiscardDraft()) return;
    const id = `map-${genId().slice(-6)}`;
    const draft = { id, name: "", tags: [], fields: {}, mapData: makeDefaultMapData() };
    setActiveMapId(id);
    setMapDraft(draft);
    initialMapDraftRef.current = JSON.stringify(draft);
    setView("cartographia");
  };

  const editMap = () => {
    const rec = (state.cartographia || []).find(m => m.id === activeMapId);
    if (!rec) return;
    if (!confirmDiscardDraft()) return;
    const draft = JSON.parse(JSON.stringify(rec));
    setMapDraft(draft);
    initialMapDraftRef.current = JSON.stringify(draft);
  };

  const saveMap = () => {
    if (!mapDraft) return;
    const name = (mapDraft.name || "").trim();
    if (!name) return;
    const rec = {
      id: mapDraft.id,
      name,
      tags: (mapDraft.tags || []).filter(t => t && t.trim()),
      fields: mapDraft.fields || {},
      mapData: ensureMapData(mapDraft.mapData),
      updatedAt: isoNow(),
    };
    updateState(s => {
      const arr = Array.isArray(s.cartographia) ? s.cartographia : [];
      const exists = arr.some(m => m.id === rec.id);
      return { ...s, cartographia: exists ? arr.map(m => m.id === rec.id ? rec : m) : [...arr, rec] };
    });
    setMapDraft(null); initialMapDraftRef.current = null;
    setActiveMapId(rec.id);
    flash("Saved");
  };

  const cancelMapEdit = () => {
    if (!confirmDiscardDraft()) return;
    const existed = (state.cartographia || []).some(m => m.id === activeMapId);
    // the folder back to what it held when the draft opened (r046); the editor keeps the originals
    if (mapEditorApiRef.current && typeof mapEditorApiRef.current.restoreOriginals === "function") mapEditorApiRef.current.restoreOriginals();
    setMapDraft(null); initialMapDraftRef.current = null;
    if (!existed) setActiveMapId(null); // brand-new map, never committed: back to index
  };

  const deleteMap = (id) => {
    if (isLocked) return;
    // v1.7 r003: maps are reference targets, so the delete clears references
    // to this one from every entry's fields, groups and grids included, as a
    // body's delete does; both confirmations count them first
    // (mapDeleteMessage). Any lingering concordance position keyed by this id
    // is dropped on next load by migrate's position validation; live, it
    // simply stops rendering.
    updateState(s => ({
      ...s,
      cartographia: (s.cartographia || []).filter(m => m.id !== id),
      entries: scrubEntryRefs(s.entries, s.templates, new Set([id])),
    }));
    if (activeMapId === id) {
      setActiveMapId(null);
      setMapDraft(null); initialMapDraftRef.current = null;
    }
  };

  // v1.7 r007: Fabula's corpora and stories (docs/fabula-spec.md, section 4).
  // A corpus's page follows the map's: a new corpus is a draft until Save,
  // and its fields change through Edit, Save, and Cancel. Its reading order
  // and the stories in it change at once, as the index's actions do. A
  // corpus's membership is its storyIds; a story's corpus is stored nowhere
  // else, and each change takes the story out of every corpus first.
  const updateFabula = (fn) => updateState(s => ({ ...s, fabula: fn(s.fabula || {}) }));
  const fabArr = (fab, slice) => (Array.isArray(fab[slice]) ? fab[slice] : []);

  const openCorpus = (id) => {
    if (!confirmDiscardDraft()) return;
    setCorpusDraft(null); initialCorpusDraftRef.current = null;
    setActiveCorpusId(id);
    setView("fabula");
  };

  const closeCorpusToIndex = () => {
    if (!confirmDiscardDraft()) return;
    setCorpusDraft(null); initialCorpusDraftRef.current = null;
    setActiveCorpusId(null);
  };

  const createCorpus = () => {
    if (isLocked) return;
    if (!confirmDiscardDraft()) return;
    const id = `fab-corpus-${genId()}`;
    const draft = { id, name: "", fields: {} };
    setActiveCorpusId(id);
    setCorpusDraft(draft);
    initialCorpusDraftRef.current = JSON.stringify(draft);
    setView("fabula");
  };

  const editCorpus = () => {
    const rec = fabArr(state.fabula || {}, "corpora").find(c => c.id === activeCorpusId);
    if (!rec || isLocked) return;
    if (!confirmDiscardDraft()) return;
    const draft = { id: rec.id, name: rec.name || "", fields: JSON.parse(JSON.stringify(rec.fields || {})) };
    setCorpusDraft(draft);
    initialCorpusDraftRef.current = JSON.stringify(draft);
  };

  const saveCorpus = () => {
    if (!corpusDraft || isLocked) return;
    const name = (corpusDraft.name || "").trim();
    if (!name) return;
    const now = isoNow();
    updateFabula(fab => {
      const arr = fabArr(fab, "corpora");
      const old = arr.find(c => c.id === corpusDraft.id);
      const rec = { ...(old || { storyIds: [], createdAt: now }), id: corpusDraft.id, name, fields: corpusDraft.fields || {}, updatedAt: now };
      return { ...fab, corpora: old ? arr.map(c => c.id === rec.id ? rec : c) : [...arr, rec] };
    });
    setCorpusDraft(null); initialCorpusDraftRef.current = null;
    setActiveCorpusId(corpusDraft.id);
    flash("Saved");
  };

  const cancelCorpusEdit = () => {
    if (!confirmDiscardDraft()) return;
    const existed = fabArr(state.fabula || {}, "corpora").some(c => c.id === activeCorpusId);
    setCorpusDraft(null); initialCorpusDraftRef.current = null;
    if (!existed) setActiveCorpusId(null); // a new corpus, never saved: back to the index
  };

  // Deleting a corpus leaves its stories in Fabula, in no corpus.
  const deleteCorpus = (id) => {
    if (isLocked) return;
    updateFabula(fab => ({ ...fab, corpora: fabArr(fab, "corpora").filter(c => c.id !== id) }));
    if (activeCorpusId === id) {
      setActiveCorpusId(null);
      setCorpusDraft(null); initialCorpusDraftRef.current = null;
    }
  };

  // A new story, in a corpus (at the end of its reading order) or in none.
  // Returns its id, so the row it lands in can open its title for typing.
  const createStory = (corpusId) => {
    if (isLocked) return null;
    const id = `fab-story-${genId()}`;
    const now = isoNow();
    updateFabula(fab => ({
      ...fab,
      stories: [...fabArr(fab, "stories"), { id, name: "Untitled story", fields: {}, outline: [], createdAt: now, updatedAt: now }],
      corpora: fabArr(fab, "corpora").map(c => c.id === corpusId ? { ...c, storyIds: [...(c.storyIds || []), id], updatedAt: now } : c),
    }));
    return id;
  };

  const renameStory = (id, name) => {
    const n = (name || "").trim();
    if (isLocked || !n) return;
    updateFabula(fab => ({ ...fab, stories: fabArr(fab, "stories").map(st => st.id === id ? { ...st, name: n, updatedAt: isoNow() } : st) }));
  };

  // v1.7 r009: a story's own records (cast, arcs, and the rest, each with the
  // story's storyId) go with it; the confirmation says how many.
  const deleteStory = (id) => {
    if (isLocked) return;
    updateFabula(fab => ({
      ...fab,
      ...fabulaDropStoryRecords(fab, id),
      stories: fabArr(fab, "stories").filter(st => st.id !== id),
      corpora: fabArr(fab, "corpora").map(c => (c.storyIds || []).includes(id) ? { ...c, storyIds: c.storyIds.filter(x => x !== id) } : c),
    }));
  };

  // The Corpus dropdown: into a corpus, at the end of its reading order, or
  // into none (corpusId null).
  const setStoryCorpus = (storyId, corpusId) => {
    if (isLocked) return;
    const now = isoNow();
    updateFabula(fab => ({
      ...fab,
      corpora: fabArr(fab, "corpora").map(c => {
        const ids = (c.storyIds || []).filter(x => x !== storyId);
        if (c.id === corpusId) return { ...c, storyIds: [...ids, storyId], updatedAt: now };
        return ids.length === (c.storyIds || []).length ? c : { ...c, storyIds: ids, updatedAt: now };
      }),
      stories: fabArr(fab, "stories").map(st => st.id === storyId ? { ...st, updatedAt: now } : st),
    }));
  };

  // The reading order: a story to a new place in its corpus.
  const moveCorpusStory = (corpusId, storyId, toIndex) => {
    if (isLocked) return;
    updateFabula(fab => ({
      ...fab,
      corpora: fabArr(fab, "corpora").map(c => {
        if (c.id !== corpusId || !(c.storyIds || []).includes(storyId)) return c;
        const ids = c.storyIds.filter(x => x !== storyId);
        ids.splice(Math.max(0, Math.min(ids.length, toIndex)), 0, storyId);
        return { ...c, storyIds: ids, updatedAt: isoNow() };
      }),
    }));
  };

  // v1.7 r008: a story's page (docs/fabula-spec.md, section 4). It opens over
  // the Fabula page it was opened from, which Back returns to, and the Story
  // record changes through Edit, Save, and Cancel, as a corpus's fields do.
  const openStory = (id) => {
    if (!confirmDiscardDraft()) return;
    setStoryDraft(null); initialStoryDraftRef.current = null;
    setRecordDraft(null); initialRecordDraftRef.current = null;
    setStoryTab("story"); setActiveRecord(null); setFabulaBack([]);
    setActiveStoryId(id);
    setView("fabula");
  };

  // v1.7 r016: back from Fabula to the entry's page a story or a record was
  // opened from, or Fabula's index when the entry is gone.
  const returnToEntry = (id) => {
    const ent = state.entries.find(e => e && e.id === id);
    setActiveRecord(null); setActiveStoryId(null); setActiveCorpusId(null); setFabulaBack([]);
    if (!ent) { setView("fabula"); return; }
    setActiveTemplateId(ent.templateId); setActiveTagFilter(null); setActiveEntryId(id); setView("entry");
  };

  const closeStory = () => {
    if (!confirmDiscardDraft()) return;
    setStoryDraft(null); initialStoryDraftRef.current = null;
    // v1.7 r016: a story opened from an entry's page goes back to the entry.
    const frame = fabulaBack[fabulaBack.length - 1];
    if (frame && frame.kind === "entry") { returnToEntry(frame.id); return; }
    setActiveRecord(null); setFabulaBack([]);
    setActiveStoryId(null);
  };

  // v1.7 r016: a story opened from an entry's list of the stories that use
  // it opens on the tab that lists the entry, Plot or Meaning, and Back
  // returns to the entry (docs/fabula-spec.md, 5.12).
  const openStoryFromEntry = (storyId, tab) => {
    if (!confirmDiscardDraft()) return;
    const fab = state.fabula || {};
    if (!fabArr(fab, "stories").some(st => st && st.id === storyId)) return;
    const home = fabArr(fab, "corpora").find(c => c && Array.isArray(c.storyIds) && c.storyIds.includes(storyId));
    const from = (view === "entry" || view === "entry-edit") && activeEntryId ? [{ kind: "entry", id: activeEntryId }] : [];
    clearDraftAndStorage();
    setActiveTagFilter(null);
    setCorpusDraft(null); initialCorpusDraftRef.current = null;
    setStoryDraft(null); initialStoryDraftRef.current = null;
    setRecordDraft(null); initialRecordDraftRef.current = null;
    setActiveCorpusId(home ? home.id : null);
    setActiveStoryId(storyId);
    setStoryTab(tab || "story"); setActiveRecord(null); setFabulaBack(from);
    setView("fabula");
  };

  // v1.7 r016: Fabula's index, scrolled to Plot Threads or Themes & Motifs.
  const landOnFabulaSection = (role) => {
    setActiveTemplateId(null); setActiveTagFilter(null); setActiveEntryId(null);
    setActiveCorpusId(null); setActiveStoryId(null); setActiveRecord(null); setFabulaBack([]);
    setFabulaFocus(role); setView("fabula");
  };

  // v1.7 r016: the index sections' Edit Template and + New Entry. A new
  // entry's Back returns to the index.
  const editFabulaTemplate = (tpl) => {
    if (isLocked || !tpl) return;
    if (!confirmDiscardDraft()) return;
    const draft = JSON.parse(JSON.stringify(tpl));
    setActiveTemplateId(tpl.id); setActiveTagFilter(null); setActiveEntryId(null);
    setTplDraft(draft);
    initialTplDraftRef.current = JSON.stringify(draft);
    initialEntryDraftRef.current = null;
    setView("tpl-edit");
  };

  const newFabulaEntry = (tpl) => {
    if (isLocked || !tpl) return;
    setEntryNavStack([{ view: "fabula", entryId: null }]);
    openNewEntry(tpl);
  };

  // The story page's tabs; the Story record's edit keeps its tab.
  const selectStoryTab = (tab) => { if (!storyDraft) setStoryTab(tab); };

  const editStory = () => {
    const rec = fabArr(state.fabula || {}, "stories").find(st => st.id === activeStoryId);
    if (!rec || isLocked) return;
    if (!confirmDiscardDraft()) return;
    const draft = { id: rec.id, name: rec.name || "", fields: JSON.parse(JSON.stringify(rec.fields || {})) };
    setStoryDraft(draft);
    initialStoryDraftRef.current = JSON.stringify(draft);
  };

  const saveStory = () => {
    if (!storyDraft || isLocked) return;
    const name = (storyDraft.name || "").trim();
    if (!name) return;
    const now = isoNow();
    updateFabula(fab => ({ ...fab, stories: fabArr(fab, "stories").map(st => st.id === storyDraft.id ? { ...st, name, fields: storyDraft.fields || {}, updatedAt: now } : st) }));
    setStoryDraft(null); initialStoryDraftRef.current = null;
    flash("Saved");
  };

  const cancelStoryEdit = () => {
    if (!confirmDiscardDraft()) return;
    setStoryDraft(null); initialStoryDraftRef.current = null;
  };

  // Delete, from the story's own page: asks first, then goes back.
  const deleteOpenStory = () => {
    const rec = fabArr(state.fabula || {}, "stories").find(st => st.id === activeStoryId);
    if (!rec || isLocked) return;
    if (!confirm(fabulaStoryDeleteMessage(state, rec))) return;
    deleteStory(rec.id);
    setStoryDraft(null); initialStoryDraftRef.current = null;
    setActiveStoryId(null);
  };

  // The Story tab's folds belong to the browser, one set for every story
  // (Drak, 2026-10-25), so they live with the display settings.
  const toggleFabulaFold = (panelId) => setPrefs(p => ({ ...p, fabulaFolds: { ...(p.fabulaFolds || {}), [panelId]: !(p.fabulaFolds || {})[panelId] } }));

  // v1.7 r011: so do the Outline tab's, one per act, chapter, or scene
  // (Drak, 2026-10-25); an unfolded one leaves the settings.
  const toggleOutlineFold = (id) => setPrefs(p => {
    const folds = { ...(p.fabulaOutlineFolds || {}) };
    if (folds[id]) delete folds[id]; else folds[id] = true;
    return { ...p, fabulaOutlineFolds: folds };
  });

  // v1.7 r009: People (docs/fabula-spec.md, section 4). A cast record, an arc,
  // or a relationship opens on a page of its own over its story's page, and
  // Back walks fabulaBack. A new record is a draft until Save, as a new
  // corpus is, and Save asks for the schema's required fields.
  const fabulaSliceOf = (kind) => (FABULA_KINDS.find(k => k.kind === kind) || {}).slice;
  const fabulaRecordOf = (kind, id) => fabArr(state.fabula || {}, fabulaSliceOf(kind)).find(r => r && r.id === id) || null;
  const fabulaHere = () => (activeRecord ? { kind: activeRecord.kind, id: activeRecord.id } : { kind: "story", tab: storyTab });

  const openFabulaRecord = (kind, id) => {
    if (!confirmDiscardDraft()) return;
    setStoryDraft(null); initialStoryDraftRef.current = null;
    setRecordDraft(null); initialRecordDraftRef.current = null;
    setFabulaBack(b => [...b, fabulaHere()]);
    setActiveRecord({ kind, id });
  };

  const newFabulaRecord = (kind) => {
    if (isLocked || !activeStoryId) return;
    if (!confirmDiscardDraft()) return;
    const id = `fab-${kind}-${genId()}`;
    const draft = { id, name: "", fields: {} };
    setFabulaBack(b => [...b, fabulaHere()]);
    setActiveRecord({ kind, id });
    setRecordDraft(draft);
    initialRecordDraftRef.current = JSON.stringify(draft);
  };

  // The page a record was opened from, without asking.
  const popFabulaBack = () => {
    const frame = fabulaBack[fabulaBack.length - 1];
    setFabulaBack(b => b.slice(0, -1));
    if (frame && frame.kind === "entry") { returnToEntry(frame.id); return; }
    if (frame && frame.kind !== "story") { setActiveRecord({ kind: frame.kind, id: frame.id }); return; }
    setActiveRecord(null);
    setStoryTab((frame && frame.tab) || "people");
  };

  const closeFabulaRecord = () => {
    if (!confirmDiscardDraft()) return;
    setRecordDraft(null); initialRecordDraftRef.current = null;
    popFabulaBack();
  };

  const editFabulaRecord = () => {
    if (!activeRecord || isLocked) return;
    const rec = fabulaRecordOf(activeRecord.kind, activeRecord.id);
    if (!rec) return;
    if (!confirmDiscardDraft()) return;
    const draft = { id: rec.id, name: rec.name || "", fields: JSON.parse(JSON.stringify(rec.fields || {})) };
    setRecordDraft(draft);
    initialRecordDraftRef.current = JSON.stringify(draft);
  };

  const saveFabulaRecord = () => {
    if (!recordDraft || !activeRecord || isLocked) return;
    const name = (recordDraft.name || "").trim();
    if (!name) return;
    const requiredErrors = validateRequiredFields(fabulaTemplate(state, activeRecord.kind), recordDraft.fields || {});
    if (requiredErrors.length > 0) { flash(requiredErrors.join(" \u00b7 ")); return; }
    const slice = fabulaSliceOf(activeRecord.kind);
    const kind = activeRecord.kind;
    const now = isoNow();
    updateFabula(fab => {
      const arr = fabArr(fab, slice);
      const old = arr.find(r => r.id === recordDraft.id);
      const rec = { ...(old || { storyId: activeStoryId, createdAt: now }), id: recordDraft.id, name, fields: recordDraft.fields || {}, updatedAt: now };
      // A cast record given a character again is no longer marked.
      if (kind === "cast" && rec.fields.character) delete rec.characterDeleted;
      return { ...fab, [slice]: old ? arr.map(r => r.id === rec.id ? rec : r) : [...arr, rec] };
    });
    setRecordDraft(null); initialRecordDraftRef.current = null;
    flash("Saved");
  };

  const cancelFabulaRecordEdit = () => {
    if (!confirmDiscardDraft()) return;
    const existed = !!(activeRecord && fabulaRecordOf(activeRecord.kind, activeRecord.id));
    setRecordDraft(null); initialRecordDraftRef.current = null;
    if (!existed) popFabulaBack(); // a new record, never saved: back where it began
  };

  // Delete asks first, counting what points at the record, then clears those
  // references; nothing else is deleted with it (Drak, 2026-10-25). Since
  // v1.7's r011 an act, a chapter, or a scene leaves its story's outline as
  // well, and an act or a chapter that holds anything asks instead, in a
  // modal, whether what it holds moves up a level, the default, or goes with
  // it (spec, section 7).
  const deleteFabulaRecord = () => {
    if (!activeRecord || isLocked) return;
    const rec = fabulaRecordOf(activeRecord.kind, activeRecord.id);
    if (!rec) return;
    if (fabulaOutlineHolding(state, activeRecord.kind, rec).length > 0) { setFabulaHoldsAsk({ kind: activeRecord.kind, id: rec.id }); return; }
    if (!confirm(fabulaRecordDeleteMessage(state, activeRecord.kind, rec))) return;
    finishFabulaDelete(activeRecord.kind, rec, false);
  };

  const finishFabulaDelete = (kind, rec, lift) => {
    if (isLocked) return;
    updateState(s => {
      const { fab, gone } = fabulaOutlineDelete(s.fabula || {}, kind, rec, lift);
      return { ...s, fabula: scrubFabulaRefs({ ...s, fabula: fab }, gone) };
    });
    setFabulaHoldsAsk(null);
    setRecordDraft(null); initialRecordDraftRef.current = null;
    popFabulaBack();
  };

  const openEditEntry = () => {
    if (!activeEntry) return;
    if (!confirmDiscardDraft()) return;
    const tmpl = state.templates.find(t => t.id === activeEntry.templateId);
    const draft = { name: activeEntry.name, tags: [...(activeEntry.tags || [])], fields: JSON.parse(JSON.stringify(activeEntry.fields || {})), calendarId: activeEntry.calendarId || null };
    if (tmpl) tmpl.fields.forEach(f => {
      if (!(f.id in draft.fields)) {
        if (f.type === "group") draft.fields[f.id] = [];
        else if (f.type === "entry-ref" && f.multi) draft.fields[f.id] = [];
        else if (f.type === "name-history") draft.fields[f.id] = [];
        else if (f.type === "multiselect") draft.fields[f.id] = [];
        else if (f.type === "grid") draft.fields[f.id] = makeEmptyGrid();
        else draft.fields[f.id] = "";
      }
    });
    setEntryDraft(draft);
    initialEntryDraftRef.current = JSON.stringify(draft);
    initialTplDraftRef.current = null;
    setView("entry-edit");
  };

  const saveEntry = () => {
    if (!entryDraft?.name?.trim()) return;
    let newId = activeEntryId;
    // Run the shared normalize pass on the draft fields before persisting.
    // Catches: empty Name History rows, calendar-date zombies, legacy
    // entry-ref shapes, array-shaped tags. Defensive clone first so we don't
    // mutate the live draft state during normalization.
    //
    // Template resolution: for new entries, activeTemplateId is correct. For
    // edits, trust activeEntry.templateId — see T-023's lesson on map-pin
    // navigation where activeTemplateId can be stale (Map) while the actual
    // entry being edited is a different template (Faction). If we can't
    // resolve a template, skip normalization rather than risk normalizing
    // against the wrong field set.
    const tplId = view === "entry-new" ? activeTemplateId : activeEntry?.templateId;
    const tpl = tplId ? state.templates.find(t => t.id === tplId) : null;
    let cleanedFields = JSON.parse(JSON.stringify(entryDraft.fields || {}));
    if (tpl) normalizeEntryFields(tpl.fields, cleanedFields);

    // Rebind conversion: if the user changed the calendar binding on this edit
    // and any stored date would be out-of-range in the new calendar's month/day
    // structure, convert all dates through absoluteDay so the absolute moment
    // is preserved while the Y/M/D representation gets rewritten to fit.
    // In-range values are left alone — preserves the rare "fix a mistaken
    // binding without conversion" workflow (e.g. typed Elven dates while bound
    // to Imperial, want to fix the binding without shifting values).
    //
    // New entries (view === "entry-new") have no previous binding so this is
    // a no-op for them.
    let didCalendarConvert = false;
    if (view !== "entry-new" && activeEntry && tpl) {
      const oldCalId = activeEntry.calendarId || null;
      const newCalId = entryDraft.calendarId || null;
      if (oldCalId !== newCalId) {
        const sourceCal = getCalendar(state, oldCalId);
        const targetCal = getCalendar(state, newCalId);
        if (sourceCal && targetCal && hasOutOfRangeDates(tpl, cleanedFields, targetCal)) {
          const tempEntry = { fields: cleanedFields, calendarId: oldCalId };
          const converted = convertEntryDatesAcrossCalendars(tempEntry, tpl, sourceCal, targetCal, newCalId);
          if (converted && converted.fields) {
            cleanedFields = converted.fields;
            didCalendarConvert = true;
          }
        }
      }
    }

    const draftBase = {
      name: entryDraft.name.trim(),
      tags: entryDraft.tags.filter(t => t.trim()),
      fields: cleanedFields,
      calendarId: entryDraft.calendarId || null,
    };
    // Validate spouse marriage dates: end-before-start is rejected.
    // Flash the error and bail so the user can fix the dates without losing
    // the rest of their edits — entryDraft is unchanged.
    const entriesById = Object.fromEntries(state.entries.map(e => [e.id, e]));
    const dateErrors = validateSpouseDates(tpl, draftBase.fields, entriesById);
    if (dateErrors.length > 0) {
      flash(dateErrors.join(" "));
      return;
    }

    // v1.3: validate required fields. Failure flashes a single combined message
    // naming the offending fields and bails — entryDraft preserved so the user
    // can fix without losing other edits. Uses the same flash pattern as the
    // spouse-date check above. Empty templates / templates without required
    // fields return no errors and pass through silently.
    const requiredErrors = validateRequiredFields(tpl, draftBase.fields);
    if (requiredErrors.length > 0) {
      flash(requiredErrors.join(" · "));
      return;
    }

    // Bug 13: warn (non-blocking) if another entry shares this name. Wiki-links
    // resolve case-insensitively to whichever entry sorts first by storage order;
    // duplicates leave subsequent same-named entries unreachable by [[Name]].
    const lname = draftBase.name.toLowerCase();
    const dupCount = state.entries.filter(e => e.id !== activeEntryId && (e.name || "").toLowerCase() === lname).length;

    if (view === "entry-new") {
      newId = `ent-${slugify(entryDraft.name)}-${genId().slice(-4)}`;
      const newEntry = {
        id: newId,
        templateId: activeTemplateId,
        ...draftBase,
        createdAt: isoNow(),
        updatedAt: isoNow(),
      };
      // Reciprocity: a brand-new entry has no prev declarations, so this is purely
      // "for each spouse declared on the new entry, mirror to the partner."
      const reciprocal = computeSpouseReciprocity(
        newId, {}, draftBase.fields, tpl, state.entries, state.templates
      );
      updateState(s => ({
        ...s,
        entries: [
          ...s.entries.map(e =>
            reciprocal.has(e.id) ? { ...e, fields: reciprocal.get(e.id), updatedAt: isoNow() } : e
          ),
          newEntry,
        ],
      }));
    } else {
      // Reciprocity: diff prev vs new spouse decls and apply mirror updates to partners.
      const reciprocal = computeSpouseReciprocity(
        activeEntryId, activeEntry?.fields || {}, draftBase.fields, tpl, state.entries, state.templates
      );
      updateState(s => ({
        ...s,
        entries: s.entries.map(e => {
          if (e.id === activeEntryId) return { ...e, ...draftBase, updatedAt: isoNow() };
          if (reciprocal.has(e.id)) return { ...e, fields: reciprocal.get(e.id), updatedAt: isoNow() };
          return e;
        }),
      }));
    }
    setActiveEntryId(newId); clearDraftAndStorage(); setView("entry");
    if (dupCount > 0) {
      flash(`Saved. ${dupCount} other entr${dupCount === 1 ? "y" : "ies"} share this name; wiki-links will resolve to the earliest-stored one.`, "warning");
    } else if (didCalendarConvert) {
      const targetCal = getCalendar(state, entryDraft.calendarId || null);
      flash(`Saved. Dates were reframed into ${targetCal?.name || "the new calendar"} to fit its month/day structure (absolute moment preserved).`);
    } else {
      flash("Saved");
    }
  };

  const deleteEntry = () => {
    if (!activeEntryId) return;
    if (!confirm(`Delete "${activeEntry?.name}"?`)) return;
    updateState(s => {
      const deletedIds = new Set([activeEntryId]);
      const remaining = s.entries.filter(e => e.id !== activeEntryId);
      // v1.7 r009: Fabula's references to it go too, and a cast record whose
      // character it was stays, marked (spec, section 9).
      const names = new Map([[activeEntryId, activeEntry ? activeEntry.name : ""]]);
      return { ...s, entries: scrubEntryRefs(remaining, s.templates, deletedIds), fabula: scrubFabulaRefs(s, deletedIds, names) };
    });
    setActiveEntryId(null); clearDraftAndStorage(); setView("list");
    flash("Deleted");
  };

  // In-place edit of a calendar-date or calendar-date-range field on an entry.
  // groupPath is an array of { groupFieldId, instanceIdx } steps for fields
  // nested in repeating groups; empty for top-level fields. Used by the
  // chronometric timeline's interactive editing mode.
  const updateEntryDate = (entryId, fieldId, groupPath, newValue) => {
    updateState(s => ({
      ...s,
      entries: s.entries.map(e => {
        if (e.id !== entryId) return e;
        const cleanFields = JSON.parse(JSON.stringify(e.fields || {}));
        let cursor = cleanFields;
        for (const step of (groupPath || [])) {
          if (!Array.isArray(cursor[step.groupFieldId])) return e;
          cursor = cursor[step.groupFieldId][step.instanceIdx];
          if (!cursor) return e;
        }
        cursor[fieldId] = newValue;
        return { ...e, fields: cleanFields, updatedAt: isoNow() };
      })
    }));
  };

  const openNewTemplate = () => {
    if (!confirmDiscardDraft()) return;
    const draft = {
      name: "", icon: "◈", color: "#c8a96e", kind: "standard",
      fields: [
        { id: genId(), label: "Description", type: "textarea", secret: false },
        { id: genId(), label: "Notes", type: "textarea", secret: false },
      ],
    };
    setTplDraft(draft);
    initialTplDraftRef.current = JSON.stringify(draft);
    initialEntryDraftRef.current = null;
    setView("tpl-build");
  };

  const openEditTemplate = () => {
    if (!activeTemplate) return;
    if (!confirmDiscardDraft()) return;
    const draft = JSON.parse(JSON.stringify(activeTemplate));
    setTplDraft(draft);
    initialTplDraftRef.current = JSON.stringify(draft);
    initialEntryDraftRef.current = null;
    setView("tpl-edit");
  };

  const saveTemplate = () => {
    if (!tplDraft?.name?.trim()) return;
    // Recursively drop empty-label fields and clean up subfields at all depths.
    // Walks group → subfields chain so nested groups get the same treatment.
    const cleanFields = (fields) => fields
      .filter(f => f.label.trim())
      .map(f => {
        const cf = { ...f };
        if (cf.type === "group" && Array.isArray(cf.subfields)) {
          cf.subfields = cleanFields(cf.subfields);
        }
        return cf;
      });
    const cleaned = {
      ...tplDraft,
      name: tplDraft.name.trim(),
      kind: tplDraft.kind || "standard",
      fields: cleanFields(tplDraft.fields),
    };
    // Ensure every field at every depth has an id.
    const ensureIds = (fields) => fields.forEach(f => {
      if (!f.id) f.id = `fld-${slugify(f.label)}-${genId().slice(-4)}`;
      if (f.type === "group" && Array.isArray(f.subfields)) ensureIds(f.subfields);
    });
    if (view === "tpl-build") {
      cleaned.id = `tpl-${slugify(cleaned.name)}-${genId().slice(-4)}`;
      cleaned.origin = TEMPLATE_ORIGIN.USER;
      ensureIds(cleaned.fields);
      // v1.7 r002: target names follow target ids (see syncRefTargetNames).
      syncRefTargetNames([...state.templates, cleaned], [cleaned]);
      updateState(s => ({ ...s, templates: [...s.templates, cleaned] }));
      setActiveTemplateId(cleaned.id);
    } else {
      // Edit mode: preserve whatever origin the template already has. If the
      // user is editing a built-in, it stays a built-in (still subject to
      // future canonical migrations). If they're editing their own template,
      // it stays user-origin.
      ensureIds(cleaned.fields);
      syncRefTargetNames(state.templates.map(t => t.id === activeTemplateId ? cleaned : t), [cleaned]);
      updateState(s => ({ ...s, templates: s.templates.map(t => t.id === activeTemplateId ? cleaned : t) }));
    }
    clearDraftAndStorage(); setView("list");
    flash("Template saved");
  };

  // ── Template export/import ──────────────────────────────────────────────────

  // Escape characters that have meaning in markdown so user-authored labels
  // don't accidentally break rendering (backticks → inline code, asterisks →
  // bold/italic, underscores → italic).
  const escapeMd = (s) => String(s ?? "").replace(/[*_`\\]/g, "\\$&");

  // Validate and normalize an imported template before it touches state.
  // Returns { ok: true, template } on success, { ok: false, error } on failure.
  // Defends against hand-edited or otherwise malformed JSON.
  const normalizeImportedTemplate = (tpl) => {
    const validTypes = new Set(FIELD_TYPES.map(ft => ft.value));
    const seenFieldIds = new Set();

    // Recursive cleanup — drops empty-label fields like saveTemplate does.
    const cleanFields = (fields) => fields
      .filter(f => f && typeof f.label === "string" && f.label.trim())
      .map(f => {
        const cf = { ...f };
        if (cf.type === "group" && Array.isArray(cf.subfields)) {
          cf.subfields = cleanFields(cf.subfields);
        }
        return cf;
      });

    // Recursive validation pass — returns first failure (if any).
    const validateField = (f) => {
      if (typeof f.type !== "string" || !validTypes.has(f.type)) {
        return `Unknown field type "${f.type}" on field "${f.label || "(unlabeled)"}".`;
      }
      // Group fields must have a subfields array — coerce if missing/wrong.
      if (f.type === "group" && !Array.isArray(f.subfields)) {
        f.subfields = [];
      }
      // De-dupe field ids: if a hand-edit duplicates an id, regenerate the dup.
      if (f.id && seenFieldIds.has(f.id)) {
        f.id = `fld-${slugify(f.label || "field")}-${genId().slice(-4)}`;
      }
      if (f.id) seenFieldIds.add(f.id);
      // Recurse into group subfields.
      if (f.type === "group" && Array.isArray(f.subfields)) {
        for (const sf of f.subfields) {
          const err = validateField(sf);
          if (err) return err;
        }
      }
      return null;
    };

    const cloned = JSON.parse(JSON.stringify(tpl));
    cloned.fields = cleanFields(cloned.fields || []);

    for (const f of cloned.fields) {
      const err = validateField(f);
      if (err) return { ok: false, error: err };
    }

    // Normalize kind to lowercase (defends against "Map" vs "map" etc.).
    if (typeof cloned.kind === "string") {
      cloned.kind = cloned.kind.toLowerCase();
    }
    // relationKinds must be an array — coerce if hand-edited to wrong type.
    if (!Array.isArray(cloned.relationKinds)) {
      cloned.relationKinds = [];
    }

    return { ok: true, template: cloned };
  };

  // Download a single template as JSON. Strips the runtime id (the receiving
  // world generates its own); keeps field ids, kind, color, icon, fields tree,
  // and relationKinds. Wrapped in an envelope with version+timestamp.
  const exportTemplateJson = (template) => {
    if (!template) return;
    // v1.7 r016: the file never carries Fabula's flag.
    const { id, fabulaRole, ...rest } = template;
    const payload = {
      cartulary_template_export: 1,
      exported_at: new Date().toISOString(),
      template: rest,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(template.name) || "template"}.template.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flash(`Exported "${template.name}" as JSON.`);
  };

  // Download a single template as human-readable Markdown. Lossy, not
  // round-trippable. Use cases: forum posts, LLM prompt scaffolds, schema
  // comparisons across tools.
  const exportTemplateMarkdown = (template) => {
    if (!template) return;
    const typeLabel = (t) => (FIELD_TYPES.find(ft => ft.value === t)?.label) || t;
    const lines = [];
    lines.push(`# ${escapeMd(template.name)}`);
    lines.push("");
    const meta = [];
    if (template.icon) meta.push(`**Icon:** ${escapeMd(template.icon)}`);
    if (template.color) meta.push(`**Color:** ${escapeMd(template.color)}`);
    if (template.kind && template.kind !== "standard") meta.push(`**Kind:** ${escapeMd(template.kind)}`);
    if (meta.length) {
      lines.push(meta.join("  \n"));
      lines.push("");
    }
    if (Array.isArray(template.relationKinds) && template.relationKinds.length > 0) {
      lines.push("## Relations");
      lines.push("");
      template.relationKinds.forEach(r => {
        const inv = r.inverse ? ` ↔ \`${escapeMd(r.inverse)}\`` : "";
        const lbl = r.label ? ` — ${escapeMd(r.label)}` : "";
        lines.push(`- \`${escapeMd(r.kind)}\`${inv}${lbl}`);
      });
      lines.push("");
    }
    lines.push("## Fields");
    lines.push("");
    const renderField = (f, depth) => {
      const indent = "  ".repeat(depth);
      const constraints = [];
      if (f.required) constraints.push("required");
      if (f.secret) constraints.push("secret");
      if (f.multi) constraints.push("multi");
      if (f.refTemplate) constraints.push(`ref: ${escapeMd(f.refTemplate)}`);
      if (f.relationKind) constraints.push(`relation: ${escapeMd(f.relationKind)}`);
      if (Array.isArray(f.options) && f.options.length > 0) {
        constraints.push(`options: ${f.options.map(escapeMd).join(" / ")}`);
      }
      const constStr = constraints.length > 0 ? ` _(${constraints.join("; ")})_` : "";
      lines.push(`${indent}- **${escapeMd(f.label)}** — ${typeLabel(f.type)}${constStr}`);
      if (f.type === "group" && Array.isArray(f.subfields)) {
        f.subfields.forEach(sf => renderField(sf, depth + 1));
      }
    };
    (template.fields || []).forEach(f => renderField(f, 0));
    const md = lines.join("\n") + "\n";
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(template.name) || "template"}.template.md`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flash(`Exported "${template.name}" as Markdown.`);
  };

  // Read an imported template file. Either inserts directly (no name collision)
  // or stages an importCollision for the modal to resolve.
  const handleImportTemplateFile = (file) => {
    // Defensive: bails if world locked. UI gates the Import button on
    // !isLocked, but a user could theoretically race state by triggering
    // import then locking the world before the file picker resolves —
    // this prevents a misleading "imported successfully" flash from
    // firing when nothing actually persisted.
    if (isLocked) return;
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try { parsed = JSON.parse(reader.result); }
      catch (e) { flash("Couldn't parse that file as JSON.", "error"); return; }
      if (!parsed || parsed.cartulary_template_export !== 1 || !parsed.template) {
        flash("That doesn't look like a Cartulary template export.", "error");
        return;
      }
      const tpl = parsed.template;
      if (!tpl.name || typeof tpl.name !== "string" || !Array.isArray(tpl.fields)) {
        flash("Imported template is missing required fields (name, fields[]).", "error");
        return;
      }
      // Validate + normalize before touching state. Rejects unknown field
      // types, coerces malformed group/relationKinds shapes, drops empty-label
      // fields, de-dupes field ids, lowercases kind.
      const norm = normalizeImportedTemplate(tpl);
      if (!norm.ok) {
        flash(norm.error, "error");
        return;
      }
      const cleanTpl = norm.template;
      // Collect referenced templates that don't exist in this world yet — warn
      // but don't block. Dangling refs survive the import; user can fix later.
      const knownNames = new Set(state.templates.map(t => t.name.toLowerCase()));
      const missingRefs = new Set();
      const collectRefs = (fields) => fields.forEach(f => {
        if (f.type === "entry-ref" && f.refTemplate && !knownNames.has(f.refTemplate.toLowerCase())) {
          missingRefs.add(f.refTemplate);
        }
        if (f.type === "group" && Array.isArray(f.subfields)) collectRefs(f.subfields);
      });
      collectRefs(cleanTpl.fields || []);

      // Check for name collision (case-insensitive)
      const existing = state.templates.find(t => t.name.toLowerCase() === cleanTpl.name.toLowerCase());
      if (existing) {
        setImportCollision({ imported: cleanTpl, existing, missingRefs: [...missingRefs] });
        setCollisionAction("rename");
        setCollisionRename(`${cleanTpl.name} (imported)`);
        setCrossKindAck(false);
        collisionConfirmInFlight.current = false;  // Reset for the fresh modal
        return;
      }
      // No collision — insert directly
      insertImportedTemplate(cleanTpl, "new");
      if (missingRefs.size > 0) {
        flash(`Imported "${cleanTpl.name}". Missing referenced templates: ${[...missingRefs].join(", ")}.`, "warn");
      } else {
        flash(`Imported template "${cleanTpl.name}".`);
      }
    };
    reader.onerror = () => flash("Couldn't read that file.", "error");
    reader.readAsText(file);
  };

  // ── Pack import (v1.5) ───────────────────────────────────────────────────────
  // Atomic. Each member template is namespaced under the pack id with a
  // DETERMINISTIC id (`${pack.id}__${fileTplId}`) so re-importing the same file
  // lands on the same world ids; internal entry-refs are remapped through that
  // file→world map. Three branches by pack id:
  //   - pack.id unseen          → first import (add pack + templates)
  //   - pack.id already present → re-import: add NEW templates, keep existing,
  //                               union templateIds, refresh name/description
  //                               (per-template Replace lands with the modal)
  //   - name clashes, id differs → new pack, "(imported)" suffix; its templates
  //                               namespace under its own id so nothing collides
  // Inserts dedup against existing world template ids, so a pack that was
  // deleted (templates kept) and re-imported reuses its orphaned templates.
  const handleImportPackFile = (file) => {
    if (isLocked) return;
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try { parsed = JSON.parse(reader.result); }
      catch (e) { flash("Couldn't parse that file as JSON.", "error"); return; }
      if (!parsed || parsed.cartulary_pack_export !== 1 || !parsed.pack || !Array.isArray(parsed.templates)) {
        flash("That doesn't look like a Cartulary pack export.", "error");
        return;
      }
      const filePack = parsed.pack;
      if (typeof filePack.id !== "string" || !filePack.id) {
        flash("Pack file is missing a pack id.", "error");
        return;
      }
      const packName = (typeof filePack.name === "string" && filePack.name.trim()) ? filePack.name.trim() : "Imported Pack";

      // file→world id map (deterministic namespace).
      const idMap = {};
      for (const t of parsed.templates) {
        if (!t || typeof t.id !== "string" || !t.id) {
          flash("Pack file has a template with no id.", "error"); return;
        }
        idMap[t.id] = t.id.startsWith(`${filePack.id}__`) ? t.id : `${filePack.id}__${t.id}`;
      }

      // Remap a template's internal entry-refs through idMap, recursing into
      // group subfields. Ids not in the map (refs to templates outside the
      // pack) are left as-is — they may dangle; surfaced as a warning.
      const remapField = (f) => {
        const nf = { ...f };
        if (Array.isArray(nf.refTemplatesId)) nf.refTemplatesId = nf.refTemplatesId.map(id => idMap[id] || id);
        if (typeof nf.refTemplateId === "string" && idMap[nf.refTemplateId]) nf.refTemplateId = idMap[nf.refTemplateId];
        // refFilters is keyed by template id — rekey any key that's a pack member.
        if (nf.refFilters && typeof nf.refFilters === "object" && !Array.isArray(nf.refFilters)) {
          const rf = {};
          for (const k of Object.keys(nf.refFilters)) rf[idMap[k] || k] = nf.refFilters[k];
          nf.refFilters = rf;
        }
        if (nf.type === "group" && Array.isArray(nf.subfields)) nf.subfields = nf.subfields.map(remapField);
        return nf;
      };

      // Normalize + namespace each template. Abort the whole import on any
      // validation failure (atomic — no partial pack).
      const builtTemplates = [];
      for (const t of parsed.templates) {
        const norm = normalizeImportedTemplate(t);
        if (!norm.ok) { flash(`Pack import failed: ${norm.error}`, "error"); return; }
        const tpl = norm.template;
        tpl.id = idMap[t.id];
        tpl.origin = "user";
        tpl.fields = (tpl.fields || []).map(remapField);
        builtTemplates.push(tpl);
      }

      // Dangling-ref warning: refs to ids not in the pack and not already in
      // the world.
      const worldTplIds = new Set(state.templates.map(t => t.id));
      const newIds = new Set(builtTemplates.map(t => t.id));
      const missingRefs = new Set();
      const collectDangling = (fields) => (fields || []).forEach(f => {
        if (Array.isArray(f.refTemplatesId)) f.refTemplatesId.forEach(id => {
          if (!newIds.has(id) && !worldTplIds.has(id)) missingRefs.add(id);
        });
        if (f.type === "group" && Array.isArray(f.subfields)) collectDangling(f.subfields);
      });
      builtTemplates.forEach(t => collectDangling(t.fields));

      const memberWorldIds = builtTemplates.map(t => t.id);
      const existingById = (state.packs || []).find(p => p.id === filePack.id);
      const existingByName = (state.packs || []).find(p => p.id !== filePack.id && (p.name || "").toLowerCase() === packName.toLowerCase());

      if (existingById) {
        // Re-import. Classify each built template against the world:
        //   - id not in world         → NEW (added silently)
        //   - id in world, identical  → unchanged (no-op)
        //   - id in world, differs    → CONFLICT (per-template Replace/Keep)
        // Stable stringify so key-order drift doesn't read as a difference;
        // array order is preserved (field order is meaningful).
        const stable = (v) => {
          if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
          if (v && typeof v === "object") {
            return "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + stable(v[k])).join(",") + "}";
          }
          return JSON.stringify(v);
        };
        const worldById = new Map(state.templates.map(t => [t.id, t]));
        const toAdd = [];
        const conflicts = [];
        for (const built of builtTemplates) {
          const existing = worldById.get(built.id);
          if (!existing) { toAdd.push(built); continue; }
          if (stable(canonicalTemplateForReconcile(built)) !== stable(canonicalTemplateForReconcile(existing))) {
            conflicts.push({ worldId: built.id, name: built.name, fileTpl: built });
          }
        }

        if (conflicts.length === 0) {
          // Nothing differs — add new members, refresh meta, union templateIds.
          updateState(s => {
            const exIds = new Set(s.templates.map(t => t.id));
            const adds = builtTemplates.filter(t => !exIds.has(t.id));
            const next = [...s.templates, ...adds];
            resolveTemplateRefs(next);
            return {
              ...s,
              templates: next,
              packs: (s.packs || []).map(p => p.id === filePack.id
                ? {
                    ...p,
                    name: packName,
                    description: typeof filePack.description === "string" ? filePack.description : p.description,
                    templateIds: Array.from(new Set([...(p.templateIds || []), ...memberWorldIds])),
                  }
                : p),
            };
          });
          setActivePackId(filePack.id); setView("pack");
          flash(`Re-imported "${packName}": ${toAdd.length} new template${toAdd.length === 1 ? "" : "s"} added, ${builtTemplates.length - toAdd.length} unchanged.`);
          return;
        }

        // Conflicts exist — stage the reconciliation modal. Default each row to
        // Replace (re-import signals update intent), but the user can Keep any.
        setPackReconcile({
          packId: filePack.id,
          packName,
          packDescription: typeof filePack.description === "string" ? filePack.description : existingById.description,
          toAdd,
          conflicts,
          memberWorldIds,
          actions: Object.fromEntries(conflicts.map(c => [c.worldId, "replace"])),
        });
        return;
      }

      const newPackName = existingByName ? `${packName} (imported)` : packName;
      const newPack = {
        id: filePack.id,
        name: newPackName,
        description: typeof filePack.description === "string" ? filePack.description : "",
        templateIds: memberWorldIds,
      };
      updateState(s => {
        const exIds = new Set(s.templates.map(t => t.id));
        const adds = builtTemplates.filter(t => !exIds.has(t.id));
        const next = [...s.templates, ...adds];
        resolveTemplateRefs(next);
        return { ...s, templates: next, packs: [...(s.packs || []), newPack] };
      });
      setActivePackId(newPack.id); setView("pack");
      const suffix = existingByName ? " (renamed to avoid a clash with an existing pack)" : "";
      const base = `Imported "${newPackName}": ${builtTemplates.length} template${builtTemplates.length === 1 ? "" : "s"}${suffix}.`;
      if (missingRefs.size > 0) flash(`${base} Some entry-references point outside the pack and may not resolve.`, "warn");
      else flash(base);
    };
    reader.onerror = () => flash("Couldn't read that file.", "error");
    reader.readAsText(file);
  };

  // Apply the staged re-import reconciliation: replace the conflicting
  // templates the user chose to Replace (keeping their world id so entries
  // survive), leave Keep-mine ones, add the new templates, union the pack's
  // member ids, refresh name/description. Atomic.
  const confirmPackReconcile = () => {
    const pr = packReconcile;
    if (!pr) return;
    const replaceById = new Map(
      pr.conflicts.filter(c => pr.actions[c.worldId] === "replace").map(c => [c.worldId, c.fileTpl])
    );
    const replacedCount = replaceById.size;
    const keptCount = pr.conflicts.length - replacedCount;
    updateState(s => {
      const exIds = new Set(s.templates.map(t => t.id));
      const adds = pr.toAdd.filter(t => !exIds.has(t.id));
      const templates = s.templates.map(t => replaceById.has(t.id) ? replaceById.get(t.id) : t);
      const next = [...templates, ...adds];
      resolveTemplateRefs(next);
      return {
        ...s,
        templates: next,
        packs: (s.packs || []).map(p => p.id === pr.packId
          ? {
              ...p,
              name: pr.packName,
              description: pr.packDescription,
              templateIds: Array.from(new Set([...(p.templateIds || []), ...pr.memberWorldIds])),
            }
          : p),
      };
    });
    setPackReconcile(null);
    setActivePackId(pr.packId); setView("pack");
    flash(`Re-imported "${pr.packName}": ${pr.toAdd.length} added, ${replacedCount} replaced, ${keptCount} kept.`);
  };

  // entries that point at it still work; mode "new" generates a fresh id.
  const insertImportedTemplate = (tpl, mode, existingId, overrideName) => {
    if (isLocked) return;
    const ensureIds = (fields) => fields.forEach(f => {
      if (!f.id) f.id = `fld-${slugify(f.label || "field")}-${genId().slice(-4)}`;
      if (f.type === "group" && Array.isArray(f.subfields)) ensureIds(f.subfields);
    });
    const newTpl = {
      ...tpl,
      name: (overrideName || tpl.name).trim(),
      kind: tpl.kind || "standard",
      // Always user-origin on import, regardless of what the imported JSON
      // says. An imported template — even one originally exported from a
      // built-in — is the user's customization in THIS world and should not
      // be touched by canonical migrations going forward. If the user wants
      // canonical behavior, they delete this and use Restore Built-ins.
      origin: TEMPLATE_ORIGIN.USER,
      fields: JSON.parse(JSON.stringify(tpl.fields || [])),
    };
    // v1.7 r016: an import never brings Fabula's flag, and one imported over
    // Plot Thread or Theme / Motif keeps the flag that template had.
    delete newTpl.fabulaRole;
    ensureIds(newTpl.fields);
    if (mode === "replace" && existingId) {
      newTpl.id = existingId;
      const was = state.templates.find(t => t.id === existingId);
      if (was && was.fabulaRole) newTpl.fabulaRole = was.fabulaRole;
      updateState(s => ({ ...s, templates: s.templates.map(t => t.id === existingId ? newTpl : t) }));
    } else {
      newTpl.id = `tpl-${slugify(newTpl.name) || "imported"}-${genId().slice(-4)}`;
      updateState(s => ({ ...s, templates: [...s.templates, newTpl] }));
    }
  };

  const deleteTemplate = () => {
    if (!activeTemplate) return;
    const fabRole = activeTemplate.fabulaRole || null;
    const count = templateCounts[activeTemplateId] || 0;
    const msg = count > 0
      ? `Delete template "${activeTemplate.name}" and its ${count} ${count === 1 ? "entry" : "entries"}?`
      : `Delete template "${activeTemplate.name}"?`;
    if (!confirm(msg)) return;
    updateState(s => {
      const deletedEntryIds = new Set(
        s.entries.filter(e => e.templateId === activeTemplateId).map(e => e.id)
      );
      const remainingTemplates = s.templates.filter(t => t.id !== activeTemplateId);
      const remainingEntries = s.entries.filter(e => e.templateId !== activeTemplateId);
      // v1.7 r009: Fabula's references to its entries go too (spec, section 9).
      const names = new Map(s.entries.filter(e => deletedEntryIds.has(e.id)).map(e => [e.id, e.name]));
      return {
        ...s,
        templates: remainingTemplates,
        entries: scrubEntryRefs(remainingEntries, remainingTemplates, deletedEntryIds),
        fabula: scrubFabulaRefs(s, deletedEntryIds, names),
      };
    });
    setActiveTemplateId(null); clearDraftAndStorage();
    // v1.7 r016: Plot Thread or Theme / Motif deleted lands on its section of
    // Fabula's index, which then offers Restore.
    if (fabRole) landOnFabulaSection(fabRole); else setView("home");
    flash("Template deleted");
  };

  // ── Pack handlers (v1.5) ─────────────────────────────────────────────────────
  // A pack is a named reference-set over state.templates (built-ins excluded).
  // These handlers cover the pack-object lifecycle: create / open / rename /
  // describe / delete. Membership editing and file import/export layer on later.
  const selectPack = (id) => { setActivePackId(id); setView("pack"); };

  const createPack = () => {
    if (isLocked) return;
    const id = genId();
    updateState(s => ({
      ...s,
      packs: [...(Array.isArray(s.packs) ? s.packs : []), { id, name: "New Pack", description: "", templateIds: [] }],
    }));
    setActivePackId(id);
    setView("pack");
    flash("Pack created");
  };

  const renamePack = (id, name) => {
    if (isLocked) return;
    const clean = (name || "").trim() || "Untitled Pack";
    updateState(s => ({
      ...s,
      packs: (s.packs || []).map(p => p.id === id ? { ...p, name: clean } : p),
    }));
  };

  const setPackDescription = (id, description) => {
    if (isLocked) return;
    updateState(s => ({
      ...s,
      packs: (s.packs || []).map(p => p.id === id ? { ...p, description: description || "" } : p),
    }));
  };

  // Membership: add/remove a template id on a pack. Built-ins are never members
  // (the add UI filters them out; this guards anyway). Add is dedup'd; the
  // template itself is untouched either way — only the pack's reference set moves.
  const addTemplateToPack = (packId, templateId) => {
    if (isLocked) return;
    const tpl = (state.templates || []).find(t => t.id === templateId);
    if (!tpl || tpl.origin === "builtin") return;
    updateState(s => ({
      ...s,
      packs: (s.packs || []).map(p =>
        p.id === packId
          ? { ...p, templateIds: (p.templateIds || []).includes(templateId) ? p.templateIds : [...(p.templateIds || []), templateId] }
          : p),
    }));
  };

  const removeTemplateFromPack = (packId, templateId) => {
    if (isLocked) return;
    updateState(s => ({
      ...s,
      packs: (s.packs || []).map(p =>
        p.id === packId ? { ...p, templateIds: (p.templateIds || []).filter(id => id !== templateId) } : p),
    }));
  };

  // Delete removes ONLY the pack record. Member templates (and their entries)
  // are never touched — they fall back to the ungrouped Templates section.
  // Pack delete must never route into template/entry deletion.
  const deletePack = (id) => {
    if (isLocked) return;
    const pack = (state.packs || []).find(p => p.id === id);
    if (!pack) return;
    if (!confirm(`Delete pack "${pack.name}"? Its templates stay in your world — only the grouping is removed.`)) return;
    updateState(s => ({ ...s, packs: (s.packs || []).filter(p => p.id !== id) }));
    if (activePackId === id) { setActivePackId(null); setView("home"); }
    flash("Pack deleted");
  };

  // Export a pack as a portable file. Unlike single-template export (which
  // strips the template id, since the receiving world mints its own), pack
  // export KEEPS member template ids: import namespaces them under the pack id
  // and remaps each template's internal entry-refs via a file→world id map, so
  // the in-file ids are the keys that map relies on. pack.id is carried verbatim
  // (file-stable) so re-import reconciles against the same pack.
  const exportPack = (pack) => {
    if (!pack) return;
    const memberTemplates = (pack.templateIds || [])
      .map(id => state.templates.find(t => t.id === id))
      .filter(Boolean);
    const payload = {
      cartulary_pack_export: 1,
      exported_at: new Date().toISOString(),
      pack: {
        id: pack.id,
        name: pack.name,
        description: pack.description || "",
        templateIds: memberTemplates.map(t => t.id),
      },
      templates: memberTemplates,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(pack.name) || "pack"}.cartulary-pack.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flash(`Exported pack "${pack.name}" (${memberTemplates.length} template${memberTemplates.length === 1 ? "" : "s"}).`);
  };

  // Export
  const exportWorld = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = slugify(state.world.name) || "world";
    a.download = `${safeName}.world.json`;
    a.click();
    URL.revokeObjectURL(url);
    // Reset backup reminder timer (Markdown/ZIP exports don't count — only JSON round-trips)
    setPrefs(p => ({ ...p, lastExportAt: isoNow() }));
    setBackupSnoozedUntil(null);
    flash("World exported");
  };

  const exportMarkdown = (includeSecrets) => {
    const md = buildMarkdownExport(state, { includeSecrets });
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = slugify(state.world.name) || "world";
    a.download = `${safeName}.world.md`;
    a.click();
    URL.revokeObjectURL(url);
    flash(includeSecrets ? "Markdown export downloaded (includes secrets)" : "Markdown export downloaded");
  };

  // Single-file HTML export. Generates a self-contained .html artifact for
  // sharing with non-Cartulary users. Read-only; cross-references render as
  // anchor links inside the document. Options shape:
  //   { includeSecrets: bool, dateCalendarId: "per-entry" | "primary" | <id> }
  // Async because image fields and map backgrounds may need FSAA file fetches
  // to inline-base64 the bytes — see resolveImageManifestForHtmlExport.
  const exportHtml = async (options) => {
    flash("Generating HTML export…");
    try {
      const html = await buildHtmlExport(state, options, dirHandle);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = slugify(state.world.name) || "world";
      a.download = `${safeName}.world.html`;
      a.click();
      URL.revokeObjectURL(url);
      flash(options.includeSecrets ? "HTML export downloaded (includes secrets)" : "HTML export downloaded");
    } catch (e) {
      console.error("HTML export failed:", e);
      flash("HTML export failed — see console", "error");
    }
  };

  // Per-entry markdown export. Available from the Entry view's actions area.
  // Includes secrets only if the global Show Secrets toggle is on, mirroring
  // the user's current visibility into the entry.
  const exportEntryMarkdown = (entryId) => {
    const entry = state.entries.find(e => e.id === entryId);
    if (!entry) return;
    const tpl = state.templates.find(t => t.id === entry.templateId);
    if (!tpl) return;
    const md = buildSingleEntryMarkdown(entry, tpl, state, { includeSecrets: showSecrets });
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(entry.name) || "entry"}.md`;
    a.click();
    URL.revokeObjectURL(url);
    flash(showSecrets ? "Entry exported (includes secrets)" : "Entry exported");
  };

  // Family-tree markdown export from the focal person of the current Family
  // Tree view. Walks ancestors via Sosa-Stradonitz numbering, then lists
  // spouses, siblings, and descendants.
  const exportFamilyTreeMarkdown = (focalId) => {
    const md = buildFamilyTreeMarkdown(focalId, state);
    if (md == null) { flash("Focal person not found", "error"); return; }
    const focal = state.entries.find(e => e.id === focalId);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(focal?.name || "person") || "person"}.family.md`;
    a.click();
    URL.revokeObjectURL(url);
    flash("Family tree exported");
  };

  const exportMarkdownZip = async (includeSecrets) => {
    if (typeof JSZip === "undefined") {
      flash("Zip library not loaded — try reloading the page", "error");
      return;
    }
    const result = buildMarkdownExport(state, { includeSecrets, collectImages: true });
    const md = result.markdown;
    const manifest = result.imageManifest;
    const safeName = slugify(state.world.name) || "world";

    const zip = new JSZip();
    zip.file(`${safeName}.md`, md);

    let resolved = 0, missing = 0;
    if (manifest.entries.length > 0) {
      const imagesFolder = zip.folder("images");
      for (const item of manifest.entries) {
        try {
          if (item.source.startsWith("data:")) {
            // Inline base64 — strip header, decode
            const comma = item.source.indexOf(",");
            if (comma === -1) { missing++; continue; }
            const b64 = item.source.substring(comma + 1);
            imagesFolder.file(item.filename, b64, { base64: true });
            resolved++;
          } else if (dirHandle) {
            // Folder mode — read the file
            try {
              const fileHandle = await dirHandle.getFileHandle(item.source);
              const file = await fileHandle.getFile();
              imagesFolder.file(item.filename, file);
              resolved++;
            } catch (e) {
              console.warn(`Image not found in folder: ${item.source}`, e);
              missing++;
            }
          } else {
            missing++;
          }
        } catch (e) {
          console.warn(`Image processing failed: ${item.source}`, e);
          missing++;
        }
      }
    }

    try {
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}.world.zip`;
      a.click();
      URL.revokeObjectURL(url);

      const totalImages = manifest.entries.length;
      let msg = `Markdown + ${resolved} ${resolved === 1 ? "image" : "images"} exported`;
      if (missing > 0) msg += ` (${missing} image${missing === 1 ? "" : "s"} not found)`;
      if (includeSecrets) msg += " — includes secrets";
      flash(msg);
    } catch (e) {
      console.error("Zip generation failed:", e);
      flash("Zip export failed", "error");
    }
  };

  // Import (Bug 9 + 10: distinguish version-too-new from shape-invalid; validate)
  const importWorld = (file) => {
    // A brush or image file is for the Stamps panel (r042), as a pack file
    // is since r036; say so before reading it as JSON.
    const brushExt = /\.(abr|gbr|gih|brush|brushset|png|zip)$/i.exec(file && file.name ? file.name : "");
    if (brushExt) {
      const e = brushExt[1].toLowerCase();
      flash(e === "zip" || e === "png" ? `That's a .${e}, not a world file. Stamp images import from the Stamps panel at the top of Cartographia.` : `That's a brush file (.${e}). Import it from the Stamps panel at the top of Cartographia, not as a world.`, "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch (e) {
        console.error(e);
        flash("Import failed: file is not valid JSON", "error");
        return;
      }
      // Reject artifact-export files that aren't worlds. A pack file carries a
      // "templates" array, which would otherwise satisfy the world shape-check
      // below and load as a world (its templates land loose, no namespacing or
      // pack grouping). Route the user to the correct importer instead.
      if (parsed && parsed.cartulary_pack_export === 1) {
        flash("That's a pack file — import it from the Packs section, not as a world.", "error");
        return;
      }
      if (parsed && parsed.cartulary_template_export === 1) {
        flash("That's a single-template file — import it from the Templates section, not as a world.", "error");
        return;
      }
      if (parsed && parsed.cartulary_conlang_export === 1) {
        flash("That's a language file — import it from Glossopoeia's Import button, not as a world.", "error");
        return;
      }
      if (parsed && parsed.cartulary_mapstamp_pack === 1) {
        flash("That's a stamp pack. Import it from the Stamps panel at the top of Cartographia, not as a world.", "error");
        return;
      }
      // Shape pre-check: a Cartulary world has at least one of these top-level
      // keys. Migrate fills in missing structure with defaults, so without this
      // check, ANY valid JSON would silently load as an empty world.
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)
          || !("world" in parsed || "templates" in parsed || "entries" in parsed || "schemaVersion" in parsed)) {
        flash("Import failed: file does not look like a Cartulary world (missing world / templates / entries)", "error");
        return;
      }
      let migrated;
      try {
        migrated = migrate(parsed);
      } catch (e) {
        console.error(e);
        flash(`Import failed during migration: ${e?.message || String(e)}`, "error");
        return;
      }
      if (!migrated) {
        const versionTooNew = parsed && typeof parsed === "object" && parsed.schemaVersion > SCHEMA_VERSION;
        flash(
          versionTooNew
            ? `Import failed: file uses schema v${parsed.schemaVersion}, this build supports v${SCHEMA_VERSION}`
            : "Import failed: file is malformed",
          "error"
        );
        return;
      }
      const validationError = validateMigrated(migrated);
      if (validationError) {
        flash(`Import failed validation: ${validationError}`, "error");
        return;
      }
      // Defer the confirmation to the destructive-op modal. If the world
      // being replaced is blank, skip the modal — there's nothing to lose.
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
    };
    reader.readAsText(file);
  };

  // Reset path. If world has zero entries, skip the export-prompt modal —
  // there's nothing meaningful to lose. Otherwise route through the
  // destructive-op modal so the user gets the "Export world first" offer
  // and the explicit skip-export acknowledgment.
  const newWorld = () => {
    const isBlank = !state || !(state.entries) || state.entries.length === 0;
    if (isBlank) {
      executeReset();
      return;
    }
    setDestructiveOp({ type: "reset" });
  };

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
    setActiveTemplateId(null); setActiveTagFilter(null); setActiveEntryId(null);
    clearDraftAndStorage(); setView("home");
    // Reset backup-reminder anchor — fresh world, no edits to back up yet.
    setPrefs(p => ({ ...p, lastExportAt: isoNow() }));
    setBackupSnoozedUntil(null);
    // Reset throttle so the fresh world doesn't immediately auto-snapshot if
    // more than 5min have passed since the last snapshot. Treat the reset
    // itself as a recent-enough event. Sync the content-change detector to
    // the fresh world's updatedAt so the interval doesn't see the swap as a
    // change worth snapshotting.
    lastSnapshotAtRef.current = Date.now();
    lastSnapshotedUpdatedAtRef.current = fresh.world?.updatedAt || null;
    setDestructiveOp(null);
    flash("New world started");
  };

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
    setActiveTemplateId(null); setActiveTagFilter(null); setActiveEntryId(null);
    clearDraftAndStorage(); setView("home");
    // Just imported a JSON — that file IS the user's most recent backup.
    setPrefs(p => ({ ...p, lastExportAt: isoNow() }));
    setBackupSnoozedUntil(null);
    lastSnapshotAtRef.current = Date.now();
    lastSnapshotedUpdatedAtRef.current = migrated.world?.updatedAt || null;
    setDestructiveOp(null);
    flash("World imported");
  };

  // ─── Version History handlers ────────────────────────────────────────────
  // Used by VersionHistoryPanel inside SettingsView. All async, all best-
  // effort: failures log and flash an error but never crash the app.

  // Manual restore-point creation. Pinned by default (Drak spec: manuals
  // survive FIFO eviction). Optional label, trimmed.
  const createManualSnapshot = async (label) => {
    if (!state) return null;
    const trimmedLabel = (label || "").trim();
    const snap = await snapshotCreate({
      state,
      trigger: "manual",
      pinned: true,
      label: trimmedLabel || null,
    });
    if (snap) {
      lastSnapshotAtRef.current = snap.timestamp;
      // Manual snapshot captures current state — sync the content-change
      // detector to it so the interval doesn't fire a redundant snapshot
      // of the same content.
      lastSnapshotedUpdatedAtRef.current = state.world?.updatedAt || null;
      flash(trimmedLabel ? `Restore point created: ${trimmedLabel}` : "Restore point created");
    } else {
      flash("Failed to create restore point", "error");
    }
    return snap;
  };

  // Restore from snapshot. Runs the snapshot's worldJson through migrate()
  // and validateMigrated() first — schemas can drift if the user upgraded
  // Cartulary between snapshot creation and restore, so we treat snapshot
  // data with the same suspicion as imported world data. After that gate,
  // takes a pre-restore pinned snapshot of current state ("Before restore
  // from <timestamp>") so the rollback is itself reversible. The pre-restore
  // snapshot is best-effort: if it fails we still proceed with the restore —
  // the user has explicitly asked to roll back, and blocking on a safety-net
  // failure would be worse than proceeding without it.
  const restoreSnapshot = async (snap) => {
    if (!snap || !snap.worldJson) {
      flash("Cannot restore: snapshot data missing", "error");
      return;
    }
    let migrated;
    try {
      migrated = migrate(snap.worldJson);
    } catch (e) {
      console.error("Snapshot migration failed:", e);
      flash(`Cannot restore: snapshot migration failed (${e?.message || "unknown error"})`, "error");
      return;
    }
    if (!migrated) {
      const versionTooNew = snap.worldJson && typeof snap.worldJson === "object" && snap.worldJson.schemaVersion > SCHEMA_VERSION;
      flash(
        versionTooNew
          ? `Cannot restore: snapshot uses schema v${snap.worldJson.schemaVersion}, this build supports v${SCHEMA_VERSION}`
          : "Cannot restore: snapshot is malformed",
        "error"
      );
      return;
    }
    const validationError = validateMigrated(migrated);
    if (validationError) {
      flash(`Cannot restore: snapshot failed validation (${validationError})`, "error");
      return;
    }
    // Pre-restore safety snapshot. snapshotCreate returns null on failure
    // (quota exceeded, write error, etc.) rather than throwing. If the
    // safety net fails, prompt the user — proceeding without it means
    // they can't undo the restore from within Version History.
    let safetySnap = null;
    try {
      safetySnap = await snapshotCreate({
        state,
        trigger: "manual",
        pinned: true,
        kind: "pre-restore",
        label: `Before restore from ${formatSnapshotTimestamp(snap.timestamp)}`,
      });
    } catch (e) {
      console.error("Pre-restore safety snapshot failed:", e);
    }
    if (!safetySnap) {
      const proceed = confirm(
        "Could not create a safety snapshot of the current world before restoring. " +
        "If you proceed, you won't be able to undo this restore from Version History. " +
        "Restore anyway?"
      );
      if (!proceed) {
        flash("Restore cancelled", "error");
        return;
      }
    }
    setState(migrated);
    setActiveTemplateId(null); setActiveTagFilter(null); setActiveEntryId(null);
    clearDraftAndStorage(); setView("home");
    lastSnapshotAtRef.current = Date.now();
    lastSnapshotedUpdatedAtRef.current = migrated.world?.updatedAt || null;
    flash("Snapshot restored");
  };

  // Export snapshot as JSON. Filename includes the snapshot timestamp so
  // multiple exports don't collide. Doesn't reset the backup-reminder timer:
  // a snapshot export isn't the same commitment as a "save my live world"
  // export — different intent, different freshness implication.
  const exportSnapshot = (snap) => {
    if (!snap || !snap.worldJson) {
      flash("Cannot export: snapshot data missing", "error");
      return;
    }
    const blob = new Blob([JSON.stringify(snap.worldJson, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = slugify(snap.worldJson?.world?.name) || "world";
    const tsLabel = new Date(snap.timestamp).toISOString().replace(/[:.]/g, "-").slice(0, 19);
    a.download = `${safeName}.snapshot-${tsLabel}.world.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash("Snapshot exported");
  };

  // Delete a single snapshot row. Named removeSnapshot (not deleteSnapshot)
  // because the module-level helper is snapshotDelete and we'd rather not
  // overload the verb on different scopes.
  const removeSnapshot = async (key) => {
    try {
      await snapshotDelete(key);
      flash("Snapshot deleted");
    } catch (e) {
      console.error("Snapshot delete failed:", e);
      flash("Failed to delete snapshot", "error");
    }
  };

  // Create a new stemma with a default-named freeform root and immediately open
  // its canvas. The proper two-step creation modal (stemma name + root smart-input)
  // arrives in step 4 alongside the smart-input widget itself; this is the
  // interim path so step 3 has something testable.
  const createStemma = () => {
    if (isLocked) return;
    const stemId = `stem-${genId()}`;
    const rootId = `n-${genId()}`;
    const newStemma = {
      id: stemId,
      name: "Untitled Stemma",
      description: "",
      tags: [],
      root: {
        id: rootId,
        slot: 0,
        type: "freeform",
        label: "Root",
        color: "#c8a96e",
        icon: "✦",
        children: [],
      },
      createdAt: isoNow(),
      updatedAt: isoNow(),
    };
    updateState(s => ({ ...s, stemmas: [...(s.stemmas || []), newStemma] }));
    setActiveStemmaId(stemId);
    setFocalNodeId(rootId);
    flash("Stemma created");
  };

  const openStemma = (stemId) => {
    const s = (state.stemmas || []).find(x => x.id === stemId);
    if (!s) return;
    setActiveStemmaId(stemId);
    setFocalNodeId(s.root?.id || null);
  };

  const closeStemmaToIndex = () => {
    setActiveStemmaId(null);
    setFocalNodeId(null);
  };

  // Immutable tree update: returns a new root with `child` appended to the
  // children array of the node whose id === parentId. Walks recursively;
  // returns the original root unchanged if parentId isn't found.
  const addChildToStemmaTree = (root, parentId, child) => {
    if (!root) return root;
    if (root.id === parentId) {
      return { ...root, children: [...(root.children || []), child] };
    }
    if (!Array.isArray(root.children) || root.children.length === 0) return root;
    return {
      ...root,
      children: root.children.map(c => addChildToStemmaTree(c, parentId, child)),
    };
  };

  // Immutable tree update: applies `updater(node)` to the node whose id matches.
  // updater takes the node and returns the patched node. Tree is rebuilt.
  const updateNodeInStemmaTree = (root, nodeId, updater) => {
    if (!root) return root;
    if (root.id === nodeId) return updater(root);
    if (!Array.isArray(root.children) || root.children.length === 0) return root;
    return {
      ...root,
      children: root.children.map(c => updateNodeInStemmaTree(c, nodeId, updater)),
    };
  };

  // Immutable tree mutation: removes the node whose id matches and returns a
  // new tree. Returns null if the root itself matches (caller should refuse to
  // delete the root). Otherwise prunes the matching subtree from its parent.
  const removeNodeFromStemmaTree = (root, nodeId) => {
    if (!root) return root;
    if (root.id === nodeId) return null;  // root deletion handled by caller
    if (!Array.isArray(root.children) || root.children.length === 0) return root;
    return {
      ...root,
      children: root.children
        .filter(c => c.id !== nodeId)
        .map(c => removeNodeFromStemmaTree(c, nodeId)),
    };
  };

  // Add a child node (freeform or linked) to a specific node within a stemma.
  // payload shape:
  //   { type: "freeform", label, color?, icon? }
  //   { type: "linked", entryId, cachedName }
  const addStemmaChild = (stemmaId, parentNodeId, slot, payload) => {
    if (isLocked) return;
    if (typeof slot !== "number" || slot < 0 || slot >= STEMMA_SLOTS) return;
    updateState(s => {
      const stemmas = (s.stemmas || []).map(st => {
        if (st.id !== stemmaId) return st;
        // Reject if slot is already occupied (defensive — UI shouldn't allow it).
        const focal = findStemmaNode(st.root, parentNodeId);
        if (!focal) return st;
        if ((focal.children || []).some(c => c.slot === slot)) return st;

        let newChild;
        if (payload.type === "linked") {
          newChild = {
            id: `n-${genId()}`,
            slot,
            type: "linked",
            entryId: payload.entryId,
            _cachedName: payload.cachedName || "",
            children: [],
          };
        } else {
          newChild = {
            id: `n-${genId()}`,
            slot,
            type: "freeform",
            label: payload.label || "(empty)",
            color: payload.color || "#c8a96e",
            icon: payload.icon || "✦",
            children: [],
          };
        }
        return {
          ...st,
          root: addChildToStemmaTree(st.root, parentNodeId, newChild),
          updatedAt: isoNow(),
        };
      });
      return { ...s, stemmas };
    });
  };

  // Patch a node's display fields (label/color/icon for freeform; nothing
  // editable on linked aside from convert/relink which have their own paths).
  // patch is a partial of the node — only specified keys overwrite.
  const updateStemmaNode = (stemmaId, nodeId, patch) => {
    if (isLocked) return;
    updateState(s => {
      const stemmas = (s.stemmas || []).map(st => {
        if (st.id !== stemmaId) return st;
        return {
          ...st,
          root: updateNodeInStemmaTree(st.root, nodeId, (n) => ({ ...n, ...patch })),
          updatedAt: isoNow(),
        };
      });
      return { ...s, stemmas };
    });
  };

  // Delete a node and all its descendants. Refuses to delete the root (the
  // caller should disable the inspector's delete button when the focal IS the
  // root, or fall through to deleting the entire stemma instead — that flow
  // isn't built yet, see step 5 flags).
  const deleteStemmaNode = (stemmaId, nodeId) => {
    if (isLocked) return;
    updateState(s => {
      const stemmas = (s.stemmas || []).map(st => {
        if (st.id !== stemmaId) return st;
        if (st.root.id === nodeId) return st;  // refuse to remove root via this path
        return {
          ...st,
          root: removeNodeFromStemmaTree(st.root, nodeId),
          updatedAt: isoNow(),
        };
      });
      return { ...s, stemmas };
    });
  };

  // Convert a freeform node to a linked node, binding it to an existing entry.
  // Drops freeform-only fields (label/color/icon) since linked nodes pull
  // display from the entry's template.
  const convertStemmaNodeToLinked = (stemmaId, nodeId, entryId, cachedName) => {
    if (isLocked) return;
    updateState(s => {
      const stemmas = (s.stemmas || []).map(st => {
        if (st.id !== stemmaId) return st;
        return {
          ...st,
          root: updateNodeInStemmaTree(st.root, nodeId, (n) => {
            // Preserve children, slot, id; replace identity fields.
            const { label, color, icon, ...rest } = n;
            return {
              ...rest,
              type: "linked",
              entryId,
              _cachedName: cachedName || "",
            };
          }),
          updatedAt: isoNow(),
        };
      });
      return { ...s, stemmas };
    });
  };

  // Convert a linked node to freeform. Promotes _cachedName to be the new
  // label (per design doc §6.1). Drops entryId / _cachedName.
  const convertStemmaNodeToFreeform = (stemmaId, nodeId) => {
    if (isLocked) return;
    updateState(s => {
      const stemmas = (s.stemmas || []).map(st => {
        if (st.id !== stemmaId) return st;
        return {
          ...st,
          root: updateNodeInStemmaTree(st.root, nodeId, (n) => {
            const { entryId, _cachedName, ...rest } = n;
            return {
              ...rest,
              type: "freeform",
              label: _cachedName || "(empty)",
              color: "#c8a96e",
              icon: "✦",
            };
          }),
          updatedAt: isoNow(),
        };
      });
      return { ...s, stemmas };
    });
  };

  // Re-link a linked node to a different entry. Stays type "linked"; just
  // swaps entryId and _cachedName. If the node was orphaned, this fixes it.
  const relinkStemmaNode = (stemmaId, nodeId, newEntryId, newCachedName) => {
    if (isLocked) return;
    updateState(s => {
      const stemmas = (s.stemmas || []).map(st => {
        if (st.id !== stemmaId) return st;
        return {
          ...st,
          root: updateNodeInStemmaTree(st.root, nodeId, (n) => ({
            ...n,
            entryId: newEntryId,
            _cachedName: newCachedName || "",
          })),
          updatedAt: isoNow(),
        };
      });
      return { ...s, stemmas };
    });
  };

  // Rename a stemma at the document level (not a node). Used by the inline
  // edit on the canvas breadcrumb.
  const renameStemma = (stemmaId, newName) => {
    if (isLocked) return;
    const trimmed = (newName || "").trim();
    if (!trimmed) return;  // refuse blank names
    updateState(s => {
      const stemmas = (s.stemmas || []).map(st =>
        st.id === stemmaId ? { ...st, name: trimmed, updatedAt: isoNow() } : st
      );
      return { ...s, stemmas };
    });
  };

  // Delete a stemma entirely. Used by the index-page row's delete action.
  const deleteStemma = (stemmaId) => {
    if (isLocked) return;
    updateState(s => ({ ...s, stemmas: (s.stemmas || []).filter(st => st.id !== stemmaId) }));
    // If the canvas was open on this stemma, close it
    if (activeStemmaId === stemmaId) {
      setActiveStemmaId(null);
      setFocalNodeId(null);
    }
  };

  // === Kalendarium calendar handlers (v1.4) ===
  //
  // Additional calendars live in state.calendars[]. Primary stays at
  // state.world.calendar and is mutated via updateWorldMeta. These three
  // handlers only touch the additional-calendars array.
  //
  // createCalendar: creates a new additional calendar with a single "Month 1"
  // as the starting structure. Worldbuilders building genuinely distinct
  // calendars rarely want primary's month layout as a starting point, and the
  // clone-then-delete workflow caused spurious month-removal warnings while
  // there were no entries bound to the fresh calendar to invalidate (now
  // additionally fixed by scoping CalendarEditor's dateUsages, but the empty
  // default eliminates the friction entirely).
  //
  // Anchor starts at absoluteDay 0 (= primary year 1 month 0 day 1). User
  // adjusts anchor in the editor.
  const createCalendar = () => {
    if (isLocked) return;
    const calId = `cal-${genId()}`;
    const newCal = {
      id: calId,
      name: "New Calendar",
      months: [{ name: "Month 1", days: 30 }],
      eras: [],
      notes: "",
      anchor: { absoluteDay: 0 },
    };
    // Apply v1.4 (post-Kalendarium) extension defaults via the same shape
    // helper that migrate() and normalizeImportedCalendar use, so freshly
    // created calendars always carry the full current schema without this
    // construction site drifting from the canonical default.
    ensureCalendarShape(newCal);
    updateState(s => ({ ...s, calendars: [...(s.calendars || []), newCal] }));
    setActiveCalendarId(calId);
    setReferenceCalendarId(calId);
    flash("Calendar created");
  };

  // updateCalendar: replace a secondary calendar by id with a patched copy.
  // Caller (KalendariumEditorView) provides the full updated object;
  // shallow-merge isn't enough since months/eras arrays need full replacement.
  const updateCalendar = (calendarId, updatedCal) => {
    if (isLocked) return;
    updateState(s => ({
      ...s,
      calendars: (s.calendars || []).map(c =>
        c.id === calendarId ? { ...updatedCal, id: calendarId } : c
      ),
    }));
  };

  // updateCalendarStructured: replaces a calendar (primary or additional)
  // AND, if the months array structurally changed, reframes every entry
  // bound to that calendar so dates that named a now-removed month roll
  // forward into the next still-existing month (or into next year if the
  // removed month was last). Same-named months at different positions
  // (reorder) get their monthIndex updated to keep the name binding.
  // Day values clamp to the new month's day count if shrunk.
  //
  // Different invariant from cross-calendar rebind: that one uses
  // convertEntryDatesAcrossCalendars to preserve absolute moments. This one
  // uses reframeEntryDatesAcrossStructure to preserve user intent (month
  // name + day) — the right semantic when the user is editing their own
  // calendar and thinks of dates as positions on it.
  //
  // All mutations land in one updateState call so the calendar shape and
  // the entries' dates stay consistent — no transient state where dates
  // point to invalid months.
  //
  // calId is null for primary, the additional calendar's id otherwise.
  // The caller passes the OLD calendar object (pre-edit) and the NEW
  // calendar object (post-edit).
  //
  // Rename-only edits (same length, same per-index days, name changes only)
  // trigger structural detection but the positional fallback inside
  // reframeDateAcrossStructure handles them cleanly: monthIndex stays put.
  const updateCalendarStructured = (calId, oldCal, newCal) => {
    if (isLocked) return;
    const structural = monthsStructurallyChanged(oldCal, newCal);
    let reframedCount = 0;
    updateState(s => {
      let nextEntries = s.entries;
      if (structural) {
        nextEntries = s.entries.map(e => {
          // Entry binds to calId? (null means primary; entry.calendarId null/unset
          // means primary too.)
          const entryBinding = e.calendarId || null;
          if (entryBinding !== (calId || null)) return e;
          const tpl = s.templates.find(t => t.id === e.templateId);
          if (!tpl) return e;
          const reframed = reframeEntryDatesAcrossStructure(e, tpl, oldCal, newCal);
          if (!reframed || JSON.stringify(reframed.fields) === JSON.stringify(e.fields)) {
            return e;
          }
          reframedCount += 1;
          return { ...reframed, updatedAt: isoNow() };
        });
      }
      // Apply the calendar change.
      if (calId == null) {
        // Primary structural edit: reframe state.world.currentMoment too.
        // currentMoment is stored as Y/M/D in primary's frame (per
        // doctrine: calendar-position invariance), so primary structural
        // edits (month add/remove/reorder/day-count change) need the same
        // reframing treatment that entry dates get. Without this, a stored
        // monthIndex could point at a non-existent month after the edit,
        // and consumers (auto-age, grid-view year init) would compute
        // against an out-of-range position. Non-structural primary edits
        // (name change, era edit, week/celestials/seasons changes) leave
        // currentMoment alone — its Y/M/D doesn't need reframing.
        let nextCurrentMoment = s.world.currentMoment;
        if (structural && s.world.currentMoment && s.world.currentMoment.year != null) {
          nextCurrentMoment = reframeDateAcrossStructure(s.world.currentMoment, oldCal, newCal);
        }
        return {
          ...s,
          world: { ...s.world, calendar: newCal, currentMoment: nextCurrentMoment, updatedAt: isoNow() },
          entries: nextEntries,
        };
      }
      return {
        ...s,
        calendars: (s.calendars || []).map(c =>
          c.id === calId ? { ...newCal, id: calId } : c
        ),
        entries: nextEntries,
      };
    });
    if (reframedCount > 0) {
      flash(`Calendar structure changed. Reframed dates on ${reframedCount} entr${reframedCount === 1 ? "y" : "ies"} bound to "${newCal.name || "this calendar"}" — dates kept their month name where possible; removed months rolled forward to the next month (or to next year's first month if needed).`);
    }
  };

  // deleteCalendar: removes the calendar. Pre-deletion conversion (Drak's
  // decision #4) is enforced by the KalendariumIndexView modal flow, which
  // walks the user through reassigning bound entries before this is called.
  // This function itself just does the deletion plus session-state cleanup.
  // If the editor was open on the deleted calendar, bounce back to index.
  // If the reference was pointing at it, clear back to primary. Also clears
  // any per-view selector entries that referenced this calendar; counts the
  // clears so the user gets a heads-up flash about which view-level prefs
  // got reset.
  const deleteCalendar = (calendarId) => {
    if (isLocked) return;
    // Map of viewPref key → user-facing name, used so the flash names the
    // views that lost their display-calendar preference rather than dumping
    // raw key strings. Only covers keys that store a calendar id; anything
    // else falls through to the bare key name as a fallback.
    const viewPrefNames = {
      mapCalendarId: "Cartographia",
      timelineCalendarId: "Timeline; Vertical",
      chronometricsCalendarId: "Timeline; Chronometric",
      familyCalendarId: "Linea",
    };
    let clearedViewNames = [];
    updateState(s => {
      const cleanedViewPrefs = { ...(s.viewPrefs || {}) };
      Object.keys(cleanedViewPrefs).forEach(k => {
        if (cleanedViewPrefs[k] === calendarId) {
          cleanedViewPrefs[k] = null;
          clearedViewNames.push(viewPrefNames[k] || k);
        }
      });
      // v1.4 post-Kalendarium: kalendariumGridYear is a MAP keyed by calendar
      // rowKey, not a flat id-valued pref. The `=== calendarId` strip above
      // doesn't touch it, so explicitly drop the stale entry.
      if (cleanedViewPrefs.kalendariumGridYear && cleanedViewPrefs.kalendariumGridYear[calendarId] !== undefined) {
        const nextMap = { ...cleanedViewPrefs.kalendariumGridYear };
        delete nextMap[calendarId];
        cleanedViewPrefs.kalendariumGridYear = nextMap;
      }
      return {
        ...s,
        calendars: (s.calendars || []).filter(c => c.id !== calendarId),
        viewPrefs: cleanedViewPrefs,
      };
    });
    if (activeCalendarId === calendarId) setActiveCalendarId(null);
    if (referenceCalendarId === calendarId) setReferenceCalendarId(null);
    if (clearedViewNames.length > 0) {
      const list = clearedViewNames.length === 1
        ? clearedViewNames[0]
        : clearedViewNames.slice(0, -1).join(", ") + " and " + clearedViewNames[clearedViewNames.length - 1];
      flash(`Calendar deleted. ${list} ${clearedViewNames.length === 1 ? "had its" : "had their"} date-display preference reset to primary.`);
    }
  };

  // updateViewPrefs: merges a patch into state.viewPrefs. Used by the
  // per-view calendar selectors. Each view's selector reads from
  // state.viewPrefs[<viewKey>CalendarId] and writes via this function.
  const updateViewPrefs = (patch) => {
    updateState(s => ({ ...s, viewPrefs: { ...(s.viewPrefs || {}), ...patch } }));
  };

  // convertAndDeleteCalendar: atomic flow used by the pre-deletion
  // conversion modal. For each entry bound to sourceId, walks every
  // date-bearing field through absoluteDay so the absolute moment is
  // preserved across the rebind. Then deletes the source calendar.
  // newCalendarId may be null (= rebind to primary) or another additional
  // calendar's id. Returns the count of entries converted.
  //
  // Defensive against template-not-found (entries with stale templateId
  // skip conversion but still rebind to the new calendar) and against
  // source-not-found (no-op).
  const convertAndDeleteCalendar = (sourceId, targetCalendarId) => {
    if (isLocked) return 0;
    const sourceCal = (state.calendars || []).find(c => c.id === sourceId);
    if (!sourceCal) return 0;
    const targetCal = getCalendar(state, targetCalendarId);
    if (!targetCal) return 0;
    const tplById = Object.fromEntries(state.templates.map(t => [t.id, t]));
    let convertedCount = 0;
    updateState(s => {
      const cleanedViewPrefs = { ...(s.viewPrefs || {}) };
      Object.keys(cleanedViewPrefs).forEach(k => {
        if (cleanedViewPrefs[k] === sourceId) cleanedViewPrefs[k] = null;
      });
      // v1.4 post-Kalendarium: kalendariumGridYear is a MAP keyed by calendar
      // rowKey, not a flat id-valued pref. Strip the source's entry.
      if (cleanedViewPrefs.kalendariumGridYear && cleanedViewPrefs.kalendariumGridYear[sourceId] !== undefined) {
        const nextMap = { ...cleanedViewPrefs.kalendariumGridYear };
        delete nextMap[sourceId];
        cleanedViewPrefs.kalendariumGridYear = nextMap;
      }
      return {
        ...s,
        entries: s.entries.map(e => {
          if (e.calendarId !== sourceId) return e;
          const tpl = tplById[e.templateId];
          if (!tpl) {
            // No template — can't convert dates safely; just rebind id.
            return { ...e, calendarId: targetCalendarId || null };
          }
          convertedCount++;
          return convertEntryDatesAcrossCalendars(e, tpl, sourceCal, targetCal, targetCalendarId);
        }),
        calendars: (s.calendars || []).filter(c => c.id !== sourceId),
        viewPrefs: cleanedViewPrefs,
      };
    });
    if (activeCalendarId === sourceId) setActiveCalendarId(null);
    if (referenceCalendarId === sourceId) setReferenceCalendarId(null);
    return convertedCount;
  };

  // Download a stemma as JSON. Wrapped in the same envelope shape as
  // template export — { cartulary_stemma_export: 1, exported_at, stemma }.
  // Note: we keep the runtime ids in the export so the file is fully
  // round-trippable when re-imported into the same world (collision modal
  // would catch the name clash and prompt). Cross-world imports regenerate
  // ids via normalizeImportedStemma → regenerateStemmaIds at import time.
  const exportStemmaJson = (stemma) => {
    if (!stemma) return;
    const payload = {
      cartulary_stemma_export: 1,
      exported_at: new Date().toISOString(),
      stemma,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(stemma.name) || "stemma"}.stemma.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flash(`Exported stemma "${stemma.name}".`);
  };

  // Read an imported stemma file. Either inserts directly (no name clash) or
  // stages a stemmaImportCollision for the modal to resolve. Always
  // regenerates ids before any state touches — design doc §5.2.
  const handleImportStemmaFile = (file) => {
    // Defensive: bails if world locked. UI gates the Import button on
    // !isLocked, but a user could theoretically race state by triggering
    // import then locking the world before the file picker resolves —
    // this prevents a misleading "imported successfully" flash from
    // firing when nothing actually persisted.
    if (isLocked) return;
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try { parsed = JSON.parse(reader.result); }
      catch (e) { flash("Couldn't parse that file as JSON.", "error"); return; }
      if (!parsed || parsed.cartulary_stemma_export !== 1 || !parsed.stemma) {
        flash("That doesn't look like a Cartulary stemma export.", "error");
        return;
      }
      const norm = normalizeImportedStemma(parsed.stemma);
      if (!norm.ok) {
        flash(norm.error, "error");
        return;
      }
      const regenerated = regenerateStemmaIds(norm.stemma);
      const missingRefs = collectStemmaMissingRefs(regenerated, state.entries);

      // Name collision check (case-insensitive)
      const existing = (state.stemmas || []).find(s =>
        s.name.toLowerCase() === regenerated.name.toLowerCase()
      );
      if (existing) {
        setStemmaImportCollision({ imported: regenerated, existing, missingRefs });
        setStemmaCollisionAction("rename");
        setStemmaCollisionRename(`${regenerated.name} (imported)`);
        stemmaCollisionConfirmInFlight.current = false;
        return;
      }
      insertImportedStemma(regenerated, "new");
      if (missingRefs.length > 0) {
        flash(`Imported "${regenerated.name}". ${missingRefs.length} linked node${missingRefs.length === 1 ? "" : "s"} became orphans (entry not in this world).`, "warn");
      } else {
        flash(`Imported stemma "${regenerated.name}".`);
      }
    };
    reader.onerror = () => flash("Couldn't read that file.", "error");
    reader.readAsText(file);
  };

  // Insert (or replace) a stemma into world state. mode "replace" preserves
  // the existing id so any future references to the stemma id continue to
  // work; mode "new" uses the regenerated id from import time. overrideName
  // is set by the rename branch of the collision modal.
  const insertImportedStemma = (stem, mode, existingId, overrideName) => {
    if (isLocked) return;
    updateState(s => {
      const stemmas = s.stemmas || [];
      if (mode === "replace" && existingId) {
        const replaced = { ...stem, id: existingId, updatedAt: isoNow() };
        return { ...s, stemmas: stemmas.map(x => x.id === existingId ? replaced : x) };
      }
      const final = overrideName ? { ...stem, name: overrideName, updatedAt: isoNow() } : { ...stem, updatedAt: isoNow() };
      return { ...s, stemmas: [...stemmas, final] };
    });
  };

  // ─── Calendar JSON I/O (v1.4 Kalendarium) ────────────────────────────────────
  // Export shape: { cartulary_calendar_export: 1, exported_at, calendar }.
  // Calendars exported from primary (world.calendar) get the same envelope —
  // primary has no anchor (it IS the absolute frame), so we synthesize
  // anchor.absoluteDay = 0 on export so the destination treats it as
  // additional with a sensible default anchor that the user can re-pin.
  const exportCalendarJson = (cal) => {
    if (!cal) return;
    // Make a deep copy so the in-memory calendar isn't mutated by the
    // anchor backfill / id-strip below.
    const calCopy = JSON.parse(JSON.stringify(cal));
    if (!calCopy.anchor || typeof calCopy.anchor !== "object") {
      calCopy.anchor = { absoluteDay: 0 };
    } else if (calCopy.anchor.absoluteDay == null) {
      calCopy.anchor = { ...calCopy.anchor, absoluteDay: 0 };
    }
    // Strip id — every import regenerates id via genId() before any state
    // touches, so the original id is dead weight in the file. Keeping it
    // would also imply id-portability across worlds, which we don't
    // guarantee.
    delete calCopy.id;
    // v1.5 moon-unification: calCopy.celestials is an array of moon-body id
    // refs. Bodies are world-scoped and don't travel with a single calendar,
    // so embed each referenced moon's synodic-cycle data inline; the importer
    // rebinds or recreates bodies from this. Orbital geometry is NOT embedded
    // (it can't be reconstructed from a calendar — a re-imported geometric moon
    // falls back to its synodic cycle, or to no phase if it never had one).
    if (Array.isArray(calCopy.celestials)) {
      const byId = {};
      (state.celestialBodies || []).forEach(b => { if (b && b.id) byId[b.id] = b; });
      calCopy.celestials = calCopy.celestials
        .map(id => {
          const b = byId[id];
          if (!b) return null;
          return {
            name: b.name || "(unnamed moon)",
            synodicCycleDays: Number.isFinite(b.synodicCycleDays) ? b.synodicCycleDays : null,
            phaseAnchorDay: Number.isFinite(b.phaseAnchorDay) ? b.phaseAnchorDay : null,
          };
        })
        .filter(Boolean);
    }
    const payload = {
      cartulary_calendar_export: 1,
      exported_at: new Date().toISOString(),
      calendar: calCopy,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(calCopy.name) || "calendar"}.calendar.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flash(`Exported calendar "${calCopy.name}".`);
  };

  // Read an imported calendar file. Either inserts directly (no name clash)
  // or stages a calendarImportCollision for the modal to resolve. Always
  // regenerates the id before any state touches — never reuse a foreign id.
  // Imported calendars always land as ADDITIONAL (state.calendars), never
  // overwrite primary — primary swapping would invalidate every entry's
  // absoluteDay frame and is intentionally not supported via import.
  const handleImportCalendarFile = (file) => {
    if (isLocked) return;
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try { parsed = JSON.parse(reader.result); }
      catch (e) { flash("Couldn't parse that file as JSON.", "error"); return; }
      if (!parsed || parsed.cartulary_calendar_export !== 1 || !parsed.calendar) {
        flash("That doesn't look like a Cartulary calendar export.", "error");
        return;
      }
      const norm = normalizeImportedCalendar(parsed.calendar);
      if (!norm.ok) {
        flash(norm.error, "error");
        return;
      }
      const regenerated = regenerateCalendarId(norm.calendar);
      beginCalendarImport(regenerated, norm.embeddedMoons || []);
    };
    reader.onerror = () => flash("Couldn't read that file.", "error");
    reader.readAsText(file);
  };

  // v1.5 moon-unification: stage one. If the imported calendar embedded any
  // moons, open the reconciliation modal (rebind each to an existing world moon
  // by name, or create it). Otherwise go straight to the name-collision check.
  const beginCalendarImport = (calendar, embeddedMoons) => {
    if (isLocked) return;
    if (!Array.isArray(embeddedMoons) || embeddedMoons.length === 0) {
      proceedToNameCollisionCheck(calendar, []);
      return;
    }
    const destMoons = (state.celestialBodies || []).filter(b => b && b.kind === "moon");
    const moons = embeddedMoons.map(em => {
      const nm = (em.name || "").trim().toLowerCase();
      const matches = destMoons.filter(b => (b.name || "").trim().toLowerCase() === nm).map(b => b.id);
      return {
        name: em.name,
        synodicCycleDays: em.synodicCycleDays,
        phaseAnchorDay: em.phaseAnchorDay,
        matches,
        // Default: rebind only on an unambiguous single match; otherwise create
        // new (never silently rebind to the wrong one of several same-named).
        decision: matches.length === 1 ? matches[0] : "__new__",
      };
    });
    setMoonReconcile({ calendar, moons });
  };

  // v1.5 moon-unification: stage two. Apply the reconciliation decisions —
  // create new moon bodies for "__new__", rebind the rest — then continue to
  // the name-collision check carrying the bodies to create at final commit.
  const confirmMoonReconcile = () => {
    if (!moonReconcile) return;
    const { calendar, moons } = moonReconcile;
    const newBodies = [];
    const refs = [];
    moons.forEach(m => {
      if (m.decision === "__new__") {
        const newId = `cel-${genId()}`;
        newBodies.push(makeNewCelestialBody(newId, {
          name: m.name,
          kind: "moon",
          // Faithful to the export: no fabricated cycle. A moon that was
          // geometric-only in the source (no synodic data, geometry didn't
          // travel) imports phase-less until the user gives it a cycle/orbit.
          synodicCycleDays: Number.isFinite(m.synodicCycleDays) ? m.synodicCycleDays : null,
          phaseAnchorDay: Number.isFinite(m.phaseAnchorDay) ? m.phaseAnchorDay : null,
        }));
        refs.push(newId);
      } else if (m.decision && !refs.includes(m.decision)) {
        refs.push(m.decision);
      }
    });
    const resolvedCal = { ...calendar, celestials: refs };
    setMoonReconcile(null);
    proceedToNameCollisionCheck(resolvedCal, newBodies);
  };

  // Name-collision check, shared by the no-moon path and post-reconciliation.
  // newBodies are created atomically with the calendar insert at commit.
  const proceedToNameCollisionCheck = (calendar, newBodies) => {
    const existing = (state.calendars || []).find(c =>
      c.name.toLowerCase() === calendar.name.toLowerCase()
    );
    const primaryClash = state.world.calendar?.name?.toLowerCase() === calendar.name.toLowerCase();
    if (existing || primaryClash) {
      setCalendarImportCollision({
        imported: calendar,
        existing: existing || { ...state.world.calendar, isPrimary: true },
        primaryClash,
        newBodies: newBodies || [],
      });
      setCalendarCollisionAction("rename");
      setCalendarCollisionRename(`${calendar.name} (imported)`);
      calendarCollisionConfirmInFlight.current = false;
      return;
    }
    insertImportedCalendar(calendar, "new", null, null, newBodies);
    flash(`Imported calendar "${calendar.name}".`);
  };

  // Insert (or replace) a calendar into state.calendars. mode "replace"
  // preserves the existing id so any entry calendarId references continue
  // to resolve; mode "new" uses the regenerated id from import time.
  // Replacing primary is NOT supported — the modal hides the Replace option
  // when primaryClash is true.
  const insertImportedCalendar = (cal, mode, existingId, overrideName, newBodies) => {
    if (isLocked) return;
    updateState(s => {
      const calendars = s.calendars || [];
      // v1.5 moon-unification: create the moon bodies the reconciliation
      // decided to add, atomically with the calendar insert (so cancelling
      // earlier never leaves orphan bodies). De-dupe against existing ids
      // defensively.
      const existingBodyIds = new Set((s.celestialBodies || []).map(b => b && b.id).filter(Boolean));
      const bodiesToAdd = (Array.isArray(newBodies) ? newBodies : []).filter(b => b && b.id && !existingBodyIds.has(b.id));
      const nextBodies = bodiesToAdd.length > 0 ? [...(s.celestialBodies || []), ...bodiesToAdd] : s.celestialBodies;
      if (mode === "replace" && existingId) {
        const replaced = { ...cal, id: existingId };
        return { ...s, celestialBodies: nextBodies, calendars: calendars.map(x => x.id === existingId ? replaced : x) };
      }
      const final = overrideName ? { ...cal, name: overrideName } : { ...cal };
      return { ...s, celestialBodies: nextBodies, calendars: [...calendars, final] };
    });
  };

  const updateWorldMeta = (patch) => {
    updateState(s => ({ ...s, world: { ...s.world, ...patch } }));
  };

  const reorderTemplate = (fromIdx, toIdx) => {
    updateState(s => {
      if (fromIdx < 0 || fromIdx >= s.templates.length) return s;
      if (toIdx < 0 || toIdx > s.templates.length) return s;
      const next = [...s.templates];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return { ...s, templates: next };
    });
  };

  // Compute what would change if a built-in template were reset to factory default.
  // Returns null if the template isn't a built-in.
  const analyzeReset = (tplId) => {
    const userTpl = state.templates.find(t => t.id === tplId);
    if (!userTpl) return null;
    // User-origin templates have no canonical "factory default" to reset to,
    // even if they happen to share a name with a built-in. The UI Reset button
    // is already gated on origin, but defense-in-depth here too.
    if (userTpl.origin !== TEMPLATE_ORIGIN.BUILTIN) return null;
    // v1.7 r016: Plot Thread and Theme / Motif by their flag, renamed or not.
    const builtin = (userTpl.fabulaRole && fabulaRoleBuiltin(userTpl.fabulaRole)) || BUILTIN_TEMPLATES.find(b => b.name === userTpl.name);
    if (!builtin) return null;

    const userLabels = new Set(userTpl.fields.map(f => f.label));
    const builtinLabels = new Set(builtin.fields.map(f => f.label));
    const customFields = userTpl.fields.filter(f => !builtinLabels.has(f.label));
    const missingFields = builtin.fields.filter(f => !userLabels.has(f.label));
    const customFieldIds = new Set(customFields.map(f => f.id));

    // Count entries with data in custom fields that would be purged
    const entries = state.entries.filter(e => e.templateId === tplId);
    let entriesAffected = 0;
    entries.forEach(e => {
      const fields = e.fields || {};
      const hasCustomData = [...customFieldIds].some(fid => {
        const v = fields[fid];
        return v != null && v !== "" && !(Array.isArray(v) && v.length === 0);
      });
      if (hasCustomData) entriesAffected++;
    });

    return {
      template: userTpl,
      builtin,
      customFields,
      missingFields,
      entriesTotal: entries.length,
      entriesAffected,
      iconChanged: userTpl.icon !== builtin.icon,
      colorChanged: userTpl.color !== builtin.color,
      nameChanged: userTpl.name !== builtin.name,
    };
  };

  // Restore one or more built-in templates that the user previously deleted.
  // Walks BUILTIN_TEMPLATES, makes fresh copies of the requested ones, removes
  // their names from seededBuiltins so the migrate path treats them as fresh,
  // and inserts them at canonical positions. The user keeps any other custom
  // templates and edits — this only reverses the specific deletion(s).
  const restoreBuiltinTemplates = (names) => {
    if (!names || names.length === 0) return;
    updateState(s => {
      const next = JSON.parse(JSON.stringify(s));
      const seeded = new Set(next.world.seededBuiltins || []);
      const newTemplates = [...next.templates];
      const insertAt = (newTpl, builtinIndex) => {
        for (let i = builtinIndex - 1; i >= 0; i--) {
          const prevName = BUILTIN_TEMPLATES[i].name;
          const idx = newTemplates.findIndex(t => t.name === prevName);
          if (idx !== -1) { newTemplates.splice(idx + 1, 0, newTpl); return; }
        }
        for (let i = builtinIndex + 1; i < BUILTIN_TEMPLATES.length; i++) {
          const nextName = BUILTIN_TEMPLATES[i].name;
          const idx = newTemplates.findIndex(t => t.name === nextName);
          if (idx !== -1) { newTemplates.splice(idx, 0, newTpl); return; }
        }
        newTemplates.push(newTpl);
      };
      names.forEach(name => {
        const builtinIdx = BUILTIN_TEMPLATES.findIndex(b => b.name === name);
        if (builtinIdx === -1) return;
        // v1.7 r016: Plot Thread or Theme / Motif comes back only when no
        // template holds its place in Fabula, a renamed one included.
        const role = BUILTIN_TEMPLATES[builtinIdx].fabulaRole;
        if (role && newTemplates.some(t => t && t.fabulaRole === role)) { seeded.delete(name); return; }
        // Skip if the user already has the built-in version back. A user-origin
        // template with the same name does NOT block restoration — they can
        // coexist (the dedup pass now keys on origin too, so they won't merge).
        if (newTemplates.some(t => t.name === name && t.origin === TEMPLATE_ORIGIN.BUILTIN)) {
          seeded.delete(name);  // sync the bookkeeping
          return;
        }
        const fresh = makeTemplateFromBuiltin(BUILTIN_TEMPLATES[builtinIdx]);
        insertAt(fresh, builtinIdx);
        seeded.delete(name);
      });
      resolveTemplateRefs(newTemplates);
      next.templates = newTemplates;
      next.world.seededBuiltins = [...seeded];
      return next;
    });
    flash(names.length === 1 ? "Template restored" : `${names.length} templates restored`);
  };

  const resetTemplate = (tplId) => {
    updateState(s => {
      const userTpl = s.templates.find(t => t.id === tplId);
      if (!userTpl) return s;
      // Refuse to reset user-origin templates — they have no canonical factory
      // schema. The Reset button is UI-gated on origin, but guarding here too
      // means programmatic calls (e.g. future bulk-reset feature) can't
      // accidentally clobber a user template.
      if (userTpl.origin !== TEMPLATE_ORIGIN.BUILTIN) return s;
      // v1.7 r016: Plot Thread and Theme / Motif by their flag, renamed or not.
      const builtin = (userTpl.fabulaRole && fabulaRoleBuiltin(userTpl.fabulaRole)) || BUILTIN_TEMPLATES.find(b => b.name === userTpl.name);
      if (!builtin) return s;

      // Build a fresh copy of the built-in but preserve the existing template ID
      // so existing entries continue to link correctly.
      const fresh = makeTemplateFromBuiltin(builtin);
      fresh.id = userTpl.id;

      // Match factory fields against existing user fields by label. If the user
      // already has a field with the same label as a factory field, REUSE the
      // user's existing field ID so its entry data survives the reset. Only
      // generate fresh IDs for genuinely new fields. This makes the actual
      // behavior match what the Reset modal promises ("these custom fields will
      // be removed; these missing fields will be added back" — everything else
      // is preserved).
      const userFieldsByLabel = new Map();
      const collectUserFields = (fields) => {
        fields.forEach(f => {
          userFieldsByLabel.set(f.label, f);
          if (f.subfields) collectUserFields(f.subfields);
        });
      };
      collectUserFields(userTpl.fields);

      const remapFieldIds = (fields) => {
        fields.forEach(f => {
          const existing = userFieldsByLabel.get(f.label);
          if (existing) f.id = existing.id;
          if (f.subfields) remapFieldIds(f.subfields);
        });
      };
      remapFieldIds(fresh.fields);

      const nextTemplates = s.templates.map(t => t.id === tplId ? fresh : t);
      resolveTemplateRefs(nextTemplates);

      // Strip orphaned field values from entries of this template.
      // After the remap above, surviving labels keep their IDs; removed
      // (custom) fields will not be in the new ID set and their values get dropped.
      const newFieldIds = new Set();
      const collectIds = (fields) => {
        fields.forEach(f => {
          newFieldIds.add(f.id);
          if (f.subfields) collectIds(f.subfields);
        });
      };
      collectIds(fresh.fields);

      const nextEntries = s.entries.map(e => {
        if (e.templateId !== tplId) return e;
        const cleanFields = {};
        Object.entries(e.fields || {}).forEach(([fid, val]) => {
          if (newFieldIds.has(fid)) cleanFields[fid] = val;
        });
        return { ...e, fields: cleanFields, updatedAt: isoNow() };
      });

      return { ...s, templates: nextTemplates, entries: nextEntries };
    });
    flash("Template reset to default");
  };

  // ── Header content ───────────────────────────────────────────────────────────

  let headerTitle = "";
  let headerIcon = null;
  if (view === "list") {
    if (activeTagFilter) headerTitle = `# ${activeTagFilter}`;
    else if (activeTemplate) { headerTitle = activeTemplate.name; headerIcon = activeTemplate; }
  } else if ((view === "entry" || view === "entry-edit") && activeEntry) {
    headerTitle = activeEntry.name;
    const tmpl = state.templates.find(t => t.id === activeEntry.templateId);
    if (tmpl) headerIcon = tmpl;
  } else if (view === "entry-new" && activeTemplate) {
    headerTitle = `New ${activeTemplate.name}`;
    headerIcon = activeTemplate;
  } else if (view === "tpl-build") headerTitle = "New Template";
  else if (view === "tpl-edit" && activeTemplate) { headerTitle = `Edit: ${activeTemplate.name}`; headerIcon = activeTemplate; }
  else if (view === "settings") headerTitle = "Settings";
  else if (view === "graph") headerTitle = "Concordance";
  else if (view === "timeline") headerTitle = "Timeline; Vertical";
  else if (view === "chronometrics") headerTitle = "Timeline; Chronometric";
  else if (view === "family") headerTitle = "Linea";
  else if (view === "kalendarium") {
    if (activeCalendarId === "__primary__") {
      headerTitle = state.world.calendar?.name || "Primary Calendar";
    } else if (activeCalendarId) {
      const cal = (state.calendars || []).find(c => c.id === activeCalendarId);
      headerTitle = cal?.name || "Calendar";
    } else {
      headerTitle = "Kalendarium";
    }
  }
  else if (view === "stemma") {
    if (activeStemmaId) {
      const stem = (state.stemmas || []).find(s => s.id === activeStemmaId);
      headerTitle = stem?.name || "Stemma";
    } else {
      headerTitle = "Stemma";
    }
  }
  else if (view === "cartographia") {
    if (mapDraft) headerTitle = (mapDraft.name && mapDraft.name.trim()) ? mapDraft.name : "New Map";
    else if (activeMapId) {
      const rec = (state.cartographia || []).find(m => m.id === activeMapId);
      headerTitle = rec?.name || "Map";
    } else headerTitle = "Cartographia";
  }
  else if (view === "fabula") {
    if (activeStoryId && activeRecord) {
      const k = FABULA_KINDS.find(x => x.kind === activeRecord.kind);
      const rec = fabArr(state.fabula || {}, k.slice).find(r => r.id === activeRecord.id);
      headerTitle = recordDraft ? ((recordDraft.name && recordDraft.name.trim()) ? recordDraft.name : `New ${k.label}`) : (rec?.name || k.label);
    }
    else if (activeStoryId) {
      const rec = ((state.fabula && state.fabula.stories) || []).find(st => st.id === activeStoryId);
      headerTitle = storyDraft ? ((storyDraft.name && storyDraft.name.trim()) ? storyDraft.name : "Story") : (rec?.name || "Story");
    }
    else if (corpusDraft) headerTitle = (corpusDraft.name && corpusDraft.name.trim()) ? corpusDraft.name : "New Corpus";
    else if (activeCorpusId) {
      const rec = ((state.fabula && state.fabula.corpora) || []).find(c => c.id === activeCorpusId);
      headerTitle = rec?.name || "Corpus";
    } else headerTitle = "Fabula";
  }
  else if (view === "ephemeris") headerTitle = "Ephemeris";
  else if (view === "glossopoeia") headerTitle = "Glossopoeia";
  else if (view === "home") headerTitle = "Home";
  else if (view === "pack") {
    const pk = (state.packs || []).find(p => p.id === activePackId);
    headerTitle = pk?.name || "Pack";
  }
  else if (view === "project") headerTitle = state.world.name || "Project";

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="root">
      <Sidebar
        state={state}
        activeTemplateId={activeTemplateId}
        activeTagFilter={activeTagFilter}
        activeView={sidebarView}
        templateCounts={templateCounts}
        tagCounts={tagCounts}
        allTags={allTags}
        onSelectTemplate={selectTemplate}
        onSelectTag={selectTag}
        onSelectView={selectView}
        onOpenSettings={() => { setView("settings"); }}
        onNewTemplate={openNewTemplate}
        onImportTemplate={handleImportTemplateFile}
        packs={state.packs}
        activePackId={activePackId}
        onSelectPack={selectPack}
        onNewPack={createPack}
        onImportPack={handleImportPackFile}
        onClickWorldName={() => setView("settings")}
        onReorderTemplate={reorderTemplate}
        viewOrder={prefs.viewOrder}
        onReorderViews={(fromIdx, toIdx) => {
          setPrefs(p => {
            const next = [...p.viewOrder];
            const [moved] = next.splice(fromIdx, 1);
            next.splice(toIdx, 0, moved);
            return { ...p, viewOrder: next };
          });
        }}
        isLocked={isLocked}
        deletedBuiltinNames={deletedBuiltinNames}
        onOpenRestoreModal={() => setRestoreModalOpen(true)}
        templatesCollapsed={prefs.templatesCollapsed}
        onToggleTemplatesCollapsed={() => setPrefs(p => ({ ...p, templatesCollapsed: !p.templatesCollapsed }))}
        sidebarWidth={prefs.sidebarWidth}
        onResize={(w) => setPrefs(p => ({ ...p, sidebarWidth: w }))}
      />

      <main className="main">
        {backupReminderActive && (
          <div className="backup-banner" role="alert">
            <div className="backup-banner-text">
              <strong>Time to back up.</strong>
              <span className="backup-banner-detail">
                {backupReminderHours >= 1
                  ? `It's been about ${backupReminderHours} hour${backupReminderHours === 1 ? "" : "s"} since your last JSON export, and you have unsaved changes.`
                  : "You have unsaved changes since your last JSON export."}
              </span>
            </div>
            <div className="backup-banner-actions">
              <button className="btn btn-accent btn-small" onClick={exportWorld}>Export now</button>
              <button className="btn btn-ghost btn-small" onClick={() => setBackupSnoozedUntil(new Date(Date.now() + 3600000).toISOString())} title="Hide this reminder for one hour">Snooze 1h</button>
            </div>
          </div>
        )}
        {view !== "home" && view !== "project" && (
          <header className="hdr">
            <h1 className="page-title">
              {headerIcon && <span className="title-icon" style={{ color: headerIcon.color }}>{headerIcon.icon}</span>}
              {headerTitle}
            </h1>
            <div className="hdr-actions">
              {/* Show secrets toggle (everywhere except settings) */}
              {view !== "settings" && (
                <button className={`btn-icon-toggle ${showSecrets ? "active" : ""}`}
                  onClick={() => setShowSecrets(!showSecrets)}
                  title={showSecrets ? "Hide secret fields" : "Show secret fields"}>
                  {showSecrets ? "◉" : "◎"}
                </button>
              )}

              {view === "list" && <>
                {activeTemplate && (
                  <div className="export-menu-wrap">
                    <button
                      className="btn btn-ghost"
                      onClick={() => setExportMenuOpen(o => !o)}
                      title="Export this template as a portable file"
                    >
                      Export ↓
                    </button>
                    {exportMenuOpen && <>
                      <div className="menu-backdrop" onClick={() => setExportMenuOpen(false)} />
                      <div className="export-menu">
                        <button onClick={() => { exportTemplateJson(activeTemplate); setExportMenuOpen(false); }}>
                          Export as .template.json
                        </button>
                        <button onClick={() => { exportTemplateMarkdown(activeTemplate); setExportMenuOpen(false); }}>
                          Export as .template.md
                        </button>
                      </div>
                    </>}
                  </div>
                )}
                {activeTemplate && !isLocked && <button className="btn btn-ghost" onClick={openEditTemplate}>Edit Template</button>}
                {activeTemplate && !isLocked && <button className="btn btn-accent" onClick={() => openNewEntry()}>+ New Entry</button>}
              </>}
              {view === "entry" && <>
                {!isLocked && <button className="btn btn-danger" onClick={deleteEntry}>Delete</button>}
                {!isLocked && <button className="btn btn-ghost" onClick={openEditEntry}>Edit</button>}
                <button className="btn btn-ghost" onClick={navigateBackFromEntry}>← Back</button>
              </>}
              {(view === "entry-edit" || view === "entry-new") && <>
                <button className="btn btn-ghost" onClick={() => {
                  if (!confirmDiscardDraft()) return;
                  clearDraftAndStorage();
                  setView(activeEntryId ? "entry" : "list");
                }}>Cancel</button>
                <button className="btn btn-accent" onClick={saveEntry} disabled={!entryDraft?.name?.trim()}>Save</button>
              </>}
              {view === "cartographia" && mapDraft && <>
                <button className="btn btn-ghost" onClick={cancelMapEdit}>Cancel</button>
                <button className="btn btn-accent" onClick={saveMap} disabled={!mapDraft?.name?.trim()}>Save</button>
              </>}
              {view === "cartographia" && activeMapId && !mapDraft && <>
                {!isLocked && <button className="btn btn-danger" onClick={() => {
                  const rec = (state.cartographia || []).find(m => m.id === activeMapId);
                  if (rec && confirm(mapDeleteMessage(rec, state))) deleteMap(activeMapId);
                }}>Delete</button>}
                {!isLocked && <button className="btn btn-ghost" onClick={editMap}>Edit</button>}
                <button className="btn btn-ghost" onClick={closeMapToIndex}>← Back</button>
              </>}
              {view === "fabula" && activeRecord && recordDraft && <>
                <button className="btn btn-ghost" onClick={cancelFabulaRecordEdit}>Cancel</button>
                <button className="btn btn-accent" onClick={saveFabulaRecord} disabled={!recordDraft?.name?.trim()}>Save</button>
              </>}
              {view === "fabula" && activeRecord && !recordDraft && <>
                {!isLocked && <button className="btn btn-danger" onClick={deleteFabulaRecord}>Delete</button>}
                {!isLocked && <button className="btn btn-ghost" onClick={editFabulaRecord}>Edit</button>}
                <button className="btn btn-ghost" onClick={closeFabulaRecord}>← Back</button>
              </>}
              {view === "fabula" && activeStoryId && !activeRecord && storyDraft && <>
                <button className="btn btn-ghost" onClick={cancelStoryEdit}>Cancel</button>
                <button className="btn btn-accent" onClick={saveStory} disabled={!storyDraft?.name?.trim()}>Save</button>
              </>}
              {view === "fabula" && activeStoryId && !activeRecord && !storyDraft && <>
                {!isLocked && <button className="btn btn-danger" onClick={deleteOpenStory}>Delete</button>}
                {!isLocked && storyTab === "story" && <button className="btn btn-ghost" onClick={editStory}>Edit</button>}
                <button className="btn btn-ghost" onClick={closeStory}>← Back</button>
              </>}
              {view === "fabula" && corpusDraft && <>
                <button className="btn btn-ghost" onClick={cancelCorpusEdit}>Cancel</button>
                <button className="btn btn-accent" onClick={saveCorpus} disabled={!corpusDraft?.name?.trim()}>Save</button>
              </>}
              {view === "fabula" && activeCorpusId && !corpusDraft && !activeStoryId && <>
                {!isLocked && <button className="btn btn-danger" onClick={() => {
                  const rec = ((state.fabula && state.fabula.corpora) || []).find(c => c.id === activeCorpusId);
                  if (rec && confirm(fabulaCorpusDeleteMessage(rec))) deleteCorpus(activeCorpusId);
                }}>Delete</button>}
                {!isLocked && <button className="btn btn-ghost" onClick={editCorpus}>Edit</button>}
                <button className="btn btn-ghost" onClick={closeCorpusToIndex}>← Back</button>
              </>}
              {(view === "tpl-build" || view === "tpl-edit") && <>
                {view === "tpl-edit" && tplDraft && tplDraft.origin === TEMPLATE_ORIGIN.BUILTIN && (
                  <button className="btn btn-ghost" onClick={() => setResetTplId(tplDraft.id)} title="Restore this template's factory fields, name, icon, and color">Reset to Default</button>
                )}
                {view === "tpl-edit" && <button className="btn btn-danger" onClick={deleteTemplate}>Delete Template</button>}
                <button className="btn btn-ghost" onClick={() => {
                  if (!confirmDiscardDraft()) return;
                  clearDraftAndStorage();
                  setView(activeTemplateId ? "list" : "home");
                }}>Cancel</button>
                <button className="btn btn-accent" onClick={saveTemplate} disabled={!tplDraft?.name?.trim()}>Save Template</button>
              </>}
              {view === "settings" && <button className="btn btn-ghost" onClick={() => setView("home")}>Done</button>}
            </div>
          </header>
        )}

        <div className="body">
          
          {view === "family" && <FamilyView state={state} onOpenEntry={openEntryFromAnywhere} onExportFamilyTree={exportFamilyTreeMarkdown} onUpdateViewPrefs={updateViewPrefs} />}
          {view === "kalendarium" && !activeCalendarId && (
            <KalendariumIndexView
              state={state}
              isLocked={isLocked}
              referenceCalendarId={referenceCalendarId}
              onOpenCalendar={(id) => setActiveCalendarId(id)}
              onCreateCalendar={createCalendar}
              onDeleteCalendar={deleteCalendar}
              onPinReference={(id) => setReferenceCalendarId(id)}
              onExportCalendar={exportCalendarJson}
              onImportCalendar={handleImportCalendarFile}
              onOpenEntry={openEntryFromAnywhere}
              onUpdateViewPrefs={updateViewPrefs}
              onRequestDeletionModal={(cal, count) => {
                // Default target picker to primary (null = primary).
                // The user picks a different target via the modal's dropdown.
                const affectedEntryIds = state.entries.filter(e => e.calendarId === cal.id).map(e => e.id);
                setCalendarDeletionPending({
                  calendar: cal,
                  affectedEntryIds,
                  targetId: null,  // null = primary
                });
              }}
              onSetCurrentMoment={(date) => {
                // Story-time anchor for auto-age. null clears; an {year, monthIndex,
                // day} object sets. Stored in primary's frame so calendar-position
                // invariance applies under primary structural edits. Persists to
                // world JSON via state.world.currentMoment.
                updateState(s => ({
                  ...s,
                  world: {
                    ...s.world,
                    currentMoment: date == null ? null : {
                      year: date.year,
                      monthIndex: date.monthIndex ?? 0,
                      day: date.day ?? 1,
                    },
                  },
                }));
              }}
            />
          )}
          {view === "kalendarium" && activeCalendarId && (() => {
            const isPrimary = activeCalendarId === "__primary__";
            const cal = isPrimary
              ? state.world.calendar
              : (state.calendars || []).find(c => c.id === activeCalendarId);
            if (!cal) {
              // Calendar not found (deleted? bad state) — bounce to index
              return (
                <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-dim)" }}>
                  This calendar no longer exists.
                  <div style={{ marginTop: 16 }}>
                    <button className="btn btn-ghost" onClick={() => setActiveCalendarId(null)}>← Back to Kalendarium</button>
                  </div>
                </div>
              );
            }
            return (
              <KalendariumEditorView
                calendar={cal}
                primaryCalendar={state.world.calendar}
                isPrimary={isPrimary}
                isLocked={isLocked}
                entries={state.entries}
                templates={state.templates}
                currentMoment={isPrimary ? state.world.currentMoment : null}
                moonBodies={(state.celestialBodies || []).filter(b => b && b.kind === "moon")}
                onCreateMoon={() => {
                  // Quick-create a world moon body from the calendar editor.
                  // Unguarded (no parent required): a new moon starts parentless
                  // in cycle-only mode with a seeded synodic cycle so it renders
                  // a glyph immediately. The user can add orbital geometry later
                  // in the Astronomical Body workspace. Returns the new id so the
                  // picker can select it into this calendar.
                  const newId = `cel-${genId()}`;
                  updateState(s => ({
                    ...s,
                    celestialBodies: [
                      ...(s.celestialBodies || []),
                      makeNewCelestialBody(newId, { name: "New Moon", kind: "moon", synodicCycleDays: 28, phaseAnchorDay: 0 }),
                    ],
                  }));
                  return newId;
                }}
                onBack={() => setActiveCalendarId(null)}
                onChange={(updatedCal) => {
                  // Route both primary and additional through updateCalendarStructured
                  // so structural edits (month add/remove/reorder/day-count change)
                  // trigger atomic absoluteDay conversion of bound entries.
                  // Rename-only edits ride through as a no-op convert (no count
                  // matched, no flash fires).
                  const oldCal = isPrimary ? state.world.calendar : cal;
                  updateCalendarStructured(isPrimary ? null : activeCalendarId, oldCal, updatedCal);
                  // Hybrid behavior: literal-edit auto-sets the reference. Pin button is separate path.
                  setReferenceCalendarId(isPrimary ? null : activeCalendarId);
                }}
              />
            );
          })()}
          {view === "graph" && <GraphView state={state} onOpenEntry={openEntryFromAnywhere} showSecrets={showSecrets} onSavePositions={saveConcordancePositions} zoomTransformRef={concordanceZoomRef} />}
          {view === "timeline" && <TimelineView state={state} onOpenEntry={openEntryFromAnywhere} showSecrets={showSecrets} onUpdateViewPrefs={updateViewPrefs} />}
          {view === "chronometrics" && <ChronometricsView state={state} onOpenEntry={openEntryFromAnywhere} showSecrets={showSecrets} onUpdateEntryDate={updateEntryDate} isLocked={isLocked} disabledTemplates={chronoDisabledTemplates} setDisabledTemplates={setChronoDisabledTemplates} onUpdateViewPrefs={updateViewPrefs} />}
          {view === "stemma" && !activeStemmaId && (
            <StemmaIndexView
              state={state}
              isLocked={isLocked}
              onOpen={openStemma}
              onCreate={createStemma}
              onImport={handleImportStemmaFile}
              onExport={exportStemmaJson}
              onDelete={deleteStemma}
            />
          )}
          {view === "stemma" && activeStemmaId && (() => {
            const stem = (state.stemmas || []).find(s => s.id === activeStemmaId);
            if (!stem) {
              // Stemma not found (deleted? bad state) — bounce to index
              return (
                <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-dim)" }}>
                  This stemma no longer exists.
                  <div style={{ marginTop: 16 }}>
                    <button className="btn btn-ghost" onClick={closeStemmaToIndex}>← Back to Stemmas</button>
                  </div>
                </div>
              );
            }
            // v1.5 r078: merge celestial bodies into the entry pool the Stemma
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
                stemma={stem}
                focalNodeId={focalNodeId}
                entries={stemmaEntriesWithBodies}
                templates={state.templates}
                isLocked={isLocked}
                flash={flash}
                onFocalChange={setFocalNodeId}
                onBackToIndex={closeStemmaToIndex}
                onAddChild={(slot, payload) => addStemmaChild(stem.id, focalNodeId, slot, payload)}
                onUpdateNode={(nodeId, patch) => updateStemmaNode(stem.id, nodeId, patch)}
                onDeleteNode={(nodeId) => deleteStemmaNode(stem.id, nodeId)}
                onConvertToLinked={(nodeId, entryId, name) => convertStemmaNodeToLinked(stem.id, nodeId, entryId, name)}
                onConvertToFreeform={(nodeId) => convertStemmaNodeToFreeform(stem.id, nodeId)}
                onRelink={(nodeId, entryId, name) => relinkStemmaNode(stem.id, nodeId, entryId, name)}
                onRename={(newName) => renameStemma(stem.id, newName)}
                onOpenEntry={openEntryFromAnywhere}
                onExport={() => exportStemmaJson(stem)}
              />
            );
          })()}
          {view === "cartographia" && !activeMapId && !mapDraft && (
            <CartographiaIndexView
              state={state}
              isLocked={isLocked}
              onOpen={openMap}
              onCreate={createMap}
              onDelete={deleteMap}
              onStampsChange={(next) => updateState(s => ({ ...s, mapStamps: next }))}
              flash={flash}
            />
          )}
          {view === "cartographia" && mapDraft && (
            <EntryForm
              draft={mapDraft}
              template={cartographiaMapSchema()}
              entries={state.entries}
              templates={state.templates}
              bodies={state.celestialBodies}
              registeredNodes={getRegisteredGraphNodes(state)}
              onChange={setMapDraft}
              showSecrets={showSecrets}
              imageFolder={state.world.imageFolder}
              allTags={allTags}
              dirHandle={dirHandle}
              calendar={getCalendar(state, null)}
              primaryCalendar={state.world.calendar}
              additionalCalendars={[]}
              selfEntryId={mapDraft.id}
              flash={flash}
              canvasSlot={
                <MapEditor
                  mapData={mapDraft.mapData || { image: null, pins: [] }}
                  onChange={(md) => setMapDraft(d => ({ ...d, mapData: md }))}
                  recordId={mapDraft.id}
                  dirHandle={dirHandle}
                  imageFolder={state.world.imageFolder}
                  entries={state.entries}
                  bodies={state.celestialBodies}
                  flash={flash}
                  stamps={state.mapStamps}
                  onStampsChange={(next) => updateState(s => ({ ...s, mapStamps: next }))}
                  stripLayout={prefs.mapStrip}
                  onStripLayout={(v) => setPrefs(p => ({ ...p, mapStrip: v }))}
                  api={mapEditorApiRef}
                />
              }
            />
          )}
          {view === "cartographia" && activeMapId && !mapDraft && (() => {
            const rec = (state.cartographia || []).find(m => m.id === activeMapId);
            if (!rec) {
              return (
                <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-dim)" }}>
                  This map no longer exists.
                  <div style={{ marginTop: 16 }}>
                    <button className="btn btn-ghost" onClick={closeMapToIndex}>← Back to Cartographia</button>
                  </div>
                </div>
              );
            }
            return (
              <EntryView
                entry={rec}
                template={cartographiaMapSchema()}
                templates={state.templates}
                entries={state.entries}
                onOpenEntry={openEntryFromAnywhere}
                onSelectTag={selectTag}
                showSecrets={showSecrets}
                imageFolder={state.world.imageFolder}
                dirHandle={dirHandle}
                calendar={getCalendar(state, null)}
                state={state}
                onUpdateViewPrefs={updateViewPrefs}
                canvasSlot={
                  <MapView
                    entry={rec}
                    dirHandle={dirHandle}
                    imageFolder={state.world.imageFolder}
                    entries={state.entries}
                    templates={state.templates}
                    calendar={getCalendar(state, null)}
                    onOpenEntry={openEntryFromAnywhere}
                    state={state}
                    onUpdateViewPrefs={updateViewPrefs}
                  />
                }
              />
            );
          })()}
          {view === "ephemeris" && (
            <EphemerisView state={state} updateState={updateState} isLocked={isLocked} onOpenEntry={openEntryFromAnywhere} onPromoteEvent={promoteComputedEventToEntry} />
          )}
          {view === "fabula" && !activeCorpusId && !corpusDraft && !activeStoryId && (
            <FabulaIndexView
              state={state}
              isLocked={isLocked}
              onOpenCorpus={openCorpus}
              onCreateCorpus={createCorpus}
              onCreateStory={createStory}
              onRenameStory={renameStory}
              onDeleteStory={deleteStory}
              onSetStoryCorpus={setStoryCorpus}
              onOpenStory={openStory}
              sections={{
                focus: fabulaFocus,
                onFocused: () => setFabulaFocus(null),
                onOpenEntry: openEntryFromAnywhere,
                onNewEntry: newFabulaEntry,
                onEditTemplate: editFabulaTemplate,
                onExportTemplate: (tpl, fmt) => (fmt === "md" ? exportTemplateMarkdown(tpl) : exportTemplateJson(tpl)),
                onRestoreTemplate: (name) => restoreBuiltinTemplates([name]),
              }}
            />
          )}
          {view === "fabula" && corpusDraft && (
            <EntryForm
              draft={corpusDraft}
              template={fabulaTemplate(state, "corpus")}
              entries={state.entries}
              templates={state.templates}
              bodies={state.celestialBodies}
              registeredNodes={getRegisteredGraphNodes(state)}
              onChange={setCorpusDraft}
              showSecrets={showSecrets}
              imageFolder={state.world.imageFolder}
              allTags={allTags}
              dirHandle={dirHandle}
              calendar={getCalendar(state, null)}
              primaryCalendar={state.world.calendar}
              additionalCalendars={[]}
              selfEntryId={corpusDraft.id}
              flash={flash}
              hideTags
            />
          )}
          {view === "fabula" && activeCorpusId && !corpusDraft && !activeStoryId && (() => {
            const rec = ((state.fabula && state.fabula.corpora) || []).find(c => c.id === activeCorpusId);
            if (!rec) {
              return (
                <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-dim)" }}>
                  This corpus no longer exists.
                  <div style={{ marginTop: 16 }}>
                    <button className="btn btn-ghost" onClick={closeCorpusToIndex}>← Back to Fabula</button>
                  </div>
                </div>
              );
            }
            return (
              <EntryView
                entry={rec}
                template={fabulaTemplate(state, "corpus")}
                templates={state.templates}
                entries={state.entries}
                onOpenEntry={openEntryFromAnywhere}
                onSelectTag={selectTag}
                showSecrets={showSecrets}
                imageFolder={state.world.imageFolder}
                dirHandle={dirHandle}
                calendar={getCalendar(state, null)}
                state={state}
                onUpdateViewPrefs={updateViewPrefs}
                canvasSlot={
                  <FabulaReadingOrder
                    state={state}
                    corpus={rec}
                    isLocked={isLocked}
                    onMoveStory={moveCorpusStory}
                    onCreateStory={createStory}
                    onRenameStory={renameStory}
                    onOpenStory={openStory}
                  />
                }
              />
            );
          })()}
          {view === "fabula" && activeStoryId && activeRecord && (() => {
            const k = FABULA_KINDS.find(x => x.kind === activeRecord.kind);
            const rec = fabArr(state.fabula || {}, k.slice).find(r => r.id === activeRecord.id) || (recordDraft && recordDraft.id === activeRecord.id ? recordDraft : null);
            if (!rec) {
              return (
                <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-dim)" }}>
                  This {FABULA_NOUNS[activeRecord.kind].one} no longer exists.
                  <div style={{ marginTop: 16 }}>
                    <button className="btn btn-ghost" onClick={closeFabulaRecord}>← Back</button>
                  </div>
                </div>
              );
            }
            return (
              <FabulaRecordPage
                state={state}
                kind={activeRecord.kind}
                record={rec}
                draft={recordDraft}
                onDraftChange={setRecordDraft}
                storyId={activeStoryId}
                isLocked={isLocked}
                onRestoreTemplate={(name) => restoreBuiltinTemplates([name])}
                showSecrets={showSecrets}
                allTags={allTags}
                dirHandle={dirHandle}
                flash={flash}
                onOpenEntry={openEntryFromAnywhere}
                onSelectTag={selectTag}
                onUpdateViewPrefs={updateViewPrefs}
              />
            );
          })()}
          {view === "fabula" && activeStoryId && !activeRecord && (() => {
            const rec = ((state.fabula && state.fabula.stories) || []).find(st => st.id === activeStoryId);
            if (!rec) {
              return (
                <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-dim)" }}>
                  This story no longer exists.
                  <div style={{ marginTop: 16 }}>
                    <button className="btn btn-ghost" onClick={closeStory}>← Back</button>
                  </div>
                </div>
              );
            }
            return (
              <FabulaStoryPage
                state={state}
                story={rec}
                draft={storyDraft}
                onDraftChange={setStoryDraft}
                tab={storyTab}
                onSelectTab={selectStoryTab}
                onOpenRecord={openFabulaRecord}
                onNewRecord={newFabulaRecord}
                isLocked={isLocked}
                folds={prefs.fabulaFolds}
                onToggleFold={toggleFabulaFold}
                outlineFolds={prefs.fabulaOutlineFolds}
                onToggleOutlineFold={toggleOutlineFold}
                onUpdateFabula={(fn) => { if (!isLocked) updateFabula(fn); }}
                onCreateThread={(name) => { if (!isLocked) updateState(s => fabulaWithNewThread(s, rec.id, name)); }}
                onCreateTheme={(name) => { if (!isLocked) updateState(s => fabulaWithNewTheme(s, rec.id, name)); }}
                onRestoreTemplate={(name) => restoreBuiltinTemplates([name])}
                showSecrets={showSecrets}
                allTags={allTags}
                dirHandle={dirHandle}
                flash={flash}
                onOpenEntry={openEntryFromAnywhere}
                onSelectTag={selectTag}
                onUpdateViewPrefs={updateViewPrefs}
              />
            );
          })()}
          {view === "glossopoeia" && (
            <GlossopoeiaView state={state} updateState={updateState} isLocked={isLocked} onOpenEntry={openEntryFromAnywhere} flash={flash} />
          )}
          {view === "home" && <HomeView state={state} onOpenEntry={openEntryFromAnywhere} dirHandle={dirHandle} />}
          {view === "pack" && (() => {
            const pack = (state.packs || []).find(p => p.id === activePackId);
            if (!pack) return <div style={{ color: "var(--text-dim)", fontStyle: "italic", padding: 16 }}>This pack no longer exists.</div>;
            return (
              <PackDetailView
                pack={pack}
                templates={state.templates}
                isLocked={isLocked}
                onRename={(name) => renamePack(pack.id, name)}
                onSetDescription={(desc) => setPackDescription(pack.id, desc)}
                onDelete={() => deletePack(pack.id)}
                onSelectTemplate={(tid) => { setActiveTemplateId(tid); setView("list"); }}
                onAddTemplate={(tid) => addTemplateToPack(pack.id, tid)}
                onRemoveTemplate={(tid) => removeTemplateFromPack(pack.id, tid)}
                onExport={() => exportPack(pack)}
              />
            );
          })()}
          {view === "project" && <ProjectView state={state} onOpenEntry={openEntryFromAnywhere} dirHandle={dirHandle} onSelectTemplate={(tid) => { setActiveTemplateId(tid); setView("list"); }} onChangeView={setView} onOpenHtmlExportModal={() => setShowHtmlExportModal(true)} />}
          {view === "list" && (
            <EntryList
              entries={filteredEntries}
              templates={state.templates}
              search={search}
              onSearch={setSearch}
              sortBy={sortBy}
              onSort={setSortBy}
              onSelect={openEntry}
              showTemplate={!!activeTagFilter}
              variantAxis={variantAxisInfo}
              onSetVariant={(v) => updateWorldMeta({ variantAxis: { ...state.world.variantAxis, active: v } })}
            />
          )}
          {view === "entry" && activeEntry && (
            <EntryView
              entry={activeEntry}
              template={state.templates.find(t => t.id === activeEntry.templateId)}
              templates={state.templates}
              entries={state.entries}
              onOpenEntry={openEntryFromAnywhere}
              onSelectTag={selectTag}
              showSecrets={showSecrets}
              imageFolder={state.world.imageFolder}
              dirHandle={dirHandle}
              calendar={getCalendar(state, activeEntry.calendarId)}
              onExportEntry={exportEntryMarkdown}
              state={state}
              onUpdateViewPrefs={updateViewPrefs}
              footSlot={pageTemplate && pageTemplate.fabulaRole ? <FabulaEntryStories state={state} entry={activeEntry} role={pageTemplate.fabulaRole} onOpenEntry={openEntryFromAnywhere} onOpenStory={openStoryFromEntry} /> : undefined}
            />
          )}
          {(view === "entry-edit" || view === "entry-new") && entryDraft && (() => {
            // Editor template resolution:
            // - For entry-edit: always trust the active entry's templateId. The
            //   sidebar's activeTemplateId can be wrong (e.g. user clicked a
            //   pin on a map, which set activeEntryId to a Faction but left
            //   activeTemplateId pointing at the Map template — rendering the
            //   editor with Map fields on a Faction draft means the Faction's
            //   fields go invisible).
            // - For entry-new: use activeTemplate (the sidebar selection IS
            //   the source of truth for new entries).
            let editorTpl = null;
            if (view === "entry-new") {
              editorTpl = activeTemplate;
            } else {
              editorTpl = (activeEntry ? state.templates.find(t => t.id === activeEntry.templateId) : null)
                || (entryDraft.templateId ? state.templates.find(t => t.id === entryDraft.templateId) : null)
                || activeTemplate;
            }
            if (!editorTpl) return null;
            return (
              <EntryForm
                draft={entryDraft}
                template={editorTpl}
                entries={state.entries}
                templates={state.templates}
                bodies={state.celestialBodies}
                registeredNodes={getRegisteredGraphNodes(state)}
                onChange={setEntryDraft}
                showSecrets={showSecrets}
                imageFolder={state.world.imageFolder}
                allTags={allTags}
                dirHandle={dirHandle}
                calendar={getCalendar(state, entryDraft.calendarId)}
                primaryCalendar={state.world.calendar}
                additionalCalendars={state.calendars}
                selfEntryId={activeEntryId}
                flash={flash}
                footSlot={view === "entry-edit" && activeEntry && editorTpl.fabulaRole ? <FabulaEntryStories state={state} entry={activeEntry} role={editorTpl.fabulaRole} editing onOpenEntry={openEntryFromAnywhere} onOpenStory={openStoryFromEntry} /> : undefined}
              />
            );
          })()}
          {(view === "tpl-build" || view === "tpl-edit") && tplDraft && (
            <TemplateBuilder
              draft={tplDraft}
              templates={state.templates}
              onChange={setTplDraft}
              flash={flash}
              entries={state.entries}
              calendar={state.world.calendar}
              imageFolder={state.world.imageFolder}
              dirHandle={dirHandle}
              allTags={allTags}
              packs={state.packs}
            />
          )}
          {view === "settings" && (
            <SettingsView
              world={state.world}
              entries={state.entries}
              templates={state.templates}
              onUpdateMeta={updateWorldMeta}
              onExport={exportWorld}
              onExportMarkdown={exportMarkdown}
              onExportMarkdownZip={exportMarkdownZip}
              onImport={importWorld}
              onNewWorld={newWorld}
              dirHandle={dirHandle}
              fsaaSupported={FSAA_SUPPORTED}
              onSetupFolder={setupImageFolder}
              onDisconnectFolder={disconnectImageFolder}
              prefs={prefs}
              onUpdatePrefs={(patch) => setPrefs(p => ({ ...p, ...patch }))}
              isLocked={isLocked}
              onNavigateToKalendarium={() => { setActiveCalendarId(null); setView("kalendarium"); }}
              onCreateManualSnapshot={createManualSnapshot}
              onRestoreSnapshot={restoreSnapshot}
              onExportSnapshot={exportSnapshot}
              onDeleteSnapshot={removeSnapshot}
            />
          )}
        </div>
      </main>

      {notice && <div className={`notice ${notice.type}`} onClick={() => setNotice(null)} title="Click to dismiss">{notice.text}</div>}

      {showHtmlExportModal && (
        <HtmlExportModal
          state={state}
          onCancel={() => setShowHtmlExportModal(false)}
          onConfirm={(options) => {
            setShowHtmlExportModal(false);
            exportHtml(options);
          }}
        />
      )}

      {resetTplId && (
        <ResetTemplateModal
          analysis={analyzeReset(resetTplId)}
          onCancel={() => setResetTplId(null)}
          onConfirm={() => {
            const tplId = resetTplId;
            const wasEditingThis = tplDraft && tplDraft.id === tplId;
            setResetTplId(null);
            resetTemplate(tplId);
            // If the user was editing this template, bounce back to the list view;
            // they can re-enter the editor to see the freshly reset state.
            if (wasEditingThis) {
              clearDraftAndStorage();
              setView(activeTemplateId === tplId ? "list" : "home");
            }
          }}
        />
      )}

      {restoreModalOpen && (
        <RestoreBuiltinsModal
          deletedNames={deletedBuiltinNames}
          onCancel={() => setRestoreModalOpen(false)}
          onConfirm={(names) => {
            setRestoreModalOpen(false);
            restoreBuiltinTemplates(names);
          }}
        />
      )}

      {fabulaHoldsAsk && (() => {
        const rec = fabulaRecordOf(fabulaHoldsAsk.kind, fabulaHoldsAsk.id);
        if (!rec) return null;
        return (
          <FabulaHoldsDeleteModal
            state={state}
            kind={fabulaHoldsAsk.kind}
            record={rec}
            onMoveUp={() => finishFabulaDelete(fabulaHoldsAsk.kind, rec, true)}
            onDeleteAll={() => finishFabulaDelete(fabulaHoldsAsk.kind, rec, false)}
            onCancel={() => setFabulaHoldsAsk(null)}
          />
        );
      })()}

      {destructiveOp && (
        <DestructiveOpModal
          key={destructiveOp.type}
          op={destructiveOp}
          onCancel={() => setDestructiveOp(null)}
          onExportFirst={exportWorld}
          onConfirm={() => {
            const op = destructiveOp;
            // Don't clear destructiveOp here — executeReset/executeImport
            // do that themselves once their async work completes. This keeps
            // the modal visible during the wipe-and-snapshot work so a slow
            // op doesn't flash a stale UI underneath.
            if (op.type === "reset") {
              executeReset();
            } else if (op.type === "import") {
              executeImport(op.migrated);
            }
          }}
        />
      )}

      {packReconcile && (
        <div className="modal-backdrop" onClick={() => { setPackReconcile(null); flash("Re-import cancelled."); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">Re-import pack: "{packReconcile.packName}"</div>
            <div className="modal-body">
              <p>
                This pack is already in your world.
                {packReconcile.toAdd.length > 0 ? ` ${packReconcile.toAdd.length} new template${packReconcile.toAdd.length === 1 ? "" : "s"} will be added.` : ""}
                {" "}{packReconcile.conflicts.length} template{packReconcile.conflicts.length === 1 ? "" : "s"} differ from the file — choose what to do with each:
              </p>
              <div className="pack-reconcile-list">
                {packReconcile.conflicts.map(c => (
                  <div key={c.worldId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "6px 0", borderBottom: "1px solid var(--border2)" }}>
                    <span className="nav-name" style={{ flex: 1 }}>{c.name}</span>
                    <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input
                        type="radio"
                        name={`rec-${c.worldId}`}
                        checked={packReconcile.actions[c.worldId] === "replace"}
                        onChange={() => setPackReconcile(pr => ({ ...pr, actions: { ...pr.actions, [c.worldId]: "replace" } }))}
                      />
                      <span>Replace from file</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input
                        type="radio"
                        name={`rec-${c.worldId}`}
                        checked={packReconcile.actions[c.worldId] === "keep"}
                        onChange={() => setPackReconcile(pr => ({ ...pr, actions: { ...pr.actions, [c.worldId]: "keep" } }))}
                      />
                      <span>Keep mine</span>
                    </label>
                  </div>
                ))}
              </div>
              <div className="modal-notice" style={{ marginTop: 10 }}>
                Replace overwrites the template's structure; entries keep their data (the templateId is preserved), and fields that no longer match are left in place but hidden. Keep mine leaves your version untouched.
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => { setPackReconcile(null); flash("Re-import cancelled."); }}>Cancel</button>
              <button className="btn btn-accent" onClick={confirmPackReconcile}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {importCollision && (
        <div className="modal-backdrop" onClick={() => setImportCollision(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">Template name collision</div>
            <div className="modal-body">
              <p>A template named <strong>"{importCollision.imported.name}"</strong> already exists in this world. Choose what to do with the import:</p>
              {importCollision.missingRefs.length > 0 && (
                <div className="modal-notice modal-notice-warning">
                  Heads up — the imported template references templates that don't exist in this world: <strong>{importCollision.missingRefs.join(", ")}</strong>. Those references will import as-is and won't resolve until you add matching templates.
                </div>
              )}
              <div className="collision-options">
                <label>
                  <input
                    type="radio"
                    name="col"
                    checked={collisionAction === "skip"}
                    onChange={() => setCollisionAction("skip")}
                  />
                  <span>
                    <strong>Skip</strong> — keep the existing template, don't import anything.
                  </span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="col"
                    checked={collisionAction === "replace"}
                    onChange={() => setCollisionAction("replace")}
                  />
                  <span>
                    <strong>Replace</strong> — overwrite the existing template's structure with the imported one. Entries are kept (their templateId is preserved), but field structure changes per the import. Field data on entries that doesn't match the new schema is left in place but invisible.
                    {collisionAction === "replace" &&
                     (importCollision.imported.kind || "standard") !== (importCollision.existing.kind || "standard") && (
                      <div className="cross-kind-warn" onClick={e => e.stopPropagation()}>
                        <strong>⚠ Cross-kind Replace.</strong> The imported template has <code>kind: "{importCollision.imported.kind || "standard"}"</code>, but the existing "{importCollision.existing.name}" has <code>kind: "{importCollision.existing.kind || "standard"}"</code>. This Replace will swap the kind. Existing entries against "{importCollision.existing.name}" will probably break in visible ways — they may render as the wrong type (blank maps, missing canvases), and kind-specific behavior (relationships, family tree, map editing) will stop working.
                        <label className="cross-kind-ack" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={crossKindAck}
                            onChange={(e) => { e.stopPropagation(); setCrossKindAck(e.target.checked); }}
                          />
                          <span>I understand this will probably wreck existing entries and want to proceed anyway.</span>
                        </label>
                      </div>
                    )}
                  </span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="col"
                    checked={collisionAction === "rename"}
                    onChange={() => setCollisionAction("rename")}
                  />
                  <span>
                    <strong>Import as a new template named:</strong>
                    <input
                      type="text"
                      className="input"
                      value={collisionRename}
                      onChange={(e) => setCollisionRename(e.target.value)}
                      onFocus={() => setCollisionAction("rename")}
                      placeholder="New name"
                    />
                  </span>
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setImportCollision(null)}>Cancel</button>
              <button
                className="btn btn-accent"
                disabled={
                  collisionAction === "replace" &&
                  (importCollision.imported.kind || "standard") !== (importCollision.existing.kind || "standard") &&
                  !crossKindAck
                }
                onClick={() => {
                  if (collisionConfirmInFlight.current) return;
                  collisionConfirmInFlight.current = true;
                  // On success paths the guard stays true — the modal closes,
                  // and the next staged collision resets the ref. On error
                  // paths, reset it so the user can correct + retry.
                  const unlock = () => { collisionConfirmInFlight.current = false; };
                  if (collisionAction === "skip") {
                    flash("Import skipped.");
                    setImportCollision(null);
                    return;
                  }
                  if (collisionAction === "replace") {
                    const importedKind = importCollision.imported.kind || "standard";
                    const existingKind = importCollision.existing.kind || "standard";
                    if (importedKind !== existingKind && !crossKindAck) {
                      flash("Tick the cross-kind acknowledgement to proceed.", "error");
                      unlock();
                      return;
                    }
                    if (tplDraft && tplDraft.id === importCollision.existing.id) {
                      flash("You have unsaved edits open for this template. Save or discard them before replacing.", "error");
                      unlock();
                      return;
                    }
                    insertImportedTemplate(importCollision.imported, "replace", importCollision.existing.id);
                    flash(`Replaced template "${importCollision.imported.name}".`);
                    setImportCollision(null);
                    return;
                  }
                  // rename
                  const newName = collisionRename.trim();
                  if (!newName) {
                    flash("Enter a new name to import as.", "error");
                    unlock();
                    return;
                  }
                  if (state.templates.some(t => t.name.toLowerCase() === newName.toLowerCase())) {
                    flash(`A template named "${newName}" already exists. Pick a different name.`, "error");
                    unlock();
                    return;
                  }
                  insertImportedTemplate(importCollision.imported, "new", null, newName);
                  const missing = importCollision.missingRefs;
                  if (missing.length > 0) {
                    flash(`Imported as "${newName}". Missing referenced templates: ${missing.join(", ")}.`, "warn");
                  } else {
                    flash(`Imported as "${newName}".`);
                  }
                  setImportCollision(null);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stemma import collision modal — separate from the template one
          because the content differs (no kind, no template field-refs; instead
          a missing-entry-refs warning that orphan-reports rather than blocks). */}
      {stemmaImportCollision && (
        <div className="modal-backdrop" onClick={() => setStemmaImportCollision(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">Stemma name collision</div>
            <div className="modal-body">
              <p>A stemma named <strong>"{stemmaImportCollision.imported.name}"</strong> already exists in this world. Choose what to do with the import:</p>
              {stemmaImportCollision.missingRefs.length > 0 && (
                <div className="modal-notice modal-notice-warning">
                  Heads up — {stemmaImportCollision.missingRefs.length} linked node{stemmaImportCollision.missingRefs.length === 1 ? "" : "s"} reference entries that don't exist in this world. Those will land as orphans (cached name shown, italic, broken-link icon). You can re-link or convert them via the inspector after import.
                </div>
              )}
              <div className="collision-options">
                <label>
                  <input
                    type="radio"
                    name="stem-col"
                    checked={stemmaCollisionAction === "skip"}
                    onChange={() => setStemmaCollisionAction("skip")}
                  />
                  <span>
                    <strong>Skip</strong> — keep the existing stemma, don't import anything.
                  </span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="stem-col"
                    checked={stemmaCollisionAction === "replace"}
                    onChange={() => setStemmaCollisionAction("replace")}
                  />
                  <span>
                    <strong>Replace</strong> — overwrite the existing stemma's contents (root, all nodes, name, tags, description). The current contents will be lost permanently.
                  </span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="stem-col"
                    checked={stemmaCollisionAction === "rename"}
                    onChange={() => setStemmaCollisionAction("rename")}
                  />
                  <span>
                    <strong>Import as a new stemma named:</strong>
                    <input
                      type="text"
                      className="input"
                      value={stemmaCollisionRename}
                      onChange={(e) => setStemmaCollisionRename(e.target.value)}
                      onFocus={() => setStemmaCollisionAction("rename")}
                      placeholder="New name"
                    />
                  </span>
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setStemmaImportCollision(null)}>Cancel</button>
              <button
                className="btn btn-accent"
                onClick={() => {
                  if (stemmaCollisionConfirmInFlight.current) return;
                  stemmaCollisionConfirmInFlight.current = true;
                  const unlock = () => { stemmaCollisionConfirmInFlight.current = false; };
                  if (stemmaCollisionAction === "skip") {
                    flash("Import skipped.");
                    setStemmaImportCollision(null);
                    return;
                  }
                  if (stemmaCollisionAction === "replace") {
                    insertImportedStemma(stemmaImportCollision.imported, "replace", stemmaImportCollision.existing.id);
                    const missing = stemmaImportCollision.missingRefs.length;
                    if (missing > 0) {
                      flash(`Replaced "${stemmaImportCollision.existing.name}". ${missing} linked node${missing === 1 ? "" : "s"} became orphans.`, "warn");
                    } else {
                      flash(`Replaced stemma "${stemmaImportCollision.existing.name}".`);
                    }
                    setStemmaImportCollision(null);
                    return;
                  }
                  // rename
                  const newName = stemmaCollisionRename.trim();
                  if (!newName) {
                    flash("Enter a new name to import as.", "error");
                    unlock();
                    return;
                  }
                  if ((state.stemmas || []).some(s => s.name.toLowerCase() === newName.toLowerCase())) {
                    flash(`A stemma named "${newName}" already exists. Pick a different name.`, "error");
                    unlock();
                    return;
                  }
                  insertImportedStemma(stemmaImportCollision.imported, "new", null, newName);
                  const missing = stemmaImportCollision.missingRefs.length;
                  if (missing > 0) {
                    flash(`Imported as "${newName}". ${missing} linked node${missing === 1 ? "" : "s"} became orphans.`, "warn");
                  } else {
                    flash(`Imported stemma as "${newName}".`);
                  }
                  setStemmaImportCollision(null);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar import collision modal — separate from stemma's because
          content differs (no missingRefs warning; instead a primaryClash flag
          that hides Replace since replacing primary is intentionally
          unsupported — it would invalidate every entry's absoluteDay frame). */}
      {moonReconcile && (
        <div className="modal-backdrop" onClick={() => setMoonReconcile(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">Import moons</div>
            <div className="modal-body">
              <p>
                The calendar <strong>"{moonReconcile.calendar.name}"</strong> references {moonReconcile.moons.length} moon{moonReconcile.moons.length > 1 ? "s" : ""}. Moons are world bodies (defined in the Ephemeris workspace). For each one, rebind it to an existing moon in this world or create it new.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 360, overflowY: "auto", margin: "12px 0" }}>
                {moonReconcile.moons.map((m, i) => {
                  const destMoons = (state.celestialBodies || []).filter(b => b && b.kind === "moon");
                  const cyc = Number.isFinite(m.synodicCycleDays) ? `${m.synodicCycleDays}d cycle` : "no cycle";
                  const matchNote = m.matches.length > 0
                    ? `${m.matches.length} name match${m.matches.length > 1 ? "es" : ""}`
                    : "no match in this world";
                  // Descriptor appended to each rebind option so same-named
                  // moons in the dropdown can be told apart. Prefer "orbits X"
                  // when geometry is set (more identifying than a redundant
                  // cycle number for a geometric moon); else the synodic cycle;
                  // else "no phase data". Two truly identical moons (same
                  // name, same parent, same cycle) remain indistinguishable —
                  // no honest label can fix that without exposing internal ids.
                  const moonDescriptor = (b) => {
                    if (b.parentBodyId) {
                      const parent = (state.celestialBodies || []).find(x => x && x.id === b.parentBodyId);
                      return parent ? `orbits ${parent.name || "(unnamed)"}` : "has orbit";
                    }
                    if (Number.isFinite(b.synodicCycleDays) && b.synodicCycleDays > 0) return `${b.synodicCycleDays}d cycle`;
                    return "no phase data";
                  };
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", border: "1px solid var(--border)", borderRadius: 4 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>◐ {m.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{cyc} · {matchNote}</div>
                      </div>
                      <select
                        className="input"
                        style={{ width: 260, flex: "0 0 auto" }}
                        value={m.decision}
                        onChange={e => {
                          const v = e.target.value;
                          setMoonReconcile(mr => ({ ...mr, moons: mr.moons.map((x, idx) => idx === i ? { ...x, decision: v } : x) }));
                        }}
                      >
                        <option value="__new__">Create new moon</option>
                        {destMoons.map(b => (
                          <option key={b.id} value={b.id}>Rebind to: {b.name || "(unnamed)"} · {moonDescriptor(b)}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setMoonReconcile(null)}>Cancel import</button>
              <button className="btn btn-accent" onClick={confirmMoonReconcile}>Continue</button>
            </div>
          </div>
        </div>
      )}

      {calendarImportCollision && (
        <div className="modal-backdrop" onClick={() => setCalendarImportCollision(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">Calendar name collision</div>
            <div className="modal-body">
              <p>
                A calendar named <strong>"{calendarImportCollision.imported.name}"</strong> already exists in this world
                {calendarImportCollision.primaryClash ? " (as the primary calendar)" : ""}.
                Choose what to do with the import:
              </p>
              <div className="collision-options">
                <label>
                  <input
                    type="radio"
                    name="cal-col"
                    checked={calendarCollisionAction === "skip"}
                    onChange={() => setCalendarCollisionAction("skip")}
                  />
                  <span>
                    <strong>Skip</strong> — keep the existing calendar, don't import anything.
                  </span>
                </label>
                {!calendarImportCollision.primaryClash && (
                  <label>
                    <input
                      type="radio"
                      name="cal-col"
                      checked={calendarCollisionAction === "replace"}
                      onChange={() => setCalendarCollisionAction("replace")}
                    />
                    <span>
                      <strong>Replace</strong> — overwrite the existing calendar's contents (months, eras, anchor, notes). Entries bound to this calendar will reckon against the new structure on next load. The current contents will be lost permanently.
                    </span>
                  </label>
                )}
                {calendarImportCollision.primaryClash && (
                  <div className="modal-notice modal-notice-warning" style={{ fontSize: 12 }}>
                    Replace isn't offered because the existing calendar is the world's primary. Swapping primary would re-frame every entry's stored dates. Rename to import as an additional calendar instead.
                  </div>
                )}
                <label>
                  <input
                    type="radio"
                    name="cal-col"
                    checked={calendarCollisionAction === "rename"}
                    onChange={() => setCalendarCollisionAction("rename")}
                  />
                  <span>
                    <strong>Import as a new calendar named:</strong>
                    <input
                      type="text"
                      className="input"
                      value={calendarCollisionRename}
                      onChange={(e) => setCalendarCollisionRename(e.target.value)}
                      onFocus={() => setCalendarCollisionAction("rename")}
                      placeholder="New name"
                    />
                  </span>
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setCalendarImportCollision(null)}>Cancel</button>
              <button
                className="btn btn-accent"
                onClick={() => {
                  if (calendarCollisionConfirmInFlight.current) return;
                  calendarCollisionConfirmInFlight.current = true;
                  const unlock = () => { calendarCollisionConfirmInFlight.current = false; };
                  if (calendarCollisionAction === "skip") {
                    flash("Import skipped.");
                    setCalendarImportCollision(null);
                    return;
                  }
                  if (calendarCollisionAction === "replace") {
                    if (calendarImportCollision.primaryClash) {
                      flash("Can't replace primary. Pick Rename instead.", "error");
                      unlock();
                      return;
                    }
                    insertImportedCalendar(calendarImportCollision.imported, "replace", calendarImportCollision.existing.id, null, calendarImportCollision.newBodies);
                    flash(`Replaced calendar "${calendarImportCollision.existing.name}".`);
                    setCalendarImportCollision(null);
                    return;
                  }
                  // rename
                  const newName = calendarCollisionRename.trim();
                  if (!newName) {
                    flash("Enter a new name to import as.", "error");
                    unlock();
                    return;
                  }
                  const lc = newName.toLowerCase();
                  const dupExisting = (state.calendars || []).some(c => c.name.toLowerCase() === lc);
                  const dupPrimary = state.world.calendar?.name?.toLowerCase() === lc;
                  if (dupExisting || dupPrimary) {
                    flash(`A calendar named "${newName}" already exists. Pick a different name.`, "error");
                    unlock();
                    return;
                  }
                  insertImportedCalendar(calendarImportCollision.imported, "new", null, newName, calendarImportCollision.newBodies);
                  flash(`Imported calendar as "${newName}".`);
                  setCalendarImportCollision(null);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-deletion conversion modal. Triggered when the user tries to
          delete a calendar that has entries bound to it. They pick a target
          calendar to re-anchor those entries to; every date field gets
          converted through absoluteDay so the absolute moment is preserved.
          Then the source calendar is removed in the same atomic state update. */}
      {calendarDeletionPending && (
        <div className="modal-backdrop" onClick={() => setCalendarDeletionPending(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">Reassign entries before deleting</div>
            <div className="modal-body">
              <p>
                <strong>{calendarDeletionPending.affectedEntryIds.length}</strong> entr{calendarDeletionPending.affectedEntryIds.length === 1 ? "y is" : "ies are"} bound to <strong>"{calendarDeletionPending.calendar.name}"</strong>. Pick which calendar those entries should reckon in after this one is removed:
              </p>
              <div style={{ margin: "12px 0" }}>
                <select
                  className="input"
                  value={calendarDeletionPending.targetId || ""}
                  onChange={e => setCalendarDeletionPending(p => p ? { ...p, targetId: e.target.value || null } : p)}
                  style={{ width: "100%" }}
                >
                  <option value="">{state.world.calendar?.name || "Primary"} (primary)</option>
                  {(state.calendars || [])
                    .filter(c => c.id !== calendarDeletionPending.calendar.id)
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name || "(unnamed)"}</option>
                    ))}
                </select>
              </div>
              <div className="modal-notice">
                Every date field on those entries will be converted through the absolute time axis. The absolute moment each date refers to stays the same — only the calendar's year/month/day representation changes. Approximate flags and other metadata are preserved.
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setCalendarDeletionPending(null)}>Cancel</button>
              <button
                className="btn btn-accent"
                onClick={() => {
                  const count = convertAndDeleteCalendar(
                    calendarDeletionPending.calendar.id,
                    calendarDeletionPending.targetId
                  );
                  const targetName = calendarDeletionPending.targetId
                    ? (state.calendars || []).find(c => c.id === calendarDeletionPending.targetId)?.name || "(unnamed)"
                    : (state.world.calendar?.name || "Primary");
                  flash(`Deleted "${calendarDeletionPending.calendar.name}". Reassigned ${count} entr${count === 1 ? "y" : "ies"} to "${targetName}".`);
                  setCalendarDeletionPending(null);
                }}
              >
                Convert and delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({ state, activeTemplateId, activeTagFilter, activeView, templateCounts, tagCounts, allTags, onSelectTemplate, onSelectTag, onClickWorldName, onNewTemplate, onImportTemplate, packs, activePackId, onSelectPack, onNewPack, onImportPack, onSelectView, onReorderTemplate, viewOrder, onReorderViews, isLocked, deletedBuiltinNames, onOpenRestoreModal, templatesCollapsed, onToggleTemplatesCollapsed, sidebarWidth, onResize }) {
  const importFileRef = useRef(null);
  const packImportFileRef = useRef(null);
  const tplDrag = useDragReorder(onReorderTemplate || (() => {}));
  const viewDrag = useDragReorder(onReorderViews || (() => {}));

  // Sidebar-resize drag. Listens at window level so the cursor can leave the
  // 6px handle without ending the gesture; clamps width to a sane range.
  // We track the drag width locally and only commit to prefs on mouseup —
  // pixel-by-pixel commits would trigger 100+ parent re-renders during a
  // single drag. The visible width during drag is taken from this local
  // state via the live width prop falling through to the inline style.
  const [resizing, setResizing] = useState(false);
  const onResizeRef = useRef(onResize);
  useEffect(() => { onResizeRef.current = onResize; }, [onResize]);
  useEffect(() => {
    if (!resizing) return;
    let lastWidth = sidebarWidth;
    const onMove = (e) => {
      const w = Math.max(200, Math.min(500, e.clientX));
      lastWidth = w;
      // Commit live so the sidebar visually resizes during drag. Acceptable
      // because this is a deliberate UI interaction; the user-induced
      // re-renders are wanted feedback, not waste.
      onResizeRef.current?.(w);
    };
    const onUp = () => setResizing(false);
    // Block text selection while dragging — without this, mousemove across
    // other elements selects text in the main view.
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      document.body.style.userSelect = prevUserSelect;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing]);  // intentionally NOT including onResize / sidebarWidth — handler reads via ref / closure

  const VIEW_DEFS = {
    graph:         { id: "graph",         icon: "◍", label: "Concordance" },
    timeline:      { id: "timeline",      icon: "⏳", label: "Timeline; Vertical" },
    chronometrics: { id: "chronometrics", icon: "⌚", label: "Timeline; Chronometric" },
    family:        { id: "family",        icon: "⌂", label: "Linea" },
    stemma:        { id: "stemma",        icon: "❋", label: "Stemma" },
    kalendarium:   { id: "kalendarium",   icon: "⊞", label: "Kalendarium" },
    ephemeris:     { id: "ephemeris",     icon: "☉", label: "Ephemeris" },
    glossopoeia:   { id: "glossopoeia",   icon: "\u03b1", label: "Glossopoeia" },
    cartographia:  { id: "cartographia",  icon: "▦", label: "Cartographia" },
    fabula:        { id: "fabula",        icon: "\u2042", label: "Fabula" },
  };

  // Filter map-kind templates out of the visible Templates list — they live
  // under Cartographia now. originalIdx is pinned to state.templates so the
  // drag-reorder handler (which operates on state.templates indices) doesn't
  // need to be reindexed. A user dragging a non-map template still writes the
  // canonical state ordering; map templates stay in their stored positions
  // within state.templates between the visible ones.
  // Also pull out user templates that belong to a pack — they render under
  // their pack group(s) in the Packs section below. Built-ins are never packed,
  // so they always stay here regardless of membership.
  const packedTemplateIds = new Set(
    (packs || []).flatMap(p => Array.isArray(p.templateIds) ? p.templateIds : [])
  );
  // v1.7 r016: Plot Thread and Theme / Motif leave it too; they live under
  // Fabula (fabulaRole).
  const displayedTemplates = state.templates
    .map((t, originalIdx) => ({ t, originalIdx }))
    .filter(({ t }) => t.kind !== "map" && !t.fabulaRole && (t.origin === "builtin" || !packedTemplateIds.has(t.id)));

  const orderedViews = (viewOrder || ["family", "fabula", "stemma", "ephemeris", "kalendarium", "glossopoeia", "cartographia", "graph", "timeline", "chronometrics"])
    .map(id => VIEW_DEFS[id])
    .filter(Boolean);

  return (
    <aside className="sidebar" style={{ width: sidebarWidth ? `${sidebarWidth}px` : undefined, minWidth: sidebarWidth ? `${sidebarWidth}px` : undefined }}>
      <div
        className={`sidebar-resize-handle ${resizing ? "dragging" : ""}`}
        onMouseDown={(e) => { e.preventDefault(); setResizing(true); }}
        onDoubleClick={() => onResize?.(236)}
        title="Drag to resize · double-click to reset"
      />
      <div className="world-hdr" onClick={onClickWorldName} title="Open settings">
        <div className="world-label">
          <span>World</span>
          {isLocked && <span className="lock-pill">🔒 view-only</span>}
        </div>
        <div className="world-name">{state.world.name}</div>
      </div>

      <div className="sidebar-pinned">
        <div className="nav-section">
          <div className="nav-label"><span>Views</span></div>
          <button className={`nav-item ${activeView === "home" ? "active" : ""}`} onClick={() => onSelectView("home")}>
            <span className="nav-icon" style={activeView === "home" ? { color: "var(--accent)" } : {}}>◐</span>
            <span className="nav-name">Home</span>
          </button>
          <button className={`nav-item ${activeView === "project" ? "active" : ""}`} onClick={() => onSelectView("project")}>
            <span className="nav-icon" style={activeView === "project" ? { color: "var(--accent)" } : {}}>▤</span>
            <span className="nav-name">Project</span>
          </button>
          <div className="nav-section-sep" />
        </div>
      </div>

      <div className="sidebar-scroll">
          {orderedViews.map((v, idx) => {
            const isActive = activeView === v.id;
            const canDrag = !!onReorderViews;
            const isDragged = viewDrag.draggedIdx === idx;
            const isOver = viewDrag.overIdx === idx;
            const showBefore = isOver && viewDrag.dropPosition === "before" && !isDragged;
            const showAfter = isOver && viewDrag.dropPosition === "after" && !isDragged;
            return (
              <div
                key={v.id}
                className={`nav-item-wrap ${isActive ? "active" : ""} ${isDragged ? "dragging" : ""} ${showBefore ? "drop-before" : ""} ${showAfter ? "drop-after" : ""}`}
                {...(canDrag ? viewDrag.rowProps(idx) : {})}
              >
                {canDrag && (
                  <span
                    className="nav-drag-handle"
                    title="Drag to reorder"
                    {...viewDrag.handleProps(idx)}
                  >⋮⋮</span>
                )}
                <button className={`nav-item ${isActive ? "active" : ""}`} onClick={() => onSelectView(v.id)}>
                  <span className="nav-icon" style={isActive ? { color: "var(--accent)" } : {}}>{v.icon}</span>
                  <span className="nav-name">{v.label}</span>
                </button>
              </div>
            );
          })}

        <div className="nav-section" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="nav-label nav-label-toggle"
            onClick={onToggleTemplatesCollapsed}
            title={templatesCollapsed ? "Expand templates" : "Collapse templates to give tags more room"}
          >
            <span>Templates {displayedTemplates.length > 0 && <span className="nav-label-count">({displayedTemplates.length})</span>}</span>
            <span className="nav-label-chevron">{templatesCollapsed ? "▸" : "▾"}</span>
          </button>
          {!templatesCollapsed && displayedTemplates.length === 0 && <div style={{ padding: "5px 14px", fontSize: 12, color: "var(--text-dim)", fontStyle: "italic" }}>No templates yet</div>}
          {!templatesCollapsed && displayedTemplates.map(({ t, originalIdx }) => {
            const idx = originalIdx;
            const isActive = activeView === "list" && activeTemplateId === t.id;
            const canDrag = !isLocked && onReorderTemplate;
            const isDragged = tplDrag.draggedIdx === idx;
            const isOver = tplDrag.overIdx === idx;
            const showIndicatorBefore = isOver && tplDrag.dropPosition === "before" && !isDragged;
            const showIndicatorAfter = isOver && tplDrag.dropPosition === "after" && !isDragged;
            return (
              <div
                key={t.id}
                className={`nav-item-wrap ${isActive ? "active" : ""} ${isDragged ? "dragging" : ""} ${showIndicatorBefore ? "drop-before" : ""} ${showIndicatorAfter ? "drop-after" : ""}`}
                {...(canDrag ? tplDrag.rowProps(idx) : {})}
              >
                {canDrag && (
                  <span
                    className="nav-drag-handle"
                    title="Drag to reorder"
                    {...tplDrag.handleProps(idx)}
                  >⋮⋮</span>
                )}
                <button className={`nav-item ${isActive ? "active" : ""}`} onClick={() => onSelectTemplate(t.id)}>
                  <span className="nav-icon" style={isActive ? { color: t.color } : {}}>{t.icon}</span>
                  <span className="nav-name">{t.name}</span>
                  {templateCounts[t.id] ? <span className="nav-count">{templateCounts[t.id]}</span> : null}
                </button>
              </div>
            );
          })}
        </div>

        {Array.isArray(packs) && packs.length > 0 && (
          <div className="nav-section" style={{ marginTop: 12 }}>
            <div className="nav-label"><span>Packs</span></div>
            {packs.map(p => {
              const memberTpls = (p.templateIds || [])
                .map(id => state.templates.find(t => t.id === id))
                .filter(Boolean);
              return (
                <div key={p.id} className="pack-group">
                  <button
                    className={`nav-item ${activePackId === p.id && activeView === "pack" ? "active" : ""}`}
                    onClick={() => onSelectPack && onSelectPack(p.id)}
                  >
                    <span className="nav-icon">▦</span>
                    <span className="nav-name">{p.name}</span>
                    {memberTpls.length ? <span className="nav-count">{memberTpls.length}</span> : null}
                  </button>
                  {memberTpls.map(t => (
                    <button
                      key={t.id}
                      className={`nav-item ${activeTemplateId === t.id && activeView === "list" ? "active" : ""}`}
                      onClick={() => onSelectTemplate(t.id)}
                      style={{ paddingLeft: 28 }}
                    >
                      <span className="nav-icon" style={{ color: t.color }}>{t.icon}</span>
                      <span className="nav-name">{t.name}</span>
                      {templateCounts[t.id] ? <span className="nav-count">{templateCounts[t.id]}</span> : null}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {allTags.length > 0 && (
          <div className="nav-section" style={{ marginTop: 12 }}>
            <div className="nav-label"><span>Tags</span></div>
            {allTags.map(tag => (
              <button key={tag} className={`nav-item ${activeTagFilter === tag ? "active" : ""}`} onClick={() => onSelectTag(tag)}>
                <span className="nav-icon" style={activeTagFilter === tag ? { color: "var(--accent)" } : {}}>#</span>
                <span className="nav-name">{tag}</span>
                <span className="nav-count">{tagCounts[tag]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="sidebar-foot">
        <div className="btn-foot-row">
          <button
            className={`btn-foot ${isLocked ? "disabled" : ""}`}
            onClick={() => !isLocked && onNewTemplate()}
            disabled={isLocked}
          >+ New</button>
          <button
            className={`btn-foot ${isLocked ? "disabled" : ""}`}
            onClick={() => !isLocked && importFileRef.current?.click()}
            disabled={isLocked}
            title="Import a template from a .template.json file"
          >↥ Import</button>
        </div>
        <div className="btn-foot-row">
          <button
            className={`btn-foot ${isLocked ? "disabled" : ""}`}
            onClick={() => !isLocked && onNewPack && onNewPack()}
            disabled={isLocked}
            title="Create a new template pack — a named, shareable group of templates"
          >+ New pack</button>
          <button
            className={`btn-foot ${isLocked ? "disabled" : ""}`}
            onClick={() => !isLocked && packImportFileRef.current?.click()}
            disabled={isLocked}
            title="Import a template pack from a .cartulary-pack.json file"
          >↥ Import pack</button>
        </div>
        <input
          ref={packImportFileRef}
          type="file"
          accept=".json,application/json"
          className="hidden-file-input"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && onImportPack) onImportPack(f);
            e.target.value = "";
          }}
        />
        <input
          ref={importFileRef}
          type="file"
          accept=".json,application/json"
          className="hidden-file-input"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && onImportTemplate) onImportTemplate(f);
            e.target.value = "";
          }}
        />
        {!isLocked && deletedBuiltinNames && deletedBuiltinNames.length > 0 && (
          <button
            className="btn-foot btn-foot-restore"
            onClick={onOpenRestoreModal}
            title={`Restore one or more of the ${deletedBuiltinNames.length} built-in template(s) you previously deleted from this world`}
          >
            Restore Built-ins ({deletedBuiltinNames.length})
          </button>
        )}
      </div>
    </aside>
  );
}

// ─── Pack detail (v1.5) ──────────────────────────────────────────────────────
// Content-pane view for a single pack: editable name + description, the member
// template list, and Delete. Name/description edit-on-blur (uncontrolled, so
// the cursor never fights a re-render). Membership editing (add/remove) and
// Export land in later builds; for now the member list is read-only and clicking
// a member opens that template's entry list.
function PackDetailView({ pack, templates, isLocked, onRename, onSetDescription, onDelete, onSelectTemplate, onAddTemplate, onRemoveTemplate, onExport }) {
  const byId = useMemo(() => {
    const m = {};
    (templates || []).forEach(t => { m[t.id] = t; });
    return m;
  }, [templates]);
  const members = (pack.templateIds || []).map(id => byId[id]).filter(Boolean);
  // Eligible to add: user (non-builtin) templates, not map-kind (those live in
  // Cartographia), not Fabula's (fabulaRole, v1.7 r016), not already in this
  // pack.
  const addable = (templates || []).filter(t =>
    t.origin !== "builtin" && t.kind !== "map" && !t.fabulaRole && !(pack.templateIds || []).includes(t.id));

  return (
    <div className="pack-detail" style={{ padding: "4px 2px", maxWidth: 720 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button
          className="btn btn-ghost"
          onClick={() => onExport && onExport()}
          disabled={members.length === 0}
          title={members.length === 0 ? "Add at least one template before exporting" : "Export this pack as a portable .cartulary-pack.json file"}
        >Export pack</button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label className="nav-label" style={{ display: "block", marginBottom: 4 }}><span>Pack name</span></label>
        <input
          className="input"
          defaultValue={pack.name}
          key={`name-${pack.id}`}
          disabled={isLocked}
          onBlur={(e) => { if (!isLocked && e.target.value.trim() !== pack.name) onRename(e.target.value); }}
          style={{ width: "100%", fontSize: "1.1em" }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label className="nav-label" style={{ display: "block", marginBottom: 4 }}><span>Description</span></label>
        <textarea
          className="input"
          defaultValue={pack.description}
          key={`desc-${pack.id}`}
          disabled={isLocked}
          rows={3}
          placeholder="What this pack is for — shown to anyone you share it with."
          onBlur={(e) => { if (!isLocked && e.target.value !== pack.description) onSetDescription(e.target.value); }}
          style={{ width: "100%", resize: "vertical" }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div className="nav-label" style={{ marginBottom: 6 }}>
          <span>Templates in this pack ({members.length})</span>
        </div>
        {members.length === 0 ? (
          <div style={{ color: "var(--text-dim)", fontStyle: "italic", padding: "12px 0" }}>
            No templates in this pack yet. Add some below.
          </div>
        ) : (
          <div className="pack-member-list">
            {members.map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  className="nav-item"
                  onClick={() => onSelectTemplate && onSelectTemplate(t.id)}
                  style={{ flex: 1, textAlign: "left" }}
                >
                  <span className="nav-icon" style={{ color: t.color }}>{t.icon}</span>
                  <span className="nav-name">{t.name}</span>
                </button>
                {!isLocked && (
                  <button
                    className="btn-icon-toggle"
                    title={`Remove "${t.name}" from this pack (the template itself stays in your world)`}
                    onClick={() => onRemoveTemplate && onRemoveTemplate(t.id)}
                  >✕</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {!isLocked && (
        <div style={{ marginBottom: 20 }}>
          <div className="nav-label" style={{ marginBottom: 6 }}><span>Add templates</span></div>
          {addable.length === 0 ? (
            <div style={{ color: "var(--text-dim)", fontStyle: "italic", padding: "8px 0" }}>
              No custom templates available to add. Built-in templates can't be packed; create or import a custom template first.
            </div>
          ) : (
            <div className="pack-add-list">
              {addable.map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span className="nav-icon" style={{ color: t.color, width: 24, textAlign: "center" }}>{t.icon}</span>
                  <span className="nav-name" style={{ flex: 1 }}>{t.name}</span>
                  <button className="btn btn-ghost" onClick={() => onAddTemplate && onAddTemplate(t.id)}>+ Add</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!isLocked && (
        <div style={{ marginTop: 24 }}>
          <button className="btn btn-danger" onClick={onDelete}>Delete pack</button>
        </div>
      )}
    </div>
  );
}
