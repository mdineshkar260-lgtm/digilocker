"""
DigiLocker DBMS Project - Flask Backend
Full-featured document management system with authentication, file handling, and admin panel.
"""

from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
import sqlite3
import os
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta
from functools import wraps
from werkzeug.utils import secure_filename

# ─── App Configuration ────────────────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = secrets.token_hex(32)  # Secure random secret key
CORS(app, supports_credentials=True, origins=["*"])

BASE_DIR      = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "static", "uploads")
DATABASE      = os.path.join(BASE_DIR, "database", "digilocker.db")

ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "gif", "webp", "doc", "docx", "txt"}
MAX_FILE_SIZE      = 10 * 1024 * 1024  # 10 MB

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(os.path.dirname(DATABASE), exist_ok=True)


# ─── Database Helpers ─────────────────────────────────────────────────────────
def get_db():
    """Return a database connection with row_factory for dict-like rows."""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create tables if they don't exist."""
    conn = get_db()
    c = conn.cursor()

    # Users table
    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            name          TEXT    NOT NULL,
            email         TEXT    UNIQUE NOT NULL,
            password_hash TEXT    NOT NULL,
            is_admin      INTEGER DEFAULT 0,
            profile_pic   TEXT    DEFAULT NULL,
            created_at    TEXT    DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Documents table
    c.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL,
            file_name   TEXT    NOT NULL,
            original_name TEXT  NOT NULL,
            file_path   TEXT    NOT NULL,
            file_type   TEXT    NOT NULL,
            file_size   INTEGER NOT NULL,
            upload_date TEXT    DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # Sessions table (token-based auth)
    c.execute("""
        CREATE TABLE IF NOT EXISTS auth_tokens (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL,
            token      TEXT    UNIQUE NOT NULL,
            expires_at TEXT    NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    conn.commit()
    conn.close()


# ─── Auth Utilities ───────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    """SHA-256 hash with salt."""
    salt = "digilocker_salt_2024"
    return hashlib.sha256((password + salt).encode()).hexdigest()


def create_token(user_id: int) -> str:
    """Generate a secure session token valid for 24 hours."""
    token  = secrets.token_urlsafe(32)
    expiry = (datetime.utcnow() + timedelta(hours=24)).isoformat()
    conn   = get_db()
    conn.execute("INSERT INTO auth_tokens (user_id, token, expires_at) VALUES (?,?,?)",
                 (user_id, token, expiry))
    conn.commit()
    conn.close()
    return token


def get_user_from_token(token: str):
    """Validate token and return user row, or None."""
    if not token:
        return None
    conn = get_db()
    row  = conn.execute(
        "SELECT u.* FROM users u JOIN auth_tokens t ON u.id=t.user_id "
        "WHERE t.token=? AND t.expires_at > ?",
        (token, datetime.utcnow().isoformat())
    ).fetchone()
    conn.close()
    return row


def token_required(f):
    """Decorator: require valid token in Authorization header."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        user  = get_user_from_token(token)
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        return f(dict(user), *args, **kwargs)
    return decorated


def admin_required(f):
    """Decorator: require admin privileges."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        user  = get_user_from_token(token)
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        if not user["is_admin"]:
            return jsonify({"error": "Admin access required"}), 403
        return f(dict(user), *args, **kwargs)
    return decorated


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# ─── Auth Routes ──────────────────────────────────────────────────────────────
@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    name     = (data.get("name")     or "").strip()
    email    = (data.get("email")    or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not name or not email or not password:
        return jsonify({"error": "All fields are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "Email already registered"}), 409

    pw_hash = hash_password(password)
    # First user becomes admin
    count   = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
    is_admin = 1 if count == 0 else 0

    conn.execute(
        "INSERT INTO users (name, email, password_hash, is_admin) VALUES (?,?,?,?)",
        (name, email, pw_hash, is_admin)
    )
    conn.commit()
    user_id = conn.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()["id"]
    conn.close()

    token = create_token(user_id)
    return jsonify({"message": "Registered successfully", "token": token,
                    "user": {"id": user_id, "name": name, "email": email, "is_admin": is_admin}}), 201


@app.route("/api/login", methods=["POST"])
def login():
    data     = request.get_json()
    email    = (data.get("email")    or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    conn    = get_db()
    user    = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    conn.close()

    if not user or user["password_hash"] != hash_password(password):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_token(user["id"])
    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": {
            "id":       user["id"],
            "name":     user["name"],
            "email":    user["email"],
            "is_admin": user["is_admin"],
            "profile_pic": user["profile_pic"]
        }
    })


@app.route("/api/logout", methods=["POST"])
@token_required
def logout(current_user):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    conn  = get_db()
    conn.execute("DELETE FROM auth_tokens WHERE token=?", (token,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Logged out"})


@app.route("/api/me", methods=["GET"])
@token_required
def get_me(current_user):
    return jsonify({"user": current_user})


# ─── Document Routes ──────────────────────────────────────────────────────────
@app.route("/api/documents", methods=["GET"])
@token_required
def list_documents(current_user):
    """List all documents for the current user, with optional search/filter."""
    search    = request.args.get("search", "")
    file_type = request.args.get("type", "")
    sort      = request.args.get("sort", "newest")  # newest | oldest | name

    conn  = get_db()
    query = "SELECT * FROM documents WHERE user_id=?"
    params = [current_user["id"]]

    if search:
        query += " AND original_name LIKE ?"
        params.append(f"%{search}%")
    if file_type:
        query += " AND file_type=?"
        params.append(file_type)

    order_map = {"newest": "upload_date DESC", "oldest": "upload_date ASC", "name": "original_name ASC"}
    query += f" ORDER BY {order_map.get(sort, 'upload_date DESC')}"

    docs  = [dict(d) for d in conn.execute(query, params).fetchall()]
    conn.close()
    return jsonify({"documents": docs})


@app.route("/api/documents/upload", methods=["POST"])
@token_required
def upload_document(current_user):
    """Upload a new document."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

    original_name = secure_filename(file.filename)
    ext           = original_name.rsplit(".", 1)[1].lower()
    unique_name   = f"{uuid.uuid4().hex}.{ext}"  # Prevent name collisions
    file_path     = os.path.join(UPLOAD_FOLDER, unique_name)

    file.save(file_path)
    file_size = os.path.getsize(file_path)

    conn = get_db()
    conn.execute(
        "INSERT INTO documents (user_id, file_name, original_name, file_path, file_type, file_size) "
        "VALUES (?,?,?,?,?,?)",
        (current_user["id"], unique_name, original_name, file_path, ext, file_size)
    )
    conn.commit()
    doc_id = conn.execute("SELECT last_insert_rowid() as id").fetchone()["id"]
    doc    = dict(conn.execute("SELECT * FROM documents WHERE id=?", (doc_id,)).fetchone())
    conn.close()

    return jsonify({"message": "File uploaded successfully", "document": doc}), 201


@app.route("/api/documents/<int:doc_id>/download", methods=["GET"])
@token_required
def download_document(current_user, doc_id):
    """Download a document (only owner or admin)."""
    conn = get_db()
    doc  = conn.execute("SELECT * FROM documents WHERE id=?", (doc_id,)).fetchone()
    conn.close()

    if not doc:
        return jsonify({"error": "Document not found"}), 404
    if doc["user_id"] != current_user["id"] and not current_user["is_admin"]:
        return jsonify({"error": "Access denied"}), 403

    return send_from_directory(UPLOAD_FOLDER, doc["file_name"],
                               as_attachment=True,
                               download_name=doc["original_name"])


@app.route("/api/documents/<int:doc_id>", methods=["DELETE"])
@token_required
def delete_document(current_user, doc_id):
    """Delete a document (only owner or admin)."""
    conn = get_db()
    doc  = conn.execute("SELECT * FROM documents WHERE id=?", (doc_id,)).fetchone()

    if not doc:
        conn.close()
        return jsonify({"error": "Document not found"}), 404
    if doc["user_id"] != current_user["id"] and not current_user["is_admin"]:
        conn.close()
        return jsonify({"error": "Access denied"}), 403

    # Remove file from disk
    try:
        os.remove(doc["file_path"])
    except FileNotFoundError:
        pass

    conn.execute("DELETE FROM documents WHERE id=?", (doc_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Document deleted"})


@app.route("/api/documents/<int:doc_id>/view", methods=["GET"])
@token_required
def view_document(current_user, doc_id):
    """Serve a document inline for preview."""
    conn = get_db()
    doc  = conn.execute("SELECT * FROM documents WHERE id=?", (doc_id,)).fetchone()
    conn.close()

    if not doc:
        return jsonify({"error": "Document not found"}), 404
    if doc["user_id"] != current_user["id"] and not current_user["is_admin"]:
        return jsonify({"error": "Access denied"}), 403

    return send_from_directory(UPLOAD_FOLDER, doc["file_name"], as_attachment=False)


# ─── Profile Routes ────────────────────────────────────────────────────────────
@app.route("/api/profile/picture", methods=["POST"])
@token_required
def upload_profile_pic(current_user):
    """Upload profile picture."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename or not allowed_file(file.filename):
        return jsonify({"error": "Invalid file"}), 400

    ext  = secure_filename(file.filename).rsplit(".", 1)[1].lower()
    if ext not in {"png", "jpg", "jpeg", "webp", "gif"}:
        return jsonify({"error": "Only images allowed for profile picture"}), 400

    pic_name  = f"profile_{current_user['id']}_{uuid.uuid4().hex[:8]}.{ext}"
    pic_path  = os.path.join(UPLOAD_FOLDER, pic_name)
    file.save(pic_path)

    conn = get_db()
    conn.execute("UPDATE users SET profile_pic=? WHERE id=?", (pic_name, current_user["id"]))
    conn.commit()
    conn.close()
    return jsonify({"message": "Profile picture updated", "profile_pic": pic_name})


# ─── Admin Routes ─────────────────────────────────────────────────────────────
@app.route("/api/admin/users", methods=["GET"])
@admin_required
def admin_list_users(current_user):
    conn  = get_db()
    users = [dict(u) for u in conn.execute(
        "SELECT id, name, email, is_admin, created_at, "
        "(SELECT COUNT(*) FROM documents d WHERE d.user_id=u.id) as doc_count "
        "FROM users u ORDER BY created_at DESC"
    ).fetchall()]
    conn.close()
    return jsonify({"users": users})


@app.route("/api/admin/documents", methods=["GET"])
@admin_required
def admin_list_documents(current_user):
    conn = get_db()
    docs = [dict(d) for d in conn.execute(
        "SELECT doc.*, u.name as user_name, u.email as user_email "
        "FROM documents doc JOIN users u ON doc.user_id=u.id "
        "ORDER BY doc.upload_date DESC"
    ).fetchall()]
    conn.close()
    return jsonify({"documents": docs})


@app.route("/api/admin/users/<int:user_id>", methods=["DELETE"])
@admin_required
def admin_delete_user(current_user, user_id):
    if user_id == current_user["id"]:
        return jsonify({"error": "Cannot delete yourself"}), 400

    conn = get_db()
    # Delete all files for the user
    docs = conn.execute("SELECT file_path FROM documents WHERE user_id=?", (user_id,)).fetchall()
    for doc in docs:
        try:
            os.remove(doc["file_path"])
        except FileNotFoundError:
            pass

    conn.execute("DELETE FROM users WHERE id=?", (user_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "User deleted"})


@app.route("/api/admin/stats", methods=["GET"])
@admin_required
def admin_stats(current_user):
    conn  = get_db()
    stats = {
        "total_users":     conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"],
        "total_documents": conn.execute("SELECT COUNT(*) as c FROM documents").fetchone()["c"],
        "total_size":      conn.execute("SELECT SUM(file_size) as s FROM documents").fetchone()["s"] or 0,
    }
    # File type breakdown
    types = [dict(r) for r in conn.execute(
        "SELECT file_type, COUNT(*) as count FROM documents GROUP BY file_type"
    ).fetchall()]
    stats["file_types"] = types
    conn.close()
    return jsonify(stats)


# ─── Serve static uploads ──────────────────────────────────────────────────────
@app.route("/uploads/<filename>")
def serve_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


# ─── Health check ─────────────────────────────────────────────────────────────
@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "service": "DigiLocker API"})


# ─── Entry Point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    init_db()
    print("✅ DigiLocker backend running on http://localhost:5000")
    app.run(debug=True, port=5000)
