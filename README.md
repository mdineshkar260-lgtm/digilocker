# 📂 DigiLocker — DBMS Project

> A full-stack secure document management system with user authentication, file upload/download, admin panel, and modern dark UI.

---

## 🗂️ Folder Structure

```
digilocker/
├── backend/
│   ├── app.py              ← Flask application (all API routes)
│   ├── start.py            ← Dev startup helper
│   ├── requirements.txt    ← Python dependencies
│   ├── Procfile            ← For Render deployment
│   ├── database/
│   │   └── schema.sql      ← SQLite schema
│   └── static/
│       └── uploads/        ← Uploaded files stored here
│
└── frontend/
    ├── index.html          ← Login / Register page
    ├── dashboard.html      ← Main app (dashboard, docs, upload, admin)
    ├── css/
    │   └── style.css       ← Complete design system
    └── js/
        ├── config.js       ← API URL + helper utilities
        ├── auth.js         ← Login/Register logic
        └── dashboard.js    ← All dashboard features
```

---

## ⚙️ Tech Stack

| Layer    | Technology              |
|----------|-------------------------|
| Frontend | HTML5, CSS3, Vanilla JS |
| Backend  | Python Flask            |
| Database | SQLite                  |
| Auth     | Token-based (JWT-style) |
| Hosting  | GitHub Pages + Render   |

---

## 🚀 Local Setup (Step-by-Step)

### 1. Clone or download the project

```bash
git clone https://github.com/YOUR_USERNAME/digilocker.git
cd digilocker
```

### 2. Set up the Python backend

```bash
cd backend

# Create a virtual environment
python -m venv venv

# Activate it
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Start the backend server

```bash
python start.py
```

You should see:
```
==================================================
  DigiLocker Backend Server
==================================================
  URL:  http://localhost:5000
  API:  http://localhost:5000/api
==================================================
```

### 4. Open the frontend

Simply open `frontend/index.html` in your browser.

Or, for best results, serve it with a simple HTTP server:

```bash
cd frontend
python -m http.server 8080
# Open: http://localhost:8080
```

### 5. Create your first account

- Go to the Register tab
- Fill in name, email, password
- **The very first registered user automatically becomes Admin!**

---

## 📡 API Endpoints

### Auth
| Method | Endpoint          | Description         |
|--------|-------------------|---------------------|
| POST   | /api/register     | Create account      |
| POST   | /api/login        | Login, get token    |
| POST   | /api/logout       | Invalidate token    |
| GET    | /api/me           | Get current user    |

### Documents
| Method | Endpoint                          | Description       |
|--------|-----------------------------------|-------------------|
| GET    | /api/documents                    | List user's docs  |
| POST   | /api/documents/upload             | Upload a file     |
| GET    | /api/documents/{id}/download      | Download file     |
| GET    | /api/documents/{id}/view          | Preview file      |
| DELETE | /api/documents/{id}               | Delete file       |

### Profile
| Method | Endpoint               | Description           |
|--------|------------------------|-----------------------|
| POST   | /api/profile/picture   | Upload profile pic    |

### Admin (Admin only)
| Method | Endpoint                    | Description       |
|--------|------------------------------|-------------------|
| GET    | /api/admin/users            | List all users    |
| GET    | /api/admin/documents        | List all docs     |
| GET    | /api/admin/stats            | Platform stats    |
| DELETE | /api/admin/users/{id}       | Delete a user     |

### Query Parameters for GET /api/documents
- `search` — search by file name
- `type` — filter by extension (pdf, jpg, etc.)
- `sort` — newest | oldest | name

---

## 🗄️ Database Schema

```sql
-- Users table
CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    UNIQUE NOT NULL,
    password_hash TEXT    NOT NULL,
    is_admin      INTEGER DEFAULT 0,
    profile_pic   TEXT    DEFAULT NULL,
    created_at    TEXT    DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE documents (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    file_name     TEXT    NOT NULL,      -- UUID-based stored name
    original_name TEXT    NOT NULL,
    file_path     TEXT    NOT NULL,
    file_type     TEXT    NOT NULL,
    file_size     INTEGER NOT NULL,
    upload_date   TEXT    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Auth tokens table
CREATE TABLE auth_tokens (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    token      TEXT    UNIQUE NOT NULL,
    expires_at TEXT    NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 🌐 Deployment Guide

### Backend → Render (Free)

1. Push your `backend/` folder to a GitHub repo.
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Configure:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app`
   - **Environment:** Python 3
5. Add environment variable: `PYTHON_VERSION = 3.11.0`
6. Click **Deploy**
7. Copy your Render URL (e.g. `https://digilocker-api.onrender.com`)

### Frontend → GitHub Pages

1. Push the `frontend/` folder contents to a repo named `YOUR_USERNAME.github.io/digilocker`
2. **Before pushing**, edit `frontend/js/config.js`:
   ```js
   // Change this line:
   : "https://digilocker-api.onrender.com";
   // To your actual Render URL
   ```
3. In GitHub: Settings → Pages → Source: main branch → `/` (root)
4. Your site will be live at: `https://YOUR_USERNAME.github.io/digilocker`

### Alternative: Railway

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select your backend repo
4. Railway auto-detects Python and installs dependencies
5. Get your public URL from the deployment settings

---

## ✨ Features Summary

| Feature                  | Status |
|--------------------------|--------|
| User Registration        | ✅     |
| Login / Logout           | ✅     |
| Password hashing         | ✅     |
| Token-based auth         | ✅     |
| Upload documents         | ✅     |
| View / Preview files     | ✅     |
| Download documents       | ✅     |
| Delete documents         | ✅     |
| Search documents         | ✅     |
| Filter by type           | ✅     |
| Sort (date/name)         | ✅     |
| Profile picture upload   | ✅     |
| Dark / Light mode toggle | ✅     |
| Responsive mobile UI     | ✅     |
| Admin panel              | ✅     |
| Admin: view all users    | ✅     |
| Admin: delete users      | ✅     |
| Admin: view all docs     | ✅     |
| Admin: platform stats    | ✅     |
| File type validation     | ✅     |
| File size limit (10MB)   | ✅     |

---

## 🔐 Security Features

- **Password hashing** — SHA-256 with salt (no plaintext storage)
- **Token-based auth** — 24-hour expiry tokens in database
- **File validation** — Only allowed extensions accepted
- **Ownership checks** — Users can only access their own files
- **UUID filenames** — Uploaded files get random names (no path traversal)
- **CORS** — Configured for cross-origin frontend requests
- **File size limit** — 10MB max per file

---

## 🧪 Test Credentials

After running the backend, the schema seeds an admin:

| Field    | Value                  |
|----------|------------------------|
| Email    | admin@digilocker.com   |
| Password | password123            |
| Role     | Administrator          |

---

## 📝 Notes for Examiners / Reviewers

1. **DBMS Concepts used:** Relational tables, foreign keys, cascading deletes, indexing, parameterized queries.
2. **Normalization:** Users and Documents are in 3NF — no redundant data.
3. **Security:** Follows OWASP basic guidelines — hashed passwords, no SQL injection (parameterized queries), file validation.
4. **REST API:** Full RESTful design with proper HTTP status codes.
5. **Responsive:** Works on mobile (320px) through desktop (1920px).
