import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { roomPrivacyModes, roomVisibilityModes } from "@tpt-hearth/config";
import { getDb, hashToken } from "@tpt-hearth/db";
import {
  apiError,
  apiOk,
  deliveryWindowSchema,
  roomPrivacyModeSchema,
  roomVisibilitySchema,
  zodErrorMessage,
  type ApiResponse,
  type Chronicle,
  type Letter,
  type Message,
  type ModerationActionKind,
  type PorchSession,
  type Report,
  type ReportStatus,
  type Ritual,
  type Room,
  type RoomPrivacyMode,
  type RoomVisibility,
  type TransparencyLog,
  type User
} from "@tpt-hearth/shared";
import { AuthFailure, type AuthenticatedSession, type AuthenticatedUser } from "@/lib/auth";

export class ApiFailure extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly status = 400
  ) {
    super(message);
    this.name = "ApiFailure";
  }
}

export type RouteParams = Promise<Record<string, string | string[]>>;

export type AuthenticatedApiContext = {
  request: Request;
  user: AuthenticatedUser;
  session: AuthenticatedSession;
};

type ApiHandler<TInput, TOutput> = (input: TInput, context: AuthenticatedApiContext) => Promise<ApiResponse<TOutput>>;

type RoomRow = {
  id: string;
  name: string;
  description: string;
  mood: string;
  topic: string;
  visibility: RoomVisibility;
  privacyMode: RoomPrivacyMode;
  capacity: number;
  stewardId: string | null;
  rules: string;
  createdAt: string;
  archivedAt: string | null;
};

type RoomSummary = Room & {
  memberCount: number;
};

type MessageRow = {
  id: string;
  roomId: string;
  authorId: string;
  bodyPlaintext: string | null;
  bodyCiphertext: string | null;
  nonce: string | null;
  keyVersion: string | null;
  createdAt: string;
  deletedAt: string | null;
};

type PorchSessionRow = {
  id: string;
  mode: "random_matching" | "open_lobby";
  roomId: string;
  startsAt: string;
  endsAt: string;
  status: "waiting" | "active" | "extended" | "left" | "archived";
  createdAt: string;
};

type PorchSessionSummary = PorchSession & {
  room: Pick<Room, "id" | "name" | "mood" | "topic" | "visibility" | "privacyMode" | "stewardId" | "archivedAt">;
};

type LetterRow = {
  id: string;
  authorId: string;
  recipientUserId: string | null;
  recipientRoomId: string | null;
  subject: string;
  bodyPlaintext: string | null;
  bodyCiphertext: string | null;
  nonce: string | null;
  deliveryWindow: "now" | "morning" | "evening";
  deliveredAt: string | null;
  createdAt: string;
  recipientDisplayName: string | null;
  recipientRoomName: string | null;
  authorDisplayName: string | null;
};

type ChronicleRow = {
  id: string;
  userId: string;
  kind: "room" | "letter" | "ritual" | "note";
  title: string;
  bodyPlaintext: string | null;
  bodyCiphertext: string | null;
  metadataJson: string;
  createdAt: string;
};

type RitualRow = {
  id: string;
  hostId: string;
  roomId: string | null;
  title: string;
  description: string;
  startsAt: string;
  summary: string | null;
  createdAt: string;
  roomName: string | null;
};

export const emptyBodySchema = z.object({});

export const roomPatchInputSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).optional(),
  mood: z.string().min(2).max(40).optional(),
  topic: z.string().min(2).max(80).optional(),
  visibility: roomVisibilitySchema.optional(),
  privacyMode: roomPrivacyModeSchema.optional(),
  rules: z.string().max(1000).optional()
});

export const roomMemberInputSchema = z.object({
  userId: z.string().min(1).max(128),
  role: z.enum(["member", "steward"]).default("member")
});

export const porchSessionExtendInputSchema = z.object({
  durationMinutes: z.number().int().positive().max(120)
});

export const letterInputSchema = z
  .object({
    recipientUserId: z.string().min(1).max(128).nullable().optional(),
    recipientRoomId: z.string().min(1).max(128).nullable().optional(),
    subject: z.string().min(1).max(160),
    body: z.string().min(1).max(50_000),
    deliveryWindow: deliveryWindowSchema.default("now"),
    bodyCiphertext: z.string().nullable().optional(),
    nonce: z.string().nullable().optional()
  })
  .superRefine((value, context) => {
    if (!value.recipientUserId && !value.recipientRoomId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recipientUserId"],
        message: "Provide either recipientUserId or recipientRoomId."
      });
    }
  });

export const chroniclePatchInputSchema = z.object({
  kind: z.enum(["room", "letter", "ritual", "note"]).optional(),
  title: z.string().min(1).max(160).optional(),
  body: z.string().max(100_000).nullable().optional(),
  metadataJson: z.string().max(20_000).optional()
});

export const ritualPatchInputSchema = z.object({
  roomId: z.string().min(1).max(128).nullable().optional(),
  title: z.string().min(1).max(160).optional(),
  description: z.string().min(1).max(2000).optional(),
  startsAt: z.string().datetime().optional()
});

export const ritualSummaryInputSchema = z.object({
  summary: z.string().min(1).max(10_000)
});

