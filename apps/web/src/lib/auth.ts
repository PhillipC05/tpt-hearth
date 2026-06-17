import crypto from "node:crypto";
import { authModes, getAuthMode, parseBooleanEnv, type AuthMode } from "@tpt-hearth/config";
import { createSessionToken, getDb, hashToken } from "@tpt-hearth/db";
import { apiError, apiOk, zodErrorMessage, type ApiResponse } from "@tpt-hearth/shared";
import { NextResponse } from "next/server";
import { z } from "zod";

export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
export const MAGIC_LINK_TTL_MS = 1000 * 60 * 15;

export type AuthenticatedUser = {
  id: string;
  displayName: string;
  handle: string;
  email: string | null;
  authProvider: AuthMode;
  isAdmin: boolean;
  createdAt: string;
};

export type AuthenticatedSession = {
  id: string;
  userId: string;
  token: string;
  displayName: string;
  expiresAt: string;
  createdAt: string;
  authProvider: AuthMode;
};

export type AuthenticatedResult = {
  user: AuthenticatedUser;
  session: AuthenticatedSession;
};

export type MagicLinkRequestResult = {
  user: AuthenticatedUser;
  debugLink?: string;
};

export class AuthFailure extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly status = 400
  ) {
    super(message);
    this.name = "AuthFailure";
  }
}

export const demoAuthInputSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional()
});

export const inviteCodeAuthInputSchema = z.object({
  code: z.string().trim().min(1).max(64),
  displayName: z.string().trim().min(1).max(80).optional()
});

export const magicLinkRequestInputSchema = z.object({
  email: z.string().trim().email().max(320)
});

export const magicLinkConfirmInputSchema = z.object({
  token: z.string().min(1).max(256)
});

export const usernameAuthInputSchema = z.object({
  handle: z.string().trim().min(2).max(40).regex(/^[a-zA-Z0-9-]+$/).optional(),
  displayName: z.string().trim().min(1).max(80).optional()
});

type DemoAuthInput = z.infer<typeof demoAuthInputSchema>;
type InviteCodeAuthInput = z.infer<typeof inviteCodeAuthInputSchema>;
type MagicLinkRequestInput = z.infer<typeof magicLinkRequestInputSchema>;
type MagicLinkConfirmInput = z.infer<typeof magicLinkConfirmInputSchema>;
type UsernameAuthInput = z.infer<typeof usernameAuthInputSchema>;

type CreateUserInput = {
  displayName?: string;
  handle?: string | undefined;
  email?: string | null;
  authProvider: AuthMode;
};

type InviteRow = {
  id: string;
  usedCount: number;
  maxUses: number;
  expiresAt: string | null;
};

type PendingMagicLinkRow = {
  sessionId: string;
  userId: string;
  expiresAt: string;
};

export function isDemoAuthAllowed() {
  const authMode = getAuthMode();

  if (authMode === authModes.localDemo) {
    return true;
  }

  return process.env.NODE_ENV !== "production" || parseBooleanEnv("DEMO_AUTH_ALLOWED", false);
}

export function getGoogleOAuthConfig() {
  const clientId = process.env.OAUTH_GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.OAUTH_GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret };
}

export async function authenticateWithDemo(input: DemoAuthInput): Promise<ApiResponse<AuthenticatedResult>> {
  if (!isDemoAuthAllowed()) {
    return apiError("demo_auth_disabled", "Demo auth is only available in local development or when DEMO_AUTH_ALLOWED=true.");
  }

  const database = getDb();

  return database.transaction(() => {
    const user = createUser(database, {
      displayName: normalizeDisplayName(input.displayName, "Local Demo"),
      authProvider: authModes.localDemo
    });

    return apiOk(createAuthenticatedResult(database, user.id, authModes.localDemo));
  })();
}

export async function authenticateWithInviteCode(input: InviteCodeAuthInput): Promise<ApiResponse<AuthenticatedResult>> {
  const database = getDb();

  return database.transaction(() => {
    const invite = database
      .prepare(`select id, used_count as usedCount, max_uses as maxUses, expires_at as expiresAt from invites where code = ?`)
      .get(input.code) as InviteRow | undefined;

    if (!invite) {
      throw new AuthFailure("invalid_invite_code", "That invite code is not recognized.");
    }

    if (invite.usedCount >= invite.maxUses) {
      throw new AuthFailure("invite_code_used", "That invite code has already been used.");
    }

    if (invite.expiresAt && isExpired(invite.expiresAt)) {
      throw new AuthFailure("invite_code_expired", "That invite code has expired.");
    }

    const user = createUser(database, {
      displayName: normalizeDisplayName(input.displayName, "Hearth Guest"),
      authProvider: authModes.inviteCode
    });

    const result = createAuthenticatedResult(database, user.id, authModes.inviteCode);

    const update = database
      .prepare(`update invites set used_count = used_count + 1 where id = ? and used_count < max_uses`)
      .run(invite.id);

    if (update.changes !== 1) {
      throw new AuthFailure("invite_code_used", "That invite code has already been used.");
    }

    return apiOk(result);
  })();
}

