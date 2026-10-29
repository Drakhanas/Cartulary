
// ─── Utilities ─────────────────────────────────────────────────────────────────

const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const fmtDate = (iso) => {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return ""; }
};

const isoNow = () => new Date().toISOString();

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

// Snapshot formatters. Local-time, fixed-width, scriptorium-register. Format
// is `YYYY-MM-DD HH:MM` — sortable-looking, unambiguous across locales, no
// "Today / Yesterday" relative phrasing that drifts in meaning as the user
// reads the list.
const formatSnapshotTimestamp = (ts) => {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
};

// Human-readable byte sizes for the snapshot list. Single decimal for sub-10
// values (1.2 MB), whole numbers above (42 MB). Limits at GB; nothing should
// reach TB in practice.
const formatSnapshotSize = (bytes) => {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${units[i]}`;
};