export async function handleApiRequest<TInput, TOutput>(
  request: Request,
  schema: z.ZodType<TInput>,
  handler: ApiHandler<TInput, TOutput>,
  options: { status?: number } = {}
): Promise<NextResponse<ApiResponse<TOutput>>> {
  try {
    const context = await requireAuthenticatedRequest(request);
    const body = await readJsonBody(request);
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return jsonResponse(apiError("validation_error", zodErrorMessage(parsed.error)), 400);
    }

    const result = await handler(parsed.data, context);
    return jsonResponse(result, options.status);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function handleMarkdownExportRequest(
  request: Request,
  handler: (context: AuthenticatedApiContext) => Promise<string> | string
): Promise<NextResponse> {
  try {
    const context = await requireAuthenticatedRequest(request);
    const markdown = await handler(context);

    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="hearth-export-${new Date().toISOString().slice(0, 10)}.md"`
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function getRouteParam(params: RouteParams, key: string): Promise<string> {
  const resolved = await params;
  const value = resolved[key];

  if (Array.isArray(value)) {
    if (value[0] && value[0].trim()) {
      return value[0];
    }

    throw new ApiFailure("bad_request", `Missing route parameter: ${key}.`, 400);
  }

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  throw new ApiFailure("bad_request", `Missing route parameter: ${key}.`, 400);
}

export async function requireAuthenticatedRequest(request: Request): Promise<AuthenticatedApiContext> {
  const token = getSessionTokenFromRequest(request);

  if (!token) {
    throw new ApiFailure("unauthorized", "Sign in to continue.", 401);
  }

  const database = getDb();
  const row = database
    .prepare(
      `select
        s.id as sessionId,
        s.user_id as userId,
        s.token_hash as tokenHash,
        s.expires_at as sessionExpiresAt,
        s.created_at as sessionCreatedAt,
        u.id as id,
        u.display_name as displayName,
        u.handle as handle,
        u.email as email,
        u.auth_provider as authProvider,
        u.is_admin as isAdmin,
        u.created_at as createdAt
      from sessions s
      join users u on u.id = s.user_id
      where s.token_hash = ?`
    )
    .get(hashToken(token)) as
    | {
        sessionId: string;
        userId: string;
        tokenHash: string;
        sessionExpiresAt: string;
        sessionCreatedAt: string;
        id: string;
        displayName: string;
        handle: string;
        email: string | null;
        authProvider: AuthenticatedUser["authProvider"];
        isAdmin: 0 | 1;
        createdAt: string;
      }
    | undefined;

  if (!row || isExpired(row.sessionExpiresAt)) {
    if (row) {
      database.prepare(`delete from sessions where id = ?`).run(row.sessionId);
    }

    throw new ApiFailure("session_expired", "Your session expired. Please sign in again.", 401);
  }

  const user: AuthenticatedUser = {
    id: row.id,
    displayName: row.displayName,
    handle: row.handle,
    email: row.email,
    authProvider: row.authProvider,
    isAdmin: row.isAdmin === 1,
    createdAt: row.createdAt
  };

  const session: AuthenticatedSession = {
    id: row.sessionId,
    userId: row.userId,
    token,
    displayName: user.displayName,
    expiresAt: row.sessionExpiresAt,
    createdAt: row.sessionCreatedAt,
    authProvider: user.authProvider
  };

  return { request, user, session };
}

export function requireAdmin(user: AuthenticatedUser): void {
  if (!user.isAdmin) {
    throw new ApiFailure("forbidden", "Admin access required.", 403);
  }
}

export function getSessionTokenFromRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  const bearerMatch = authorization?.match(/^Bearer\s+(.+)$/i);

  if (bearerMatch?.[1]) {
    return bearerMatch[1].trim();
  }

  return request.headers.get("x-session-token");
}

export function listRooms(userId: string): ApiResponse<RoomSummary[]> {
  const database = getDb();
  const rows = database
    .prepare(
      `select
        r.id as id,
        r.name as name,
        r.description as description,
        r.mood as mood,
        r.topic as topic,
        r.visibility as visibility,
        r.privacy_mode as privacyMode,
        r.capacity as capacity,
        r.steward_id as stewardId,
        r.rules as rules,
        r.created_at as createdAt,
        r.archived_at as archivedAt
      from rooms r
      left join room_members rm on rm.room_id = r.id and rm.user_id = ? and rm.left_at is null
      where r.archived_at is null and (r.visibility in (?, ?) or rm.user_id is not null or r.steward_id = ?)
      order by r.created_at asc, r.name asc`
    )
    .all(userId, roomVisibilityModes.openDirectory, roomVisibilityModes.openPorchEligible, userId) as RoomRow[];

  return apiOk(rows.map((row) => getRoomSummaryFromRow(database, row)));
}

export function getRoom(roomId: string, userId: string): ApiResponse<RoomSummary> {
  const database = getDb();
  const room = requireAccessibleRoom(database, roomId, userId);
  return apiOk(getRoomSummaryFromRow(database, room));
}

export function createRoom(input: z.infer<typeof import("@tpt-hearth/shared").roomInputSchema>, userId: string): ApiResponse<RoomSummary> {
  const database = getDb();
  const now = new Date().toISOString();
  const roomId = crypto.randomUUID();

  database
    .prepare(
      `insert into rooms (id, name, description, mood, topic, visibility, privacy_mode, capacity, steward_id, rules, created_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      roomId,
      input.name,
      input.description ?? "",
      input.mood,
      input.topic,
      input.visibility,
      input.privacyMode,
      12,
      userId,
      input.rules ?? "",
      now
    );

  database.prepare(`insert into room_members (room_id, user_id, role, joined_at) values (?, ?, ?, ?)`).run(roomId, userId, "steward", now);

  return apiOk(getRoomSummary(database, roomId));
}

export function patchRoom(roomId: string, userId: string, input: z.infer<typeof roomPatchInputSchema>): ApiResponse<RoomSummary> {
  const database = getDb();
  const room = requireAccessibleRoom(database, roomId, userId);

  if (!isRoomSteward(database, room, userId)) {
    throw new ApiFailure("forbidden", "Only the room steward can edit this room.", 403);
  }

  const updates: string[] = [];
  const values: Array<string | number> = [];

  for (const field of ["name", "description", "mood", "topic", "visibility", "privacyMode", "rules"] as const) {
    const value = input[field];

    if (value !== undefined) {
      updates.push(`${field === "privacyMode" ? "privacy_mode" : field} = ?`);
      values.push(value);
    }
  }

  if (updates.length === 0) {
    return apiOk(getRoomSummaryFromRow(database, room));
  }

  const now = new Date().toISOString();
  values.push(now, roomId);

  database.prepare(`update rooms set ${updates.join(", ")} where id = ?`).run(...values);

  return apiOk(getRoomSummary(database, roomId));
}

export function archiveRoom(roomId: string, userId: string): ApiResponse<RoomSummary> {
  const database = getDb();
  const room = requireAccessibleRoom(database, roomId, userId);

  if (!isRoomSteward(database, room, userId)) {
    throw new ApiFailure("forbidden", "Only the room steward can archive this room.", 403);
  }

  const now = new Date().toISOString();
  database.prepare(`update rooms set archived_at = ? where id = ? and archived_at is null`).run(now, roomId);

  return apiOk(getRoomSummary(database, roomId));
}

export function addRoomMember(roomId: string, userId: string, input: z.infer<typeof roomMemberInputSchema>): ApiResponse<RoomSummary> {
  const database = getDb();
  const room = requireAccessibleRoom(database, roomId, userId);

  if (!isRoomSteward(database, room, userId)) {
    throw new ApiFailure("forbidden", "Only the room steward can add members.", 403);
  }

  if (input.userId === userId) {
    throw new ApiFailure("conflict", "The steward is already part of this room.", 409);
  }

  if (!database.prepare(`select 1 from users where id = ?`).get(input.userId)) {
    throw new ApiFailure("not_found", "The user could not be found.", 404);
  }

  if (getActiveMember(database, roomId, input.userId)) {
    throw new ApiFailure("conflict", "That user is already a member of this room.", 409);
  }

  ensureRoomCapacity(database, roomId);

  const now = new Date().toISOString();
  database.prepare(`insert into room_members (room_id, user_id, role, joined_at) values (?, ?, ?, ?)`).run(roomId, input.userId, input.role, now);

  return apiOk(getRoomSummary(database, roomId));
}

export function removeRoomMember(roomId: string, userId: string, targetUserId: string): ApiResponse<{ ok: true }> {
  const database = getDb();
  const room = requireAccessibleRoom(database, roomId, userId);

  if (!isRoomSteward(database, room, userId) && targetUserId !== userId) {
    throw new ApiFailure("forbidden", "Only the room steward can remove members.", 403);
  }

  if (!getActiveMember(database, roomId, targetUserId)) {
    throw new ApiFailure("not_found", "That user is not an active member of this room.", 404);
  }

  const now = new Date().toISOString();
  database.prepare(`update room_members set left_at = ? where room_id = ? and user_id = ? and left_at is null`).run(now, roomId, targetUserId);

  return apiOk({ ok: true });
}

export function listRoomMessages(roomId: string, userId: string, request: Request): ApiResponse<Message[]> {
  const database = getDb();
  requireAccessibleRoom(database, roomId, userId);
  const limit = normalizeLimit(request.url, 100);
  const rows = database
    .prepare(
      `select
        id as id,
        room_id as roomId,
        author_id as authorId,
        body_plaintext as bodyPlaintext,
        body_ciphertext as bodyCiphertext,
        nonce as nonce,
        key_version as keyVersion,
        created_at as createdAt,
        deleted_at as deletedAt
      from messages
      where room_id = ? and deleted_at is null
      order by created_at desc
      limit ?`
    )
    .all(roomId, limit) as MessageRow[];

  return apiOk(rows.map(toMessage).reverse());
}

export function createMessage(input: z.infer<typeof import("@tpt-hearth/shared").messageInputSchema>, userId: string): ApiResponse<Message> {
  const database = getDb();
  const room = requireAccessibleRoom(database, input.roomId, userId);

  if (room.archivedAt) {
    throw new ApiFailure("conflict", "Archived rooms cannot receive messages.", 409);
  }

  if (input.privacyMode !== room.privacyMode) {
    throw new ApiFailure("conflict", "The message privacy mode does not match the room.", 409);
  }

  const now = new Date().toISOString();
  const messageId = crypto.randomUUID();
  const isPrivate = room.privacyMode === roomPrivacyModes.privateE2e;

  database
    .prepare(
      `insert into messages (id, room_id, author_id, body_plaintext, body_ciphertext, nonce, key_version, created_at)
      values (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      messageId,
      input.roomId,
      userId,
      isPrivate ? null : input.body,
      isPrivate ? input.bodyCiphertext ?? null : null,
      isPrivate ? input.nonce ?? null : null,
      isPrivate ? input.keyVersion ?? null : null,
      now
    );

  return apiOk(getMessage(database, messageId));
}

export function archiveMessage(messageId: string, userId: string): ApiResponse<Message> {
  return deleteMessage(messageId, userId);
}

export function deleteMessage(messageId: string, userId: string): ApiResponse<Message> {
  const database = getDb();
  const message = getMessageRow(database, messageId);

  if (!message) {
    throw new ApiFailure("not_found", "The message could not be found.", 404);
  }

  const room = requireAccessibleRoom(database, message.roomId, userId);

  if (message.authorId !== userId && !isRoomSteward(database, room, userId)) {
    throw new ApiFailure("forbidden", "Only the message author or room steward can delete this message.", 403);
  }

  const now = new Date().toISOString();
  const result = database.prepare(`update messages set deleted_at = ? where id = ? and deleted_at is null`).run(now, messageId);

  if (result.changes !== 1) {
    throw new ApiFailure("conflict", "The message was already deleted.", 409);
  }

  return apiOk(getMessage(database, messageId));
}

export function listPorchSessions(): ApiResponse<PorchSessionSummary[]> {
  const database = getDb();
  const rows = database
    .prepare(
      `select
        ps.id as id,
        ps.mode as mode,
        ps.room_id as roomId,
        ps.starts_at as startsAt,
        ps.ends_at as endsAt,
        ps.status as status,
        ps.created_at as createdAt,
        r.name as roomName,
        r.mood as roomMood,
        r.topic as roomTopic,
        r.visibility as roomVisibility,
        r.privacy_mode as roomPrivacyMode,
        r.steward_id as roomStewardId,
        r.archived_at as roomArchivedAt
      from porch_sessions ps
      join rooms r on r.id = ps.room_id
      where r.visibility = ? and r.archived_at is null and ps.status not in (?, ?)
      order by ps.starts_at asc, ps.created_at asc`
    )
    .all(roomVisibilityModes.openPorchEligible, "left", "archived") as Array<PorchSessionRow & {
      roomName: string;
      roomMood: string;
      roomTopic: string;
      roomVisibility: RoomVisibility;
      roomPrivacyMode: RoomPrivacyMode;
      roomStewardId: string | null;
      roomArchivedAt: string | null;
    }>;

  return apiOk(rows.map(toPorchSessionSummary));
}

export function createPorchSession(input: z.infer<typeof import("@tpt-hearth/shared").porchSessionInputSchema>, userId: string): ApiResponse<PorchSessionSummary> {
  const database = getDb();
  const now = new Date();
  const startsAt = new Date(now.getTime()).toISOString();
  const endsAt = new Date(now.getTime() + input.durationMinutes * 60_000).toISOString();
  const roomId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();

  database
    .prepare(
      `insert into rooms (id, name, description, mood, topic, visibility, privacy_mode, capacity, steward_id, rules, created_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      roomId,
      `Porch ${input.mode.replaceAll("_", " ")}`,
      "A temporary porch room for a short sit.",
      input.mode,
      "temporary porch",
      roomVisibilityModes.openPorchEligible,
      roomPrivacyModes.openPlaintext,
      12,
      userId,
      "Kind exits are welcome.",
      startsAt
    );

  database.prepare(`insert into room_members (room_id, user_id, role, joined_at) values (?, ?, ?, ?)`).run(roomId, userId, "steward", startsAt);

  database
    .prepare(
      `insert into porch_sessions (id, mode, room_id, starts_at, ends_at, status, created_at)
      values (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(sessionId, input.mode, roomId, startsAt, endsAt, "waiting", startsAt);

  return apiOk(getPorchSessionSummary(database, sessionId));
}

export function joinPorchSession(sessionId: string, userId: string): ApiResponse<PorchSessionSummary> {
  const database = getDb();
  const session = requirePorchSession(database, sessionId);

  if (session.status !== "waiting") {
    throw new ApiFailure("conflict", "That porch session is no longer waiting.", 409);
  }

  if (isExpired(session.endsAt)) {
    throw new ApiFailure("conflict", "That porch session has expired.", 409);
  }

  const now = new Date().toISOString();
  database.transaction(() => {
    database.prepare(`update porch_sessions set starts_at = ?, status = ? where id = ?`).run(now, "active", sessionId);
    database.prepare(`insert or ignore into room_members (room_id, user_id, role, joined_at) values (?, ?, ?, ?)`).run(session.roomId, userId, "member", now);
  })();

  return apiOk(getPorchSessionSummary(database, sessionId));
}

export function extendPorchSession(sessionId: string, userId: string, input: z.infer<typeof porchSessionExtendInputSchema>): ApiResponse<PorchSessionSummary> {
  const database = getDb();
  const session = requirePorchSession(database, sessionId);
  requireAccessibleRoom(database, session.roomId, userId);

  if (session.status !== "active" && session.status !== "extended") {
    throw new ApiFailure("conflict", "Only active porch sessions can be extended.", 409);
  }

  const base = isExpired(session.endsAt) ? Date.now() : Date.parse(session.endsAt);
  const endsAt = new Date(base + input.durationMinutes * 60_000).toISOString();
  database.prepare(`update porch_sessions set ends_at = ?, status = ? where id = ?`).run(endsAt, "extended", sessionId);

  return apiOk(getPorchSessionSummary(database, sessionId));
}

export function leavePorchSession(sessionId: string, userId: string): ApiResponse<PorchSessionSummary> {
  const database = getDb();
  const session = requirePorchSession(database, sessionId);
  requireAccessibleRoom(database, session.roomId, userId);
  database.prepare(`update porch_sessions set status = ? where id = ? and status not in (?, ?)`).run("left", sessionId, "left", "archived");

  return apiOk(getPorchSessionSummary(database, sessionId));
}

export function exchangeEmbers(sessionId: string, userId: string): ApiResponse<PorchSessionSummary> {
  const database = getDb();
  const session = requirePorchSession(database, sessionId);
  requireAccessibleRoom(database, session.roomId, userId);

  if (session.status !== "active" && session.status !== "extended") {
    throw new ApiFailure("conflict", "Only an active porch sitting can exchange embers.", 409);
  }

  database.prepare(`update porch_sessions set status = ? where id = ?`).run("archived", sessionId);

  return apiOk(getPorchSessionSummary(database, sessionId));
}

export function searchGrove(request: Request): ApiResponse<Room[]> {
  const database = getDb();
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  const mood = url.searchParams.get("mood")?.trim();
  const where = ["r.archived_at is null", "r.visibility = ?"];
  const values: Array<string> = [roomVisibilityModes.openDirectory];

  if (query) {
    where.push("(r.name like ? or r.mood like ? or r.topic like ?)");
    const term = `%${query}%`;
    values.push(term, term, term);
  }

  if (mood) {
    where.push("r.mood = ?");
    values.push(mood);
  }

  const rows = database.prepare(`select
    r.id as id,
    r.name as name,
    r.description as description,
    r.mood as mood,
    r.topic as topic,
    r.visibility as visibility,
    r.privacy_mode as privacyMode,
    r.capacity as capacity,
    r.steward_id as stewardId,
    r.rules as rules,
    r.created_at as createdAt,
    r.archived_at as archivedAt
  from rooms r
  where ${where.join(" and ")}
  order by r.created_at asc, r.name asc`).all(...values) as RoomRow[];

  return apiOk(rows.map(toRoom));
}

export function listLetters(userId: string): ApiResponse<Array<Letter & { recipientDisplayName: string | null; recipientRoomName: string | null; authorDisplayName: string | null }>> {
  const database = getDb();
  const rows = database
    .prepare(
      `select
        l.id as id,
        l.author_id as authorId,
        l.recipient_user_id as recipientUserId,
        l.recipient_room_id as recipientRoomId,
        l.subject as subject,
        l.body_plaintext as bodyPlaintext,
        l.body_ciphertext as bodyCiphertext,
        l.nonce as nonce,
        l.delivery_window as deliveryWindow,
        l.delivered_at as deliveredAt,
        l.created_at as createdAt,
        recipient.display_name as recipientDisplayName,
        recipient_room.name as recipientRoomName,
        author.display_name as authorDisplayName
      from letters l
      left join users recipient on recipient.id = l.recipient_user_id
      left join rooms recipient_room on recipient_room.id = l.recipient_room_id
      left join users author on author.id = l.author_id
      where l.author_id = ? or l.recipient_user_id = ?
      order by l.created_at asc, l.id asc`
    )
    .all(userId, userId) as LetterRow[];

  return apiOk(rows.map(toLetterWithNames));
}

export function createLetter(input: z.infer<typeof letterInputSchema>, userId: string): ApiResponse<Letter> {
  const database = getDb();

  if (input.recipientUserId && !database.prepare(`select 1 from users where id = ?`).get(input.recipientUserId)) {
    throw new ApiFailure("not_found", "The recipient user could not be found.", 404);
  }

  if (input.recipientRoomId) {
    const room = getRoomRow(database, input.recipientRoomId);

    if (!room) {
      throw new ApiFailure("not_found", "The recipient room could not be found.", 404);
    }

    if (room.archivedAt) {
      throw new ApiFailure("conflict", "Archived rooms cannot receive letters.", 409);
    }
  }

  const now = new Date().toISOString();
  const letterId = crypto.randomUUID();

  database
    .prepare(
      `insert into letters (id, author_id, recipient_user_id, recipient_room_id, subject, body_plaintext, body_ciphertext, nonce, delivery_window, delivered_at, created_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      letterId,
      userId,
      input.recipientUserId ?? null,
      input.recipientRoomId ?? null,
      input.subject,
      input.body,
      null,
      null,
      input.deliveryWindow,
      input.deliveryWindow === "now" ? now : null,
      now
    );

  return apiOk(getLetterByRow(database, letterId, userId));
}

export function getLetter(letterId: string, userId: string): ApiResponse<Letter> {
  const database = getDb();
  return apiOk(getLetterByRow(database, letterId, userId));
}

export function buildLetterMarkdown(letterId: string, userId: string): string {
  const database = getDb();
  const row = getLetterRow(database, letterId);

  if (!row || !canAccessLetter(database, row, userId)) {
    throw new ApiFailure("not_found", "The letter could not be found.", 404);
  }

  const letter = toLetterWithNames(row);
  const body = letter.bodyPlaintext ?? (letter.bodyCiphertext ? "[Encrypted letter body]" : "[No body]");
  const recipient = letter.recipientDisplayName ?? letter.recipientRoomName ?? "Unknown recipient";
  const author = letter.authorDisplayName ?? "Unknown author";

  return [
    `# ${letter.subject}`,
    "",
    `- From: ${author}`,
    `- To: ${recipient}`,
    `- Delivery window: ${letter.deliveryWindow}`,
    `- Delivered: ${letter.deliveredAt ?? "not yet"}`,
    `- Created: ${letter.createdAt}`,
    "",
    body
  ].join("\n");
}

export function listChronicles(userId: string): ApiResponse<Chronicle[]> {
  const database = getDb();
  const rows = database
    .prepare(
      `select
        id as id,
        user_id as userId,
        kind as kind,
        title as title,
        body_plaintext as bodyPlaintext,
        body_ciphertext as bodyCiphertext,
        metadata_json as metadataJson,
        created_at as createdAt
      from chronicles
      where user_id = ?
      order by created_at asc, id asc`
    )
    .all(userId) as ChronicleRow[];

  return apiOk(rows.map(toChronicle));
}

export function createChronicle(input: z.infer<typeof import("@tpt-hearth/shared").chronicleInputSchema>, userId: string): ApiResponse<Chronicle> {
  const database = getDb();
  validateMetadataJson(input.metadataJson);

  const now = new Date().toISOString();
  const chronicleId = crypto.randomUUID();

  database
    .prepare(
      `insert into chronicles (id, user_id, kind, title, body_plaintext, body_ciphertext, metadata_json, created_at)
      values (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(chronicleId, userId, input.kind, input.title, input.body ?? null, null, input.metadataJson, now);

  return apiOk(getChronicle(database, chronicleId));
}

export function patchChronicle(chronicleId: string, userId: string, input: z.infer<typeof chroniclePatchInputSchema>): ApiResponse<Chronicle> {
  const database = getDb();
  const chronicle = requireUserChronicle(database, chronicleId, userId);
  const updates: string[] = [];
  const values: Array<string | null> = [];

  if (input.kind !== undefined) {
    updates.push("kind = ?");
    values.push(input.kind);
  }

  if (input.title !== undefined) {
    updates.push("title = ?");
    values.push(input.title);
  }

  if (input.body !== undefined) {
    updates.push("body_plaintext = ?");
    values.push(input.body);
  }

  if (input.metadataJson !== undefined) {
    validateMetadataJson(input.metadataJson);
    updates.push("metadata_json = ?");
    values.push(input.metadataJson);
  }

  if (updates.length === 0) {
    return apiOk(toChronicle(chronicle));
  }

  database.prepare(`update chronicles set ${updates.join(", ")} where id = ?`).run(...values, chronicleId);

  return apiOk(getChronicle(database, chronicleId));
}

export function deleteChronicle(chronicleId: string, userId: string): ApiResponse<{ ok: true }> {
  const database = getDb();
  requireUserChronicle(database, chronicleId, userId);
  const result = database.prepare(`delete from chronicles where id = ?`).run(chronicleId);

  if (result.changes !== 1) {
    throw new ApiFailure("not_found", "The chronicle could not be found.", 404);
  }

  return apiOk({ ok: true });
}

export function listRituals(userId: string): ApiResponse<Ritual[]> {
  const database = getDb();
  const rows = database
    .prepare(
      `select distinct
        ri.id as id,
        ri.host_id as hostId,
        ri.room_id as roomId,
        ri.title as title,
        ri.description as description,
        ri.starts_at as startsAt,
        ri.summary as summary,
        ri.created_at as createdAt,
        r.name as roomName
      from rituals ri
      left join rooms r on r.id = ri.room_id
      left join room_members rm on rm.room_id = ri.room_id and rm.user_id = ? and rm.left_at is null
      where ri.host_id = ? or (ri.room_id is not null and rm.user_id is not null)
      order by ri.starts_at asc, ri.id asc`
    )
    .all(userId, userId) as RitualRow[];

  return apiOk(rows.map(toRitual));
}

export function createRitual(input: z.infer<typeof import("@tpt-hearth/shared").ritualInputSchema>, userId: string): ApiResponse<Ritual> {
  const database = getDb();

  if (input.roomId) {
    requireAccessibleRoom(database, input.roomId, userId);
  }

  const now = new Date().toISOString();
  const ritualId = crypto.randomUUID();

  database
    .prepare(
      `insert into rituals (id, host_id, room_id, title, description, starts_at, created_at)
      values (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(ritualId, userId, input.roomId ?? null, input.title, input.description, input.startsAt, now);

  return apiOk(getRitual(database, ritualId));
}

export function patchRitual(ritualId: string, userId: string, input: z.infer<typeof ritualPatchInputSchema>): ApiResponse<Ritual> {
  const database = getDb();
  const ritual = requireHostRitual(database, ritualId, userId);
  const updates: string[] = [];
  const values: Array<string | null> = [];

  if (input.roomId !== undefined) {
    if (input.roomId) {
      requireAccessibleRoom(database, input.roomId, userId);
    }

    updates.push("room_id = ?");
    values.push(input.roomId);
  }

  if (input.title !== undefined) {
    updates.push("title = ?");
    values.push(input.title);
  }

  if (input.description !== undefined) {
    updates.push("description = ?");
    values.push(input.description);
  }

  if (input.startsAt !== undefined) {
    updates.push("starts_at = ?");
    values.push(input.startsAt);
  }

  if (updates.length === 0) {
    return apiOk(toRitual(ritual));
  }

  database.prepare(`update rituals set ${updates.join(", ")} where id = ?`).run(...values, ritualId);

  return apiOk(getRitual(database, ritualId));
}

export function addRitualSummary(ritualId: string, userId: string, input: z.infer<typeof ritualSummaryInputSchema>): ApiResponse<Ritual> {
  const database = getDb();
  requireHostRitual(database, ritualId, userId);
  database.prepare(`update rituals set summary = ? where id = ?`).run(input.summary, ritualId);

  return apiOk(getRitual(database, ritualId));
}

// ---- MODERATION ----

export function listReports(): ApiResponse<Array<Report & { reporterName: string | null }>> {
  const database = getDb();
  const rows = database
    .prepare(
      `select
        r.id as id,
        r.reporter_id as reporterId,
        r.target_user_id as targetUserId,
        r.target_room_id as targetRoomId,
        r.reason as reason,
        r.status as status,
        r.created_at as createdAt,
        u.display_name as reporterName
      from reports r
      left join users u on u.id = r.reporter_id
      order by r.created_at desc, r.id asc`
    )
    .all() as Array<{
      id: string;
      reporterId: string;
      targetUserId: string | null;
      targetRoomId: string | null;
      reason: string;
      status: string;
      createdAt: string;
      reporterName: string | null;
    }>;

  return apiOk(rows.map((row) => ({
    id: row.id,
    reporterId: row.reporterId,
    targetUserId: row.targetUserId,
    targetRoomId: row.targetRoomId,
    reason: row.reason,
    status: row.status as ReportStatus,
    createdAt: row.createdAt,
    reporterName: row.reporterName
  })));
}

export function getReport(reportId: string): ApiResponse<Report & { reporterName: string | null }> {
  const database = getDb();
  const row = database
    .prepare(
      `select
        r.id as id,
        r.reporter_id as reporterId,
        r.target_user_id as targetUserId,
        r.target_room_id as targetRoomId,
        r.reason as reason,
        r.status as status,
        r.created_at as createdAt,
        u.display_name as reporterName
      from reports r
      left join users u on u.id = r.reporter_id
      where r.id = ?`
    )
    .get(reportId) as {
      id: string;
      reporterId: string;
      targetUserId: string | null;
      targetRoomId: string | null;
      reason: string;
      status: string;
      createdAt: string;
      reporterName: string | null;
    } | undefined;

  if (!row) {
    throw new ApiFailure("not_found", "The report could not be found.", 404);
  }

  return apiOk({
    id: row.id,
    reporterId: row.reporterId,
    targetUserId: row.targetUserId,
    targetRoomId: row.targetRoomId,
    reason: row.reason,
    status: row.status as ReportStatus,
    createdAt: row.createdAt,
    reporterName: row.reporterName
  });
}

export function createReport(input: z.infer<typeof import("@tpt-hearth/shared").reportInputSchema>, userId: string): ApiResponse<Report> {
  const database = getDb();
  const now = new Date().toISOString();
  const reportId = crypto.randomUUID();

  database
    .prepare(
      `insert into reports (id, reporter_id, target_user_id, target_room_id, reason, status, created_at)
      values (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(reportId, userId, input.targetUserId ?? null, input.targetRoomId ?? null, input.reason, "open", now);

  return apiOk({
    id: reportId,
    reporterId: userId,
    targetUserId: input.targetUserId ?? null,
    targetRoomId: input.targetRoomId ?? null,
    reason: input.reason,
    status: "open" as ReportStatus,
    createdAt: now
  });
}

export function updateReportStatus(reportId: string, status: ReportStatus): ApiResponse<Report> {
  const database = getDb();
  const row = database.prepare(`select * from reports where id = ?`).get(reportId) as Record<string, unknown> | undefined;

  if (!row) {
    throw new ApiFailure("not_found", "The report could not be found.", 404);
  }

  database.prepare(`update reports set status = ? where id = ?`).run(status, reportId);

  return apiOk({
    id: row.id as string,
    reporterId: row.reporter_id as string,
    targetUserId: row.target_user_id as string | null,
    targetRoomId: row.target_room_id as string | null,
    reason: row.reason as string,
    status,
    createdAt: row.created_at as string
  });
}

export function listModerationActions(): ApiResponse<Array<Record<string, unknown>>> {
  const database = getDb();
  const rows = database
    .prepare(
      `select
        ma.id as id,
        ma.actor_id as actorId,
        ma.target_user_id as targetUserId,
        ma.target_room_id as targetRoomId,
        ma.action as action,
        ma.reason as reason,
        ma.created_at as createdAt,
        actor.display_name as actorName,
        target.display_name as targetName
      from moderation_actions ma
      left join users actor on actor.id = ma.actor_id
      left join users target on target.id = ma.target_user_id
      order by ma.created_at desc, ma.id asc`
    )
    .all() as Array<Record<string, unknown>>;

  return apiOk(rows.map((row) => ({
    id: row.id,
    actorId: row.actorId,
    targetUserId: row.targetUserId ?? null,
    targetRoomId: row.targetRoomId ?? null,
    action: row.action,
    reason: row.reason,
    createdAt: row.createdAt,
    actorName: row.actorName ?? null,
    targetName: row.targetName ?? null
  })));
}

export function createModerationAction(
  input: z.infer<typeof import("@tpt-hearth/shared").moderationActionInputSchema>,
  actorId: string
): ApiResponse<Record<string, unknown>> {
  const database = getDb();
  const now = new Date().toISOString();
  const actionId = crypto.randomUUID();

  database
    .prepare(
      `insert into moderation_actions (id, actor_id, target_user_id, target_room_id, action, reason, created_at)
      values (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(actionId, actorId, input.targetUserId ?? null, input.targetRoomId ?? null, input.action, input.reason, now);

  // Add a transparency log for the moderation action
  const publicNote = `Moderation action: ${input.action}${input.targetUserId ? ` (user)` : ""}${input.targetRoomId ? ` (room)` : ""}`;
  database
    .prepare(
      `insert into transparency_logs (id, action_id, public_note, created_at)
      values (?, ?, ?, ?)`
    )
    .run(crypto.randomUUID(), actionId, publicNote, now);

  return apiOk({
    id: actionId,
    actorId,
    targetUserId: input.targetUserId ?? null,
    targetRoomId: input.targetRoomId ?? null,
    action: input.action,
    reason: input.reason,
    createdAt: now
  });
}

export function listTransparencyLogs(): ApiResponse<TransparencyLog[]> {
  const database = getDb();
  const rows = database
    .prepare(
      `select
        id as id,
        action_id as actionId,
        public_note as publicNote,
        created_at as createdAt
      from transparency_logs
      order by created_at desc, id asc`
    )
    .all() as Array<{
      id: string;
      actionId: string;
      publicNote: string;
      createdAt: string;
    }>;

  return apiOk(rows.map((row) => ({
    id: row.id,
    actionId: row.actionId,
    publicNote: row.publicNote,
    createdAt: row.createdAt
  })));
}

// ---- ADMIN ----

export function listSettings(): ApiResponse<Record<string, string>> {
  const database = getDb();
  const rows = database
    .prepare(`select key as k, value as v from settings`)
    .all() as Array<{ k: string; v: string }>;

  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.k] = row.v;
  }

  return apiOk(settings);
}

export function updateSetting(key: string, value: string): ApiResponse<{ key: string; value: string }> {
  const database = getDb();
  const now = new Date().toISOString();
  const existing = database.prepare(`select 1 from settings where key = ?`).get(key);

  if (existing) {
    database.prepare(`update settings set value = ?, updated_at = ? where key = ?`).run(value, now, key);
  } else {
    database.prepare(`insert into settings (id, key, value, updated_at) values (?, ?, ?, ?)`).run(crypto.randomUUID(), key, value, now);
  }

  return apiOk({ key, value });
}

export function seedDemoData(): ApiResponse<{ ok: true }> {
  const database = getDb();

  database.transaction(() => {
    // Create demo users
    const hostId = crypto.randomUUID();
    database.prepare(`insert or ignore into users (id, display_name, handle, auth_provider, created_at) values (?, ?, ?, ?, ?)`)
      .run(hostId, "Demo Host", "demo_host", "local_demo", new Date().toISOString());

    const memberId = crypto.randomUUID();
    database.prepare(`insert or ignore into users (id, display_name, handle, auth_provider, created_at) values (?, ?, ?, ?, ?)`)
      .run(memberId, "Demo Member", "demo_member", "local_demo", new Date().toISOString());

    // Create demo room
    const roomId = crypto.randomUUID();
    database.prepare(
      `insert or ignore into rooms (id, name, description, mood, topic, visibility, privacy_mode, capacity, steward_id, rules, created_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(roomId, "Story Circle", "A gentle gathering for sharing stories and sitting together.", "Gentle", "Storytelling", "open_directory", "open_plaintext", 12, hostId, "Speak kindly. Listen deeply.", new Date().toISOString());

    database.prepare(`insert or ignore into room_members (room_id, user_id, role, joined_at) values (?, ?, ?, ?)`)
      .run(roomId, hostId, "steward", new Date().toISOString());
    database.prepare(`insert or ignore into room_members (room_id, user_id, role, joined_at) values (?, ?, ?, ?)`)
      .run(roomId, memberId, "member", new Date().toISOString());

    // Create demo messages
    database.prepare(`insert into messages (id, room_id, author_id, body_plaintext, created_at) values (?, ?, ?, ?, ?)`)
      .run(crypto.randomUUID(), roomId, hostId, "Welcome to the Story Circle. Take your time, there's no rush.", new Date().toISOString());
    database.prepare(`insert into messages (id, room_id, author_id, body_plaintext, created_at) values (?, ?, ?, ?, ?)`)
      .run(crypto.randomUUID(), roomId, memberId, "Thank you. It's good to be here.", new Date().toISOString());

    // Create demo ritual
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    database.prepare(
      `insert into rituals (id, host_id, room_id, title, description, starts_at, created_at)
      values (?, ?, ?, ?, ?, ?, ?)`
    ).run(crypto.randomUUID(), hostId, roomId, "Evening Poetry Reading", "A quiet evening of shared poetry. Bring a verse that moves you.", futureDate, new Date().toISOString());

    // Create demo past ritual with summary
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    database.prepare(
      `insert into rituals (id, host_id, room_id, title, description, starts_at, summary, created_at)
      values (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(crypto.randomUUID(), hostId, roomId, "Full Moon Gathering", "A gentle gathering under the full moon to share stories and reflections.", pastDate, "We sat together under the full moon. Stories were shared about growing up near the ocean.", pastDate);

    // Create demo report
    database.prepare(
      `insert into reports (id, reporter_id, target_user_id, reason, status, created_at)
      values (?, ?, ?, ?, ?, ?)`
    ).run(crypto.randomUUID(), memberId, hostId, "Demo report: This is a sample report for testing the moderation flow.", "open", new Date().toISOString());

    // Create demo moderation action with transparency log
    const modActionId = crypto.randomUUID();
    database.prepare(
      `insert into moderation_actions (id, actor_id, target_user_id, action, reason, created_at)
      values (?, ?, ?, ?, ?, ?)`
    ).run(modActionId, hostId, memberId, "mute", "Demo moderation action: Testing the moderation system.", new Date().toISOString());

    database.prepare(
      `insert into transparency_logs (id, action_id, public_note, created_at)
      values (?, ?, ?, ?)`
    ).run(crypto.randomUUID(), modActionId, "Demo transparency: A moderation action was logged as part of seeding.", new Date().toISOString());
  })();

  return apiOk({ ok: true });
}

export function listUsers(): ApiResponse<Array<Pick<User, "id" | "displayName" | "handle">>> {
  const database = getDb();
  const rows = database
    .prepare(
      `select id as id, display_name as displayName, handle as handle
      from users
      order by display_name asc, handle asc`
    )
    .all() as Array<{ id: string; displayName: string; handle: string }>;

  return apiOk(rows);
}

export function listInvites(): ApiResponse<Array<Record<string, unknown>>> {
  const database = getDb();
  const rows = database
    .prepare(
      `select
        id as id,
        code as code,
        created_by_user_id as createdByUserId,
        max_uses as maxUses,
        used_count as usedCount,
        expires_at as expiresAt,
        created_at as createdAt
      from invites
      order by created_at desc, id asc`
    )
    .all() as Array<Record<string, unknown>>;

  return apiOk(rows.map((row) => ({
    id: row.id,
    code: row.code,
    createdByUserId: row.createdByUserId ?? null,
    maxUses: row.maxUses,
    usedCount: row.usedCount,
    expiresAt: row.expiresAt ?? null,
    createdAt: row.createdAt
  })));
}

export function createInvite(input: { maxUses?: number | null; expiresAt?: string | null }, userId: string): ApiResponse<Record<string, unknown>> {
  const database = getDb();
  const now = new Date().toISOString();
  const inviteId = crypto.randomUUID();
  const code = crypto.randomUUID().slice(0, 12);
  const maxUses = input.maxUses ?? 1;
  const expiresAt = input.expiresAt ?? null;

  database
    .prepare(
      `insert into invites (id, code, created_by_user_id, max_uses, used_count, expires_at, created_at)
      values (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(inviteId, code, userId, maxUses, 0, expiresAt, now);

  return apiOk({ id: inviteId, code, maxUses, expiresAt, createdAt: now });
}

export function deleteInvite(inviteId: string): ApiResponse<{ ok: true }> {
  const database = getDb();
  const result = database.prepare(`delete from invites where id = ?`).run(inviteId);

  if (result.changes !== 1) {
    throw new ApiFailure("not_found", "The invite could not be found.", 404);
  }

  return apiOk({ ok: true });
}

export function addRoomRules(roomId: string, userId: string, rules: string): ApiResponse<{ ok: true }> {
  const database = getDb();
  const room = requireAccessibleRoom(database, roomId, userId);

  if (!isRoomSteward(database, room, userId)) {
    throw new ApiFailure("forbidden", "Only the room steward can edit room rules.", 403);
  }

  database.prepare(`update rooms set rules = ? where id = ?`).run(rules, roomId);
  return apiOk({ ok: true });
}

export function exportJson(userId: string): ApiResponse<ExportPayload> {
  const database = getDb();
  const user = getUser(database, userId);

  if (!user) {
    throw new ApiFailure("not_found", "The account could not be found.", 404);
  }

  return apiOk({
    exportedAt: new Date().toISOString(),
    user,
    rooms: getRoomsForUser(database, userId, true),
    messages: getMessagesForUser(database, userId),
    porchSessions: getPorchSessionsForUser(database, userId),
    letters: getLettersForUser(database, userId).map(toLetter),
    chronicles: getChroniclesForUser(database, userId),
    rituals: getRitualsForUser(database, userId)
  });
}

export function buildMarkdownExport(userId: string): string {
  const database = getDb();
  const user = getUser(database, userId);

  if (!user) {
    throw new ApiFailure("not_found", "The account could not be found.", 404);
  }

  const exportedAt = new Date().toISOString();
  const rooms = getRoomsForUser(database, userId, true);
  const messages = getMessagesForUser(database, userId);
  const porchSessions = getPorchSessionsForUser(database, userId);
  const letters = getLettersForUser(database, userId).map(toLetter);
  const chronicles = getChroniclesForUser(database, userId);
  const rituals = getRitualsForUser(database, userId);

  const lines = [
    "# tpt hearth export",
    "",
    `Exported at: ${exportedAt}`,
    "",
    "## User",
    "",
    `- Handle: ${user.handle}`,
    `- Display name: ${user.displayName}`,
    `- Email: ${user.email ?? "none"}`,
    `- Auth provider: ${user.authProvider}`,
    "",
    `## Rooms (${rooms.length})`,
    ""
  ];

  if (rooms.length === 0) {
    lines.push("_No rooms found._", "");
  } else {
    for (const room of rooms) {
      lines.push(`### ${room.name}`, `- Mood: ${room.mood}`, `- Topic: ${room.topic}`, `- Visibility: ${room.visibility}`, `- Privacy: ${room.privacyMode}`, `- Rules: ${room.rules || "_none_"}`, "");
    }
  }

  lines.push(`## Messages (${messages.length})`, "");

  if (messages.length === 0) {
    lines.push("_No messages found._", "");
  } else {
    for (const message of messages) {
      lines.push(`### Message ${message.id}`, `- Room: ${message.roomId}`, `- Created: ${message.createdAt}`, "", message.bodyPlaintext ?? (message.bodyCiphertext ? "[Encrypted message body]" : "[No body]"), "");
    }
  }

  lines.push(`## Porch Sessions (${porchSessions.length})`, "");

  if (porchSessions.length === 0) {
    lines.push("_No porch sessions found._", "");
  } else {
    for (const session of porchSessions) {
      lines.push(`### ${session.room.name ?? session.roomId}`, `- Mode: ${session.mode}`, `- Starts: ${session.startsAt}`, `- Ends: ${session.endsAt}`, `- Status: ${session.status}`, "");
    }
  }

  lines.push(`## Letters (${letters.length})`, "");

  if (letters.length === 0) {
    lines.push("_No letters found._", "");
  } else {
    for (const letter of letters) {
      lines.push(`### ${letter.subject}`, `- Delivery window: ${letter.deliveryWindow}`, `- Delivered: ${letter.deliveredAt ?? "not yet"}`, "", letter.bodyPlaintext ?? (letter.bodyCiphertext ? "[Encrypted letter body]" : "[No body]"), "");
    }
  }

  lines.push(`## Chronicles (${chronicles.length})`, "");

  if (chronicles.length === 0) {
    lines.push("_No chronicles found._", "");
  } else {
    for (const chronicle of chronicles) {
      lines.push(`### ${chronicle.title}`, `- Kind: ${chronicle.kind}`, "", chronicle.bodyPlaintext ?? (chronicle.bodyCiphertext ? "[Encrypted chronicle body]" : "[No body]"), "");
    }
  }

  lines.push(`## Rituals (${rituals.length})`, "");

  if (rituals.length === 0) {
    lines.push("_No rituals found._", "");
  } else {
    for (const ritual of rituals) {
      lines.push(`### ${ritual.title}`, `- Starts: ${ritual.startsAt}`, ritual.summary ? `- Summary: ${ritual.summary}` : "", "");
    }
  }

  return lines.join("\n");
}

export function deleteAccount(userId: string): ApiResponse<{ ok: true; deletedUserId: string }> {
  const database = getDb();
  const user = getUser(database, userId);

  if (!user) {
    throw new ApiFailure("not_found", "The account could not be found.", 404);
  }

  database.prepare(`delete from sessions where user_id = ?`).run(userId);
  database.prepare(`delete from room_members where user_id = ?`).run(userId);
  database.prepare(`update rooms set steward_id = null where steward_id = ?`).run(userId);
  database.prepare(`update letters set recipient_user_id = null where recipient_user_id = ?`).run(userId);
  database.prepare(`update reports set target_user_id = null where target_user_id = ?`).run(userId);
  database.prepare(`update moderation_actions set target_user_id = null where target_user_id = ?`).run(userId);
  database.prepare(`delete from users where id = ?`).run(userId);

  return apiOk({ ok: true, deletedUserId: userId });
}

export function handleApiError(error: unknown): NextResponse<ApiResponse<never>> {
  if (error instanceof ApiFailure) {
    return jsonResponse(apiError(error.code, error.message), error.status);
  }

  if (error instanceof AuthFailure) {
    return jsonResponse(apiError(error.code, error.message), error.status);
  }

  console.error(error);
  return jsonResponse(apiError("internal_error", "Unable to complete request."), 500);
}

export type ExportPayload = {
  exportedAt: string;
  user: User;
  rooms: RoomSummary[];
  messages: Message[];
  porchSessions: PorchSessionSummary[];
  letters: Letter[];
  chronicles: Chronicle[];
  rituals: Ritual[];
};

function jsonResponse<T>(result: ApiResponse<T>, status?: number): NextResponse<ApiResponse<T>> {
  return NextResponse.json(result, { status: status ?? statusForResponse(result) });
}

function statusForResponse(result: ApiResponse<unknown>) {
  if (result.ok) {
    return 200;
  }

  switch (result.error.code) {
    case "unauthorized":
    case "session_expired":
      return 401;
    case "forbidden":
      return 403;
    case "not_found":
      return 404;
    case "conflict":
      return 409;
    case "validation_error":
    case "bad_request":
      return 400;
    default:
      return 500;
  }
}

async function readJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function getRoomSummary(database: ReturnType<typeof getDb>, roomId: string): RoomSummary {
  const row = getRoomRow(database, roomId);

  if (!row) {
    throw new ApiFailure("not_found", "The room could not be found.", 404);
  }

  return getRoomSummaryFromRow(database, row);
}

function getRoomSummaryFromRow(database: ReturnType<typeof getDb>, row: RoomRow): RoomSummary {
  const count = database.prepare(`select count(*) as memberCount from room_members where room_id = ? and left_at is null`).get(row.id) as { memberCount: number };
  return { ...toRoom(row), memberCount: count.memberCount };
}

function requireAccessibleRoom(database: ReturnType<typeof getDb>, roomId: string, userId: string): RoomRow {
  const room = getRoomRow(database, roomId);

  if (!room) {
    throw new ApiFailure("not_found", "The room could not be found.", 404);
  }

  if (room.archivedAt) {
    throw new ApiFailure("conflict", "The room is archived.", 409);
  }

  if (room.visibility === roomVisibilityModes.openDirectory || room.visibility === roomVisibilityModes.openPorchEligible || room.stewardId === userId) {
    return room;
  }

  if (getActiveMember(database, roomId, userId)) {
    return room;
  }

  throw new ApiFailure("forbidden", "You do not have access to this room.", 403);
}

function getRoomRow(database: ReturnType<typeof getDb>, roomId: string): RoomRow | null {
  return database
    .prepare(
      `select
        id as id,
        name as name,
        description as description,
        mood as mood,
        topic as topic,
        visibility as visibility,
        privacy_mode as privacyMode,
        capacity as capacity,
        steward_id as stewardId,
        rules as rules,
        created_at as createdAt,
        archived_at as archivedAt
      from rooms
      where id = ?`
    )
    .get(roomId) as RoomRow | null;
}

function toRoom(row: RoomRow): Room {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    mood: row.mood,
    topic: row.topic,
    visibility: row.visibility,
    privacyMode: row.privacyMode,
    capacity: 12,
    stewardId: row.stewardId,
    rules: row.rules,
    createdAt: row.createdAt,
    archivedAt: row.archivedAt
  };
}

function getActiveMember(database: ReturnType<typeof getDb>, roomId: string, userId: string) {
  return database.prepare(`select role from room_members where room_id = ? and user_id = ? and left_at is null`).get(roomId, userId);
}

function isRoomSteward(database: ReturnType<typeof getDb>, room: RoomRow, userId: string) {
  if (room.stewardId === userId) {
    return true;
  }

  const member = getActiveMember(database, room.id, userId) as { role?: string } | undefined;
  return member?.role === "steward";
}

function ensureRoomCapacity(database: ReturnType<typeof getDb>, roomId: string) {
  const count = database.prepare(`select count(*) as memberCount from room_members where room_id = ? and left_at is null`).get(roomId) as { memberCount: number };

  if (count.memberCount >= 12) {
    throw new ApiFailure("conflict", "This room is already at capacity.", 409);
  }
}

function getMessage(database: ReturnType<typeof getDb>, messageId: string): Message {
  const row = getMessageRow(database, messageId);

  if (!row) {
    throw new ApiFailure("not_found", "The message could not be found.", 404);
  }

  return toMessage(row);
}

function getMessageRow(database: ReturnType<typeof getDb>, messageId: string): MessageRow | null {
  return database
    .prepare(
      `select
        id as id,
        room_id as roomId,
        author_id as authorId,
        body_plaintext as bodyPlaintext,
        body_ciphertext as bodyCiphertext,
        nonce as nonce,
        key_version as keyVersion,
        created_at as createdAt,
        deleted_at as deletedAt
      from messages
      where id = ?`
    )
    .get(messageId) as MessageRow | null;
}

function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    roomId: row.roomId,
    authorId: row.authorId,
    bodyPlaintext: row.bodyPlaintext,
    bodyCiphertext: row.bodyCiphertext,
    nonce: row.nonce,
    keyVersion: row.keyVersion,
    createdAt: row.createdAt,
    deletedAt: row.deletedAt
  };
}

function requirePorchSession(database: ReturnType<typeof getDb>, sessionId: string): PorchSessionRow {
  const session = getPorchSessionRow(database, sessionId);

  if (!session) {
    throw new ApiFailure("not_found", "The porch session could not be found.", 404);
  }

  return session;
}

function getPorchSessionRow(database: ReturnType<typeof getDb>, sessionId: string): PorchSessionRow | null {
  return database
    .prepare(
      `select
        id as id,
        mode as mode,
        room_id as roomId,
        starts_at as startsAt,
        ends_at as endsAt,
        status as status,
        created_at as createdAt
      from porch_sessions
      where id = ?`
    )
    .get(sessionId) as PorchSessionRow | null;
}

function getPorchSessionSummary(database: ReturnType<typeof getDb>, sessionId: string): PorchSessionSummary {
  const row = getPorchSessionRow(database, sessionId);

  if (!row) {
    throw new ApiFailure("not_found", "The porch session could not be found.", 404);
  }

  const room = getRoomRow(database, row.roomId);

  if (!room) {
    throw new ApiFailure("not_found", "The porch room could not be found.", 404);
  }

  return toPorchSessionSummary({
    ...row,
    roomName: room.name,
    roomMood: room.mood,
    roomTopic: room.topic,
    roomVisibility: room.visibility,
    roomPrivacyMode: room.privacyMode,
    roomStewardId: room.stewardId,
    roomArchivedAt: room.archivedAt
  });
}

function toPorchSession(row: PorchSessionRow): PorchSession {
  return {
    id: row.id,
    mode: row.mode,
    roomId: row.roomId,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    status: row.status,
    createdAt: row.createdAt
  };
}

function toPorchSessionSummary(row: PorchSessionRow & { roomName: string; roomMood: string; roomTopic: string; roomVisibility: RoomVisibility; roomPrivacyMode: RoomPrivacyMode; roomStewardId: string | null; roomArchivedAt: string | null }): PorchSessionSummary {
  return {
    ...toPorchSession(row),
    room: {
      id: row.roomId,
      name: row.roomName,
      mood: row.roomMood,
      topic: row.roomTopic,
      visibility: row.roomVisibility,
      privacyMode: row.roomPrivacyMode,
      stewardId: row.roomStewardId,
      archivedAt: row.roomArchivedAt
    }
  };
}

function getLetterByRow(database: ReturnType<typeof getDb>, letterId: string, userId: string): Letter {
  const row = getLetterRow(database, letterId);

  if (!row || !canAccessLetter(database, row, userId)) {
    throw new ApiFailure("not_found", "The letter could not be found.", 404);
  }

  return toLetterWithNames(row);
}

function canAccessLetter(database: ReturnType<typeof getDb>, row: LetterRow, userId: string) {
  if (row.authorId === userId || row.recipientUserId === userId) {
    return true;
  }

  if (!row.recipientRoomId) {
    return false;
  }

  try {
    requireAccessibleRoom(database, row.recipientRoomId, userId);
    return true;
  } catch {
    return false;
  }
}

function getLetterRow(database: ReturnType<typeof getDb>, letterId: string): LetterRow | null {
  return database
    .prepare(
      `select
        l.id as id,
        l.author_id as authorId,
        l.recipient_user_id as recipientUserId,
        l.recipient_room_id as recipientRoomId,
        l.subject as subject,
        l.body_plaintext as bodyPlaintext,
        l.body_ciphertext as bodyCiphertext,
        l.nonce as nonce,
        l.delivery_window as deliveryWindow,
        l.delivered_at as deliveredAt,
        l.created_at as createdAt,
        recipient.display_name as recipientDisplayName,
        recipient_room.name as recipientRoomName,
        author.display_name as authorDisplayName
      from letters l
      left join users recipient on recipient.id = l.recipient_user_id
      left join rooms recipient_room on recipient_room.id = l.recipient_room_id
      left join users author on author.id = l.author_id
      where l.id = ?`
    )
    .get(letterId) as LetterRow | null;
}

function toLetter(row: LetterRow): Letter {
  return {
    id: row.id,
    authorId: row.authorId,
    recipientUserId: row.recipientUserId,
    recipientRoomId: row.recipientRoomId,
    subject: row.subject,
    bodyPlaintext: row.bodyPlaintext,
    bodyCiphertext: row.bodyCiphertext,
    nonce: row.nonce,
    deliveryWindow: row.deliveryWindow,
    deliveredAt: row.deliveredAt,
    createdAt: row.createdAt
  };
}

function toLetterWithNames(row: LetterRow): Letter & { recipientDisplayName: string | null; recipientRoomName: string | null; authorDisplayName: string | null } {
  return {
    ...toLetter(row),
    recipientDisplayName: row.recipientDisplayName,
    recipientRoomName: row.recipientRoomName,
    authorDisplayName: row.authorDisplayName
  };
}

function requireUserChronicle(database: ReturnType<typeof getDb>, chronicleId: string, userId: string): ChronicleRow {
  const chronicle = getChronicleRow(database, chronicleId);

  if (!chronicle || chronicle.userId !== userId) {
    throw new ApiFailure("not_found", "The chronicle could not be found.", 404);
  }

  return chronicle;
}

function getChronicle(database: ReturnType<typeof getDb>, chronicleId: string): Chronicle {
  return toChronicle(requireUserChronicle(database, chronicleId, "unused"));
}

function getChronicleRow(database: ReturnType<typeof getDb>, chronicleId: string): ChronicleRow | null {
  return database
    .prepare(
      `select
        id as id,
        user_id as userId,
        kind as kind,
        title as title,
        body_plaintext as bodyPlaintext,
        body_ciphertext as bodyCiphertext,
        metadata_json as metadataJson,
        created_at as createdAt
      from chronicles
      where id = ?`
    )
    .get(chronicleId) as ChronicleRow | null;
}

function toChronicle(row: ChronicleRow): Chronicle {
  return {
    id: row.id,
    userId: row.userId,
    kind: row.kind,
    title: row.title,
    bodyPlaintext: row.bodyPlaintext,
    bodyCiphertext: row.bodyCiphertext,
    metadataJson: row.metadataJson,
    createdAt: row.createdAt
  };
}

function validateMetadataJson(value: string) {
  try {
    JSON.parse(value);
  } catch {
    throw new ApiFailure("validation_error", "metadataJson must be valid JSON.", 400);
  }
}

function requireHostRitual(database: ReturnType<typeof getDb>, ritualId: string, userId: string): RitualRow {
  const ritual = getRitualRow(database, ritualId);

  if (!ritual || ritual.hostId !== userId) {
    throw new ApiFailure("not_found", "The ritual could not be found.", 404);
  }

  return ritual;
}

function getRitual(database: ReturnType<typeof getDb>, ritualId: string): Ritual {
  const ritual = getRitualRow(database, ritualId);

  if (!ritual) {
    throw new ApiFailure("not_found", "The ritual could not be found.", 404);
  }

  return toRitual(ritual);
}

function getRitualRow(database: ReturnType<typeof getDb>, ritualId: string): RitualRow | null {
  return database
    .prepare(
      `select
        ri.id as id,
        ri.host_id as hostId,
        ri.room_id as roomId,
        ri.title as title,
        ri.description as description,
        ri.starts_at as startsAt,
        ri.summary as summary,
        ri.created_at as createdAt,
        r.name as roomName
      from rituals ri
      left join rooms r on r.id = ri.room_id
      where ri.id = ?`
    )
    .get(ritualId) as RitualRow | null;
}

function toRitual(row: RitualRow): Ritual {
  return {
    id: row.id,
    hostId: row.hostId,
    roomId: row.roomId,
    title: row.title,
    description: row.description,
    startsAt: row.startsAt,
    summary: row.summary,
    createdAt: row.createdAt
  };
}

function getUser(database: ReturnType<typeof getDb>, userId: string): AuthenticatedUser | null {
  return database
    .prepare(
      `select
        id as id,
        display_name as displayName,
        handle as handle,
        email as email,
        auth_provider as authProvider,
        created_at as createdAt
      from users
      where id = ?`
    )
    .get(userId) as AuthenticatedUser | null;
}

function getRoomsForUser(database: ReturnType<typeof getDb>, userId: string, includeArchived: boolean): RoomSummary[] {
  const archivedClause = includeArchived ? "1 = 1" : "r.archived_at is null";
  const rows = database
    .prepare(
      `select distinct
        r.id as id,
        r.name as name,
        r.description as description,
        r.mood as mood,
        r.topic as topic,
        r.visibility as visibility,
        r.privacy_mode as privacyMode,
        r.capacity as capacity,
        r.steward_id as stewardId,
        r.rules as rules,
        r.created_at as createdAt,
        r.archived_at as archivedAt
      from rooms r
      left join room_members rm on rm.room_id = r.id and rm.user_id = ? and (${includeArchived ? "1 = 1" : "rm.left_at is null"})
      where ${archivedClause} and (r.steward_id = ? or rm.user_id = ?)
      order by r.created_at asc, r.name asc`
    )
    .all(userId, userId, userId) as RoomRow[];

  return rows.map((row) => getRoomSummaryFromRow(database, row));
}

function getMessagesForUser(database: ReturnType<typeof getDb>, userId: string): Message[] {
  const rows = database
    .prepare(
      `select distinct
        m.id as id,
        m.room_id as roomId,
        m.author_id as authorId,
        m.body_plaintext as bodyPlaintext,
        m.body_ciphertext as bodyCiphertext,
        m.nonce as nonce,
        m.key_version as keyVersion,
        m.created_at as createdAt,
        m.deleted_at as deletedAt
      from messages m
      join rooms r on r.id = m.room_id
      left join room_members rm on rm.room_id = r.id and rm.user_id = ? and rm.left_at is null
      where m.author_id = ? or r.steward_id = ? or rm.user_id = ?
      order by m.created_at asc, m.id asc`
    )
    .all(userId, userId, userId, userId) as MessageRow[];

  return rows.map(toMessage);
}

function getPorchSessionsForUser(database: ReturnType<typeof getDb>, userId: string): PorchSessionSummary[] {
  const rows = database
    .prepare(
      `select distinct
        ps.id as id,
        ps.mode as mode,
        ps.room_id as roomId,
        ps.starts_at as startsAt,
        ps.ends_at as endsAt,
        ps.status as status,
        ps.created_at as createdAt,
        r.name as roomName,
        r.mood as roomMood,
        r.topic as roomTopic,
        r.visibility as roomVisibility,
        r.privacy_mode as roomPrivacyMode,
        r.steward_id as roomStewardId,
        r.archived_at as roomArchivedAt
      from porch_sessions ps
      join rooms r on r.id = ps.room_id
      left join room_members rm on rm.room_id = r.id and rm.user_id = ? and rm.left_at is null
      where r.steward_id = ? or rm.user_id = ?
      order by ps.starts_at asc, ps.created_at asc`
    )
    .all(userId, userId, userId) as Array<PorchSessionRow & {
      roomName: string;
      roomMood: string;
      roomTopic: string;
      roomVisibility: RoomVisibility;
      roomPrivacyMode: RoomPrivacyMode;
      roomStewardId: string | null;
      roomArchivedAt: string | null;
    }>;

  return rows.map(toPorchSessionSummary);
}

function getLettersForUser(database: ReturnType<typeof getDb>, userId: string): LetterRow[] {
  return database
    .prepare(
      `select
        l.id as id,
        l.author_id as authorId,
        l.recipient_user_id as recipientUserId,
        l.recipient_room_id as recipientRoomId,
        l.subject as subject,
        l.body_plaintext as bodyPlaintext,
        l.body_ciphertext as bodyCiphertext,
        l.nonce as nonce,
        l.delivery_window as deliveryWindow,
        l.delivered_at as deliveredAt,
        l.created_at as createdAt,
        recipient.display_name as recipientDisplayName,
        recipient_room.name as recipientRoomName,
        author.display_name as authorDisplayName
      from letters l
      left join users recipient on recipient.id = l.recipient_user_id
      left join rooms recipient_room on recipient_room.id = l.recipient_room_id
      left join users author on author.id = l.author_id
      where l.author_id = ? or l.recipient_user_id = ?
      order by l.created_at asc, l.id asc`
    )
    .all(userId, userId) as LetterRow[];
}

function getChroniclesForUser(database: ReturnType<typeof getDb>, userId: string): Chronicle[] {
  const rows = database
    .prepare(
      `select
        id as id,
        user_id as userId,
        kind as kind,
        title as title,
        body_plaintext as bodyPlaintext,
        body_ciphertext as bodyCiphertext,
        metadata_json as metadataJson,
        created_at as createdAt
      from chronicles
      where user_id = ?
      order by created_at asc, id asc`
    )
    .all(userId) as ChronicleRow[];

  return rows.map(toChronicle);
}

function getRitualsForUser(database: ReturnType<typeof getDb>, userId: string): Ritual[] {
  const rows = database
    .prepare(
      `select distinct
        ri.id as id,
        ri.host_id as hostId,
        ri.room_id as roomId,
        ri.title as title,
        ri.description as description,
        ri.starts_at as startsAt,
        ri.summary as summary,
        ri.created_at as createdAt,
        r.name as roomName
      from rituals ri
      left join rooms r on r.id = ri.room_id
      left join room_members rm on rm.room_id = ri.room_id and rm.user_id = ? and rm.left_at is null
      where ri.host_id = ? or (ri.room_id is not null and rm.user_id is not null)
      order by ri.starts_at asc, ri.id asc`
    )
    .all(userId, userId) as RitualRow[];

  return rows.map(toRitual);
}

function normalizeLimit(url: string, fallback: number) {
  const parsed = Number(new URL(url).searchParams.get("limit") ?? fallback);

  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, 1), 500);
}

function isExpired(value: string) {
  return Date.parse(value) <= Date.now();
}

function toTransparencyLog(row: { id: string; actionId: string; publicNote: string; createdAt: string }): TransparencyLog {
  return {
    id: row.id,
    actionId: row.actionId,
    publicNote: row.publicNote,
    createdAt: row.createdAt
  };
}