export async function requestMagicLink(input: MagicLinkRequestInput): Promise<ApiResponse<MagicLinkRequestResult>> {
  const database = getDb();

  return database.transaction(() => {
    let user = getUserByEmail(database, input.email);

    if (!user) {
      user = createUser(database, {
        displayName: displayNameFromEmail(input.email),
        email: input.email,
        authProvider: authModes.magicLink
      });
    }

    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS).toISOString();
    const sessionId = crypto.randomUUID();

    database
      .prepare(`insert into sessions (id, user_id, token_hash, expires_at, created_at) values (?, ?, ?, ?, ?)`)
      .run(sessionId, user.id, hashToken(token), expiresAt, new Date().toISOString());

    const debugLink = shouldShowMagicLinkDebugLink() ? buildMagicLink(input.email, token) : undefined;

    return apiOk({ user, ...(debugLink ? { debugLink } : {}) });
  })();
}

export async function confirmMagicLink(input: MagicLinkConfirmInput): Promise<ApiResponse<AuthenticatedResult>> {
  const database = getDb();

  return database.transaction(() => {
    const pending = database
      .prepare(`select id as sessionId, user_id as userId, expires_at as expiresAt from sessions where token_hash = ?`)
      .get(hashToken(input.token)) as PendingMagicLinkRow | undefined;

    if (!pending) {
      throw new AuthFailure("invalid_magic_link", "That magic link is not recognized or has already been used.");
    }

    if (isExpired(pending.expiresAt)) {
      database.prepare(`delete from sessions where id = ?`).run(pending.sessionId);
      throw new AuthFailure("magic_link_expired", "That magic link has expired. Request a new one.");
    }

    const result = createAuthenticatedResult(database, pending.userId, authModes.magicLink);
    database.prepare(`delete from sessions where id = ?`).run(pending.sessionId);

    return apiOk(result);
  })();
}

export async function authenticateWithUsername(input: UsernameAuthInput): Promise<ApiResponse<AuthenticatedResult>> {
  const database = getDb();

  return database.transaction(() => {
    const user = createUser(database, {
      displayName: normalizeDisplayName(input.displayName, "Hearth Guest"),
      handle: input.handle,
      authProvider: authModes.username
    });

    return apiOk(createAuthenticatedResult(database, user.id, authModes.username));
  })();
}

export function createOfflineDemoSession(displayName?: string): AuthenticatedSession {
  const now = new Date();

  return {
    id: `offline-${crypto.randomUUID()}`,
    userId: "offline-demo-user",
    token: `local-demo-${crypto.randomUUID()}`,
    displayName: normalizeDisplayName(displayName, "Local Demo"),
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
    createdAt: now.toISOString(),
    authProvider: authModes.localDemo
  };
}

function createUser(database: ReturnType<typeof getDb>, input: CreateUserInput): AuthenticatedUser {
  const now = new Date().toISOString();
  const displayName = normalizeDisplayName(input.displayName, "Hearth Guest");
  const fallbackHandle = slugifyHandle(displayName, "hearth-guest");
  const requestedHandle = input.handle ? slugifyHandle(input.handle, fallbackHandle) : fallbackHandle;
  const handle = uniqueHandle(database, requestedHandle);
  const id = crypto.randomUUID();

  database
    .prepare(`insert into users (id, display_name, handle, email, auth_provider, created_at) values (?, ?, ?, ?, ?, ?)`)
    .run(id, displayName, handle, input.email ?? null, input.authProvider, now);

  return {
    id,
    displayName,
    handle,
    email: input.email ?? null,
    authProvider: input.authProvider,
    isAdmin: false,
    createdAt: now
  };
}

function createAuthenticatedResult(database: ReturnType<typeof getDb>, userId: string, authProvider: AuthMode): AuthenticatedResult {
  const user = getUserById(database, userId);
  const token = createSessionToken();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const sessionId = crypto.randomUUID();

  database
    .prepare(`insert into sessions (id, user_id, token_hash, expires_at, created_at) values (?, ?, ?, ?, ?)`)
    .run(sessionId, user.id, hashToken(token), expiresAt, now);

  return {
    user,
    session: {
      id: sessionId,
      userId: user.id,
      token,
      displayName: user.displayName,
      expiresAt,
      createdAt: now,
      authProvider
    }
  };
}

