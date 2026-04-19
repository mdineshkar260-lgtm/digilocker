# 📂 DigiLocker — DBMS Project

> Full-stack secure document management system.  
> **GitHub:** `mdineshkar260-lgtm/digilocker`  
> **Frontend:** GitHub Pages  
> **Backend:** Render (Python Flask + SQLite)

---

## 🗂️ Folder Structure

```
digilocker/
├── backend/
│   ├── app.py              ← Flask application (all API routes)
│   ├── start.py            ← Local dev startup helper
│   ├── requirements.txt    ← Python dependencies
│   ├── Procfile            ← For Render deployment
│   ├── .gitignore
│   ├── database/
│   │   └── schema.sql      ← SQLite schema reference
│   └── static/
│       └── uploads/        ← Uploaded files stored here (gitignored)
│
└── frontend/
    ├── index.html          ← Login / Register page
    ├── dashboard.html      ← Main app
    ├── css/
    │   └── style.css
    └── js/
        ├── config.js       ← API URL + helpers  ← EDIT THIS AFTER DEPLOYING
        ├── auth.js         ← Login/Register logic
        └── dashboard.js    ← All dashboard features
```

---

## 🚀 DEPLOYMENT GUIDE (Step by Step)

### STEP 1 — Push ALL files to GitHub

```bash
cd digilocker
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/mdineshkar260-lgtm/digilocker.git
git push -u origin main
```

---

### STEP 2 — Deploy Backend to Render

1. Go to **[render.com](https://render.com)** → Sign in with GitHub
2. Click **New → Web Service**
3. Connect repo: `mdineshkar260-lgtm/digilocker`
4. Set **Root Directory** to: `backend`
5. Configure:

   | Setting | Value |
   |---|---|
   | Runtime | Python 3 |
   | Build Command | `pip install -r requirements.txt` |
   | Start Command | `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2` |

6. Click **Deploy** — wait ~2 minutes
7. **Copy your Render URL** — looks like: `https://digilocker-xxxx.onrender.com`

---

### STEP 3 — Update config.js with your Render URL

Open `frontend/js/config.js` and replace line 11:

```js
// Change this:
: "https://digilocker-mdineshkar.onrender.com";

// To YOUR actual Render URL:
: "https://YOUR-ACTUAL-RENDER-URL.onrender.com";
```

Then push again:
```bash
git add frontend/js/config.js
git commit -m "Update API URL to Render"
git push
```

---

### STEP 4 — Enable GitHub Pages

1. Go to your repo on GitHub: `github.com/mdineshkar260-lgtm/digilocker`
2. **Settings → Pages**
3. Source: **Deploy from a branch**
4. Branch: `main` | Folder: `/frontend`  
   *(if `/frontend` is not available, move all frontend files to repo root)*
5. Save → site live at: `https://mdineshkar260-lgtm.github.io/digilocker`

---

## 🔐 Default Admin Credentials

| Field | Value |
|---|---|
| Email | admin@digilocker.com |
| Password | password123 |
| Role | Administrator |

> The first registered user also auto-becomes Admin.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/register | Create account |
| POST | /api/login | Login, get token |
| POST | /api/logout | Invalidate token |
| GET | /api/me | Get current user |
| GET | /api/documents | List user's docs |
| POST | /api/documents/upload | Upload a file |
| GET | /api/documents/{id}/download | Download file |
| GET | /api/documents/{id}/view | Preview file |
| DELETE | /api/documents/{id} | Delete file |
| POST | /api/profile/picture | Upload profile pic |
| GET | /api/admin/users | List all users (admin) |
| GET | /api/admin/documents | List all docs (admin) |
| GET | /api/admin/stats | Platform stats (admin) |
| DELETE | /api/admin/users/{id} | Delete user (admin) |
| GET | /api/health | Health check |

---

## ⚙️ Local Development

```bash
cd backend
python -m venv venv
source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
python start.py
# Backend: http://localhost:5000

cd ../frontend
python -m http.server 8080
# Frontend: http://localhost:8080
```
