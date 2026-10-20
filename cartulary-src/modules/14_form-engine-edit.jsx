
// ImageFieldEditor — image field's editing surface. Supports three input
// methods: drag-and-drop a file onto the zone, paste an image from the
// clipboard while the filename input is focused, or click the picker to
// open a native file dialog. The ingestion path branches:
//   - If FSAA dirHandle is connected: write file into the linked world-images
//     folder (unique-named to avoid collision), store the filename.
//   - Otherwise: read as base64 data URL, store the URL inline in the field
//     value. World JSON bloats by roughly the file size × 1.37 (base64
//     overhead). User flashed a warning describing the bloat and pointing
//     at World Settings for the folder-linking remedy.
//
// Storage shape: field value is a string, either a bare filename (FSAA case)
// or a "data:image/..;base64,.." URL (inline case). Both shapes already work
// through ImagePreview (handles both branches) and through markdown export
// (imageManifestEntry already branches on .startsWith("data:")).
function ImageFieldEditor({ value, onChange, imageFolder, dirHandle, flash }) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const isInline = typeof value === "string" && value.startsWith("data:");

  const embedAsBase64 = async (file) => {
    try {
      const dataUrl = await fileToDataUrl(file);
      onChange(dataUrl);
      const sizeKB = Math.round(file.size / 1024);
      const adviceMsg = dirHandle == null
        ? `Embedded ${file.name} inline (${sizeKB} KB). Link a world-images folder via World Settings to save filenames instead and keep world JSON small.`
        : `Embedded ${file.name} inline (${sizeKB} KB). Couldn't write to the linked folder — using base64 fallback.`;
      flash && flash(adviceMsg);
    } catch (e) {
      console.error("base64 embed failed", e);
      flash && flash("Couldn't read image file.");
    }
  };

  const ingestFile = async (file) => {
    if (!file) return;
    if (!file.type || !file.type.startsWith("image/")) {
      flash && flash("Drop an image file (png, jpg, gif, webp, svg).");
      return;
    }
    // FSAA path: write to linked folder, store filename.
    if (dirHandle) {
      try {
        const safeName = await generateUniqueFilename(dirHandle, file.name);
        const fh = await dirHandle.getFileHandle(safeName, { create: true });
        const writable = await fh.createWritable();
        await writable.write(file);
        await writable.close();
        onChange(safeName);
        flash && flash(`Saved ${safeName} to linked folder.`);
        return;
      } catch (e) {
        console.warn("FSAA write failed, falling back to inline base64", e);
        // Fall through to base64 path so the user doesn't lose the drop.
      }
    }
    // No FSAA / write failed: inline.
    await embedAsBase64(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) ingestFile(file);
  };
  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = (e) => {
    // Only flip off when the cursor leaves the zone entirely, not when it
    // crosses an inner child boundary.
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragOver(false);
  };
  const onPaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();  // suppress text paste of the image binary
          ingestFile(file);
          return;
        }
      }
    }
  };
  const onPickerChange = (e) => {
    const file = e.target.files?.[0];
    if (file) ingestFile(file);
    e.target.value = "";  // reset so picking the same file twice works
  };

  return (
    <div
      className={`image-field-zone${dragOver ? " drag-over" : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="image-input-row">
        <input
          className="input"
          placeholder={isInline ? "(inline base64 image — clear to type a filename)" : "filename.png"}
          value={isInline ? "" : (value || "")}
          onChange={e => onChange(e.target.value)}
          onPaste={onPaste}
          disabled={isInline}
        />
        <button
          type="button"
          className="image-picker-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Choose image file"
        >📁</button>
        {value && (
          <button
            type="button"
            className="image-clear-btn"
            onClick={() => onChange("")}
            title="Clear image"
          >✕</button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={onPickerChange}
        />
      </div>
      <div className="image-hint">
        {dirHandle
          ? <>Drop / paste / pick an image to save it to <code>{imageFolder || "world-images"}/</code>, or type a filename.</>
          : <>Drop / paste / pick an image to embed inline (bloats world JSON). Link a world-images folder via World Settings to save filenames instead.</>
        }
      </div>
      {value && <ImagePreview filename={value} imageFolder={imageFolder} dirHandle={dirHandle} />}
    </div>
  );
}

// ─── Entry form ────────────────────────────────────────────────────────────────

function EntryForm({ draft, template, entries, templates, bodies, registeredNodes, onChange, showSecrets, imageFolder, allTags, dirHandle, calendar, primaryCalendar, selfEntryId, flash, previewMode, additionalCalendars, ipaSymbols, canvasSlot }) {
  const updateField = (fid, val) => onChange({ ...draft, fields: { ...draft.fields, [fid]: val } });
  const cals = additionalCalendars || [];
  const hasAdditional = cals.length > 0;
  const selectedCal = draft.calendarId ? cals.find(c => c.id === draft.calendarId) : null;

  return (
    <div className="entry-form">
      {!previewMode && (
        template.ipaName
          ? <IpaTextInput value={draft.name} onChange={(nm) => onChange({ ...draft, name: nm })} placeholder={`${template.name} name...`} ipaSymbols={ipaSymbols} className="form-title-input" autoFocus />
          : <input className="form-title-input" placeholder={`${template.name} name...`} value={draft.name} onChange={e => onChange({ ...draft, name: e.target.value })} autoFocus />
      )}

      {!previewMode && (
        <div className="form-tags-bar">
          <label className="form-label">Tags</label>
          <input className="input form-tags-input" placeholder="comma-separated tags..." value={(draft.tags || []).join(", ")} onChange={e => onChange({ ...draft, tags: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} list="all-tags" />
          <datalist id="all-tags">{allTags.map(t => <option key={t} value={t} />)}</datalist>
          <div className="form-tags-hint">cross-cutting tags · existing tags will autocomplete</div>
        </div>
      )}

      {!previewMode && hasAdditional && (
        <div className="form-tags-bar">
          <label className="form-label">Calendar</label>
          <select
            className="input"
            value={draft.calendarId || ""}
            onChange={(e) => {
              const v = e.target.value;
              onChange({ ...draft, calendarId: v || null });
            }}
            style={{ flex: "0 0 auto", minWidth: 240 }}
          >
            <option value="">{primaryCalendar?.name || "Primary"} (primary)</option>
            {cals.map(c => (
              <option key={c.id} value={c.id}>{c.name || "(unnamed)"}</option>
            ))}
          </select>
          <div className="form-tags-hint">
            {selectedCal
              ? `Dates on this entry reckon in ${selectedCal.name || "this calendar"}.`
              : `Dates on this entry reckon in the world's primary calendar (${primaryCalendar?.name || "primary"}).`}
          </div>
        </div>
      )}

      {canvasSlot}

      {(() => {
        // v1.3-halfwidth: helper for cascade-child indent suppression. The
        // visual indent on cascade children exists to signal "this is a child
        // of the field above." But when a cascade child sits immediately
        // after its parent in declaration order, the adjacency already
        // conveys the relationship — indent becomes redundant and visually
        // jarring (especially in tight half-width cascade chains like
        // BroadType → Type → Subtype, where Subtype's parent is on the
        // previous row but only one position back). Rule: cascade child
        // shows indent ONLY when its parent is NOT the immediately preceding
        // field. Far-apart parents (user-built templates with non-adjacent
        // cascades) still get the indent cue.
        //
        // Hoisted outside the buildFieldLayoutUnits map so the Map is built
        // once per render, not once per layout unit. Closes O(N×rows) work.
        const fieldIdxById = new Map(template.fields.map((f, i) => [f.id, i]));
        const isTightCascade = (field) => {
          if (!field.dependsOn) return false;
          const myIdx = fieldIdxById.get(field.id);
          const parentIdx = fieldIdxById.get(field.dependsOn);
          if (myIdx == null || parentIdx == null) return false;
          return myIdx - parentIdx === 1;
        };
        return buildFieldLayoutUnits(
          template.fields,
          (f) => isFieldVisibleEdit(f, draft.fields, showSecrets)
        ).map(unit => {
        if (unit.kind === "full") {
          const field = unit.field;
          // v1.3: cascade child fields render with a "nested" visual treatment —
          // indented + dimmer label — so they read as a subfield of their cascade
          // parent above, rather than as a peer field. The dropdown itself is
          // already cascade-aware in FieldEditor. Tight cascade (parent
          // declaration-adjacent) suppresses indent.
          const isCascadeChild = field.type === "select" && field.dependsOn && !isTightCascade(field);
          return (
            <div key={field.id} className={`form-field ${field.secret ? "secret" : ""}${isCascadeChild ? " cascade-child-row" : ""}`}>
              <label className="form-label">
                <FieldLabelText field={field} templates={templates} />
                {field.required && <span className="required-mark" title="Required">*</span>}
                {field.secret && <span className="secret-tag">SECRET</span>}
              </label>
              <FieldEditor field={field} value={draft.fields[field.id]} onChange={(v) => updateField(field.id, v)} entries={entries} templates={templates} bodies={bodies} registeredNodes={registeredNodes} imageFolder={imageFolder} dirHandle={dirHandle} calendar={calendar} selfEntryId={selfEntryId} allFieldValues={draft.fields} tplFields={template.fields} flash={flash} ipaSymbols={ipaSymbols} />
            </div>
          );
        }
        // unit.kind === "pair" — both halves guaranteed visible by predicate filter.
        // Cascade-child indent suppression: a cascade child shows indent only when
        // its parent is NOT declaration-adjacent. Note that with visibility-aware
        // re-pairing, a cascade child may now end up paired with a non-parent
        // neighbor (parent on a prior row, child re-paired here); indent rule
        // still depends only on declared adjacency, not pair adjacency.
        const { a, b } = unit;
        const aIsCascadeChild = a.type === "select" && a.dependsOn && !isTightCascade(a);
        const bIsCascadeChild = b.type === "select" && b.dependsOn && !isTightCascade(b);
        return (
          <div key={`pair-${a.id}-${b.id}`} className="form-row">
            <div className={`form-field ${a.secret ? "secret" : ""}${aIsCascadeChild ? " cascade-child-row" : ""}`}>
              <label className="form-label" title={a.label}>
                <FieldLabelText field={a} templates={templates} />
                {a.required && <span className="required-mark" title="Required">*</span>}
                {a.secret && <span className="secret-tag">SECRET</span>}
              </label>
              <FieldEditor field={a} value={draft.fields[a.id]} onChange={(v) => updateField(a.id, v)} entries={entries} templates={templates} bodies={bodies} registeredNodes={registeredNodes} imageFolder={imageFolder} dirHandle={dirHandle} calendar={calendar} selfEntryId={selfEntryId} allFieldValues={draft.fields} tplFields={template.fields} flash={flash} ipaSymbols={ipaSymbols} />
            </div>
            <div className={`form-field ${b.secret ? "secret" : ""}${bIsCascadeChild ? " cascade-child-row" : ""}`}>
              <label className="form-label" title={b.label}>
                <FieldLabelText field={b} templates={templates} />
                {b.required && <span className="required-mark" title="Required">*</span>}
                {b.secret && <span className="secret-tag">SECRET</span>}
              </label>
              <FieldEditor field={b} value={draft.fields[b.id]} onChange={(v) => updateField(b.id, v)} entries={entries} templates={templates} bodies={bodies} registeredNodes={registeredNodes} imageFolder={imageFolder} dirHandle={dirHandle} calendar={calendar} selfEntryId={selfEntryId} allFieldValues={draft.fields} tplFields={template.fields} flash={flash} ipaSymbols={ipaSymbols} />
            </div>
          </div>
        );
        });
      })()}
    </div>
  );
}

