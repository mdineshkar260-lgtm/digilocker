/**
 * DigiLocker — Configuration
 * GitHub: mdineshkar260-lgtm/digilocker
 * Frontend: GitHub Pages
 * Backend: Render
 */

// ─── API Base URL ──────────────────────────────────────────────────────────────
// Local dev   → http://localhost:5000
// Production  → your Render URL (update after deploying backend to Render)
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:5000"
  : "https://digilocker-mdineshkar.onrender.com"; // ← REPLACE with your actual Render URL

// ─── Helper: Format file size ─────────────────────────────────────────────────
function formatSize(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

// ─── Helper: Format date ──────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Helper: File type icon ───────────────────────────────────────────────────
function fileIcon(ext) {
  const map = {
    pdf: "📕", png: "🖼️", jpg: "🖼️", jpeg: "🖼️", gif: "🖼️", webp: "🖼️",
    doc: "📘", docx: "📘", txt: "📝", default: "📄"
  };
  return map[ext?.toLowerCase()] || map.default;
}

// ─── Helper: API fetch wrapper ────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (options.body instanceof FormData) delete headers["Content-Type"];

  try {
    const res  = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error("API Error:", err);
    return { ok: false, status: 0, data: { error: "Cannot reach server. Is the backend running?" } };
  }
}

// ─── Auth guard ───────────────────────────────────────────────────────────────
function requireAuth() {
  if (!localStorage.getItem("token")) {
    window.location.href = "index.html";
    return false;
  }
  return true;
}
