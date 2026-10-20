
// ─── Utilities ─────────────────────────────────────────────────────────────────

const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const fmtDate = (iso) => {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return ""; }
};

const isoNow = () => new Date().toISOString();

const slugify = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

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