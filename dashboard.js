/**
 * DigiLocker — Dashboard Logic
 * Handles navigation, document CRUD, upload, admin panel, dark mode.
 */

// ── Auth Guard ─────────────────────────────────────────────────────────────────
if (!requireAuth()) throw new Error("Not authenticated");

// ── State ─────────────────────────────────────────────────────────────────────
let currentUser  = JSON.parse(localStorage.getItem("user") || "{}");
let selectedFile = null;
let allDocs      = [];

// ── Init ──────────────────────────────────────────────────────────────────────
(async function init() {
  // Refresh user from API
  const { ok, data } = await apiFetch("/api/me");
  if (!ok) { logout(); return; }
  currentUser = data.user;
  localStorage.setItem("user", JSON.stringify(currentUser));

  // Apply saved dark-mode preference
  if (localStorage.getItem("darkMode") === "false") {
    document.body.classList.add("light");
    document.getElementById("darkToggle").textContent = "☀️ Light Mode";
  }

  // Populate UI with user info
  document.getElementById("topbarName").textContent  = currentUser.name;
  document.getElementById("welcomeName").textContent = currentUser.name.split(" ")[0];

  // Avatar
  const avatarSrc = currentUser.profile_pic
    ? `${API_BASE}/uploads/${currentUser.profile_pic}`
    : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.name)}`;
  document.getElementById("topbarAvatar").src = avatarSrc;
  document.getElementById("profilePic").src   = avatarSrc;

  // Show admin nav if admin
  if (currentUser.is_admin) {
    document.getElementById("adminNavItem").style.display = "flex";
  }

  // Load the default page
  await loadDashboard();
})();

// ── Navigation ─────────────────────────────────────────────────────────────────
async function navigateTo(page, el) {
  // Update nav
  document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
  const navEl = el || document.querySelector(`[data-page="${page}"]`);
  if (navEl) navEl.classList.add("active");

  // Hide all pages, show target
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(`page-${page}`).classList.add("active");

  // Update topbar title
  const titles = { dashboard:"Dashboard", documents:"My Documents", upload:"Upload", profile:"Profile", admin:"Admin Panel" };
  document.getElementById("topbarTitle").textContent = titles[page] || page;

  // Close mobile sidebar
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebarOverlay").classList.remove("show");

  // Load page data
  const loaders = {
    dashboard: loadDashboard,
    documents: loadDocuments,
    profile:   loadProfile,
    admin:     loadAdmin,
  };
  if (loaders[page]) await loaders[page]();
}

// ── Sidebar toggle (mobile) ────────────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("sidebarOverlay").classList.toggle("show");
}

// ── Dark Mode ─────────────────────────────────────────────────────────────────
function toggleDark() {
  const isLight = document.body.classList.toggle("light");
  localStorage.setItem("darkMode", String(!isLight));
  document.getElementById("darkToggle").textContent = isLight ? "☀️ Light Mode" : "🌙 Dark Mode";
}

// ── Logout ────────────────────────────────────────────────────────────────────
async function logout() {
  await apiFetch("/api/logout", { method: "POST" }).catch(() => {});
  localStorage.clear();
  window.location.href = "index.html";
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD PAGE
// ══════════════════════════════════════════════════════════════════════════════
async function loadDashboard() {
  const { ok, data } = await apiFetch("/api/documents");
  if (!ok) return;

  allDocs = data.documents;
  const totalSize = allDocs.reduce((s, d) => s + (d.file_size || 0), 0);
  const thisMonth = allDocs.filter(d => {
    const m = new Date(d.upload_date).getMonth();
    return m === new Date().getMonth();
  }).length;

  document.getElementById("statDocs").textContent   = allDocs.length;
  document.getElementById("statSize").textContent   = formatSize(totalSize);
  document.getElementById("statRecent").textContent = thisMonth;

  // Recent 5 docs
  const recentDiv = document.getElementById("recentDocs");
  const recent    = [...allDocs].slice(0, 5);
  if (recent.length === 0) {
    recentDiv.innerHTML = '<div class="empty-msg"><div class="empty-icon">📭</div><p>No documents yet. Upload one!</p></div>';
    return;
  }
  recentDiv.innerHTML = recent.map(d => docRowHtml(d)).join("");
}

// ══════════════════════════════════════════════════════════════════════════════
// DOCUMENTS PAGE
// ══════════════════════════════════════════════════════════════════════════════
async function loadDocuments() {
  await searchDocs();
}

async function searchDocs() {
  const search = document.getElementById("searchInput")?.value || "";
  const type   = document.getElementById("typeFilter")?.value  || "";
  const sort   = document.getElementById("sortSelect")?.value  || "newest";

  const params = new URLSearchParams({ search, type, sort });
  const { ok, data } = await apiFetch(`/api/documents?${params}`);

  const grid = document.getElementById("docGrid");
  if (!ok) { grid.innerHTML = '<div class="loading-msg">Failed to load.</div>'; return; }

  allDocs = data.documents;
  if (allDocs.length === 0) {
    grid.innerHTML = '<div class="empty-msg" style="grid-column:1/-1"><div class="empty-icon">🗂️</div><p>No documents found.</p></div>';
    return;
  }
  grid.innerHTML = allDocs.map(d => docCardHtml(d)).join("");
}

// ── Doc row HTML (compact) ────────────────────────────────────────────────────
function docRowHtml(doc) {
  return `
    <div class="doc-row" id="row-${doc.id}">
      <span class="doc-type-badge">${doc.file_type?.toUpperCase()}</span>
      <span class="doc-name" title="${doc.original_name}">${doc.original_name}</span>
      <span class="doc-date">${formatDate(doc.upload_date)}</span>
      <div class="doc-actions">
        <button class="icon-btn view" title="Preview" onclick="previewDoc(${doc.id},'${doc.file_type}','${doc.original_name}')">👁</button>
        <button class="icon-btn dl"  title="Download" onclick="downloadDoc(${doc.id})">⬇</button>
        <button class="icon-btn del" title="Delete"   onclick="deleteDoc(${doc.id})">🗑</button>
      </div>
    </div>`;
}

// ── Doc card HTML (grid) ──────────────────────────────────────────────────────
function docCardHtml(doc) {
  const isImg  = ["jpg","jpeg","png","gif","webp"].includes(doc.file_type);
  const thumb  = isImg
    ? `<img src="${API_BASE}/uploads/${doc.file_name}" alt="${doc.original_name}" loading="lazy"/>`
    : `<span>${fileIcon(doc.file_type)}</span>`;

  return `
    <div class="doc-card" id="card-${doc.id}">
      <div class="doc-card-thumb">${thumb}</div>
      <div class="doc-card-body">
        <div class="doc-card-name" title="${doc.original_name}">${doc.original_name}</div>
        <div class="doc-card-meta">${formatSize(doc.file_size)} · ${formatDate(doc.upload_date)}</div>
      </div>
      <div class="doc-card-actions">
        <button class="icon-btn view" title="Preview"  onclick="previewDoc(${doc.id},'${doc.file_type}','${doc.original_name}')">👁</button>
        <button class="icon-btn dl"  title="Download" onclick="downloadDoc(${doc.id})">⬇</button>
        <button class="icon-btn del" title="Delete"   onclick="deleteDoc(${doc.id})">🗑</button>
      </div>
    </div>`;
}

// ── Download doc ──────────────────────────────────────────────────────────────
function downloadDoc(docId) {
  const token = localStorage.getItem("token");
  const a     = document.createElement("a");
  a.href      = `${API_BASE}/api/documents/${docId}/download`;
  a.setAttribute("download", "");
  // Append token to query string for download
  fetch(`${API_BASE}/api/documents/${docId}/download`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => res.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob);
      a.href = url;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
}

// ── Preview modal ─────────────────────────────────────────────────────────────
async function previewDoc(docId, fileType, fileName) {
  document.getElementById("modalTitle").textContent = fileName;
  const body  = document.getElementById("modalBody");
  const token = localStorage.getItem("token");
  const url   = `${API_BASE}/api/documents/${docId}/view`;

  const isImg = ["jpg","jpeg","png","gif","webp"].includes(fileType);
  const isPdf = fileType === "pdf";

  if (isImg) {
    body.innerHTML = `<img src="${url}" alt="${fileName}" style="max-width:100%;max-height:70vh;display:block;margin:auto" />`;
  } else if (isPdf) {
    body.innerHTML = `<iframe src="${url}#toolbar=0" style="width:100%;height:70vh;border:none"></iframe>`;
  } else {
    // Fetch text content
    try {
      const res  = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const text = await res.text();
      body.innerHTML = `<pre style="padding:20px;font-size:.85rem;white-space:pre-wrap;max-height:60vh;overflow:auto">${escHtml(text)}</pre>`;
    } catch {
      body.innerHTML = `<p style="padding:20px;color:var(--muted)">Cannot preview this file type. Please download it.</p>`;
    }
  }

  document.getElementById("previewModal").classList.remove("hidden");
}

function closeModal() { document.getElementById("previewModal").classList.add("hidden"); }
function escHtml(s) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

// ── Delete doc ────────────────────────────────────────────────────────────────
async function deleteDoc(docId) {
  if (!confirm("Delete this document? This cannot be undone.")) return;

  const { ok, data } = await apiFetch(`/api/documents/${docId}`, { method: "DELETE" });
  if (!ok) { alert(data.error || "Delete failed"); return; }

  // Remove from DOM
  document.getElementById(`card-${docId}`)?.remove();
  document.getElementById(`row-${docId}`)?.remove();
}

// ══════════════════════════════════════════════════════════════════════════════
// UPLOAD PAGE
// ══════════════════════════════════════════════════════════════════════════════
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) showFilePreview(file);
}

function handleDrop(event) {
  event.preventDefault();
  document.getElementById("dropZone").classList.remove("dragover");
  const file = event.dataTransfer.files[0];
  if (file) showFilePreview(file);
}

function showFilePreview(file) {
  selectedFile = file;
  document.getElementById("previewName").textContent = file.name;
  document.getElementById("previewSize").textContent = formatSize(file.size);
  document.getElementById("previewIcon").textContent = fileIcon(file.name.split(".").pop());
  document.getElementById("filePreview").classList.remove("hidden");
  document.getElementById("uploadBtn").disabled = false;
  document.getElementById("uploadAlert").style.display = "none";
}

function clearFile() {
  selectedFile = null;
  document.getElementById("fileInput").value = "";
  document.getElementById("filePreview").classList.add("hidden");
  document.getElementById("uploadBtn").disabled = true;
}

async function uploadFile() {
  if (!selectedFile) return;

  const formData = new FormData();
  formData.append("file", selectedFile);

  const token = localStorage.getItem("token");
  const progressWrap = document.getElementById("uploadProgress");
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");
  const uploadBtn    = document.getElementById("uploadBtn");
  const alertEl      = document.getElementById("uploadAlert");

  progressWrap.classList.remove("hidden");
  uploadBtn.disabled = true;
  alertEl.style.display = "none";

  // Simulate progress (XHR for real progress)
  const xhr = new XMLHttpRequest();
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const pct = Math.round((e.loaded / e.total) * 100);
      progressFill.style.width = `${pct}%`;
      progressText.textContent = `Uploading… ${pct}%`;
    }
  };

  xhr.onload = () => {
    progressWrap.classList.add("hidden");
    if (xhr.status === 201) {
      alertEl.textContent = "✅ Document uploaded successfully!";
      alertEl.className   = "alert success";
      alertEl.style.display = "block";
      clearFile();
    } else {
      const err = JSON.parse(xhr.responseText || "{}");
      alertEl.textContent = `❌ ${err.error || "Upload failed."}`;
      alertEl.className   = "alert error";
      alertEl.style.display = "block";
      uploadBtn.disabled = false;
    }
  };

  xhr.onerror = () => {
    progressWrap.classList.add("hidden");
    alertEl.textContent = "❌ Network error. Please try again.";
    alertEl.className   = "alert error";
    alertEl.style.display = "block";
    uploadBtn.disabled = false;
  };

  xhr.open("POST", `${API_BASE}/api/documents/upload`);
  xhr.setRequestHeader("Authorization", `Bearer ${token}`);
  xhr.send(formData);
}

// ══════════════════════════════════════════════════════════════════════════════
// PROFILE PAGE
// ══════════════════════════════════════════════════════════════════════════════
async function loadProfile() {
  const { ok, data } = await apiFetch("/api/documents");
  const docCount      = ok ? data.documents.length : "—";

  document.getElementById("profileName").textContent  = currentUser.name;
  document.getElementById("profileEmail").textContent = currentUser.email;

  const badge = document.getElementById("profileBadge");
  badge.textContent = currentUser.is_admin ? "Admin" : "User";
  if (currentUser.is_admin) badge.classList.add("admin");

  document.getElementById("infoName").textContent     = currentUser.name;
  document.getElementById("infoEmail").textContent    = currentUser.email;
  document.getElementById("infoRole").textContent     = currentUser.is_admin ? "Administrator" : "User";
  document.getElementById("infoJoined").textContent   = currentUser.created_at ? formatDate(currentUser.created_at) : "—";
  document.getElementById("infoDocCount").textContent = docCount;
}

async function uploadProfilePic(event) {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  const { ok, data } = await apiFetch("/api/profile/picture", {
    method: "POST",
    headers: {},  // Let browser set content-type for FormData
    body: formData
  });

  if (!ok) { alert(data.error || "Upload failed"); return; }

  const newSrc = `${API_BASE}/uploads/${data.profile_pic}`;
  document.getElementById("profilePic").src    = newSrc;
  document.getElementById("topbarAvatar").src  = newSrc;
  currentUser.profile_pic = data.profile_pic;
  localStorage.setItem("user", JSON.stringify(currentUser));
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
async function loadAdmin() {
  if (!currentUser.is_admin) {
    navigateTo("dashboard");
    return;
  }

  // Stats
  const { data: stats } = await apiFetch("/api/admin/stats");
  document.getElementById("adminUserCount").textContent = stats.total_users   || "—";
  document.getElementById("adminDocCount").textContent  = stats.total_documents|| "—";
  document.getElementById("adminTotalSize").textContent = formatSize(stats.total_size);

  // Users table
  const { data: ud } = await apiFetch("/api/admin/users");
  const tbody = document.getElementById("usersTableBody");
  if (!ud.users?.length) {
    tbody.innerHTML = "<tr><td colspan='7' style='text-align:center;color:var(--muted)'>No users</td></tr>";
  } else {
    tbody.innerHTML = ud.users.map(u => `
      <tr>
        <td>#${u.id}</td>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td><span class="badge ${u.is_admin ? 'admin' : ''}">${u.is_admin ? "Admin" : "User"}</span></td>
        <td>${u.doc_count}</td>
        <td>${formatDate(u.created_at)}</td>
        <td>${u.id !== currentUser.id
          ? `<button class="icon-btn del" onclick="adminDeleteUser(${u.id})">🗑 Delete</button>`
          : '<span style="color:var(--muted);font-size:.8rem">You</span>'}</td>
      </tr>`).join("");
  }

  // Docs table
  const { data: dd } = await apiFetch("/api/admin/documents");
  const dbody = document.getElementById("adminDocsBody");
  if (!dd.documents?.length) {
    dbody.innerHTML = "<tr><td colspan='7' style='text-align:center;color:var(--muted)'>No documents</td></tr>";
  } else {
    dbody.innerHTML = dd.documents.map(d => `
      <tr>
        <td>#${d.id}</td>
        <td title="${d.original_name}">${d.original_name.length > 28 ? d.original_name.slice(0,28)+"…" : d.original_name}</td>
        <td>${d.user_name}</td>
        <td>${d.file_type?.toUpperCase()}</td>
        <td>${formatSize(d.file_size)}</td>
        <td>${formatDate(d.upload_date)}</td>
        <td><button class="icon-btn del" onclick="deleteDoc(${d.id}); this.closest('tr').remove()">🗑 Delete</button></td>
      </tr>`).join("");
  }
}

async function adminDeleteUser(userId) {
  if (!confirm("Delete this user and ALL their documents? This cannot be undone.")) return;

  const { ok, data } = await apiFetch(`/api/admin/users/${userId}`, { method: "DELETE" });
  if (!ok) { alert(data.error || "Delete failed"); return; }
  await loadAdmin();
}

// ── Close modal on overlay click ──────────────────────────────────────────────
document.getElementById("previewModal").addEventListener("click", function(e) {
  if (e.target === this) closeModal();
});
