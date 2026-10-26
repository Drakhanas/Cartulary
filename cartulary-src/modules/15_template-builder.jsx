
// ─── Template builder ──────────────────────────────────────────────────────────

// Local-state input for select-field options. The naive controlled input
// (parse-on-keystroke, re-render from array) eats commas and trailing spaces
// because the parsed-and-filtered array round-trips through .join() on
// every render — typing the separator produces ["A", ""], filter drops the
// empty, display loses the separator before the user can type the next
// token. Solution: maintain the raw string locally and only commit the
// parsed array on blur.
//
// Separator is "|" (pipe) rather than "," (comma) so option text can
// itself contain commas, e.g. "Foo, Inc." or "Captain, Wardens" — useful
// for org charts and formal titles. The data is stored as an array of
// strings; the separator is purely a UI input convention and exists only
// in this component.
function SelectOptionsInput({ value, onCommit, placeholder, style }) {
  const initial = (value || []).join(" | ");
  const [str, setStr] = useState(initial);
  // Sync local state if the canonical value changes externally (template
  // switch, undo, etc.). Compare by serialization since the array identity
  // doesn't matter — only its contents.
  useEffect(() => { setStr((value || []).join(" | ")); }, [JSON.stringify(value || [])]);
  return (
    <input
      className="input"
      style={style}
      placeholder={placeholder}
      value={str}
      onChange={e => setStr(e.target.value)}
      onBlur={() => {
        const parsed = str.split("|").map(s => s.trim()).filter(Boolean);
        onCommit(parsed);
      }}
    />
  );
}

// Per-parent-value options matrix for a cascade-select child field.
// Renders one row per option in the parent field, each with its own
// SelectOptionsInput. Result is committed to `optionsByParent` keyed by the
// parent's option string (e.g. optionsByParent["Settlement"] = ["Camp", "Town", ...]).
//
// If the parent has no options yet (user setting up the parent), shows a hint
// to add parent options first. Editing a parent option's name in the parent
// field LEAVES the corresponding optionsByParent entry under the old key (the
// matrix re-renders empty for the new key, the old key becomes dormant data).
// User can manually clean up by clearing all dependsOn config; that's an edge
// case rare enough to not auto-rewire.
function CascadeOptionsInput({ field, parentField, onCommit }) {
  const parentOptions = (parentField && Array.isArray(parentField.options)) ? parentField.options : [];
  const obp = field.optionsByParent || {};
  if (parentOptions.length === 0) {
    return (
      <div className="tpl-cascade-hint">
        Add options to the parent field "{parentField?.label || "?"}" first, then return to set per-parent options here.
      </div>
    );
  }
  return (
    <div className="tpl-cascade-matrix">
      <div className="tpl-cascade-label">Options per parent value:</div>
      {parentOptions.map(parentVal => (
        <div key={parentVal} className="tpl-cascade-row">
          <div className="tpl-cascade-parent-val">{parentVal}</div>
          <SelectOptionsInput
            value={obp[parentVal] || []}
            onCommit={(opts) => onCommit({ ...obp, [parentVal]: opts })}
            placeholder={`Options when ${parentField.label} = ${parentVal}`}
            style={{ flex: 1 }}
          />
        </div>
      ))}
    </div>
  );
}

