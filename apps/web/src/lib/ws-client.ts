/**
 * WebSocket client helper for tpt hearth.
 *
 * Provides a simple event-driven wrapper around the native WebSocket API.
 *
 * Usage:
 *   import { createWsClient } from "@/lib/ws-client";
 *   const client = createWsClient(token);
 *
 *   client.on("room_state", (payload) => { ... });
 *   client.on("message", (payload) => { ... });
 *   client.on("presence", (payload) => { ... });
 *   client.on("typing", (payload) => { ... });
 *   client.on("error", (payload) => { ... });
 *
 *   client.joinRoom("room-id");
 *   client.sendMessage("room-id", "hello");
 *   client.sendTyping("room-id");
 *   client.leaveRoom("room-id");
 *   client.disconnect();
 */

export type WsEventType = "room_state" | "message" | "presence" | "typing" | "error";

export type WsEventHandler = (payload: Record<string, unknown>) => void;

export interface WsClient {
  /** The underlying WebSocket, null when disconnected. */
  ws: WebSocket | null;
  /** Register an event handler. */
  on: (event: WsEventType, handler: WsEventHandler) => void;
  /** Remove an event handler. */
  off: (event: WsEventType, handler: WsEventHandler) => void;
  /** Join a room. */
  joinRoom: (roomId: string) => void;
  /** Leave a room. */
  leaveRoom: (roomId: string) => void;
  /** Send a chat message. */
  sendMessage: (roomId: string, body: string, options?: { privacyMode?: string; bodyCiphertext?: string; nonce?: string; keyVersion?: string }) => void;
  /** Signal typing in a room. */
  sendTyping: (roomId: string) => void;
  /** Disconnect from the WebSocket server. */
  disconnect: () => void;
  /** The current connection state. */
  readyState: () => number;
}

const DEFAULT_WS_PORT = 4000;

function getWsUrl(token: string): string {
  if (typeof window === "undefined") return "";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const port = process.env.NEXT_PUBLIC_WS_PORT ?? DEFAULT_WS_PORT;
  return `${protocol}//${window.location.hostname}:${port}?token=${encodeURIComponent(token)}`;
}

export function createWsClient(token: string): WsClient {
  const handlers = new Map<WsEventType, Set<WsEventHandler>>();

  const url = getWsUrl(token);
  const ws = new WebSocket(url);

  const client: WsClient = {
    ws,

    on(event: WsEventType, handler: WsEventHandler) {
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      handlers.get(event)!.add(handler);
    },

    off(event: WsEventType, handler: WsEventHandler) {
      handlers.get(event)?.delete(handler);
    },

    joinRoom(roomId: string) {
      sendWs(ws, { type: "join_room", payload: { roomId } });
    },

    leaveRoom(roomId: string) {
      sendWs(ws, { type: "leave_room", payload: { roomId } });
    },

    sendMessage(roomId: string, body: string, options = {}) {
      sendWs(ws, {
        type: "message",
        payload: { roomId, body, ...options }
      });
    },

    sendTyping(roomId: string) {
      sendWs(ws, { type: "typing", payload: { roomId } });
    },

    disconnect() {
      ws.close(1000, "Client disconnect");
    },

    readyState() {
      return ws.readyState;
    }
  };

  ws.onmessage = (event: MessageEvent) => {
    try {
      const parsed = JSON.parse(event.data as string) as {
        type: string;
        payload?: Record<string, unknown>;
      };
      const { type, payload = {} } = parsed;

      if (handlers.has(type as WsEventType)) {
        handlers.get(type as WsEventType)!.forEach((handler) => handler(payload));
      }
    } catch {
      // Ignore malformed messages
    }
  };

  ws.onerror = () => {
    // Connection errors are handled via close or error handlers
  };

  ws.onclose = () => {
    // Clear all handlers on disconnect
    handlers.clear();
  };

  return client;
}

function sendWs(ws: WebSocket | null, message: { type: string; payload?: Record<string, unknown> }) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(message));
}