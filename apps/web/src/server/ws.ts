/**
 * Native WebSocket server for tpt hearth.
 * Runs alongside the Next.js dev server on a configurable port (default: 4000).
 *
 * Protocol is a simple JSON message envelope:
 *   { type: string, payload?: unknown }
 *
 * Events:
 *   join_room  -> client sends { type: "join_room", payload: { roomId: string } }
 *   leave_room -> client sends { type: "leave_room", payload: { roomId: string } }
 *   message    -> client sends { type: "message", payload: { roomId, body, privacyMode?, bodyCiphertext?, nonce?, keyVersion? } }
 *   presence   -> server broadcasts { type: "presence", payload: { roomId, userId, displayName, action: "join"|"leave" } }
 *   typing     -> client sends { type: "typing", payload: { roomId } }
 *              -> server broadcasts { type: "typing", payload: { roomId, userId, displayName } }
 *   room_state -> server sends room state on join { type: "room_state", payload: { roomId, participants: [...], messages: [...] } }
 *   error      -> server sends { type: "error", payload: { code: string, message: string } }
 */

import { createServer, type IncomingMessage } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { DEFAULT_WS_PORT, ROOM_CAPACITY } from "@tpt-hearth/config";
import { getDb, hashToken, getDatabasePath } from "@tpt-hearth/db";
import crypto from "node:crypto";

const PORT = process.env.WS_PORT ? Number.parseInt(process.env.WS_PORT, 10) : DEFAULT_WS_PORT;

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthenticatedClient {
  ws: WebSocket;
  userId: string;
  displayName: string;
  rooms: Set<string>;
}

interface RoomState {
  participants: Map<string, { userId: string; displayName: string }>;
}

interface WsMessage {
  type: string;
  payload?: Record<string, unknown> | undefined;
}

// ── State ─────────────────────────────────────────────────────────────────────

const clients = new Map<WebSocket, AuthenticatedClient>();
const rooms = new Map<string, RoomState>();

// Typing debounce: track last typing timestamp per user per room
const typingThrottle = new Map<string, number>();
const TYPING_THROTTLE_MS = 2_000;

// ── Connection ────────────────────────────────────────────────────────────────

function getAuthToken(req: IncomingMessage): string | null {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  return url.searchParams.get("token");
}

function authenticateClient(token: string): { userId: string; displayName: string } | null {
  try {
    const db = getDb();
    const row = db
      .prepare(
        `select s.user_id as userId, u.display_name as displayName
         from sessions s
         join users u on u.id = s.user_id
         where s.token_hash = ? and s.expires_at > datetime('now')`
      )
      .get(hashToken(token)) as { userId: string; displayName: string } | undefined;

    if (!row) return null;
    return { userId: row.userId, displayName: row.displayName };
  } catch {
    return null;
  }
}

function send(ws: WebSocket, message: WsMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function sendError(ws: WebSocket, code: string, message: string) {
  send(ws, { type: "error", payload: { code, message } });
}

// ── Presence ──────────────────────────────────────────────────────────────────

function broadcastPresence(roomId: string, userId: string, displayName: string, action: "join" | "leave") {
  const room = rooms.get(roomId);
  if (!room) return;

  for (const [ws, client] of clients) {
    if (client.rooms.has(roomId)) {
      send(ws, {
        type: "presence",
        payload: { roomId, userId, displayName, action }
      });
    }
  }
}

function broadcastTyping(roomId: string, userId: string, displayName: string) {
  const key = `${roomId}:${userId}`;
  const now = Date.now();
  const last = typingThrottle.get(key) ?? 0;

  if (now - last < TYPING_THROTTLE_MS) return;
  typingThrottle.set(key, now);

  const room = rooms.get(roomId);
  if (!room) return;

  for (const [ws, client] of clients) {
    if (client.rooms.has(roomId) && client.userId !== userId) {
      send(ws, {
        type: "typing",
        payload: { roomId, userId, displayName }
      });
    }
  }
}

// ── Room state ────────────────────────────────────────────────────────────────

function getRoomState(roomId: string, excludeUserId?: string): Record<string, unknown> {
  const room = rooms.get(roomId);
  const participants = room
    ? Array.from(room.participants.values()).filter((p) => p.userId !== excludeUserId)
    : [];

  // Load recent messages from DB for context
  let messages: Array<Record<string, unknown>> = [];
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `select id, room_id as roomId, author_id as authorId, body_plaintext as bodyPlaintext, created_at as createdAt
         from messages
         where room_id = ? and deleted_at is null
         order by created_at desc
         limit 50`
      )
      .all(roomId) as Array<Record<string, unknown>>;
    messages = rows.reverse();
  } catch {
    // DB not available yet
  }

  return {
    roomId,
    participants: participants.map((p) => ({ userId: p.userId, displayName: p.displayName })),
    messages
  };
}

// ── Handlers ──────────────────────────────────────────────────────────────────

