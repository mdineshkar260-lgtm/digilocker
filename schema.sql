-- DigiLocker Database Schema
-- SQLite | mdineshkar260-lgtm/digilocker

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    UNIQUE NOT NULL,
    password_hash TEXT    NOT NULL,
    is_admin      INTEGER DEFAULT 0,
    profile_pic   TEXT    DEFAULT NULL,
    created_at    TEXT    DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    file_name     TEXT    NOT NULL,      -- UUID-based stored name
    original_name TEXT    NOT NULL,      -- Original filename shown to user
    file_path     TEXT    NOT NULL,      -- Absolute path on disk
    file_type     TEXT    NOT NULL,      -- Extension: pdf, jpg, png, etc.
    file_size     INTEGER NOT NULL,      -- Bytes
    upload_date   TEXT    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Auth tokens table (token-based session management)
CREATE TABLE IF NOT EXISTS auth_tokens (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    token      TEXT    UNIQUE NOT NULL,
    expires_at TEXT    NOT NULL,         -- ISO datetime, 24hr expiry
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
