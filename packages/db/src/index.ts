import Database from "better-sqlite3";
import { DEFAULT_DATABASE_PATH } from "@tpt-hearth/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

export * from "./schema";

let db: Database.Database | null = null;

export function getDatabasePath() {
  const configured = process.env.DATABASE_URL;

  if (configured && configured.startsWith("file:")) {
    const filePath = configured.replace(/^file:/, "");
    return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  }

  if (configured && configured.startsWith("postgresql://")) {
    throw new Error("PostgreSQL is configured, but this SQLite helper is active. Use the Postgres adapter path.");
  }

  const configuredPath = process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH;
  return path.isAbsolute(configuredPath) ? configuredPath : path.resolve(process.cwd(), configuredPath);
}

export function getDb() {
  if (db) {
    return db;
  }

  const databasePath = getDatabasePath();
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  db = new Database(databasePath);
  db.pragma("foreign_keys = ON");
  ensureSchema(db);
  return db;
}

export function closeDb() {
  db?.close();
  db = null;
}

export function ensureSchema(database = getDb()) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      handle TEXT NOT NULL UNIQUE,
      email TEXT,
      auth_provider TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invites (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      max_uses INTEGER NOT NULL DEFAULT 1,
      used_count INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      mood TEXT NOT NULL,
      topic TEXT NOT NULL,
      visibility TEXT NOT NULL,
      privacy_mode TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 12,
      steward_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      rules TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      archived_at TEXT
    );

    CREATE TABLE IF NOT EXISTS room_members (
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      left_at TEXT,
      PRIMARY KEY (room_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body_plaintext TEXT,
      body_ciphertext TEXT,
      nonce TEXT,
      key_version TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS porch_sessions (
      id TEXT PRIMARY KEY,
      mode TEXT NOT NULL,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'waiting',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS letters (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      recipient_room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL,
      subject TEXT NOT NULL,
      body_plaintext TEXT,
      body_ciphertext TEXT,
      nonce TEXT,
      delivery_window TEXT NOT NULL DEFAULT 'now',
      delivered_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chronicles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      body_plaintext TEXT,
      body_ciphertext TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rituals (
      id TEXT PRIMARY KEY,
      host_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      summary TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      target_room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS moderation_actions (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      target_room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transparency_logs (
      id TEXT PRIMARY KEY,
      action_id TEXT NOT NULL REFERENCES moderation_actions(id) ON DELETE CASCADE,
      public_note TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_rooms_visibility ON rooms(visibility);
    CREATE INDEX IF NOT EXISTS idx_rooms_mood ON rooms(mood);
    CREATE INDEX IF NOT EXISTS idx_rooms_topic ON rooms(topic);
    CREATE INDEX IF NOT EXISTS idx_rooms_archived_at ON rooms(archived_at);
    CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON room_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_letters_recipient_user_id ON letters(recipient_user_id);
    CREATE INDEX IF NOT EXISTS idx_letters_created_at ON letters(created_at);
    CREATE INDEX IF NOT EXISTS idx_rituals_starts_at ON rituals(starts_at);
  `);

  // Additive migrations for existing databases
  try { database.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0`); } catch { /* column already exists */ }
}

export function createSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function seedDemoData(database = getDb()) {
  const now = new Date().toISOString();
  const userId = crypto.randomUUID();
  const stewardId = crypto.randomUUID();
  const hearthRoomId = crypto.randomUUID();
  const emberRoomId = crypto.randomUUID();
  const porchRoomId = crypto.randomUUID();

  database.prepare(`INSERT OR IGNORE INTO users (id, display_name, handle, email, auth_provider, created_at) VALUES (?, ?, ?, ?, ?, ?)`).run(
    userId,
    "First Listener",
    "first-listener",
    null,
    "local_demo",
    now
  );
  database.prepare(`INSERT OR IGNORE INTO users (id, display_name, handle, email, auth_provider, created_at) VALUES (?, ?, ?, ?, ?, ?)`).run(
    stewardId,
    "Quiet Steward",
    "quiet-steward",
    null,
    "local_demo",
    now
  );
  database.prepare(`INSERT OR IGNORE INTO rooms (id, name, description, mood, topic, visibility, privacy_mode, capacity, steward_id, rules, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    hearthRoomId,
    "The First Hearth",
    "A small room for the first conversation.",
    "warm",
    "arrival",
    "link_only",
    "private_e2e",
    12,
    stewardId,
    "Speak slowly. Leave space. Step away kindly.",
    now
  );
  database.prepare(`INSERT OR IGNORE INTO rooms (id, name, description, mood, topic, visibility, privacy_mode, capacity, steward_id, rules, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    emberRoomId,
    "Rain in Wellington",
    "A quiet ember room with a rainy mood.",
    "rain",
    "silence",
    "open_directory",
    "open_plaintext",
    12,
    stewardId,
    "Silence is welcome here.",
    now
  );
  database.prepare(`INSERT OR IGNORE INTO rooms (id, name, description, mood, topic, visibility, privacy_mode, capacity, steward_id, rules, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    porchRoomId,
    "Porch Sitting Spot",
    "A temporary room for gentle first meetings.",
    "porch",
    "first meeting",
    "open_porch_eligible",
    "open_plaintext",
    12,
    stewardId,
    "No pressure. Kind exits are welcome.",
    now
  );
  database.prepare(`INSERT OR IGNORE INTO room_members (room_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)`).run(hearthRoomId, userId, "member", now);
  database.prepare(`INSERT OR IGNORE INTO room_members (room_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)`).run(hearthRoomId, stewardId, "steward", now);
  database.prepare(`INSERT OR IGNORE INTO room_members (room_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)`).run(emberRoomId, userId, "member", now);
  database.prepare(`INSERT OR IGNORE INTO room_members (room_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)`).run(emberRoomId, stewardId, "steward", now);
  database.prepare(`INSERT OR IGNORE INTO room_members (room_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)`).run(porchRoomId, userId, "member", now);
  database.prepare(`INSERT OR IGNORE INTO room_members (room_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)`).run(porchRoomId, stewardId, "steward", now);
  database.prepare(`INSERT OR IGNORE INTO settings (id, key, value, updated_at) VALUES (?, ?, ?, ?)`).run(
    crypto.randomUUID(),
    "porch_mode",
    "open_lobby",
    now
  );
  database.prepare(`INSERT OR IGNORE INTO settings (id, key, value, updated_at) VALUES (?, ?, ?, ?)`).run(
    crypto.randomUUID(),
    "open_room_policy",
    "allowed",
    now
  );
}

export const tables = schema;