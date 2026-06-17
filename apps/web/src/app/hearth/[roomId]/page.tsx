"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Input } from "@tpt-hearth/ui";
import { getJson, postJson, getSessionToken } from "@/lib/api";
import { createWsClient, type WsClient } from "@/lib/ws-client";
import { MoodPill, GentleEmptyState } from "@/components";
import { Send, ArrowLeft, Archive, Users, Loader2, MessageSquare } from "lucide-react";
import type { Message, Room } from "@tpt-hearth/shared";

type RoomSummary = Room & { memberCount: number };

type ChatMessage = {
  id: string;
  roomId: string;
  authorId: string;
  authorDisplayName?: string;
  bodyPlaintext: string | null;
  bodyCiphertext: string | null;
  nonce: string | null;
  keyVersion: string | null;
  createdAt: string;
};

type Participant = {
  userId: string;
  displayName: string;
};

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [input, setInput] = useState("");
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [joined, setJoined] = useState(false);
  const wsRef = useRef<WsClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Fetch room and messages from REST API
  const fetchRoomData = useCallback(async () => {
    const result = await getJson<RoomSummary>(`/api/rooms/${roomId}`);
    if (result.ok) {
      setRoom(result.data);
    }
    const msgsResult = await getJson<Message[]>(`/api/rooms/${roomId}/messages`);
    if (msgsResult.ok) {
      setMessages(msgsResult.data.map(toChatMessage));
    }
    setLoading(false);
  }, [roomId]);

  useEffect(() => {
    fetchRoomData();
  }, [fetchRoomData]);

  // WebSocket connection
  useEffect(() => {
    const token = getSessionToken();
    if (!token || !room) return;

    const ws = createWsClient(token);

    ws.on("room_state", (payload) => {
      if (payload.roomId === roomId) {
        if (payload.participants) {
          setParticipants(payload.participants as Participant[]);
        }
        if (payload.messages) {
          setMessages((payload.messages as ChatMessage[]).map(toChatMessage));
        }
      }
      if (payload.type === "connected") {
        ws.joinRoom(roomId);
        setJoined(true);
      }
    });

    ws.on("message", (payload) => {
      if (payload.roomId === roomId) {
        setMessages((prev) => [...prev, payload as unknown as ChatMessage]);
      }
    });

    ws.on("presence", (payload) => {
      if (payload.roomId === roomId) {
        const action = payload.action as string;
        const participant = {
          userId: payload.userId as string,
          displayName: payload.displayName as string
        };
        if (action === "join") {
          setParticipants((prev) => {
            if (prev.find((p) => p.userId === participant.userId)) return prev;
            return [...prev, participant];
          });
        } else if (action === "leave") {
          setParticipants((prev) => prev.filter((p) => p.userId !== participant.userId));
        }
      }
    });

    ws.on("typing", (payload) => {
      if (payload.roomId === roomId) {
        const userId = payload.userId as string;
        const displayName = payload.displayName as string;
        setTypingUsers((prev) => new Map(prev).set(userId, displayName));

        // Clear typing indicator after 3 seconds
        const existing = typingTimers.current.get(userId);
        if (existing) clearTimeout(existing);
        typingTimers.current.set(
          userId,
          setTimeout(() => {
            setTypingUsers((prev) => {
              const next = new Map(prev);
              next.delete(userId);
              return next;
            });
            typingTimers.current.delete(userId);
          }, 3_000)
        );
      }
    });

    ws.on("error", (payload) => {
      console.error("[ws error]", payload.code, payload.message);
    });

    wsRef.current = ws;

    return () => {
      ws.leaveRoom(roomId);
      ws.disconnect();
      wsRef.current = null;
      // Clear typing timers
      for (const timer of typingTimers.current.values()) {
        clearTimeout(timer);
      }
      typingTimers.current.clear();
    };
  }, [roomId, room]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !wsRef.current) return;

    const body = input.trim();
    wsRef.current.sendMessage(roomId, body, {
      privacyMode: room?.privacyMode ?? "open_plaintext"
    });
    setInput("");
  };

  const handleTyping = () => {
    if (wsRef.current) {
      wsRef.current.sendTyping(roomId);
    }
  };

  const handleArchive = async () => {
    if (!confirm("Archive this room? It will no longer be accessible.")) return;
    setArchiving(true);
    const result = await postJson(`/api/rooms/${roomId}/archive`, {});
    if (result.ok) {
      router.push("/hearth");
    }
    setArchiving(false);
  };

  const handleLeave = async () => {
    if (!confirm("Leave this room? You can rejoin later if invited.")) return;

    if (wsRef.current) {
      wsRef.current.leaveRoom(roomId);
    }
    router.push("/hearth");
  };

  if (loading) {
    return (
      <div className="section-stack flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-ember" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="section-stack">
        <GentleEmptyState title="Room not found" description="This room may have been archived or you may not have access." />
        <Button onClick={() => router.push("/hearth")}>Back to Hearth</Button>
      </div>
    );
  }

  const typingText = Array.from(typingUsers.values()).join(", ");

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      {/* Header */}
      <div className="lodge-surface mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.push("/hearth")} className="inline-flex items-center justify-center rounded-full p-2 text-sand hover:bg-white/10" aria-label="Back to hearth">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-display-sm">{room.name}</h2>
              <MoodPill mood={room.mood} />
            </div>
            <p className="text-sm text-sand/68">{room.topic}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-sand/68">
            <Users className="h-4 w-4" />
            <span>{participants.length > 0 ? participants.length : room.memberCount}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleLeave}>
            Leave
          </Button>
          <Button variant="outline" size="sm" onClick={handleArchive} disabled={archiving}>
            <Archive className="mr-2 h-4 w-4" />
            {archiving ? "Archiving..." : "Archive"}
          </Button>
        </div>
      </div>

      {/* Room rules */}
      {room.rules && (
        <div className="lodge-panel mb-4 px-4 py-3 text-sm italic text-sand/68">
          <span className="font-medium text-sand/48 not-italic">Rules: </span>
          {room.rules}
        </div>
      )}

      {/* Participants */}
      {participants.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-sand/48">Present:</span>
          {participants.map((p) => (
            <span
              key={p.userId}
              className="inline-flex items-center gap-1.5 rounded-full border border-pine/40 bg-pine/10 px-3 py-1 text-xs text-sand/78"
            >
              <span className="h-2 w-2 rounded-full bg-ember animate-slow-pulse" />
              {p.displayName}
            </span>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-sand/10 bg-white/[0.025] p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-sand/28" />
              <p className="mt-3 text-sm text-sand/48">No messages yet. Be the first to speak.</p>
            </div>
          </div>
        ) : (
          <div className="calm-stack">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.authorId === "you" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    msg.authorId === "you"
                      ? "bg-ember/15 border border-ember/20"
                      : "bg-white/[0.045] border border-sand/10"
                  }`}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-ember/80">
                      {msg.authorDisplayName ?? "Unknown"}
                    </span>
                    <span className="text-[10px] text-sand/38">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-sand/88">
                    {msg.bodyPlaintext ?? (
                      <span className="italic text-sand/48">[Encrypted message]</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Typing indicator */}
      {typingText && (
        <div className="mt-1 text-xs text-sand/48 italic px-2 animate-slow-fade-in">
          {typingText} {typingUsers.size === 1 ? "is" : "are"} typing...
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="mt-4 flex gap-3">
        <Input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            handleTyping();
          }}
          placeholder="Write a message..."
          maxLength={20000}
          className="flex-1"
        />
        <Button type="submit" disabled={!input.trim() || !wsRef.current}>
          <Send className="mr-2 h-4 w-4" />
          Send
        </Button>
      </form>
    </div>
  );
}

function toChatMessage(msg: ChatMessage): ChatMessage {
  return msg;
}