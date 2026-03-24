require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'neurovent.sqlite');

// Créer le dossier parent si nécessaire
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Mode WAL pour de meilleures performances
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schéma ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS tags (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT UNIQUE NOT NULL,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    role                TEXT NOT NULL DEFAULT 'PARTICIPANT',
    is_active           INTEGER NOT NULL DEFAULT 1,
    is_staff            INTEGER NOT NULL DEFAULT 0,
    date_joined         TEXT DEFAULT (datetime('now')),
    password_hash       TEXT NOT NULL,

    -- PARTICIPANT
    email               TEXT UNIQUE,
    first_name          TEXT NOT NULL DEFAULT '',
    last_name           TEXT NOT NULL DEFAULT '',
    employer_name       TEXT NOT NULL DEFAULT '',

    -- COMPANY
    company_identifier  TEXT UNIQUE,
    recovery_email      TEXT NOT NULL DEFAULT '',
    company_name        TEXT NOT NULL DEFAULT '',
    company_logo        TEXT DEFAULT NULL,
    company_description TEXT NOT NULL DEFAULT '',
    website_url         TEXT NOT NULL DEFAULT '',
    youtube_url         TEXT NOT NULL DEFAULT '',
    linkedin_url        TEXT NOT NULL DEFAULT '',
    twitter_url         TEXT NOT NULL DEFAULT '',
    instagram_url       TEXT NOT NULL DEFAULT '',
    facebook_url        TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS user_tags (
    user_id INTEGER NOT NULL,
    tag_id  INTEGER NOT NULL,
    PRIMARY KEY (user_id, tag_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id)  REFERENCES tags(id)  ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS events (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id            INTEGER NOT NULL,
    title                 TEXT NOT NULL,
    description           TEXT NOT NULL DEFAULT '',
    banner                TEXT DEFAULT NULL,
    date_start            TEXT NOT NULL,
    date_end              TEXT NOT NULL,
    capacity              INTEGER NOT NULL,
    status                TEXT NOT NULL DEFAULT 'DRAFT',
    format                TEXT NOT NULL DEFAULT 'ONSITE',
    registration_mode     TEXT NOT NULL DEFAULT 'AUTO',
    registration_deadline TEXT DEFAULT NULL,

    address_full          TEXT NOT NULL DEFAULT '',
    address_city          TEXT NOT NULL DEFAULT '',
    address_country       TEXT NOT NULL DEFAULT '',
    address_visibility    TEXT NOT NULL DEFAULT 'FULL',
    address_reveal_date   TEXT DEFAULT NULL,

    online_platform       TEXT NOT NULL DEFAULT '',
    online_link           TEXT NOT NULL DEFAULT '',
    online_visibility     TEXT NOT NULL DEFAULT 'FULL',
    online_reveal_date    TEXT DEFAULT NULL,

    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (company_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS event_tags (
    event_id INTEGER NOT NULL,
    tag_id   INTEGER NOT NULL,
    PRIMARY KEY (event_id, tag_id),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id)   REFERENCES tags(id)   ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS registrations (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_id      INTEGER NOT NULL,
    event_id            INTEGER NOT NULL,
    status              TEXT NOT NULL DEFAULT 'PENDING',
    accessibility_needs TEXT NOT NULL DEFAULT '',
    company_comment     TEXT NOT NULL DEFAULT '',
    created_at          TEXT DEFAULT (datetime('now')),
    updated_at          TEXT DEFAULT (datetime('now')),

    UNIQUE (participant_id, event_id),
    FOREIGN KEY (participant_id) REFERENCES users(id)   ON DELETE CASCADE,
    FOREIGN KEY (event_id)       REFERENCES events(id)  ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS token_blacklist (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    jti            TEXT UNIQUE NOT NULL,
    blacklisted_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    token      TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

module.exports = db;