// Multi-template entry-ref configuration. Allows the user to check off any
// number of target templates and, for each, optionally filter to entries
// whose specific select-field value matches an allowed-value set.
// Storage shape:
//   refTemplatesId: [tplId, tplId, ...]                       — which target templates are allowed
//   refFilters: { [tplName]: { fieldId, allowedValues: [...] } } — per-template filter (optional)
// refFilters is keyed by template NAME (matches built-in convention; survives
// template rename if TEMPLATE_RENAMES handles it; otherwise filter quietly
// becomes inert — picker just shows all entries of that template, no crash).
function MultiTemplateRefConfig({ field, templates, onChange, packs }) {
  // Pack-qualified label: same-named templates from different packs are
  // disambiguated by their pack (the r040 lesson). Returns the first owning
  // pack's name, or null for ungrouped templates.
  const packNameFor = (tid) => {
    const owning = (packs || []).find(p => Array.isArray(p.templateIds) && p.templateIds.includes(tid));
    return owning ? owning.name : null;
  };
  const checked = new Set(field.refTemplatesId || []);
  const filters = field.refFilters || {};
  // v1.5 r077: registered node types (Astronomical Body, future ConLang) are
  // offered as ref targets alongside real templates. Checking one stores its
  // synthetic-template id (= the body sentinel) into refTemplatesId. Since
  // v1.7 r007 only the sources marked eligible: Fabula's kinds aren't.
  const targetTemplates = [...templates, ...getRegisteredSyntheticTemplates().filter(t => t.refEligible)];
  const toggleTpl = (tplId, tplName) => {
    const nextChecked = new Set(checked);
    const nextFilters = { ...filters };
    if (nextChecked.has(tplId)) {
      nextChecked.delete(tplId);
      delete nextFilters[tplName];  // clear filter when template unchecked
    } else {
      nextChecked.add(tplId);
    }
    onChange({ refTemplatesId: [...nextChecked], refFilters: nextFilters });
  };
  const updateFilter = (tplName, patch) => {
    const cur = filters[tplName] || {};
    const next = { ...cur, ...patch };
    // Drop the entire filter if both fieldId and allowedValues are unset/empty —
    // keeps refFilters tidy and lets the picker fall through to "no filter".
    const nextFilters = { ...filters };
    if (!next.fieldId && (!Array.isArray(next.allowedValues) || next.allowedValues.length === 0)) {
      delete nextFilters[tplName];
    } else {
      nextFilters[tplName] = next;
    }
    onChange({ refTemplatesId: field.refTemplatesId, refFilters: nextFilters });
  };
  return (
    <div className="tpl-ref-multi-block">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="tpl-ref-multi-label">Allowed templates:</div>
        {checked.size > 0 && (
          <button
            type="button"
            className="tpl-ref-clear-btn"
            onClick={() => onChange({ refTemplatesId: [], refFilters: {} })}
            title="Clear all checked templates and their filters"
          >
            Clear selections
          </button>
        )}
      </div>
      <div className="tpl-ref-multi-checks">
        {targetTemplates.map(t => (
          <label key={t.id}>
            <input type="checkbox" checked={checked.has(t.id)} onChange={() => toggleTpl(t.id, t.name)} />
            <span style={{ color: t.color }}>{t.icon}</span> {t.name}
            {packNameFor(t.id) && <span style={{ color: "var(--text-dim)" }}> · {packNameFor(t.id)}</span>}
          </label>
        ))}
      </div>
      {[...checked].map(tplId => {
        const tpl = targetTemplates.find(t => t.id === tplId);
        if (!tpl || tpl.synthetic) return null;
        const filter = filters[tpl.name] || {};
        const filterField = tpl.fields.find(f => f.id === filter.fieldId);
        const filterFieldOptions = (filterField && Array.isArray(filterField.options)) ? filterField.options : [];
        const allowedSet = new Set(filter.allowedValues || []);
        const candidateFields = tpl.fields.filter(f => f.type === "select" && !f.dependsOn);
        return (
          <div key={tpl.id} className="tpl-ref-filter-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div className="tpl-ref-filter-tplname">{tpl.icon} {tpl.name}{packNameFor(tpl.id) ? ` · ${packNameFor(tpl.id)}` : ""}</div>
              <span style={{ fontSize: "calc(11px * var(--font-scale))", color: "var(--text-dim)" }}>Filter by:</span>
              <select
                className="input"
                value={filter.fieldId || ""}
                onChange={e => updateFilter(tpl.name, { fieldId: e.target.value || null, allowedValues: [] })}
              >
                <option value="">— No filter —</option>
                {candidateFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
            {filter.fieldId && filterFieldOptions.length > 0 && (
              <div className="tpl-showwhen-checks" style={{ marginLeft: 136 }}>
                {filterFieldOptions.map(opt => (
                  <label key={opt}>
                    <input
                      type="checkbox"
                      checked={allowedSet.has(opt)}
                      onChange={() => {
                        const next = new Set(allowedSet);
                        if (next.has(opt)) next.delete(opt); else next.add(opt);
                        updateFilter(tpl.name, { fieldId: filter.fieldId, allowedValues: [...next] });
                      }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Recursive subfield list. Renders one level of subfields and recurses into
// any subfield that's itself a group, until MAX_GROUP_DEPTH. Type selector
// at the deepest allowed depth omits "group" so users can't bypass the cap.
// Each subfield row exposes the same authoring capabilities as a top-level
// field: required, secret, otherTextField (select, multiselect), multi/multi-template/
// refTemplate/relationKind (entry-ref), cascade dependsOn + per-parent
// options matrix (select), showWhen visibility config.
// Cascade and showWhen candidates are restricted to other subfields at
// the SAME level (siblings) — cross-scope references (e.g. depending on a
// top-level field from inside a group instance) aren't supported because
// the runtime evaluation has access only to the instance's values, not the
// outer entry.
function SubfieldList({ subfields, parentPath, depth, templates, onAdd, onUpdate, onRemove, packs, fabula }) {
  const allowedTypes = subfieldTypesAtDepth(depth);
  return (
    <div className="tpl-subfields">
      <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 6 }}>
        Subfields{depth > 1 ? ` (level ${depth})` : ""}
      </div>
      {subfields.map(sf => {
        // v1.7 r017: on one of Fabula's kinds a subfield can point at one of
        // the story's kinds, which isn't a multi-template target.
        const sfKind = fabula ? fabulaRefKindOf(sf) : null;
        const isMultiRef = !sfKind && Array.isArray(sf.refTemplatesId) && sf.refTemplatesId.length > 0;
        const cascadeCandidates = subfields.filter(s =>
          s.id !== sf.id && s.type === "select" && !s.dependsOn
        );
        const showWhenCandidates = subfields.filter(s =>
          s.id !== sf.id && (s.type === "select" || s.type === "multiselect") && !s.dependsOn
        );
        const sw = sf.showWhen || null;
        const swParent = sw && subfields.find(s => s.id === sw.fieldId);
        const swParentOpts = (swParent && Array.isArray(swParent.options)) ? swParent.options : [];
        const swSelectedVals = new Set(sw?.values || []);
        return (
          <React.Fragment key={sf.id}>
            <div className="tpl-subfield-wrap">
              <div className="tpl-subfield-row">
                <input
                  className="input tpl-field-lbl"
                  placeholder="Subfield name..."
                  value={sf.label}
                  onChange={e => onUpdate(parentPath, sf.id, { label: e.target.value })}
                />
                <select
                  className="input tpl-field-type"
                  value={sf.type}
                  onChange={e => onUpdate(parentPath, sf.id, { type: e.target.value })}
                >
                  {allowedTypes.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                </select>
                <button className="del-field-btn" onClick={() => onRemove(parentPath, sf.id)}>×</button>
              </div>
              {fabula && (
                <input className="input tpl-field-help" style={{ marginTop: 4, fontSize: 12 }} placeholder="Help line: what goes in this subfield..." value={sf.help || ""} onChange={e => onUpdate(parentPath, sf.id, { help: e.target.value })} />
              )}

              <div className="tpl-field-flags">
                <label>
                  <input type="checkbox" checked={!!sf.secret} onChange={e => onUpdate(parentPath, sf.id, { secret: e.target.checked })} />
                  Secret
                </label>
                <label>
                  <input type="checkbox" checked={!!sf.required} onChange={e => onUpdate(parentPath, sf.id, { required: e.target.checked })} />
                  Required
                </label>
                {(sf.type === "select" || sf.type === "multiselect") && (
                  <label title={sf.type === "select" ? "Adds an 'Other' option that lets users type a custom value" : "Adds an Other box where users type values of their own"}>
                    <input type="checkbox" checked={!!sf.otherTextField} onChange={e => onUpdate(parentPath, sf.id, { otherTextField: e.target.checked })} />
                    Allow custom "Other" text
                  </label>
                )}
                {sf.type === "entry-ref" && <>
                  <label>
                    <input type="checkbox" checked={!!sf.multi} onChange={e => onUpdate(parentPath, sf.id, { multi: e.target.checked })} />
                    Multiple
                  </label>
                  <label title="When on, this field can reference entries from multiple template types (with optional per-template filtering)">
                    <input
                      type="checkbox"
                      checked={isMultiRef}
                      disabled={!!sfKind}
                      onChange={e => {
                        if (e.target.checked) {
                          const seed = sf.refTemplateId ? [sf.refTemplateId] : [];
                          onUpdate(parentPath, sf.id, { refTemplatesId: seed, refTemplateId: null });
                        } else {
                          const first = (sf.refTemplatesId && sf.refTemplatesId[0]) || null;
                          onUpdate(parentPath, sf.id, { refTemplatesId: null, refFilters: null, refTemplateId: first });
                        }
                      }}
                    />
                    Multi-template
                  </label>
                  {!isMultiRef && (
                    <select className="input" style={{ flex: 1, fontSize: 11, padding: "3px 8px" }} value={sfKind ? sfKind.id : (sf.refTemplateId || "")} onChange={e => onUpdate(parentPath, sf.id, fabula ? fabulaTargetPatch(e.target.value) : { refTemplateId: e.target.value || null })}>
                      <option value="">Any template</option>
                      {(templates || []).map(t => <option key={t.id} value={t.id}>{t.icon} {t.name} only</option>)}
                      {getRegisteredSyntheticTemplates().filter(t => t.refEligible).map(t => <option key={t.id} value={t.id}>{t.icon} {t.name} only</option>)}
                      {fabula && fabulaStoryKinds(fabula.kind).length > 0 && (
                        <optgroup label="This story's records">
                          {fabulaStoryKinds(fabula.kind).map(k => <option key={k.id} value={k.id}>{k.label} (this story)</option>)}
                        </optgroup>
                      )}
                    </select>
                  )}
                  {!fabula && <select className="input" style={{ flex: "0 0 130px", fontSize: 11, padding: "3px 8px" }} value={sf.relationKind || ""} onChange={e => onUpdate(parentPath, sf.id, { relationKind: e.target.value || null })} title="Family tree builds itself from these">
                    <option value="">No family role</option>
                    <option value="parent">Parent of this</option>
                    <option value="spouse">Spouse of this</option>
                  </select>}
                </>}
              </div>

              {sf.type === "entry-ref" && isMultiRef && (
                <MultiTemplateRefConfig
                  field={sf}
                  templates={templates || []}
                  onChange={(patch) => onUpdate(parentPath, sf.id, patch)}
                  packs={packs}
                />
              )}

              {sf.type === "select" && sf.otherTextField && (
                <div className="tpl-cascade-hint" style={{ marginLeft: 0 }}>
                  "Other" will be auto-added to the dropdown at runtime.
                </div>
              )}
              {sf.type === "multiselect" && sf.otherTextField && (
                <div className="tpl-cascade-hint" style={{ marginLeft: 0 }}>
                  An Other box goes under the options; each value typed there is saved with the picked ones.
                </div>
              )}

              {sf.type === "select" && (
                <>
                  <div className="tpl-cascade-controls">
                    <label className="tpl-cascade-pick">
                      <span>Depends on:</span>
                      <select
                        className="input"
                        value={sf.dependsOn || ""}
                        onChange={e => onUpdate(parentPath, sf.id, { dependsOn: e.target.value || null })}
                      >
                        <option value="">— No parent (flat options) —</option>
                        {cascadeCandidates.map(p => (
                          <option key={p.id} value={p.id}>{p.label || "(unnamed)"}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {sf.dependsOn ? (
                    <CascadeOptionsInput
                      field={sf}
                      parentField={subfields.find(s => s.id === sf.dependsOn)}
                      onCommit={(obp) => onUpdate(parentPath, sf.id, { optionsByParent: obp })}
                    />
                  ) : (
                    <SelectOptionsInput
                      value={sf.options}
                      onCommit={(opts) => onUpdate(parentPath, sf.id, { options: opts })}
                      placeholder={`${sf.label || 'Subfield'} options: A | B | C`}
                    />
                  )}
                </>
              )}

              {sf.type === "multiselect" && (
                <SelectOptionsInput
                  value={sf.options}
                  onCommit={(opts) => onUpdate(parentPath, sf.id, { options: opts })}
                  placeholder={`${sf.label || 'Subfield'} options: A | B | C`}
                />
              )}

              {sf.type === "group" && (
                <SubfieldList
                  subfields={sf.subfields || []}
                  parentPath={[...parentPath, sf.id]}
                  depth={depth + 1}
                  templates={templates}
                  onAdd={onAdd}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                  packs={packs}
                  fabula={fabula}
                />
              )}

              {/* showWhen — universal */}
              <div className="tpl-showwhen-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span>Show only when:</span>
                  <select
                    className="input parent-pick"
                    value={sw?.fieldId || ""}
                    onChange={e => {
                      const newParentId = e.target.value || null;
                      if (!newParentId) {
                        onUpdate(parentPath, sf.id, { showWhen: null });
                      } else {
                        onUpdate(parentPath, sf.id, { showWhen: { fieldId: newParentId, values: [] } });
                      }
                    }}
                  >
                    <option value="">— Always (no condition) —</option>
                    {showWhenCandidates.map(p => (
                      <option key={p.id} value={p.id}>{p.label || "(unnamed)"}</option>
                    ))}
                  </select>
                  {sw?.fieldId && <span style={{ color: "var(--text-dim)" }}>equals one of:</span>}
                </div>
                {sw?.fieldId && swParentOpts.length === 0 && (
                  <div className="tpl-cascade-hint" style={{ marginLeft: 0 }}>
                    Parent subfield has no options yet. Add options to "{swParent?.label || "?"}" first.
                  </div>
                )}
                {sw?.fieldId && swParentOpts.length > 0 && (
                  <div className="tpl-showwhen-checks">
                    {swParentOpts.map(opt => (
                      <label key={opt}>
                        <input
                          type="checkbox"
                          checked={swSelectedVals.has(opt)}
                          onChange={() => {
                            const next = new Set(swSelectedVals);
                            if (next.has(opt)) next.delete(opt); else next.add(opt);
                            onUpdate(parentPath, sf.id, { showWhen: { fieldId: sw.fieldId, values: [...next] } });
                          }}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}
                {sw?.fieldId && swParentOpts.length > 0 && swSelectedVals.size === 0 && (
                  <div className="tpl-cascade-hint" style={{ marginLeft: 0, color: "var(--warn, #c8836e)" }}>
                    No values selected — this subfield is currently hidden everywhere. Check at least one value, or set "Always" to make it visible.
                  </div>
                )}
              </div>
            </div>
          </React.Fragment>
        );
      })}
      <button className="add-subfield-btn" onClick={() => onAdd(parentPath)}>+ Add Subfield</button>
    </div>
  );
}

// ─── Template preview popup (v1.3 builder UX) ──────────────────────────────
// TemplateBuilder opens a separate browser window showing a live preview of
// the in-progress template rendered as an entry form. Free-floating: can be
// dragged to a second monitor.
//
// State lives in the parent React tree; the popup is a render target. An
// about:blank popup from a file:// parent is same-origin in modern browsers
// (Chrome / Firefox / Edge / Safari), so direct JS access to the popup's
// document and window works without restriction.
//
// Step 2 (this) lands the lifecycle:
//   - open via window.open
//   - close-on-builder-exit (TemplateBuilder unmount cleanup)
//   - close-on-tab-close/reload (parent's beforeunload listener)
//   - self-close-on-opener-gone (watchdog inside popup)
// Step 3 wires React to render EntryForm into the popup body.
//
// Cross-window state sync uses a session token written to both the opener
// and the popup at open time. The popup's watchdog compares the opener's
// token against its stored copy; mismatch (opener reloaded into a fresh
// session, or opener replaced via navigation) triggers self-close.
const PREVIEW_POPUP_NAME = "cartulary-template-preview";
const PREVIEW_POPUP_FEATURES = "width=560,height=760,popup=yes,resizable=yes,scrollbars=yes";
const PREVIEW_SESSION_KEY = "__cartularyPreviewSession";

function setupPreviewPopup(popup, draft, sessionToken) {
  const doc = popup.document;

  // Firefox compatibility: window.open("about:blank") from a file:// parent
  // leaves the popup's document in a transitional state — Firefox's own
  // about:blank loader runs asynchronously and overwrites anything we
  // append before it completes, resulting in a blank-white popup. Explicit
  // doc.open() + doc.write(skeleton) + doc.close() claims the document for
  // our use, guarantees head/body exist, and pre-empts the about:blank
  // load. No-op for Chrome/Edge where the document is already initialized
  // synchronously, but harmless.
  doc.open();
  doc.write('<!DOCTYPE html><html><head></head><body></body></html>');
  doc.close();

  const name = (draft && draft.name) || "Untitled Template";
  doc.title = `Preview · ${name} · Cartulary`;

  // Clone all <style> elements from the parent. Cartulary inlines its full
  // CSS in one <style> block plus the inlined @font-face block from the
  // build inliner — both come along automatically.
  const parentStyles = document.querySelectorAll("style");
  parentStyles.forEach(s => {
    const clone = doc.createElement("style");
    clone.textContent = s.textContent;
    doc.head.appendChild(clone);
  });

  // Copy CSS custom properties from the parent's :root computed style to
  // the popup's :root. The cloned stylesheet defines defaults under :root,
  // but the user's active theme (which overrides :root via inline style on
  // documentElement, set by the theme-switcher) lives on the parent's
  // documentElement and doesn't ride along via stylesheet cloning.
  const parentRootStyle = getComputedStyle(document.documentElement);
  const popupRoot = doc.documentElement;
  [
    "--bg", "--surf1", "--surf2", "--surf3",
    "--text", "--text-dim", "--text-bright",
    "--accent", "--accent-glow", "--accent-dim",
    "--border", "--border2", "--warn",
    "--font-scale",
  ].forEach(varname => {
    const val = parentRootStyle.getPropertyValue(varname);
    if (val) popupRoot.style.setProperty(varname, val);
  });

  // Build the chrome. The preview body (#preview-root) is mounted into by
  // a separate React root from TemplateBuilder. createPortal across windows
  // doesn't work cleanly because React 17+ binds synthetic event listeners
  // to the root's container; events fired in the popup's window don't reach
  // listeners in the parent's window. A separate root in the popup gets its
  // own event delegation pinned to the popup's document.
  doc.body.innerHTML = "";
  const wrap = doc.createElement("div");
  wrap.className = "preview-window";
  wrap.innerHTML =
    '<div class="preview-window-header">' +
      'Preview · <strong class="preview-window-name"></strong>' +
    '</div>' +
    '<div class="preview-window-body" id="preview-root"></div>';
  doc.body.appendChild(wrap);

  // textContent set after innerHTML to avoid HTML injection from arbitrary
  // template names (a name like '<script>' shouldn't execute or break chrome).
  const nameEl = doc.body.querySelector(".preview-window-name");
  if (nameEl) nameEl.textContent = name;

  // Plant the session token on the popup window so the watchdog can compare.
  popup[PREVIEW_SESSION_KEY] = sessionToken;

  // Self-close watchdog. Fires every second; closes the popup if the opener
  // is gone (closed, or reloaded into a fresh session that doesn't carry
  // our token). Handles cases where the parent's beforeunload didn't fire
  // (browser crash, force-quit).
  const watchdogScript = doc.createElement("script");
  watchdogScript.textContent =
    "(function(){" +
      "var myToken = window['" + PREVIEW_SESSION_KEY + "'];" +
      "var poll = setInterval(function(){" +
        "try {" +
          "if (!window.opener || window.opener.closed) { clearInterval(poll); window.close(); return; }" +
          "var openerToken = window.opener['" + PREVIEW_SESSION_KEY + "'];" +
          "if (openerToken !== myToken) { clearInterval(poll); window.close(); }" +
        "} catch (e) {" +
          // Cross-origin block (e.g. opener navigated to another origin)
          "clearInterval(poll); window.close();" +
        "}" +
      "}, 1000);" +
    "})();";
  doc.head.appendChild(watchdogScript);
}

function updatePreviewPopupTitle(popup, draft) {
  if (!popup || popup.closed) return;
  const name = (draft && draft.name) || "Untitled Template";
  try {
    popup.document.title = `Preview · ${name} · Cartulary`;
    const nameEl = popup.document.body && popup.document.body.querySelector(".preview-window-name");
    if (nameEl) nameEl.textContent = name;
  } catch (e) {
    // popup may have navigated away or been torn down between checks
  }
}

// React component that lives inside the preview popup. Renders the
// in-progress template as an entry form, backed by an ephemeral entry whose
// state is local to this component (cleared automatically when the popup
// closes and the component unmounts). The popup gets fresh state on every
// open.
//
// Reuses EntryForm — the same component the production entry editor uses —
// so cascade-select, showWhen, otherTextField, refFilters, half-width pair
// layout, etc. all behave identically to production.
function TemplatePreviewBody({ template, entries, templates, calendar, imageFolder, dirHandle, allTags, flash }) {
  const [ephemeralEntry, setEphemeralEntry] = useState({
    id: "preview-entry",
    templateId: template ? template.id : null,
    name: "",
    tags: [],
    fields: {},
  });

  // Reset ephemeral state when the user switches templates inside the
  // builder (different draft.id). Field-level mutations within the same
  // template don't reset — orphan field values from type/ID changes stay
  // in ephemeral state and render as garbage in worst case; user closes
  // and reopens the popup to clear.
  useEffect(() => {
    setEphemeralEntry({
      id: "preview-entry",
      templateId: template ? template.id : null,
      name: "",
      tags: [],
      fields: {},
    });
  }, [template?.id]);

  if (!template) {
    return <div className="preview-window-empty">No template loaded.</div>;
  }
  if (!template.fields || template.fields.length === 0) {
    return <div className="preview-window-empty">Add fields to see preview.</div>;
  }

  return (
    <EntryForm
      draft={ephemeralEntry}
      template={template}
      entries={entries || []}
      templates={templates || []}
      onChange={setEphemeralEntry}
      showSecrets={true}
      imageFolder={imageFolder}
      allTags={allTags || []}
      dirHandle={dirHandle}
      calendar={calendar}
      selfEntryId="preview-entry"
      flash={flash}
      previewMode={true}
    />
  );
}

// v1.7 r017: the head of the builder on one of Fabula's kinds, in place of a
// template's name, icon, color, and type, which are Fabula's: the help line
// of the records' name, the user's to change (docs/fabula-spec.md, section
// 4).
function FabulaBuilderHead({ draft, onChange, fabula }) {
  return (
    <div className="form-field fabula-builder-head">
      <label className="form-label">Help line for the name</label>
      <input className="input" placeholder="What the name holds..." value={draft.nameHelp || ""} onChange={e => onChange({ ...draft, nameHelp: e.target.value })} />
      <div className="tpl-cascade-hint" style={{ marginTop: 8 }}>
        These are the fields of every {(FABULA_NOUNS[fabula.kind] || { one: fabula.label }).one} in this world. Fabula reads the fields marked Core, so what it reads of each is locked; the rest of them, and every other field, is yours to change. A Core tag's tooltip says what reads its field.
      </div>
    </div>
  );
}

// v1.7 r017: a core group's subfields on one of Fabula's kinds, which Fabula
// reads, shown as they are and not editable.
function FabulaLockedRows({ field }) {
  const typeLabel = (t) => (FIELD_TYPES.find(ft => ft.value === t) || {}).label || t;
  return (
    <div className="tpl-subfields fabula-locked-rows">
      <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 6 }}>Subfields, locked</div>
      {(field.subfields || []).map(sf => (
        <div key={sf.id} className="tpl-subfield-row" style={{ color: "var(--text-dim)", fontSize: "calc(13px * var(--font-scale))" }}>
          <span style={{ flex: 2 }}>{sf.label}</span>
          <span style={{ flex: 1.4 }}>{typeLabel(sf.type)}</span>
        </div>
      ))}
    </div>
  );
}

// v1.7 r017: fabula, when set ({ kind, label }), puts the builder in its
// mode for one of Fabula's kinds (docs/fabula-spec.md, section 4).
function TemplateBuilder({ draft, templates, onChange, flash, entries, calendar, imageFolder, dirHandle, allTags, packs, fabula }) {
  const updateField = (id, patch) => onChange({ ...draft, fields: draft.fields.map(f => f.id === id ? { ...f, ...patch } : f) });
  const removeField = (id) => onChange({ ...draft, fields: draft.fields.filter(f => f.id !== id) });
  const addField = () => onChange({ ...draft, fields: [...draft.fields, { id: genId(), label: "", type: "text", secret: false }] });
  const reorderField = (fromIdx, toIdx) => {
    if (fromIdx < 0 || fromIdx >= draft.fields.length) return;
    if (toIdx < 0 || toIdx > draft.fields.length) return;
    const next = [...draft.fields];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onChange({ ...draft, fields: next });
  };
  const fieldDrag = useDragReorder(reorderField);
  // v1.7 r017: one of Fabula's kinds opens at the top of its page, wherever
  // Fabula's index stood when its Edit Template was clicked.
  const builderRef = useRef(null);
  React.useLayoutEffect(() => {
    if (!fabula) return;
    for (let el = builderRef.current && builderRef.current.parentElement; el; el = el.parentElement) {
      if (el.scrollHeight > el.clientHeight && /(auto|scroll)/.test(getComputedStyle(el).overflowY)) { el.scrollTop = 0; break; }
    }
  }, [fabula && fabula.kind]);

  // ─── Template preview popup state ───────────────────────────────────────
  // popupRef holds the Window handle returned by window.open. popupSessionRef
  // holds the unique session token planted on window[PREVIEW_SESSION_KEY] at
  // open time; the popup's watchdog reads this back to detect parent-reload.
  // previewRootRef holds the ReactDOM root that renders TemplatePreviewBody
  // into the popup's #preview-root mount point. popupOpen flips the toggle
  // button's visual state.
  const popupRef = useRef(null);
  const popupSessionRef = useRef(null);
  const previewRootRef = useRef(null);
  const [popupOpen, setPopupOpen] = useState(false);

  // Unmount the popup's React root cleanly. Wrapped in try/catch because
  // the popup's DOM may already be gone (user closed the OS window, parent
  // is unloading, etc).
  const unmountPreviewRoot = () => {
    if (previewRootRef.current) {
      try { previewRootRef.current.unmount(); } catch (e) { /* popup torn down */ }
      previewRootRef.current = null;
    }
  };

  // Close popup on TemplateBuilder unmount. Handles in-app navigation: user
  // leaves the template builder via sidebar nav, Save, Cancel, or by clicking
  // another template. React's unmount cleanup is reliable for these cases.
  useEffect(() => {
    return () => {
      unmountPreviewRoot();
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
      popupRef.current = null;
      if (popupSessionRef.current) {
        window[PREVIEW_SESSION_KEY] = null;
        popupSessionRef.current = null;
      }
    };
  }, []);

  // Close popup on tab close / page reload. React's unmount cleanup is NOT
  // reliable on unload — browsers may tear down the JS env before React's
  // cleanup runs. beforeunload fires synchronously while the JS env is
  // still alive, giving us a chance to close the popup explicitly.
  useEffect(() => {
    const onBeforeUnload = () => {
      unmountPreviewRoot();
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Sync template name into popup chrome when it changes.
  useEffect(() => {
    if (popupRef.current && !popupRef.current.closed) {
      updatePreviewPopupTitle(popupRef.current, draft);
    }
  }, [draft.name]);

  // Detect popup-closed-by-user (e.g. clicking the OS window's close button).
  // Lightweight 500ms poll while popupOpen is true; flips state to false
  // when the popup is found closed so the toggle button reflects reality.
  useEffect(() => {
    if (!popupOpen) return;
    const checkInterval = setInterval(() => {
      if (popupRef.current && popupRef.current.closed) {
        unmountPreviewRoot();
        popupRef.current = null;
        if (popupSessionRef.current) {
          window[PREVIEW_SESSION_KEY] = null;
          popupSessionRef.current = null;
        }
        setPopupOpen(false);
      }
    }, 500);
    return () => clearInterval(checkInterval);
  }, [popupOpen]);

  // Mount / re-render the popup's React tree whenever the popup is open and
  // any input prop changes. Creates the React root on first run for a given
  // open session; subsequent runs just call root.render() to reconcile.
  // Idempotent — React handles change detection internally.
  //
  // Wrapped in try/catch as defense in depth: cross-window React rendering
  // can throw in edge cases (popup torn down between checks, ReactDOM
  // internal issues, invalid mount point). On failure: log, drop the root,
  // bail out without crashing the parent's render cycle.
  useEffect(() => {
    if (!popupOpen || !popupRef.current || popupRef.current.closed) return;
    try {
      const mountPoint = popupRef.current.document.getElementById("preview-root");
      if (!mountPoint) return;
      if (!previewRootRef.current) {
        previewRootRef.current = ReactDOM.createRoot(mountPoint);
      }
      previewRootRef.current.render(
        <TemplatePreviewBody
          template={draft}
          entries={entries}
          templates={templates}
          calendar={calendar}
          imageFolder={imageFolder}
          dirHandle={dirHandle}
          allTags={allTags}
          flash={flash}
        />
      );
    } catch (err) {
      console.error("Cartulary: failed to render preview popup", err);
      unmountPreviewRoot();
    }
  }, [popupOpen, draft, entries, templates, calendar, imageFolder, dirHandle, allTags, flash]);

  const togglePreview = () => {
    // If already open, close it.
    if (popupRef.current && !popupRef.current.closed) {
      unmountPreviewRoot();
      popupRef.current.close();
      popupRef.current = null;
      if (popupSessionRef.current) {
        window[PREVIEW_SESSION_KEY] = null;
        popupSessionRef.current = null;
      }
      setPopupOpen(false);
      return;
    }
    // Open a fresh popup. window.open requires a user gesture; the button
    // click satisfies it, so this should not be blocked under normal conditions.
    const popup = window.open("about:blank", PREVIEW_POPUP_NAME, PREVIEW_POPUP_FEATURES);
    if (!popup) {
      if (flash) flash("Template preview popup was blocked. Allow popups for this page and try again.", "warn");
      else console.warn("Cartulary: template preview popup was blocked. Allow popups for this page.");
      return;
    }
    // Plant a session token on both windows so the popup's watchdog can
    // detect parent-reload (new parent won't have this token).
    const sessionToken = String(Date.now()) + ":" + Math.random().toString(36).slice(2);
    window[PREVIEW_SESSION_KEY] = sessionToken;
    popupSessionRef.current = sessionToken;
    setupPreviewPopup(popup, draft, sessionToken);
    popupRef.current = popup;
    setPopupOpen(true);
  };

  // Path-aware subfield helpers. `path` is an array of group field IDs from
  // root downward to the parent whose subfields we're modifying. Length 1
  // means a direct subfield of a top-level group. Length 2 means a subfield
  // of a group nested inside another group. Etc.
  //
  // updateAtPath walks the field tree along path[], applies `mutate` to the
  // target subfield array, and returns a new fields tree. Pure — no in-place
  // mutation.
  const updateAtPath = (fields, path, mutate) => {
    if (path.length === 0) return mutate(fields);
    const [head, ...rest] = path;
    return fields.map(f => {
      if (f.id !== head) return f;
      return { ...f, subfields: updateAtPath(f.subfields || [], rest, mutate) };
    });
  };
  const addSubfieldAt = (path) => onChange({
    ...draft,
    fields: updateAtPath(draft.fields, path, subs => [...subs, { id: genId(), label: "", type: "text" }]),
  });
  const updateSubfieldAt = (path, sfid, patch) => onChange({
    ...draft,
    fields: updateAtPath(draft.fields, path, subs => subs.map(sf => {
      if (sf.id !== sfid) return sf;
      const next = { ...sf, ...patch };
      // Type changes need scaffolding: changing TO group needs subfields[],
      // changing TO select needs options[]. Same as top-level field type-change.
      if ("type" in patch) {
        if (patch.type === "group" && !next.subfields) next.subfields = [];
        if ((patch.type === "select" || patch.type === "multiselect") && !next.options) next.options = [];
        if (patch.type !== "group") delete next.subfields;
        if (patch.type !== "select" && patch.type !== "multiselect") delete next.options;
      }
      return next;
    })),
  });
  const removeSubfieldAt = (path, sfid) => onChange({
    ...draft,
    fields: updateAtPath(draft.fields, path, subs => subs.filter(sf => sf.id !== sfid)),
  });

  return (
    <>
      {!fabula && <div className="tpl-builder-toolbar">
        <button
          className={`btn btn-ghost preview-toggle-btn${popupOpen ? " active" : ""}`}
          onClick={togglePreview}
          title="Open a live preview of this template in a separate window"
        >
          👁 Template Preview
        </button>
      </div>}
      <div className="tpl-builder" ref={builderRef}>
        {fabula ? <FabulaBuilderHead draft={draft} onChange={onChange} fabula={fabula} /> : <>
        <div className="form-field">
          <label className="form-label">Template Name</label>
          <input className="input" style={{ fontSize: 16 }} placeholder="Name this template..." value={draft.name} onChange={e => onChange({ ...draft, name: e.target.value })} autoFocus />
        </div>

      <div className="form-field">
        <label className="form-label">Icon</label>
        <div className="icon-grid">
          {ICONS.map(icon => (
            <div key={icon} className={`icon-opt ${draft.icon === icon ? "sel" : ""}`} onClick={() => onChange({ ...draft, icon })}>{icon}</div>
          ))}
        </div>
      </div>

      <div className="form-field">
        <label className="form-label">Color</label>
        <div className="color-row">
          {COLORS.map(color => (
            <div key={color} className={`color-opt ${draft.color === color ? "sel" : ""}`} style={{ background: color }} onClick={() => onChange({ ...draft, color })} />
          ))}
        </div>
      </div>

      <div className="form-field">
        <label className="form-label">Type</label>
        <select className="input" value={draft.kind || "standard"} onChange={e => onChange({ ...draft, kind: e.target.value })}>
          <option value="standard">Standard — text fields and references</option>
        </select>
      </div>
        </>}

      <div className="section-hdr">Fields</div>

      {draft.fields.map((field, idx) => {
        const isDragged = fieldDrag.draggedIdx === idx;
        const isOver = fieldDrag.overIdx === idx;
        const showBefore = isOver && fieldDrag.dropPosition === "before" && !isDragged;
        const showAfter = isOver && fieldDrag.dropPosition === "after" && !isDragged;
        // v1.7 r017: on one of Fabula's kinds a core field keeps what Fabula
        // reads (docs/fabula-spec.md, section 3): its label, help line,
        // Secret, and options, unless the seed locks them, are the user's.
        const core = !!(fabula && field.core);
        const fabKind = fabula ? fabulaRefKindOf(field) : null;
        const multiTpl = !fabKind && Array.isArray(field.refTemplatesId) && field.refTemplatesId.length > 0;
        const optionsLocked = core && !!field.optionsLocked;
        return (
        <div
          key={field.id}
          className={`tpl-field-row ${isDragged ? "dragging" : ""} ${showBefore ? "drop-before" : ""} ${showAfter ? "drop-after" : ""}`}
          {...fieldDrag.rowProps(idx)}
        >
          <div className="tpl-field-line">
            <span
              className="tpl-field-drag-handle"
              title="Drag to reorder field"
              {...fieldDrag.handleProps(idx)}
            >⋮⋮</span>
            <input className="input tpl-field-lbl" placeholder="Field name..." value={field.label} onChange={e => updateField(field.id, { label: e.target.value })} />
            {core && <span className="fabula-core-tag" title={fabulaCoreTitle(field)} style={{ fontSize: "calc(10px * var(--font-scale))", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--accent)", border: "1px solid var(--accent-dim)", borderRadius: 3, padding: "1px 6px", whiteSpace: "nowrap", cursor: "help" }}>Core</span>}
            <select className="input tpl-field-type" value={field.type} disabled={core} onChange={e => {
              const newType = e.target.value;
              const patch = { type: newType };
              if ((newType === "select" || newType === "multiselect") && !field.options) patch.options = [];
              if (newType === "group" && !field.subfields) patch.subfields = [];
              if (newType === "entry-ref" && field.multi == null) patch.multi = false;
              updateField(field.id, patch);
            }}>
              {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
            </select>
            {!core && <button className="del-field-btn" onClick={() => removeField(field.id)} title="Remove field">×</button>}
          </div>
          {fabula && (
            <input className="input tpl-field-help" style={{ marginTop: 5, fontSize: 12 }} placeholder="Help line: what goes in this field..." value={field.help || ""} onChange={e => updateField(field.id, { help: e.target.value })} />
          )}

          <div className="tpl-field-flags">
            <label>
              <input type="checkbox" checked={!!field.secret} onChange={e => updateField(field.id, { secret: e.target.checked })} />
              Secret
            </label>
            <label>
              <input type="checkbox" checked={!!field.required} disabled={core} onChange={e => updateField(field.id, { required: e.target.checked })} />
              Required
            </label>
            {(field.type === "select" || field.type === "multiselect") && (
              <label title={field.type === "select" ? "Adds an 'Other' option that lets users type a custom value" : "Adds an Other box where users type values of their own"}>
                <input type="checkbox" checked={!!field.otherTextField} disabled={optionsLocked} onChange={e => updateField(field.id, { otherTextField: e.target.checked })} />
                Allow custom "Other" text
              </label>
            )}
            {field.type === "entry-ref" && <>
              <label>
                <input type="checkbox" checked={!!field.multi} disabled={core} onChange={e => updateField(field.id, { multi: e.target.checked })} />
                Multiple
              </label>
              <label title="When on, this field can reference entries from multiple template types (with optional per-template filtering)">
                <input
                  type="checkbox"
                  checked={multiTpl}
                  disabled={core || !!fabKind}
                  onChange={e => {
                    if (e.target.checked) {
                      // Seed multi-template list with the current single pick (if any)
                      const seed = field.refTemplateId ? [field.refTemplateId] : [];
                      updateField(field.id, { refTemplatesId: seed, refTemplateId: null });
                    } else {
                      // Demote first multi-pick back to single, clear filters
                      const first = (field.refTemplatesId && field.refTemplatesId[0]) || null;
                      updateField(field.id, { refTemplatesId: null, refFilters: null, refTemplateId: first });
                    }
                  }}
                />
                Multi-template
              </label>
              {!multiTpl && (
                <select className="input" style={{ flex: 1, fontSize: 11, padding: "3px 8px" }} value={fabKind ? fabKind.id : (field.refTemplateId || "")} disabled={core} onChange={e => updateField(field.id, fabula ? fabulaTargetPatch(e.target.value) : { refTemplateId: e.target.value || null })}>
                  <option value="">Any template</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name} only</option>)}
                  {getRegisteredSyntheticTemplates().filter(t => t.refEligible).map(t => <option key={t.id} value={t.id}>{t.icon} {t.name} only</option>)}
                  {fabula && fabulaStoryKinds(fabula.kind).length > 0 && (
                    <optgroup label="This story's records">
                      {fabulaStoryKinds(fabula.kind).map(k => <option key={k.id} value={k.id}>{k.label} (this story)</option>)}
                    </optgroup>
                  )}
                </select>
              )}
              {!fabula && <select className="input" style={{ flex: "0 0 130px", fontSize: 11, padding: "3px 8px" }} value={field.relationKind || ""} onChange={e => updateField(field.id, { relationKind: e.target.value || null })} title="Family tree builds itself from these">
                <option value="">No family role</option>
                <option value="parent">Parent of this</option>
                <option value="spouse">Spouse of this</option>
              </select>}
            </>}
            {fabula && fabula.kind === "story" && (
              <select className="input fabula-panel-pick" style={{ flex: "0 0 150px", fontSize: 11, padding: "3px 8px", marginLeft: "auto" }} value={field.panel || ""} onChange={e => updateField(field.id, { panel: e.target.value || undefined })} title="Which panel of the Story tab the field sits in">
                <option value="">No panel</option>
                {FABULA_STORY_PANELS.map(p => <option key={p.id} value={p.id}>{p.label} panel</option>)}
              </select>
            )}
          </div>

          {field.type === "entry-ref" && !fabKind && Array.isArray(field.refTemplatesId) && field.refTemplatesId.length >= 0 && (
            // Show the multi-template UI whenever multi-template is the active mode
            // (toggled on above). Empty refTemplatesId is still "multi-template mode
            // with nothing picked yet" — the UI prompts the user to pick.
            Array.isArray(field.refTemplatesId) && (core ? (
              <div className="tpl-cascade-hint fabula-locked-targets" style={{ marginLeft: 0 }}>
                Points at {(field.refTemplates || []).join(", ") || "any template"}; that stays as it is.
              </div>
            ) : (
              <MultiTemplateRefConfig
                field={field}
                templates={templates}
                onChange={(patch) => updateField(field.id, patch)}
                packs={packs}
              />
            ))
          )}

          {field.type === "select" && field.otherTextField && !optionsLocked && (
            <div className="tpl-cascade-hint" style={{ marginLeft: 0 }}>
              "Other" will be auto-added to the dropdown at runtime.
            </div>
          )}
          {field.type === "multiselect" && field.otherTextField && (
            <div className="tpl-cascade-hint" style={{ marginLeft: 0 }}>
              An Other box goes under the options; each value typed there is saved with the picked ones.
            </div>
          )}

          {field.type === "select" && (optionsLocked ? (
            <div className="tpl-cascade-hint fabula-locked-options" style={{ marginLeft: 0 }}>
              {field.optionsFrom ? `Its options come from the story's structure${field.otherTextField ? ", with Other after them" : ""}.` : `Options: ${(field.options || []).join(" | ")}. Fabula reads these names, so they stay as they are.`}
            </div>
          ) : (
            <>
              {/* Cascade-select: pick a parent select field on the same template. When set,
                  this field's options become per-parent-value via optionsByParent.
                  Excludes self and other cascade children (only top-level selects can be
                  parents — no two-level cascades). */}
              {!core && (() => {
                const candidateParents = draft.fields.filter(f =>
                  f.id !== field.id && f.type === "select" && !f.dependsOn
                );
                return (
                  <div className="tpl-cascade-controls">
                    <label className="tpl-cascade-pick">
                      <span>Depends on:</span>
                      <select
                        className="input"
                        value={field.dependsOn || ""}
                        onChange={e => updateField(field.id, { dependsOn: e.target.value || null })}
                      >
                        <option value="">— No parent (flat options) —</option>
                        {candidateParents.map(p => (
                          <option key={p.id} value={p.id}>{p.label || "(unnamed)"}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                );
              })()}
              {field.dependsOn ? (
                <CascadeOptionsInput
                  field={field}
                  parentField={draft.fields.find(f => f.id === field.dependsOn)}
                  onCommit={(obp) => updateField(field.id, { optionsByParent: obp })}
                />
              ) : (
                <SelectOptionsInput
                  value={field.options}
                  onCommit={(opts) => updateField(field.id, { options: opts })}
                  placeholder="Options: A | B | C"
                />
              )}
            </>
          ))}

          {field.type === "multiselect" && (
            <SelectOptionsInput
              value={field.options}
              onCommit={(opts) => updateField(field.id, { options: opts })}
              placeholder="Options: A | B | C"
            />
          )}

          {field.type === "group" && (core ? (
            <FabulaLockedRows field={field} />
          ) : (
            <SubfieldList
              subfields={field.subfields || []}
              parentPath={[field.id]}
              depth={1}
              templates={templates}
              onAdd={addSubfieldAt}
              onUpdate={updateSubfieldAt}
              onRemove={removeSubfieldAt}
              packs={packs}
              fabula={fabula}
            />
          ))}

          {field.type === "grid" && (
            <div className="tpl-cascade-hint" style={{ marginLeft: 0 }}>
              Rows, columns, and each cell's type (text, number, entry reference, calendar date, or calendar date range) are set per entry. Reference cells can point at any entry.
            </div>
          )}

          {/* v1.3: showWhen conditional visibility — pick a parent select field
              on this template and which values reveal this field. Available on
              every field type. Empty values list = field hidden everywhere
              (UI warns); to make a field always visible, set parent to "—". */}
          {core ? (field.showWhen ? (
            <div className="tpl-cascade-hint fabula-locked-when" style={{ marginLeft: 0 }}>{fabulaShowWhenText(field, draft.fields)}</div>
          ) : null) : (() => {
            const showWhenCandidates = draft.fields.filter(f =>
              f.id !== field.id && (f.type === "select" || f.type === "multiselect") && !f.dependsOn
            );
            const sw = field.showWhen || null;
            const parentField = sw && draft.fields.find(f => f.id === sw.fieldId);
            const parentOptions = (parentField && Array.isArray(parentField.options))
              ? parentField.options : [];
            const selectedVals = new Set(sw?.values || []);
            return (
              <div className="tpl-showwhen-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span>Show only when:</span>
                  <select
                    className="input parent-pick"
                    value={sw?.fieldId || ""}
                    onChange={e => {
                      const newParentId = e.target.value || null;
                      if (!newParentId) {
                        updateField(field.id, { showWhen: null });
                      } else {
                        updateField(field.id, { showWhen: { fieldId: newParentId, values: [] } });
                      }
                    }}
                  >
                    <option value="">— Always (no condition) —</option>
                    {showWhenCandidates.map(p => (
                      <option key={p.id} value={p.id}>{p.label || "(unnamed)"}</option>
                    ))}
                  </select>
                  {sw?.fieldId && <span style={{ color: "var(--text-dim)" }}>equals one of:</span>}
                </div>
                {sw?.fieldId && parentOptions.length === 0 && (
                  <div className="tpl-cascade-hint" style={{ marginLeft: 0 }}>
                    Parent field has no options yet. Add options to "{parentField?.label || "?"}" first.
                  </div>
                )}
                {sw?.fieldId && parentOptions.length > 0 && (
                  <div className="tpl-showwhen-checks">
                    {parentOptions.map(opt => (
                      <label key={opt}>
                        <input
                          type="checkbox"
                          checked={selectedVals.has(opt)}
                          onChange={() => {
                            const next = new Set(selectedVals);
                            if (next.has(opt)) next.delete(opt); else next.add(opt);
                            updateField(field.id, { showWhen: { fieldId: sw.fieldId, values: [...next] } });
                          }}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}
                {sw?.fieldId && parentOptions.length > 0 && selectedVals.size === 0 && (
                  <div className="tpl-cascade-hint" style={{ marginLeft: 0, color: "var(--warn, #c8836e)" }}>
                    No values selected — this field is currently hidden everywhere. Check at least one value, or set "Always" to make it visible.
                  </div>
                )}
              </div>
            );
          })()}
        </div>
        );
      })}

      <button className="add-field-btn" onClick={addField}>+ Add Field</button>
    </div>
    </>
  );
}