function handleJoinRoom(client: AuthenticatedClient, payload: Record<string, unknown>) {
  const roomId = String(payload.roomId ?? "");
  if (!roomId) {
    sendError(client.ws, "validation_error", "roomId is required");
    return;
  }

  let room = rooms.get(roomId);
  if (!room) {
    room = { participants: new Map() };
    rooms.set(roomId, room);
  }

  if (room.participants.size >= ROOM_CAPACITY) {
    sendError(client.ws, "room_full", `This room is at capacity (${ROOM_CAPACITY} participants).`);
    return;
  }

  if (room.participants.has(client.userId)) {
    // Already in the room — still send state
    send(client.ws, {
      type: "room_state",
      payload: getRoomState(roomId)
    });
    return;
  }

  room.participants.set(client.userId, {
    userId: client.userId,
    displayName: client.displayName
  });
  client.rooms.add(roomId);

  send(client.ws, {
    type: "room_state",
    payload: getRoomState(roomId)
  });

  broadcastPresence(roomId, client.userId, client.displayName, "join");
}

function handleLeaveRoom(client: AuthenticatedClient, payload: Record<string, unknown>) {
  const roomId = String(payload.roomId ?? "");
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) return;

  room.participants.delete(client.userId);
  client.rooms.delete(roomId);

  broadcastPresence(roomId, client.userId, client.displayName, "leave");

  if (room.participants.size === 0) {
    rooms.delete(roomId);
  }
}

function handleMessage(client: AuthenticatedClient, payload: Record<string, unknown>) {
  const roomId = String(payload.roomId ?? "");
  const body = String(payload.body ?? "");
  if (!roomId || !body) {
    sendError(client.ws, "validation_error", "roomId and body are required");
    return;
  }

  const room = rooms.get(roomId);
  if (!room || !room.participants.has(client.userId)) {
    sendError(client.ws, "forbidden", "You must join the room before sending messages.");
    return;
  }

  // Persist to database
  const privacyMode = String(payload.privacyMode ?? "open_plaintext");
  const bodyCiphertext = payload.bodyCiphertext ? String(payload.bodyCiphertext) : null;
  const nonce = payload.nonce ? String(payload.nonce) : null;
  const keyVersion = payload.keyVersion ? String(payload.keyVersion) : null;
  const messageId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    const db = getDb();
    const isPrivate = privacyMode === "private_e2e";
    db.prepare(
      `insert into messages (id, room_id, author_id, body_plaintext, body_ciphertext, nonce, key_version, created_at)
       values (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      messageId,
      roomId,
      client.userId,
      isPrivate ? null : body,
      isPrivate ? bodyCiphertext : null,
      isPrivate ? nonce : null,
      isPrivate ? keyVersion : null,
      now
    );
  } catch {
    sendError(client.ws, "server_error", "Failed to persist message.");
    return;
  }

  const messagePayload: WsMessage = {
    type: "message",
    payload: {
      id: messageId,
      roomId,
      authorId: client.userId,
      authorDisplayName: client.displayName,
      bodyPlaintext: privacyMode === "private_e2e" ? null : body,
      bodyCiphertext: privacyMode === "private_e2e" ? bodyCiphertext : null,
      nonce: privacyMode === "private_e2e" ? nonce : null,
      keyVersion: privacyMode === "private_e2e" ? keyVersion : null,
      privacyMode,
      createdAt: now
    }
  };

  // Broadcast to all participants in the room
  for (const [ws, c] of clients) {
    if (c.rooms.has(roomId)) {
      send(ws, messagePayload);
    }
  }
}

function handleTyping(client: AuthenticatedClient, payload: Record<string, unknown>) {
  const roomId = String(payload.roomId ?? "");
  if (!roomId) return;

  broadcastTyping(roomId, client.userId, client.displayName);
}

// ── Server ────────────────────────────────────────────────────────────────────

const httpServer = createServer();
const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  const token = getAuthToken(req);
  if (!token) {
    sendError(ws, "unauthorized", "Authentication token is required. Connect with ?token=<session_token>");
    ws.close(4001, "Missing authentication token");
    return;
  }

  const auth = authenticateClient(token);
  if (!auth) {
    sendError(ws, "unauthorized", "Invalid or expired session token.");
    ws.close(4001, "Invalid or expired token");
    return;
  }

  const client: AuthenticatedClient = {
    ws,
    userId: auth.userId,
    displayName: auth.displayName,
    rooms: new Set()
  };
  clients.set(ws, client);

    send(ws, {
      type: "room_state",
      payload: {
        type: "connected",
        userId: client.userId,
        displayName: client.displayName
      }
    });

  ws.on("message", (raw: Buffer) => {
    let parsed: WsMessage;
    try {
      parsed = JSON.parse(raw.toString("utf-8")) as WsMessage;
    } catch {
      sendError(ws, "parse_error", "Invalid JSON message.");
      return;
    }

    const { type, payload = {} } = parsed;

    switch (type) {
      case "join_room":
        handleJoinRoom(client, payload);
        break;
      case "leave_room":
        handleLeaveRoom(client, payload);
        break;
      case "message":
        handleMessage(client, payload);
        break;
      case "typing":
        handleTyping(client, payload);
        break;
      default:
        sendError(ws, "unknown_type", `Unknown message type: "${type}".`);
    }
  });

  ws.on("close", () => {
    // Leave all rooms
    for (const roomId of client.rooms) {
      const room = rooms.get(roomId);
      if (room) {
        room.participants.delete(client.userId);
        broadcastPresence(roomId, client.userId, client.displayName, "leave");
        if (room.participants.size === 0) {
          rooms.delete(roomId);
        }
      }
    }
    clients.delete(ws);
  });

  ws.on("error", () => {
    // Cleanup handled by close event
  });
});

httpServer.listen(PORT, () => {
  console.log(`[ws] tpt hearth WebSocket server listening on ws://localhost:${PORT}`);
});