// Single-line text input with wiki-link autocomplete. Edit-side parallel to
// InlineWikiLinkText's display-side rendering. Modeled on RichTextEditor's
// autocomplete bits — same candidate-building logic (primary names first,
// then name-history fallback), same keyboard nav (Arrow/Enter/Tab/Escape),
// same portal-based popup positioning. Differs only in being single-line:
// no toolbar, no auto-grow, no markdown shortcuts, no preview toggle.
//
// When the user types `[[`, the popup lists matching entries. Pressing Enter
// or Tab inserts the entry name and the closing `]]`. Pressing Escape closes
// without inserting. The popup follows the input's viewport position, flipping
// upward when there's no room below (same as RichTextEditor).
function WikiLinkInput({ value, onChange, entries, templates, bodies, placeholder }) {
  const inputRef = useRef(null);
  const [wikiPopup, setWikiPopup] = useState(null);
  const v = value || "";

  // Same `[[`-at-cursor detection as RichTextEditor.handleKeyUp. Single-line
  // input has no newlines so the `[^\]\n|]*` exclusion is functionally just
  // "not ] or |", same outcome.
  const handleKeyUp = (e) => {
    const inp = inputRef.current;
    if (!inp) return;
    const cursor = inp.selectionStart;
    const before = v.substring(0, cursor);
    const m = before.match(/\[\[([^\]\n|]*)$/);
    if (m) {
      const query = m[1].toLowerCase();
      const seen = new Set();
      const candidates = [];
      (entries || []).forEach(en => {
        if (!en.name) return;
        if (en.name.toLowerCase().includes(query)) {
          candidates.push({ entry: en, displayName: en.name, insertName: en.name, viaHistory: false });
          seen.add(en.id + ":" + en.name.toLowerCase());
        }
      });
      if (Array.isArray(templates)) {
        const tplById = Object.fromEntries(templates.map(t => [t.id, t]));
        (entries || []).forEach(en => {
          const tpl = tplById[en.templateId];
          getEntryNameHistory(en, tpl).forEach(altName => {
            if (!altName.toLowerCase().includes(query)) return;
            const key = en.id + ":" + altName.toLowerCase();
            if (seen.has(key)) return;
            if (en.name && en.name.toLowerCase() === altName.toLowerCase()) return;
            candidates.push({ entry: en, displayName: altName, insertName: altName, viaHistory: true });
            seen.add(key);
          });
        });
      }
      // r026: bodies as a third candidate tier. Indexed by primary name +
      // comma-split "Other Names". Body candidates use `isBody: true` so
      // the popup renderer can differentiate them visually.
      (bodies || []).forEach(b => {
        if (!b || !b.name) return;
        if (b.name.toLowerCase().includes(query)) {
          const key = b.id + ":" + b.name.toLowerCase();
          if (!seen.has(key)) {
            candidates.push({ entry: b, displayName: b.name, insertName: b.name, viaHistory: false, isBody: true });
            seen.add(key);
          }
        }
        if (typeof b.otherNames === "string" && b.otherNames.trim()) {
          b.otherNames.split(",").forEach(alias => {
            const trimmed = alias.trim();
            if (!trimmed) return;
            if (!trimmed.toLowerCase().includes(query)) return;
            const key = b.id + ":" + trimmed.toLowerCase();
            if (seen.has(key)) return;
            if (b.name && b.name.toLowerCase() === trimmed.toLowerCase()) return;
            candidates.push({ entry: b, displayName: trimmed, insertName: trimmed, viaHistory: true, isBody: true });
            seen.add(key);
          });
        }
      });
      const sliced = candidates.slice(0, 8);
      if (sliced.length > 0) {
        const POPUP_MAX_H = 240;
        const GAP = 4;
        const rect = inp.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const flipUp = spaceBelow < POPUP_MAX_H + GAP && rect.top > spaceBelow;
        const y = flipUp ? rect.top - GAP : rect.bottom + GAP;
        setWikiPopup({
          x: rect.left, y, flipUp,
          query, candidates: sliced, activeIdx: 0,
          matchStart: cursor - m[1].length,
          matchEnd: cursor,
        });
        return;
      }
    }
    setWikiPopup(null);
  };

  const acceptWikiSuggestion = (entryName) => {
    if (!wikiPopup) return;
    const inp = inputRef.current;
    const before = v.substring(0, wikiPopup.matchStart);
    const after = v.substring(wikiPopup.matchEnd);
    const afterStartsWithCloser = after.startsWith("]]");
    const insertion = entryName + (afterStartsWithCloser ? "" : "]]");
    const next = before + insertion + after;
    onChange(next);
    setWikiPopup(null);
    setTimeout(() => {
      if (!inp) return;
      inp.focus();
      const pos = before.length + insertion.length + (afterStartsWithCloser ? 2 : 0);
      inp.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (!wikiPopup) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setWikiPopup(p => ({ ...p, activeIdx: (p.activeIdx + 1) % p.candidates.length }));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setWikiPopup(p => ({ ...p, activeIdx: (p.activeIdx - 1 + p.candidates.length) % p.candidates.length }));
      return;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      acceptWikiSuggestion(wikiPopup.candidates[wikiPopup.activeIdx].insertName);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setWikiPopup(null);
      return;
    }
  };

  // Close popup on blur, but delay so a mouse-click on a popup option lands
  // before the close — onMouseDown on the option also calls preventDefault to
  // keep focus on the input, same pattern as RichTextEditor.
  const handleBlur = () => {
    setTimeout(() => setWikiPopup(null), 120);
  };

  return (
    <>
      <input
        ref={inputRef}
        className="input"
        value={v}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onKeyUp={handleKeyUp}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
      {wikiPopup && ReactDOM.createPortal(
        <div
          className="wikilink-popup"
          style={{
            left: wikiPopup.x,
            top: wikiPopup.y,
            transform: wikiPopup.flipUp ? "translateY(-100%)" : undefined,
          }}
        >
          {wikiPopup.candidates.map((c, i) => (
            <div
              key={c.entry.id + ":" + c.displayName}
              className={`wikilink-opt ${i === wikiPopup.activeIdx ? "active" : ""}`}
              onMouseDown={(ev) => { ev.preventDefault(); acceptWikiSuggestion(c.insertName); }}
              onMouseEnter={() => setWikiPopup(p => ({ ...p, activeIdx: i }))}
              title={
                c.isBody
                  ? (c.viaHistory ? `Other name for body "${c.entry.name}"` : "Celestial body")
                  : (c.viaHistory ? `Former name of "${c.entry.name}"` : null)
              }
            >
              <span className="wikilink-opt-icon">{c.isBody ? "◉" : "◈"}</span>
              <span>{c.displayName}</span>
              {c.viaHistory && (
                <span className="wikilink-opt-history-hint"> → {c.entry.name}</span>
              )}
              {c.isBody && !c.viaHistory && (
                <span className="wikilink-opt-tmpl">body</span>
              )}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

// Editor affordance (v1.5): a hover hint on an entry-ref field's label stating
// what the field references and any value filter, so the target isn't
// mystifying while authoring an entry. Returns "" for non-ref fields. Target
// names come off the field (refTemplate / refTemplates carry template names;
// the body sentinel maps to its label); the per-target allowed-value constraint
// comes off refFilters. Rendered only in the entry edit form (editor-only).
const refHintFor = (field, templates) => {
  if (!field || field.type !== "entry-ref") return "";
  const byId = {}, byName = {};
  (templates || []).forEach(t => { byId[t.id] = t; byName[t.name] = t; });
  const fromName = (n) => (n === BODY_REF_SENTINEL ? BODY_REF_LABEL : n);
  const fromId = (id) => (id === BODY_REF_SENTINEL ? BODY_REF_LABEL : (byId[id] ? byId[id].name : null));
  // Target display names. Built-in / pack fields author by name (refTemplate /
  // refTemplates); the in-app builder stores ids (refTemplatesId), so resolve
  // those through the template list. Prefer names when present.
  let names = [];
  if (field.refTemplate) names = [fromName(field.refTemplate)];
  else if (Array.isArray(field.refTemplates) && field.refTemplates.length) names = field.refTemplates.map(fromName);
  else if (field.refTemplateId) { const n = fromId(field.refTemplateId); if (n) names = [n]; }
  else if (Array.isArray(field.refTemplatesId) && field.refTemplatesId.length) names = field.refTemplatesId.map(fromId).filter(Boolean);
  // refFilters is keyed by template name in both authoring paths; the value
  // carries fieldLabel (built-in / pack) or fieldId (in-app builder) -- resolve
  // an id to its label via the target template's fields.
  const rf = field.refFilters || {};
  const clauseFor = (name) => {
    const f = rf[name];
    if (!f || !Array.isArray(f.allowedValues) || !f.allowedValues.length) return null;
    let lbl = f.fieldLabel;
    if (!lbl && f.fieldId) { const tpl = byName[name]; const ff = tpl && (tpl.fields || []).find(x => x.id === f.fieldId); lbl = ff && ff.label; }
    return lbl ? `${lbl} is ${f.allowedValues.join(" or ")}` : null;
  };
  const art = (s) => /^[aeiou]/i.test((s || "").trim()) ? "an" : "a";
  let base;
  if (names.length === 0) {
    base = "References any entry";
  } else if (names.length === 1) {
    const c = clauseFor(names[0]);
    base = c ? `References ${art(names[0])} ${names[0]} entry where ${c}` : `References ${art(names[0])} ${names[0]} entry`;
  } else {
    const list = names.slice(0, -1).join(", ") + " or " + names[names.length - 1];
    base = `References ${art(names[0])} ${list} entry`;
    const clauses = names.map(n => { const c = clauseFor(n); return c ? `${n} where ${c}` : null; }).filter(Boolean);
    if (clauses.length) base += ` (${clauses.join("; ")})`;
  }
  if (field.multi) base += " (one or more)";
  return base + ".";
};

function FieldLabelText({ field, templates }) {
  const hint = refHintFor(field, templates);
  // v1.5: field.help (Glossopoeia helper copy) renders as a dotted-underline
  // tooltip on the label. Takes precedence over the ref-target hint so there's
  // one affordance, not two; the help copy already names the target where it
  // matters. Used by both EntryForm (top-level fields) and GroupEditor
  // (subfields), so this single point covers every labelled field.
  if (field.help) return <span className="field-help" title={field.help}>{field.label}</span>;
  return hint ? <span className="ref-hint" title={hint}>{field.label}</span> : field.label;
}

// v1.5: multi-select editor. Pick any number of options from a fixed set,
// rendered as toggle chips (the built-in-safe stand-in for the user-only
// `tags` field). Value is an array of option strings. Options removed from
// the set after an entry picked them ("stale") still render so the pick is
// never silently dropped; they can be toggled off but not re-added.
function MultiSelectEditor({ field, value, onChange }) {
  const selected = Array.isArray(value)
    ? value.filter(v => v != null && String(v).trim() !== "").map(v => String(v).trim())
    : [];
  const options = Array.isArray(field.options) ? field.options : [];
  const stale = selected.filter(v => !options.includes(v));
  const chips = [...options, ...stale];
  const toggle = (opt) => {
    if (selected.includes(opt)) onChange(selected.filter(v => v !== opt));
    else onChange([...selected, opt]);
  };
  if (chips.length === 0) return <div className="field-hint">No options defined for this field.</div>;
  return (
    <div className="multiselect-editor">
      {chips.map(opt => {
        const on = selected.includes(opt);
        const isStale = stale.includes(opt);
        return (
          <button
            type="button"
            key={opt}
            className={`multiselect-chip${on ? " multiselect-chip-on" : ""}${isStale ? " multiselect-chip-stale" : ""}`}
            onClick={() => toggle(opt)}
            title={isStale ? "No longer in this field's option set — click to remove" : undefined}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ─── IPA input palette (v1.5 r107) ──────────────────────────────────────────
// Static fallback chart: the full IPA letter set plus common suprasegmentals
// and diacritics, grouped for browsing. Combining marks (U+0300–036F) are
// displayed on a dotted circle (◌) so they render legibly as standalone chips,
// but only the bare combining char is inserted (it attaches to the preceding
// character in the field). Used as the "full chart" tier under a language's own
// phoneme inventory in IpaTextInput.
const IPA_CHART = [
  { group: "Consonants", symbols: ["p","b","t","d","ʈ","ɖ","c","ɟ","k","ɡ","q","ɢ","ʔ","m","ɱ","n","ɳ","ɲ","ŋ","ɴ","ʙ","r","ʀ","ⱱ","ɾ","ɽ","ɸ","β","f","v","θ","ð","s","z","ʃ","ʒ","ʂ","ʐ","ç","ʝ","x","ɣ","χ","ʁ","ħ","ʕ","h","ɦ","ɬ","ɮ","ʋ","ɹ","ɻ","j","ɰ","l","ɭ","ʎ","ʟ"] },
  { group: "Other consonants", symbols: ["ʍ","w","ɥ","ʜ","ʢ","ʡ","ɕ","ʑ","ɺ","ɧ","ʘ","ǀ","ǃ","ǂ","ǁ","ɓ","ɗ","ʄ","ɠ","ʛ"] },
  { group: "Vowels", symbols: ["i","y","ɨ","ʉ","ɯ","u","ɪ","ʏ","ʊ","e","ø","ɘ","ɵ","ɤ","o","ə","ɛ","œ","ɜ","ɞ","ʌ","ɔ","æ","ɐ","a","ɶ","ɑ","ɒ"] },
  { group: "Suprasegmentals", symbols: ["ˈ","ˌ","ː","ˑ","|","‖","‿","↗","↘"] },
  { group: "Diacritics & modifiers", symbols: ["ʰ","ʷ","ʲ","ˠ","ˤ","ⁿ","ˡ","͡","̃","̥","̬","̩","̯","̟","̠","̪","̺","̻","̝","̞","̃"] },
];

// Text input with an attached IPA picker. The picker shows the current
// language's phoneme inventory first (the symbols you actually use), then the
// full chart for sounds not yet in the inventory. Clicking a symbol splices it
// at the caret and keeps focus, so you can chain several. No wiki-link
// autocomplete (unlike WikiLinkInput): phonetic strings don't take [[refs]].
function IpaTextInput({ value, onChange, placeholder, ipaSymbols, className, autoFocus }) {
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const v = value || "";
  const insert = (sym) => {
    const el = inputRef.current;
    const start = el && el.selectionStart != null ? el.selectionStart : v.length;
    const end = el && el.selectionEnd != null ? el.selectionEnd : v.length;
    const next = v.slice(0, start) + sym + v.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      const e2 = inputRef.current;
      if (e2) { const pos = start + sym.length; e2.focus(); try { e2.setSelectionRange(pos, pos); } catch (_) {} }
    });
  };
  const disp = (s) => /[\u0300-\u036f]/.test(s) ? "\u25CC" + s : s;
  const inv = Array.isArray(ipaSymbols) ? ipaSymbols.filter(x => x && x.sym) : [];
  return (
    <div className="ipa-field" ref={wrapRef}>
      <div className="ipa-field-row">
        <input ref={inputRef} className={className || "input"} value={v} onChange={e => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} onKeyDown={e => { if (e.key === "Escape") setOpen(false); }} />
        <button type="button" className={`ipa-toggle${open ? " ipa-toggle-on" : ""}`} onMouseDown={e => e.preventDefault()} onClick={() => setOpen(o => !o)} title="Insert IPA symbol">IPA</button>
      </div>
      {open && (
        <div className="ipa-palette">
          {inv.length > 0 && (
            <div className="ipa-palette-section">
              <div className="ipa-palette-head">This language</div>
              <div className="ipa-palette-grid">
                {inv.map((p, i) => (
                  <button key={"inv" + i} type="button" className="ipa-chip ipa-chip-inv" title={p.rom || undefined} onMouseDown={e => { e.preventDefault(); insert(p.sym); }}>{p.sym}</button>
                ))}
              </div>
            </div>
          )}
          {IPA_CHART.map(sec => (
            <div className="ipa-palette-section" key={sec.group}>
              <div className="ipa-palette-head">{sec.group}</div>
              <div className="ipa-palette-grid">
                {sec.symbols.map((s, i) => (
                  <button key={sec.group + i} type="button" className="ipa-chip" onMouseDown={e => { e.preventDefault(); insert(s); }}>{disp(s)}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FieldEditor({ field, value, onChange, entries, templates, bodies, registeredNodes, imageFolder, dirHandle, calendar, selfEntryId, allFieldValues, tplFields, flash, ipaSymbols }) {
  const ftype = field.type;

  if (ftype === "text" && field.ipa) return <IpaTextInput value={value} onChange={onChange} placeholder={field.label} ipaSymbols={ipaSymbols} />;

  if (ftype === "text") return <WikiLinkInput value={value} onChange={onChange} entries={entries} templates={templates} bodies={bodies} placeholder={field.label} />;
  if (ftype === "number") return <input className="input" type="number" value={value || ""} onChange={e => onChange(e.target.value)} placeholder={field.label} />;
  if (ftype === "date") return <input className="input" type="date" value={value || ""} onChange={e => onChange(e.target.value)} />;
  if (ftype === "calendar-date") return <CalendarDateEditor value={value} onChange={onChange} calendar={calendar} allowApproximate={true} />;
  if (ftype === "calendar-date-range") return <CalendarDateRangeEditor value={value} onChange={onChange} calendar={calendar} />;
  if (ftype === "name-history") return <NameHistoryEditor value={value} onChange={onChange} calendar={calendar} />;
  if (ftype === "color") return <input className="input" type="color" value={value || "#888888"} onChange={e => onChange(e.target.value)} />;
  if (ftype === "url") return (
    <div className="input-row">
      <input className="input" type="url" value={value || ""} onChange={e => onChange(e.target.value)} placeholder="https://..." />
      {value && <a className="url-go" href={value} target="_blank" rel="noopener noreferrer">↗</a>}
    </div>
  );
  if (ftype === "tags") return <input className="input" placeholder="comma-separated..." value={value || ""} onChange={e => onChange(e.target.value)} />;
  if (ftype === "multiselect") return <MultiSelectEditor field={field} value={value} onChange={onChange} />;
  if (ftype === "select") {
    // v1.3: cascade-aware + Other-text-aware. When the field is a cascade child
    // (dependsOn), the dropdown options come from optionsByParent[parentValue];
    // when the parent has no value, the dropdown is disabled with a hint. When
    // otherTextField is true, the field carries an inline text input that
    // appears whenever "Other" is the dropdown's current value; the typed text
    // replaces "Other" in all display surfaces.
    const isCascadeChild = !!field.dependsOn;
    const hasOtherText = !!field.otherTextField;

    // Resolve the options list to show. Cascade children show optionsByParent
    // for the parent's current value; otherwise flat options[].
    let availableOptions;
    let parentValueStr = null;
    let parentField = null;
    if (isCascadeChild) {
      parentField = (tplFields || []).find(ff => ff.id === field.dependsOn) || null;
      parentValueStr = selectValueOnly(allFieldValues?.[field.dependsOn]);
      availableOptions = parentValueStr ? ((field.optionsByParent || {})[parentValueStr] || []) : [];
    } else {
      availableOptions = field.options || [];
    }
    // v1.3: when otherTextField is on, auto-inject "Other" if the author didn't
    // include it explicitly. Keeps the template definition minimal — users only
    // need to toggle the "Allow custom Other text" checkbox, not also manually
    // append "Other" to every options list (or every per-parent options list in
    // cascade case). No-op when "Other" is already present.
    if (hasOtherText && !availableOptions.includes("Other")) {
      availableOptions = [...availableOptions, "Other"];
    }

    // Resolve current dropdown selection + custom text portions.
    let dropdownValue, customText;
    if (hasOtherText) {
      if (value && typeof value === "object") {
        dropdownValue = value.value || "";
        customText = value.customText || "";
      } else {
        dropdownValue = (typeof value === "string" ? value : "") || "";
        customText = "";
      }
    } else {
      dropdownValue = (typeof value === "string" ? value : (value?.value || "")) || "";
      customText = "";
    }

    // If the stored value is not in the currently-available options, render the
    // dropdown as if empty (so the user picks fresh). The stored value persists
    // until they save — defensive normalize cleans it up then. This keeps the
    // editor from showing an invalid selection that's no longer in the dropdown.
    const visibleDropdownValue = availableOptions.includes(dropdownValue) ? dropdownValue : "";

    const cascadeDisabled = isCascadeChild && !parentValueStr;

    const handleDropdownChange = (newVal) => {
      if (hasOtherText) {
        // Switching away from "Other" clears any custom text. Switching TO "Other"
        // preserves whatever the user already typed (typically empty on first select).
        const nextCustom = newVal === "Other" ? customText : "";
        onChange({ value: newVal, customText: nextCustom });
      } else {
        onChange(newVal);
      }
    };

    const handleCustomTextChange = (newText) => {
      onChange({ value: "Other", customText: newText });
    };

    return (
      <>
        <select
          className="input"
          value={visibleDropdownValue}
          onChange={e => handleDropdownChange(e.target.value)}
          disabled={cascadeDisabled}
        >
          <option value="">— Select —</option>
          {availableOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        {cascadeDisabled && parentField && (
          <div className="field-hint">Select {parentField.label} first</div>
        )}
        {hasOtherText && dropdownValue === "Other" && (
          <input
            className="input cascade-other-text"
            value={customText}
            onChange={e => handleCustomTextChange(e.target.value)}
            placeholder={`Type a custom ${(field.label || "value").toLowerCase()}...`}
            maxLength={80}
          />
        )}
      </>
    );
  }
  if (ftype === "textarea") return <RichTextEditor value={value || ""} onChange={onChange} entries={entries} templates={templates} bodies={bodies} dirHandle={dirHandle} placeholder={field.label} flash={flash} />;
  if (ftype === "longform") return <LongformEditor value={value || ""} onChange={onChange} placeholder={field.label} />;
  if (ftype === "image") return <ImageFieldEditor value={value} onChange={onChange} imageFolder={imageFolder} dirHandle={dirHandle} flash={flash} />;
  if (ftype === "entry-ref") return <EntryRefEditor field={field} value={value} onChange={onChange} entries={entries} templates={templates} bodies={bodies} registeredNodes={registeredNodes} selfEntryId={selfEntryId} calendar={calendar} />;
  if (ftype === "grid") return <GridEditor field={field} value={value} onChange={onChange} entries={entries} templates={templates} bodies={bodies} registeredNodes={registeredNodes} selfEntryId={selfEntryId} calendar={calendar} />;
  if (ftype === "group") return <GroupEditor field={field} value={value || []} onChange={onChange} entries={entries} templates={templates} bodies={bodies} imageFolder={imageFolder} dirHandle={dirHandle} calendar={calendar} selfEntryId={selfEntryId} flash={flash} ipaSymbols={ipaSymbols} />;
  return <input className="input" value={value || ""} onChange={e => onChange(e.target.value)} />;
}

function AutoTextarea({ value, onChange, placeholder }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [value]);
  return <textarea ref={ref} className="input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} />;
}

function EntryRefEditor({ field, value, onChange, entries, templates, bodies, registeredNodes, selfEntryId, calendar }) {
  // v1.3: candidate set considers:
  //   - field.refTemplateId (legacy, single template) — filter entries to that template
  //   - field.refTemplatesId (v1.3, array) — filter to entries whose templateId is in the set
  //   - field.refFilters — per-target-template, restrict by a filter-field value
  //     (e.g., Astronomical Body entries with Type in [Planet, Moon, Asteroid])
  // Multi-template + filter combine: an entry must pass both checks.
  //
  // v1.5 r004: BODY_REF_SENTINEL in refTemplatesId / refTemplateId opts the
  // field in to selecting celestial bodies from state.celestialBodies.
  // Bodies are wrapped as synthetic entry-like objects (id, name, templateId
  // = sentinel, _isBody marker) so they flow through the existing candidate
  // pipeline. refFilters do not apply to bodies — kind-based filtering is
  // a v1.6 polish if ever needed.
  const tplById = useMemo(
    () => Object.fromEntries([...(templates || []), ...getRegisteredSyntheticTemplates()].map(t => [t.id, t])),
    [templates]
  );
  const candidates = useMemo(() => {
    let pool = entries;
    const synthBodies = () => (bodies || []).map(b => ({
      id: b.id,
      name: b.name || "(unnamed)",
      templateId: BODY_REF_SENTINEL,
      _isBody: true,
    }));
    // v1.5 Glossopoeia: generic registered-node candidates. Any node-source in
    // the registry other than bodies (bodies keep their own path above) whose
    // sentinel id is among the field's allowed targets contributes its
    // instances. `registeredNodes` is the precomputed getRegisteredGraphNodes
    // list, threaded from the form; on body-only callers it is absent and this
    // is a no-op, so the existing bodies behavior is untouched.
    const synthReg = (allowedSet) => (registeredNodes || [])
      .filter(n => n && n.templateId !== BODY_REF_SENTINEL && (!allowedSet || allowedSet.has(n.templateId)))
      .map(n => ({ id: n.id, name: n.name || "(unnamed)", templateId: n.templateId, _isSynth: true }));
    if (Array.isArray(field.refTemplatesId) && field.refTemplatesId.length > 0) {
      const allowed = new Set(field.refTemplatesId);
      pool = pool.filter(e => allowed.has(e.templateId));
      if (allowed.has(BODY_REF_SENTINEL)) {
        pool = pool.concat(synthBodies());
      }
      pool = pool.concat(synthReg(allowed));
    } else if (field.refTemplateId) {
      if (field.refTemplateId === BODY_REF_SENTINEL) {
        pool = synthBodies();
      } else if (getRegisteredSourceById(field.refTemplateId)) {
        pool = synthReg(new Set([field.refTemplateId]));
      } else {
        pool = pool.filter(e => e.templateId === field.refTemplateId);
      }
    }
    if (field.refFilters) {
      pool = pool.filter(e => {
        // Bodies and registered nodes bypass refFilters — they don't have
        // template fields to filter against.
        if (e._isBody || e._isSynth) return true;
        const tpl = tplById[e.templateId];
        if (!tpl) return false;
        const filterCfg = field.refFilters[tpl.name];
        if (!filterCfg || !filterCfg.fieldId || !Array.isArray(filterCfg.allowedValues)) return true;
        const targetVal = selectValueOnly(e.fields?.[filterCfg.fieldId]);
        return filterCfg.allowedValues.includes(targetVal);
      });
    }
    return pool.filter(e => e.id !== selfEntryId);  // self-references are never legitimate
  }, [entries, bodies, registeredNodes, field.refTemplatesId, field.refTemplateId, field.refFilters, selfEntryId, tplById]);
  const sorted = [...candidates].sort((a, b) => a.name.localeCompare(b.name));
  const isRelation = !!field.relationKind;
  const isSpouse = field.relationKind === SPOUSE_KIND;
  // v1.3: show template-name badge when this field can target multiple templates,
  // so the user can disambiguate "Eastwatch (Location)" from "Eastwatch (Astronomical Body)".
  // If the field also has a cascade pair on the target template, the badge surfaces
  // the resolved cascade display ("Eastwatch (Location - Town)").
  const isMultiTpl = Array.isArray(field.refTemplatesId) && field.refTemplatesId.length > 1;
  const formatEntryLabel = (e) => {
    if (!isMultiTpl) return e.name;
    // v1.5 r004: body entries show the BODY_REF_LABEL badge.
    if (e.templateId === BODY_REF_SENTINEL) return `${e.name} (${BODY_REF_LABEL})`;
    const tpl = tplById[e.templateId];
    if (!tpl) return e.name;
    // Look for a cascade pair (parent select with a dependsOn-pointing child select)
    // on the target template and compute the combined display.
    let cascadeSuffix = "";
    const fields = tpl.fields || [];
    // Find the first cascade child (any child counts; in practice a template has one)
    const childField = fields.find(ff => ff.type === "select" && ff.dependsOn);
    if (childField) {
      const parentField = fields.find(ff => ff.id === childField.dependsOn);
      if (parentField) {
        const parentVal = selectValueOnly(e.fields?.[parentField.id]);
        const childDisplay = formatSelectDisplay(e.fields?.[childField.id]);
        if (parentVal) {
          cascadeSuffix = childDisplay ? ` - ${parentVal} - ${childDisplay}` : ` - ${parentVal}`;
        }
      }
    }
    return `${e.name} (${tpl.name}${cascadeSuffix})`;
  };

  if (field.multi) {
    const items = isRelation
      ? getRelationValues(value, true)
      : (Array.isArray(value) ? value.filter(Boolean).map(id => ({ id })) : []);

    const commit = (next) => onChange(isRelation ? next : next.map(it => it.id));
    const removeAt = (i) => commit(items.filter((_, idx) => idx !== i));
    const addOne = (id) => {
      if (!id || items.some(it => it.id === id)) return;
      commit([...items, { id }]);
    };
    const updateLabel = (i, label) => {
      const next = items.map((it, idx) => idx === i ? { ...it, label } : it);
      commit(next);
    };
    // Spouse-only: edit marriedOn / endedOn calendar dates. Empty/null clears the field.
    const updateSpouseDate = (i, key, dateValue) => {
      const next = items.map((it, idx) => {
        if (idx !== i) return it;
        const updated = { ...it };
        if (dateValue && dateValue.year != null) updated[key] = dateValue;
        else delete updated[key];
        return updated;
      });
      commit(next);
    };
    const available = sorted.filter(e => !items.some(it => it.id === e.id));

    return (
      <>
        {items.map((it, i) => {
          // v1.5 r004: fall through to bodies for body-targeting fields.
          const ref = entries.find(e => e.id === it.id) || (bodies || []).find(b => b && b.id === it.id) || (registeredNodes || []).find(n => n && n.id === it.id);
          return (
            <div key={i} className={isSpouse ? "spouse-decl-block" : undefined}>
              <div className="ref-pick-row">
                <div className="input" style={{ display: "flex", alignItems: "center", color: ref ? "var(--text)" : "var(--text-dim)", flex: "2 1 160px" }}>
                  {ref ? formatEntryLabel(ref) : "(missing entry)"}
                </div>
                {isRelation && (
                  <input
                    className="input ref-override-input"
                    type="text"
                    value={it.label || ""}
                    onChange={e => updateLabel(i, e.target.value)}
                    placeholder={`(override "${field.label}")`}
                    title={`Override "${field.label}" for this specific reference`}
                  />
                )}
                {isSpouse && (
                  <select
                    className="input ref-status-select"
                    value={it.status || "active"}
                    onChange={e => commit(items.map((x, idx) => idx === i ? { ...x, status: e.target.value } : x))}
                    title="Marriage status"
                  >
                    <option value="active">Active</option>
                    <option value="former">Former</option>
                    <option value="estranged">Estranged</option>
                  </select>
                )}
                <button className="group-remove-btn" onClick={() => removeAt(i)} title="Remove">×</button>
              </div>
              {isSpouse && (
                <div className="spouse-dates-block">
                  <div className="cal-range-row">
                    <div className="cal-range-label">Married</div>
                    <CalendarDateEditor
                      value={it.marriedOn || null}
                      onChange={v => updateSpouseDate(i, "marriedOn", v)}
                      calendar={calendar}
                      allowApproximate={true}
                    />
                  </div>
                  <div className="cal-range-row">
                    <div className="cal-range-label">Ended</div>
                    <CalendarDateEditor
                      value={it.endedOn || null}
                      onChange={v => updateSpouseDate(i, "endedOn", v)}
                      calendar={calendar}
                      allowApproximate={true}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <select className="input" value="" onChange={e => addOne(e.target.value)}>
          <option value="">+ Add reference...</option>
          {available.map(e => <option key={e.id} value={e.id}>{formatEntryLabel(e)}</option>)}
        </select>
      </>
    );
  }

  // Single-value
  if (isRelation) {
    const item = (value && typeof value === "object" && value.id) ? value
                : (typeof value === "string" && value ? { id: value } : null);
    return (
      <div className="ref-pick-row" style={{ flexWrap: "wrap" }}>
        <select
          className="input"
          style={{ flex: "2 1 180px" }}
          value={item?.id || ""}
          onChange={e => {
            const id = e.target.value;
            if (!id) onChange(null);
            else onChange({ id, ...(item?.label ? { label: item.label } : {}) });
          }}
        >
          <option value="">— None —</option>
          {sorted.map(e => <option key={e.id} value={e.id}>{formatEntryLabel(e)}</option>)}
        </select>
        {item?.id && (
          <input
            className="input ref-override-input"
            type="text"
            value={item.label || ""}
            onChange={e => onChange({ id: item.id, label: e.target.value })}
            placeholder={`(override "${field.label}")`}
            title={`Override "${field.label}" for this reference`}
          />
        )}
      </div>
    );
  }

  return (
    <select className="input" value={value || ""} onChange={e => onChange(e.target.value)}>
      <option value="">— None —</option>
      {sorted.map(e => <option key={e.id} value={e.id}>{formatEntryLabel(e)}</option>)}
    </select>
  );
}

// GridEditor (v1.5) — per-entry 2D grid. Axes (rows + columns) are defined on
// each entry; cell scalars are typed by the field's cellType (text | number |
// entry-ref). Stateless/value-derived like GroupEditor: every mutation rebuilds
// the value via coerceGridValue + onChange. Cells key off stable row/col ids so
// rename/reorder never disturbs bindings.
function GridEditor({ field, value, onChange, entries, templates, bodies, registeredNodes, selfEntryId, calendar }) {
  const g = coerceGridValue(value);

  const commit = (next) => onChange(coerceGridValue(next));
  const clone = () => ({
    rowAxisLabel: g.rowAxisLabel, colAxisLabel: g.colAxisLabel,
    rows: g.rows.map(r => ({ ...r })), cols: g.cols.map(c => ({ ...c })),
    cells: JSON.parse(JSON.stringify(g.cells)),
  });

  const setRowAxisLabel = (v) => { const n = clone(); n.rowAxisLabel = v; commit(n); };
  const setColAxisLabel = (v) => { const n = clone(); n.colAxisLabel = v; commit(n); };
  const addRow = () => { const n = clone(); n.rows.push({ id: genId(), label: "" }); commit(n); };
  const addCol = () => { const n = clone(); n.cols.push({ id: genId(), label: "" }); commit(n); };
  const renameRow = (rid, label) => { const n = clone(); const r = n.rows.find(x => x.id === rid); if (r) r.label = label; commit(n); };
  const renameCol = (cid, label) => { const n = clone(); const c = n.cols.find(x => x.id === cid); if (c) c.label = label; commit(n); };

  const rowHasData = (rid) => g.cells[rid] && Object.values(g.cells[rid]).some(c => !gridCellIsEmpty(c));
  const colHasData = (cid) => Object.keys(g.cells).some(rid => !gridCellIsEmpty(g.cells[rid]?.[cid]));

  const deleteRow = (rid) => {
    if (rowHasData(rid) && !window.confirm("Delete this row and its cell values?")) return;
    const n = clone(); n.rows = n.rows.filter(r => r.id !== rid); delete n.cells[rid]; commit(n);
  };
  const deleteCol = (cid) => {
    if (colHasData(cid) && !window.confirm("Delete this column and its cell values?")) return;
    const n = clone(); n.cols = n.cols.filter(c => c.id !== cid);
    Object.keys(n.cells).forEach(rid => { if (n.cells[rid]) delete n.cells[rid][cid]; });
    commit(n);
  };
  const moveRow = (rid, dir) => {
    const n = clone(); const i = n.rows.findIndex(r => r.id === rid); const j = i + dir;
    if (i < 0 || j < 0 || j >= n.rows.length) return;
    [n.rows[i], n.rows[j]] = [n.rows[j], n.rows[i]]; commit(n);
  };
  const moveCol = (cid, dir) => {
    const n = clone(); const i = n.cols.findIndex(c => c.id === cid); const j = i + dir;
    if (i < 0 || j < 0 || j >= n.cols.length) return;
    [n.cols[i], n.cols[j]] = [n.cols[j], n.cols[i]]; commit(n);
  };
  const setCellType = (rid, cid, type) => {
    const n = clone();
    if (!n.cells[rid]) n.cells[rid] = {};
    n.cells[rid][cid] = makeGridCell(type);   // clear-on-switch
    commit(n);
  };
  const setCellValue = (rid, cid, val) => {
    const n = clone();
    const cur = n.cells[rid]?.[cid];
    const type = cur && GRID_CELL_TYPE_SET.has(cur.type) ? cur.type : "text";
    if (!n.cells[rid]) n.cells[rid] = {};
    n.cells[rid][cid] = { type, value: val };
    commit(n);   // coerce drops text+empty, keeps non-text type choices even when blank
  };

  // Ref cells target ANY entry or registered node (Lexeme, Phoneme, etc.). A
  // grid field may scope them via field.cellRefTemplatesId (e.g. the Corpus
  // interlinear limits word cells to Lexemes); otherwise the picker is open.
  const synthRefField = { type: "entry-ref", label: "", multi: false };
  if (field && Array.isArray(field.cellRefTemplatesId) && field.cellRefTemplatesId.length) synthRefField.refTemplatesId = field.cellRefTemplatesId;
  const renderCellInput = (rid, cid, cell) => {
    const t = cell.type;
    if (t === "number") return <input className="input" type="number" value={cell.value == null ? "" : cell.value} onChange={e => setCellValue(rid, cid, e.target.value)} />;
    if (t === "entry-ref") return <EntryRefEditor field={synthRefField} value={typeof cell.value === "string" ? cell.value : ""} onChange={v => setCellValue(rid, cid, v)} entries={entries} templates={templates} bodies={bodies} registeredNodes={registeredNodes} selfEntryId={selfEntryId} calendar={calendar} />;
    if (t === "calendar-date") return <CalendarDateEditor value={cell.value} onChange={v => setCellValue(rid, cid, v)} calendar={calendar} allowApproximate={true} />;
    if (t === "calendar-date-range") return <CalendarDateRangeEditor value={cell.value} onChange={v => setCellValue(rid, cid, v)} calendar={calendar} />;
    return <input className="input" value={cell.value == null ? "" : cell.value} onChange={e => setCellValue(rid, cid, e.target.value)} />;
  };
  const renderCell = (rid, cid) => {
    const cell = g.cells[rid]?.[cid] || { type: "text", value: "" };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <select className="input" style={{ fontSize: "0.78em", padding: "1px 4px" }} value={cell.type} onChange={e => setCellType(rid, cid, e.target.value)}>
          {GRID_CELL_TYPES.map(t => <option key={t} value={t}>{GRID_CELL_TYPE_LABELS[t]}</option>)}
        </select>
        {renderCellInput(rid, cid, cell)}
      </div>
    );
  };

  const miniBtn = { background: "none", border: "1px solid var(--border)", color: "var(--text-dim)", cursor: "pointer", borderRadius: 3, padding: "0 5px", lineHeight: 1.6, fontSize: "0.8em" };
  const hdrInput = { width: "100%", boxSizing: "border-box", fontWeight: 600 };

  return (
    <div className="grid-field-editor" style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 4, padding: 8 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <label style={{ fontSize: "0.85em", color: "var(--text-dim)" }}>
          Row axis name
          <input className="input" style={{ marginTop: 2 }} value={g.rowAxisLabel} onChange={e => setRowAxisLabel(e.target.value)} placeholder="(optional, e.g. Case)" />
        </label>
        <label style={{ fontSize: "0.85em", color: "var(--text-dim)" }}>
          Column axis name
          <input className="input" style={{ marginTop: 2 }} value={g.colAxisLabel} onChange={e => setColAxisLabel(e.target.value)} placeholder="(optional, e.g. Number)" />
        </label>
      </div>

      {g.rows.length === 0 && g.cols.length === 0 ? (
        <div className="field-hint" style={{ marginBottom: 8 }}>Add a row and a column to start the grid.</div>
      ) : (
        <table style={{ borderCollapse: "collapse", minWidth: "100%" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid var(--border)", padding: 4, minWidth: 120, color: "var(--text-dim)", fontSize: "0.8em", textAlign: "left", verticalAlign: "bottom" }}>
                {g.colAxisLabel && <div style={{ textAlign: "center" }}>{g.colAxisLabel} →</div>}
                {g.rowAxisLabel && <div>↓ {g.rowAxisLabel}</div>}
              </th>
              {g.cols.map((c, ci) => (
                <th key={c.id} style={{ border: "1px solid var(--border)", padding: 4, minWidth: 130 }}>
                  <input className="input" style={hdrInput} value={c.label} onChange={e => renameCol(c.id, e.target.value)} placeholder={`Col ${ci + 1}`} />
                  <div style={{ display: "flex", gap: 3, justifyContent: "center", marginTop: 3 }}>
                    <button style={miniBtn} onClick={() => moveCol(c.id, -1)} disabled={ci === 0} title="Move left">‹</button>
                    <button style={miniBtn} onClick={() => moveCol(c.id, 1)} disabled={ci === g.cols.length - 1} title="Move right">›</button>
                    <button style={miniBtn} onClick={() => deleteCol(c.id)} title="Delete column">×</button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {g.rows.map((r, ri) => (
              <tr key={r.id}>
                <th style={{ border: "1px solid var(--border)", padding: 4, minWidth: 120, textAlign: "left" }}>
                  <input className="input" style={hdrInput} value={r.label} onChange={e => renameRow(r.id, e.target.value)} placeholder={`Row ${ri + 1}`} />
                  <div style={{ display: "flex", gap: 3, marginTop: 3 }}>
                    <button style={miniBtn} onClick={() => moveRow(r.id, -1)} disabled={ri === 0} title="Move up">▲</button>
                    <button style={miniBtn} onClick={() => moveRow(r.id, 1)} disabled={ri === g.rows.length - 1} title="Move down">▼</button>
                    <button style={miniBtn} onClick={() => deleteRow(r.id)} title="Delete row">×</button>
                  </div>
                </th>
                {g.cols.map(c => (
                  <td key={c.id} style={{ border: "1px solid var(--border)", padding: 4, verticalAlign: "top" }}>
                    {renderCell(r.id, c.id)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button className="btn btn-ghost" onClick={addRow}>+ Row</button>
        <button className="btn btn-ghost" onClick={addCol}>+ Column</button>
      </div>
    </div>
  );
}

function GroupEditor({ field, value, onChange, entries, templates, bodies, imageFolder, dirHandle, calendar, selfEntryId, flash, ipaSymbols }) {
  const instances = Array.isArray(value) ? value : [];
  const subfields = field.subfields || [];

  const addInstance = () => {
    const blank = {};
    subfields.forEach(sf => {
      if (sf.type === "entry-ref" && sf.multi) blank[sf.id] = [];
      else if (sf.type === "group") blank[sf.id] = [];
      else if (sf.type === "name-history") blank[sf.id] = [];
      else if (sf.type === "multiselect") blank[sf.id] = [];
      else if (sf.type === "tags") blank[sf.id] = "";
      else blank[sf.id] = "";
    });
    onChange([...instances, blank]);
  };
  const removeAt = (i) => onChange(instances.filter((_, idx) => idx !== i));
  const updateAt = (i, sfid, val) => {
    onChange(instances.map((inst, idx) => idx === i ? { ...inst, [sfid]: val } : inst));
  };

  return (
    <div className="group-builder">
      {instances.map((inst, i) => (
        <div key={i} className="group-instance-form">
          <div className="group-instance-hdr">
            <span className="group-instance-num">#{i + 1}</span>
            <button className="group-remove-btn" onClick={() => removeAt(i)} title="Remove">×</button>
          </div>
          {subfields.map(sf => {
            // v1.3: showWhen conditional visibility evaluated against this
            // group instance's values (not the top-level entry's). Cascade
            // children also work this way at runtime.
            if (!isFieldVisible(sf, inst)) return null;
            return (
            <div key={sf.id} className="form-field" style={{ marginBottom: 10 }}>
              <label className="form-label">
                <FieldLabelText field={sf} templates={templates} />
                {sf.required && <span className="required-mark" title="Required">*</span>}
              </label>
              <FieldEditor field={sf} value={inst[sf.id]} onChange={(v) => updateAt(i, sf.id, v)} entries={entries} templates={templates} bodies={bodies} imageFolder={imageFolder} dirHandle={dirHandle} calendar={calendar} selfEntryId={selfEntryId} allFieldValues={inst} tplFields={field.subfields || []} flash={flash} ipaSymbols={ipaSymbols} />
            </div>
            );
          })}
        </div>
      ))}
      <button className="group-add-btn" onClick={addInstance}>+ Add {subfields.length === 0 ? "instance" : (instances.length === 0 ? "first" : "another")}</button>
      {subfields.length === 0 && <div className="image-hint" style={{ marginTop: 6 }}>This group has no subfields defined yet — edit the template to add some.</div>}
    </div>
  );
}

// ─── Longform + rich text editor ───────────────────────────────────────────────

function LongformEditor({ value, onChange, placeholder }) {
  const ref = useRef(null);
  const v = value || "";
  const insertLineStart = (text) => {
    const ta = ref.current; if (!ta) return;
    const pos = ta.selectionStart;
    const ls = v.lastIndexOf("\n", pos - 1) + 1;
    onChange(v.slice(0, ls) + text + v.slice(ls));
    requestAnimationFrame(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = pos + text.length; });
  };
  const insertAtCursor = (text) => {
    const ta = ref.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    onChange(v.slice(0, s) + text + v.slice(e));
    requestAnimationFrame(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = s + text.length; });
  };
  return (
    <div className="longform-editor">
      <div className="longform-toolbar">
        <button type="button" className="longform-btn" title="Indent this line by 5 spaces" onClick={() => insertLineStart("     ")}>⇥ Indent</button>
        <button type="button" className="longform-btn" title="Insert a divider / page break" onClick={() => insertAtCursor("\n\f\n")}>— Divider</button>
      </div>
      <textarea
        ref={ref}
        className="longform-textarea"
        value={v}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function RichTextEditor({ value, onChange, entries, templates, bodies, dirHandle, onRequestFolderSetup, placeholder, onOpenEntry, flash }) {
  const taRef = useRef(null);
  const wrapperRef = useRef(null);
  const [showPreview, setShowPreview] = useState(false);
  const [wikiPopup, setWikiPopup] = useState(null);  // { x, y, query, candidates, activeIdx }

  const v = value || "";

  // Auto-grow
  useEffect(() => {
    if (!showPreview && taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = (taRef.current.scrollHeight + 2) + "px";
    }
  }, [v, showPreview]);

  const wrapSel = (before, after = before) => {
    const ta = taRef.current;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = v.substring(s, e);
    const next = v.substring(0, s) + before + sel + after + v.substring(e);
    onChange(next);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(s + before.length, e + before.length);
    }, 0);
  };

  const prefixLines = (prefix) => {
    const ta = taRef.current;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    let lineStart = v.lastIndexOf("\n", s - 1) + 1;
    let lineEnd = v.indexOf("\n", e);
    if (lineEnd === -1) lineEnd = v.length;
    const block = v.substring(lineStart, lineEnd);
    // Toggle: if all lines already have prefix, strip it; else add it
    const lines = block.split("\n");
    const allHave = lines.every(l => l.startsWith(prefix));
    const nextBlock = allHave
      ? lines.map(l => l.substring(prefix.length)).join("\n")
      : lines.map(l => prefix + l).join("\n");
    const next = v.substring(0, lineStart) + nextBlock + v.substring(lineEnd);
    onChange(next);
    setTimeout(() => { ta.focus(); }, 0);
  };

  const insertAtCursor = (text, cursorOffset) => {
    const ta = taRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const next = v.substring(0, s) + text + v.substring(ta.selectionEnd);
    onChange(next);
    setTimeout(() => {
      ta.focus();
      const pos = cursorOffset != null ? s + cursorOffset : s + text.length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const insertImage = async () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const altText = file.name.replace(/\.[^.]+$/, "");

      // Try FSAA first
      if (dirHandle) {
        const ok = await verifyHandlePermission(dirHandle);
        if (ok) {
          try {
            const filename = await generateUniqueFilename(dirHandle, file.name);
            const fh = await dirHandle.getFileHandle(filename, { create: true });
            const writable = await fh.createWritable();
            await writable.write(file);
            await writable.close();
            insertAtCursor(`\n\n![${altText}](${filename})\n\n`);
            return;
          } catch (err) {
            console.error("FSAA write failed, falling back to base64", err);
          }
        }
      }

      // Fallback: base64 inline
      // Warn if the file is large
      if (file.size > 800 * 1024) {
        const proceed = confirm(`This image is ${(file.size / 1024).toFixed(0)} KB. Without an image folder set up, it will be embedded directly in your save file (which makes the save file much larger). Continue?\n\nTip: cancel and set up an image folder in Settings to keep save files small.`);
        if (!proceed) return;
      }
      try {
        const dataUrl = await fileToDataUrl(file);
        insertAtCursor(`\n\n![${altText}](${dataUrl})\n\n`);
      } catch (err) {
        if (flash) flash("Failed to read image: " + err.message, "error");
        else console.error("Failed to read image:", err);
      }
    };
    fileInput.click();
  };

  // Wiki-link autocomplete: when user types `[[`, show entry picker
  const handleKeyUp = (e) => {
    const ta = taRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart;
    const before = v.substring(0, cursor);
    const m = before.match(/\[\[([^\]\n|]*)$/);
    if (m) {
      const query = m[1].toLowerCase();
      // Build candidates: primary-name matches first, then name-history matches.
      // Each candidate carries displayName (what the user sees in the popup) and
      // insertName (what gets inserted into the link). For primary matches both
      // are entry.name. For history matches, displayName is the historical name
      // (so the user picks the version they wanted) and insertName is the same
      // historical name (so [[New Amsterdam]] resolves correctly via the
      // history-fallback path in MarkdownDisplay).
      const seen = new Set();
      const candidates = [];
      entries.forEach(en => {
        if (!en.name) return;
        if (en.name.toLowerCase().includes(query)) {
          candidates.push({ entry: en, displayName: en.name, insertName: en.name, viaHistory: false });
          seen.add(en.id + ":" + en.name.toLowerCase());
        }
      });
      if (Array.isArray(templates)) {
        const tplById = Object.fromEntries(templates.map(t => [t.id, t]));
        entries.forEach(en => {
          const tpl = tplById[en.templateId];
          getEntryNameHistory(en, tpl).forEach(altName => {
            if (!altName.toLowerCase().includes(query)) return;
            const key = en.id + ":" + altName.toLowerCase();
            if (seen.has(key)) return;
            // Don't add a history-name candidate if the primary name already
            // matched and is identical (case-insensitive).
            if (en.name && en.name.toLowerCase() === altName.toLowerCase()) return;
            candidates.push({ entry: en, displayName: altName, insertName: altName, viaHistory: true });
            seen.add(key);
          });
        });
      }
      // r026: body candidates as a third tier. Primary body name + comma-
      // split "Other Names" aliases. Body matches sit below all entry
      // matches in popup order so entries always rank first.
      (bodies || []).forEach(b => {
        if (!b || !b.name) return;
        if (b.name.toLowerCase().includes(query)) {
          const key = b.id + ":" + b.name.toLowerCase();
          if (!seen.has(key)) {
            candidates.push({ entry: b, displayName: b.name, insertName: b.name, viaHistory: false, isBody: true });
            seen.add(key);
          }
        }
        if (typeof b.otherNames === "string" && b.otherNames.trim()) {
          b.otherNames.split(",").forEach(alias => {
            const trimmed = alias.trim();
            if (!trimmed) return;
            if (!trimmed.toLowerCase().includes(query)) return;
            const key = b.id + ":" + trimmed.toLowerCase();
            if (seen.has(key)) return;
            if (b.name && b.name.toLowerCase() === trimmed.toLowerCase()) return;
            candidates.push({ entry: b, displayName: trimmed, insertName: trimmed, viaHistory: true, isBody: true });
            seen.add(key);
          });
        }
      });
      const slicedCandidates = candidates.slice(0, 8);
      if (slicedCandidates.length > 0) {
        // Position popup using viewport coords. The popup renders via portal
        // (see render below) so it floats free of any ancestor clipping;
        // fixed positioning means we use rect.left / rect.bottom directly.
        //
        // Flip-up: if there's not enough room below the textarea, render
        // above instead. The popup's max-height is 240px (CSS); we use that
        // as the height budget rather than measuring the actual rendered
        // popup, which would require a layout pass we don't have here. This
        // overestimates required space when the popup has fewer items but
        // that's safe — flipping up sooner is fine.
        const POPUP_MAX_H = 240;
        const GAP = 4;
        const rect = ta.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const flipUp = spaceBelow < POPUP_MAX_H + GAP && rect.top > spaceBelow;
        const y = flipUp ? rect.top - GAP : rect.bottom + GAP;
        setWikiPopup({
          x: rect.left,
          y,
          flipUp,
          query, candidates: slicedCandidates, activeIdx: 0,
          matchStart: cursor - m[1].length,
          matchEnd: cursor,
        });
        return;
      }
    }
    setWikiPopup(null);
  };

  const acceptWikiSuggestion = (entryName) => {
    if (!wikiPopup) return;
    const ta = taRef.current;
    const before = v.substring(0, wikiPopup.matchStart);
    const after = v.substring(wikiPopup.matchEnd);
    // Need to also consume the trailing `]]` if user already typed them; otherwise add them.
    const afterStartsWithCloser = after.startsWith("]]");
    const insertion = entryName + (afterStartsWithCloser ? "" : "]]");
    const next = before + insertion + after;
    onChange(next);
    setWikiPopup(null);
    setTimeout(() => {
      ta.focus();
      const pos = before.length + insertion.length + (afterStartsWithCloser ? 2 : 0);
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleKeyDown = (e) => {
    // Wiki popup nav
    if (wikiPopup) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setWikiPopup(p => ({ ...p, activeIdx: (p.activeIdx + 1) % p.candidates.length }));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setWikiPopup(p => ({ ...p, activeIdx: (p.activeIdx - 1 + p.candidates.length) % p.candidates.length }));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        acceptWikiSuggestion(wikiPopup.candidates[wikiPopup.activeIdx].insertName);
        return;
      }
      if (e.key === "Escape") { e.preventDefault(); setWikiPopup(null); return; }
    }
    // Markdown shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "b") { e.preventDefault(); wrapSel("**"); }
      else if (e.key === "i") { e.preventDefault(); wrapSel("*"); }
      else if (e.key === "k") { e.preventDefault(); insertAtCursor("[](url)", 1); }
    }
  };

  return (
    <div className="rich-editor" ref={wrapperRef} style={{ position: "relative" }}>
      <div className="rich-toolbar">
        <button type="button" className="rt-btn" onClick={() => wrapSel("**")} title="Bold (Ctrl+B)"><b>B</b></button>
        <button type="button" className="rt-btn" onClick={() => wrapSel("*")} title="Italic (Ctrl+I)"><i>I</i></button>
        <span className="rt-sep" />
        <button type="button" className="rt-btn" onClick={() => prefixLines("## ")} title="Heading">H</button>
        <button type="button" className="rt-btn" onClick={() => prefixLines("### ")} title="Sub-heading" style={{ fontSize: 12 }}>H₃</button>
        <span className="rt-sep" />
        <button type="button" className="rt-btn" onClick={() => prefixLines("- ")} title="Bullet list">•</button>
        <button type="button" className="rt-btn" onClick={() => prefixLines("1. ")} title="Numbered list" style={{ fontSize: 12 }}>1.</button>
        <button type="button" className="rt-btn" onClick={() => prefixLines("> ")} title="Quote">"</button>
        <span className="rt-sep" />
        <button type="button" className="rt-btn" onClick={() => insertAtCursor("[[]]", 2)} title="Wiki link to entry: [[Name]] or [[Name|custom label]]" style={{ fontSize: 12 }}>[[ ]]</button>
        <button type="button" className="rt-btn" onClick={() => insertAtCursor("[text](url)", 1)} title="External link (Ctrl+K)">↗</button>
        <button type="button" className="rt-btn" onClick={insertImage} title="Insert image">🖼</button>
        <span className="rt-sep" />
        <button type="button" className="rt-btn" onClick={() => wrapSel("`")} title="Inline code" style={{ fontSize: 12 }}>{"</>"}</button>
        <span style={{ flex: 1 }} />
        <button type="button" className={`rt-btn ${showPreview ? "active" : ""}`} onClick={() => setShowPreview(!showPreview)} title="Toggle preview" style={{ fontSize: 12 }}>{showPreview ? "Edit" : "Preview"}</button>
      </div>

      {showPreview ? (
        <div className="rich-preview">
          <MarkdownDisplay markdown={v} entries={entries} templates={templates} bodies={bodies} onOpenEntry={onOpenEntry || (() => {})} dirHandle={dirHandle} />
        </div>
      ) : (
        <textarea
          ref={taRef}
          className="rich-textarea"
          value={v}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onClick={handleKeyUp}
          placeholder={placeholder || ""}
          rows={4}
        />
      )}

      {wikiPopup && !showPreview && ReactDOM.createPortal(
        <div
          className="wikilink-popup"
          style={{
            left: wikiPopup.x,
            top: wikiPopup.y,
            // When flipUp is set, wikiPopup.y is the desired BOTTOM edge;
            // translate so the popup grows upward from that point.
            transform: wikiPopup.flipUp ? "translateY(-100%)" : undefined,
          }}
        >
          {wikiPopup.candidates.map((c, i) => (
            <div
              key={c.entry.id + ":" + c.displayName}
              className={`wikilink-opt ${i === wikiPopup.activeIdx ? "active" : ""}`}
              onMouseDown={(ev) => { ev.preventDefault(); acceptWikiSuggestion(c.insertName); }}
              onMouseEnter={() => setWikiPopup(p => ({ ...p, activeIdx: i }))}
              title={
                c.isBody
                  ? (c.viaHistory ? `Other name for body "${c.entry.name}"` : "Celestial body")
                  : (c.viaHistory ? `Former name of "${c.entry.name}"` : null)
              }
            >
              <span className="wikilink-opt-icon">{c.isBody ? "◉" : "◈"}</span>
              <span>{c.displayName}</span>
              {c.viaHistory && (
                <span className="wikilink-opt-history-hint"> → {c.entry.name}</span>
              )}
              {c.isBody && !c.viaHistory && (
                <span className="wikilink-opt-tmpl">body</span>
              )}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Calendar date editor ──────────────────────────────────────────────────────

function CalendarDateEditor({ value, onChange, calendar, allowApproximate }) {
  const cal = calendar || DEFAULT_CALENDAR;
  const months = cal.months || [];
  // A date is "set" only when year is a real number. Without a year the date
  // is null — the month/day pickers are hidden so the user can't accidentally
  // produce a {year:null, monthIndex:0, day:1} zombie by tabbing through empty
  // inputs. The year field is the sole gate for transitioning null → set.
  const isSet = !!value && value.year != null;
  const v = isSet ? value : null;
  const monthIdx = v ? Math.max(0, Math.min(v.monthIndex ?? 0, Math.max(0, months.length - 1))) : 0;
  const monthDays = months[monthIdx]?.days || 30;
  const safeDay = v ? Math.max(1, Math.min(v.day || 1, monthDays)) : 1;

  // Year is the transition: typing a year goes null → set; clearing the year
  // goes set → null. Month/day/approx mutations are inert when not set.
  const setYear = (yearStr) => {
    if (yearStr === "") { onChange(null); return; }
    const year = parseInt(yearStr);
    if (Number.isNaN(year)) return;
    if (!isSet) onChange({ year, monthIndex: 0, day: 1 });
    else onChange({ ...v, year });
  };
  const setDay = (dayStr) => {
    if (!isSet) return;
    const day = parseInt(dayStr) || 1;
    onChange({ ...v, day });
  };
  const setMonth = (mStr) => {
    if (!isSet) return;
    const monthIndex = parseInt(mStr);
    const newDays = months[monthIndex]?.days || 30;
    const next = { ...v, monthIndex };
    if (next.day > newDays) next.day = newDays;
    onChange(next);
  };
  const setApprox = (b) => {
    if (!isSet) return;
    onChange({ ...v, approximate: b });
  };
  const clear = () => onChange(null);

  return (
    <div>
      <div className="cal-date-input">
        {isSet && (
          <input
            className="input cal-day"
            type="number" min={1} max={monthDays}
            placeholder="Day"
            value={safeDay}
            onChange={e => setDay(e.target.value)}
          />
        )}
        {isSet && (
          <select
            className="input cal-month"
            value={monthIdx}
            onChange={e => setMonth(e.target.value)}
          >
            {months.map((m, i) => <option key={i} value={i}>{m.name}</option>)}
          </select>
        )}
        <input
          className="input cal-year"
          type="number"
          placeholder="Year"
          value={v?.year ?? ""}
          onChange={e => setYear(e.target.value)}
        />
        {isSet && allowApproximate && (
          <label className="cal-approx-toggle" title="Mark as approximate (~). Use for fuzzy historical dates.">
            <input
              type="checkbox"
              checked={!!v.approximate}
              onChange={e => setApprox(e.target.checked)}
            />
            <span>~</span>
          </label>
        )}
        {isSet && (
          <button type="button" className="btn btn-ghost" onClick={clear} title="Clear date">×</button>
        )}
      </div>
      {isSet && (
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
          → {v.approximate ? "~" : ""}{formatCalendarDate(v, cal)}
        </div>
      )}
    </div>
  );
}

function CalendarDateRangeEditor({ value, onChange, calendar }) {
  const cal = calendar || DEFAULT_CALENDAR;
  const v = value || { start: null, end: null };
  // When both halves are cleared, normalize the whole range to null. Otherwise
  // a {start: null, end: null} shape lingers — technically empty but treated
  // as "value present" by some downstream code, and confuses users who think
  // they cleared the period entirely.
  const updateStart = (start) => {
    if (start == null && v.end == null) onChange(null);
    else onChange({ ...v, start });
  };
  const updateEnd = (end) => {
    if (end == null && v.start == null) onChange(null);
    else onChange({ ...v, end });
  };
  return (
    <div className="cal-range-editor">
      <div className="cal-range-row">
        <div className="cal-range-label">Start</div>
        <CalendarDateEditor value={v.start} onChange={updateStart} calendar={cal} allowApproximate={true} />
      </div>
      <div className="cal-range-row">
        <div className="cal-range-label">End</div>
        <CalendarDateEditor value={v.end} onChange={updateEnd} calendar={cal} allowApproximate={true} />
      </div>
    </div>
  );
}

// Editor for name-history fields: a list of {name, from?, to?} entries that
// record what an entry was called over time. Each row has a name input and
// optional from/to calendar-date pickers. New rows are added at the end with
// empty values; remove via × button on each row. Empty rows (no name typed)
// are filtered out on save by the migrate normalization pass.
function NameHistoryEditor({ value, onChange, calendar }) {
  const cal = calendar || DEFAULT_CALENDAR;
  const items = Array.isArray(value) ? value : [];
  const updateAt = (i, patch) => {
    const next = items.map((item, idx) => idx === i ? { ...item, ...patch } : item);
    onChange(next);
  };
  const removeAt = (i) => onChange(items.filter((_, idx) => idx !== i));
  const addRow = () => onChange([...items, { name: "", from: null, to: null }]);
  return (
    <div className="name-history-editor">
      {items.length === 0 && (
        <div className="name-history-empty">
          No former names recorded. Use this for renames over time
          (e.g. New Amsterdam → New York, or maiden → married surname).
        </div>
      )}
      {items.map((item, i) => (
        <div key={i} className="name-history-row">
          <div className="name-history-row-hdr">
            <input
              className="input"
              value={item.name || ""}
              onChange={e => updateAt(i, { name: e.target.value })}
              placeholder="Name (e.g. New Amsterdam)"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => removeAt(i)}
              title="Remove this name"
            >×</button>
          </div>
          <div className="name-history-row-dates">
            <div className="name-history-date-block">
              <div className="name-history-date-label">From <span style={{ color: "var(--text-dim)", fontSize: 10, fontWeight: 400, fontStyle: "italic" }}>(optional)</span></div>
              <CalendarDateEditor
                value={item.from}
                onChange={(v) => updateAt(i, { from: v })}
                calendar={cal}
                allowApproximate={true}
              />
            </div>
            <div className="name-history-date-block">
              <div className="name-history-date-label">To <span style={{ color: "var(--text-dim)", fontSize: 10, fontWeight: 400, fontStyle: "italic" }}>(optional)</span></div>
              <CalendarDateEditor
                value={item.to}
                onChange={(v) => updateAt(i, { to: v })}
                calendar={cal}
                allowApproximate={true}
              />
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-small" onClick={addRow} style={{ marginTop: 8 }}>
        + Add former name
      </button>
    </div>
  );
}
