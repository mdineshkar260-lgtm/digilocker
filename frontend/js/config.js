/**
 * DigiLocker — Auth (Login / Register)
 */

// Redirect to dashboard if already logged in
if (localStorage.getItem("token")) {
  window.location.href = "dashboard.html";
}

// ── Tab Switching ─────────────────────────────────────────────────────────────
function switchTab(tab) {
  const loginForm    = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const loginBtn     = document.getElementById("loginTab");
  const regBtn       = document.getElementById("registerTab");
  const indicator    = document.getElementById("tabIndicator");

  hideAlert();

  if (tab === "login") {
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    loginBtn.classList.add("active");
    regBtn.classList.remove("active");
    indicator.classList.remove("right");
  } else {
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    regBtn.classList.add("active");
    loginBtn.classList.remove("active");
    indicator.classList.add("right");
  }
}

// ── Alert helpers ─────────────────────────────────────────────────────────────
function showAlert(msg, type = "error") {
  const el = document.getElementById("alert");
  el.textContent = msg;
  el.className = `alert ${type}`;
  el.style.display = "block";
}
function hideAlert() {
  document.getElementById("alert").style.display = "none";
}

// ── Toggle password visibility ────────────────────────────────────────────────
function togglePw(fieldId) {
  const inp = document.getElementById(fieldId);
  inp.type = inp.type === "password" ? "text" : "password";
}

// ── Button loading state ──────────────────────────────────────────────────────
function setLoading(btnId, loading) {
  const btn    = document.getElementById(btnId);
  const text   = btn.querySelector(".btn-text");
  const loader = btn.querySelector(".btn-loader");
  btn.disabled = loading;
  text.style.display   = loading ? "none" : "";
  loader.style.display = loading ? "" : "none";
}

// ── Login Handler ─────────────────────────────────────────────────────────────
async function handleLogin(event) {
  event.preventDefault();
  hideAlert();
  setLoading("loginBtn", true);

  const email    = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  const { ok, data } = await apiFetch("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });

  setLoading("loginBtn", false);

  if (!ok) {
    showAlert(data.error || "Login failed. Please try again.");
    return;
  }

  // Store token and user info
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));

  showAlert("Welcome back! Redirecting…", "success");
  setTimeout(() => { window.location.href = "dashboard.html"; }, 700);
}

// ── Register Handler ──────────────────────────────────────────────────────────
async function handleRegister(event) {
  event.preventDefault();
  hideAlert();
  setLoading("registerBtn", true);

  const name     = document.getElementById("regName").value.trim();
  const email    = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;

  if (password.length < 6) {
    showAlert("Password must be at least 6 characters.");
    setLoading("registerBtn", false);
    return;
  }

  const { ok, data } = await apiFetch("/api/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password })
  });

  setLoading("registerBtn", false);

  if (!ok) {
    showAlert(data.error || "Registration failed.");
    return;
  }

  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));

  showAlert("Account created! Redirecting…", "success");
  setTimeout(() => { window.location.href = "dashboard.html"; }, 700);
}