export async function authenticateWithGoogleOAuth(code: string, redirectUri: string): Promise<ApiResponse<AuthenticatedResult>> {
  const config = getGoogleOAuthConfig();

  if (!config) {
    return apiError("oauth_not_configured", "Google OAuth is not configured for this deployment.");
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });

  if (!tokenResponse.ok) {
    return apiError("oauth_token_exchange_failed", "Failed to exchange authorization code with Google.");
  }

  const tokens = await tokenResponse.json() as { id_token?: string; access_token?: string };

  if (!tokens.id_token) {
    return apiError("oauth_missing_id_token", "Google did not return an ID token.");
  }

  // Decode payload from JWT (no signature verification needed — we just exchanged with Google directly)
  const parts = tokens.id_token.split(".");

  if (parts.length !== 3 || !parts[1]) {
    return apiError("oauth_invalid_token", "Google returned a malformed ID token.");
  }

  let payload: { sub?: string; email?: string; name?: string; given_name?: string } = {};

  try {
    payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
  } catch {
    return apiError("oauth_invalid_token", "Could not parse Google ID token payload.");
  }

  if (!payload.sub || !payload.email) {
    return apiError("oauth_missing_claims", "Google ID token is missing required claims.");
  }

  const database = getDb();
  const displayName = payload.name ?? payload.given_name ?? displayNameFromEmail(payload.email);

  return database.transaction(() => {
    let user = getUserByEmail(database, payload.email!);

    if (!user) {
      user = createUser(database, {
        displayName,
        email: payload.email!,
        authProvider: authModes.oauth
      });
    }

    return apiOk(createAuthenticatedResult(database, user.id, authModes.oauth));
  })();
}

function getUserById(database: ReturnType<typeof getDb>, userId: string): AuthenticatedUser {
  const row = database
    .prepare(
      `select id, display_name as displayName, handle, email, auth_provider as authProvider, is_admin as isAdmin, created_at as createdAt from users where id = ?`
    )
    .get(userId) as (Omit<AuthenticatedUser, "isAdmin"> & { isAdmin: 0 | 1 }) | undefined;

  if (!row) {
    throw new AuthFailure("invalid_user", "The account could not be found.", 500);
  }

  return { ...row, isAdmin: row.isAdmin === 1 };
}

function getUserByEmail(database: ReturnType<typeof getDb>, email: string): AuthenticatedUser | null {
  const row = database
    .prepare(
      `select id, display_name as displayName, handle, email, auth_provider as authProvider, is_admin as isAdmin, created_at as createdAt from users where email = ?`
    )
    .get(email) as (Omit<AuthenticatedUser, "isAdmin"> & { isAdmin: 0 | 1 }) | undefined;

  return row ? { ...row, isAdmin: row.isAdmin === 1 } : null;
}

function normalizeDisplayName(value: string | undefined, fallback: string) {
  const displayName = value?.trim();

  if (!displayName) {
    return fallback;
  }

  return displayName.slice(0, 80);
}

function displayNameFromEmail(email: string) {
  const localPart = email.split("@")[0]?.replaceAll(/[._-]+/g, " ").trim();

  if (!localPart) {
    return "Hearth Guest";
  }

  return localPart
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .slice(0, 80);
}

function slugifyHandle(value: string, fallback: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

  return slug || fallback;
}

function uniqueHandle(database: ReturnType<typeof getDb>, baseHandle: string) {
  let handle = baseHandle;
  let suffix = 2;

  while (
    Boolean(
      database.prepare(`select 1 from users where handle = ?`).get(handle)
    )
  ) {
    handle = `${baseHandle}-${suffix}`;
    suffix += 1;
  }

  return handle;
}

function isExpired(expiresAt: string) {
  return Date.parse(expiresAt) <= Date.now();
}

function shouldShowMagicLinkDebugLink() {
  return process.env.NODE_ENV !== "production" || parseBooleanEnv("MAGIC_LINK_ALLOW_DEBUG_LINKS", false);
}

function buildMagicLink(email: string, token: string) {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const params = new URLSearchParams({ email, token });

  return `${baseUrl}/auth?${params.toString()}`;
}

export async function handleAuthRequest<T>(
  request: Request,
  schema: z.ZodType<T>,
  handler: (input: T) => Promise<ApiResponse<unknown>>
) {
  const body = await readJsonBody(request);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(apiError("validation_error", zodErrorMessage(parsed.error)), { status: 400 });
  }

  try {
    const result = await handler(parsed.data);

    return NextResponse.json(result, {
      status: result.ok ? 200 : statusForAuthError(result.error.code)
    });
  } catch (error) {
    if (error instanceof AuthFailure) {
      return NextResponse.json(apiError(error.code, error.message), { status: error.status });
    }

    console.error(error);
    return NextResponse.json(apiError("internal_error", "Unable to complete auth request."), { status: 500 });
  }
}

async function readJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function statusForAuthError(code: string) {
  switch (code) {
    case "demo_auth_disabled":
      return 403;
    case "invalid_invite_code":
    case "invite_code_used":
    case "invite_code_expired":
    case "invalid_magic_link":
    case "magic_link_expired":
      return 400;
    default:
      return 400;
  }
}