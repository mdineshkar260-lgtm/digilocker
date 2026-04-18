-- ═══════════════════════════════════════════════════════════
--  DigiLocker — Database Schema
--  Run: sqlite3 database/digilocker.db < schema.sql
-- ═══════════════════════════════════════════════════════════

-- Drop existing tables (for fresh init)
DROP TABLE IF EXISTS auth_tokens;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS users;

-- ── Users ─────────────────────────────────────────────────────
CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    UNIQUE NOT NULL,
    password_hash TEXT    NOT NULL,
    is_admin      INTEGER DEFAULT 0,        -- 1 = admin
    profile_pic   TEXT    DEFAULT NULL,     -- filename in uploads/
    created_at    TEXT    DEFAULT CURRENT_TIMESTAMP
);

-- ── Documents ─────────────────────────────────────────────────
CREATE TABLE documents (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    file_name     TEXT    NOT NULL,         -- UUID-based stored name
    original_name TEXT    NOT NULL,         -- original file name
    file_path     TEXT    NOT NULL,         -- absolute disk path
    file_type     TEXT    NOT NULL,         -- extension (pdf, jpg, etc.)
    file_size     INTEGER NOT NULL,         -- bytes
    upload_date   TEXT    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Auth Tokens ────────────────────────────────────────────────
CREATE TABLE auth_tokens (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    token      TEXT    UNIQUE NOT NULL,
    expires_at TEXT    NOT NULL,            -- ISO datetime
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_tokens_token      ON auth_tokens(token);
CREATE INDEX idx_tokens_user_id    ON auth_tokens(user_id);

-- ── Sample data (optional — remove for production) ────────────
-- Admin user (password: admin123)
INSERT INTO users (name, email, password_hash, is_admin)
VALUES ('Admin User', 'admin@digilocker.com',
        '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', -- password123
        1);
