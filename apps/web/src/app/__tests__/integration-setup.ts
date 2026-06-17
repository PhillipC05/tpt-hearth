import type Database from "better-sqlite3";
import { ensureSchema } from "@tpt-hearth/db";
import crypto from "node:crypto";

/**
 * Creates an in-memory SQLite database with the full Hearth schema.
 * Each call returns a fresh database instance.
 */
export async function createTestDatabase(): Promise<Database.Database> {
  // Dynamic import to avoid type issues with exactOptionalPropertyTypes
  const Database = (await import("better-sqlite3")).default;
  const database = new Database(":memory:");
  database.pragma("foreign_keys = ON");
  ensureSchema(database);
  return database;
}

/**
 * Inserts a demo user into the database and returns the user record.
 */
export function insertDemoUser(
  database: Database.Database,
  displayName = "Test User"
) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  database
    .prepare(
      `insert into users (id, display_name, handle, email, auth_provider, created_at)
       values (?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      displayName,
      displayName.toLowerCase().replace(/\s+/g, "-"),
      null,
      "local_demo",
      now
    );
  return {
    id,
    displayName,
    handle: displayName.toLowerCase().replace(/\s+/g, "-"),
    email: null,
    authProvider: "local_demo" as const,
    createdAt: now
  };
}

/**
 * Creates a session token for a user and returns both the raw token and session info.
 */
export function createTestSession(
  database: Database.Database,
  userId: string
) {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  const now = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();
  const sessionId = crypto.randomUUID();

  database
    .prepare(
      `insert into sessions (id, user_id, token_hash, expires_at, created_at)
       values (?, ?, ?, ?, ?)`
    )
    .run(sessionId, userId, tokenHash, expiresAt, now);

  return {
    sessionId,
    userId,
    token,
    expiresAt,
    createdAt: now,
    displayName: "",
    authProvider: "local_demo" as const
  };
}

/**
 * Builds a mock Request object with a Bearer token.
 */
export function buildAuthenticatedRequest(
  token: string,
  body?: unknown,
  method = "POST"
): Request {
  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json"
  };

  const init: RequestInit & { body?: string } = {
    method,
    headers
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  return new Request("http://localhost:3000", init as RequestInit);
}

export function buildUnauthenticatedRequest(
  body?: unknown,
  method = "POST"
): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json"
  };

  const init: RequestInit & { body?: string } = {
    method,
    headers
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  return new Request("http://localhost:3000", init as RequestInit);
}