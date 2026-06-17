"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Textarea, Select } from "@tpt-hearth/ui";
import { getJson, postJson } from "@/lib/api";
import { useEncryptedDraft } from "@/lib/use-encrypted-draft";
import { GentleEmptyState } from "@/components";
import { ScrollText, Send, Clock, User, DoorOpen, Loader2, ChevronDown, ChevronUp, Reply, Save } from "lucide-react";
import type { Letter, Room, DeliveryWindow, User as AppUser } from "@tpt-hearth/shared";

type LetterWithNames = Letter & {
  recipientDisplayName: string | null;
  recipientRoomName: string | null;
  authorDisplayName: string | null;
};

const deliveryWindowLabels: Record<DeliveryWindow, string> = {
  now: "Deliver now",
  morning: "Next morning",
  evening: "Next evening"
};

export default function LettersPage() {
  const router = useRouter();
  const [letters, setLetters] = useState<LetterWithNames[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [sending, setSending] = useState(false);

  // Compose form state
  const [recipientType, setRecipientType] = useState<"user" | "room">("user");
  const [recipientUserId, setRecipientUserId] = useState("");
  const [recipientUserSearch, setRecipientUserSearch] = useState("");
  const [recipientRoomId, setRecipientRoomId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [deliveryWindow, setDeliveryWindow] = useState<DeliveryWindow>("now");

  // Available rooms for room recipient selection
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AppUser[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);

  const [expandedLetter, setExpandedLetter] = useState<string | null>(null);

  // Encrypted local draft storage for the letter compose form
  const draft = useEncryptedDraft("letter-compose");
  const draftLoaded = useRef(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved draft when composing opens
  useEffect(() => {
    if (composing && !draftLoaded.current) {
      draft.loadDraft().then((savedBody) => {
        if (savedBody && !body) {
          setBody(savedBody);
        }
        draftLoaded.current = true;
      });
    }
  }, [composing, draft.loadDraft, body]);

  // Auto-save draft as the user types (debounced)
  useEffect(() => {
    if (!composing || !body.trim()) return;

    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    autoSaveTimer.current = setTimeout(() => {
      draft.saveDraft(body);
    }, 1500);

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [body, composing, draft.saveDraft]);

  const fetchLetters = useCallback(async () => {
    const result = await getJson<LetterWithNames[]>("/api/letters");
    if (result.ok) {
      setLetters(result.data);
    }
    setLoading(false);
  }, []);

  const fetchRoomsAndUsers = useCallback(async () => {
    const [roomsRes, usersRes] = await Promise.all([
      getJson<Room[]>("/api/rooms"),
      fetch("/api/users").then(r => r.json().catch(() => null))
    ]);
    if (roomsRes.ok) {
      setAvailableRooms(roomsRes.data);
    }
    if (usersRes?.ok) {
      setAvailableUsers(usersRes.data);
    }
  }, []);

  useEffect(() => {
    fetchLetters();
    fetchRoomsAndUsers();
  }, [fetchLetters, fetchRoomsAndUsers]);

  const handleSendLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    if (recipientType === "user" && !recipientUserId.trim()) return;
    if (recipientType === "room" && !recipientRoomId.trim()) return;

    setSending(true);
    const result = await postJson<Letter>("/api/letters", {
      recipientUserId: recipientType === "user" ? recipientUserId.trim() : null,
      recipientRoomId: recipientType === "room" ? recipientRoomId.trim() : null,
      subject: subject.trim(),
      body: body.trim(),
      deliveryWindow
    });

    if (result.ok) {
      draft.clearDraft();
      draftLoaded.current = false;
      setComposing(false);
      setSubject("");
      setBody("");
      setRecipientUserId("");
      setRecipientRoomId("");
      setRecipientUserSearch("");
      setDeliveryWindow("now");
      fetchLetters();
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="section-stack flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-ember" />
      </div>
    );
  }

  return (
    <div className="section-stack">
      <section className="page-enter">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-display">Letters</h1>
            <p className="mt-2 max-w-2xl text-body text-sand/68">
              Asynchronous, thoughtful messages. Sent to a person or a room. Delivered on your schedule.
            </p>
          </div>
          <Button onClick={() => setComposing(!composing)}>
            <Send className="mr-2 h-4 w-4" />
            {composing ? "Cancel" : "Write letter"}
          </Button>
        </div>
      </section>

      {/* Composer */}
      {composing && (
        <Card className="page-enter p-6">
          <form onSubmit={handleSendLetter} className="calm-stack">
            <h2 className="text-display-sm">Write a letter</h2>

            {/* Recipient type selector */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRecipientType("user")}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${
                  recipientType === "user"
                    ? "bg-ember text-ash"
                    : "border border-sand/15 bg-white/[0.035] text-sand/68 hover:border-ember/30"
                }`}
              >
                <User className="h-4 w-4" />
                To a person
              </button>
              <button
                type="button"
                onClick={() => setRecipientType("room")}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${
                  recipientType === "room"
                    ? "bg-ember text-ash"
                    : "border border-sand/15 bg-white/[0.035] text-sand/68 hover:border-ember/30"
                }`}
              >
                <DoorOpen className="h-4 w-4" />
                To a room
              </button>
            </div>

            {/* Recipient user search */}
            {recipientType === "user" && (
              <div className="relative">
                <label className="mb-1 block text-sm text-sand/68">Recipient</label>
                <Input
                  value={recipientUserSearch}
                  onChange={(e) => {
                    setRecipientUserSearch(e.target.value);
                    setRecipientUserId(e.target.value);
                    setShowUserSearch(true);
                  }}
                  onFocus={() => setShowUserSearch(true)}
                  placeholder="Search by user ID or display name..."
                />
                {showUserSearch && recipientUserSearch && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl border border-sand/15 bg-ash-950 p-2 shadow-lodge">
                    <p className="px-2 py-1 text-xs text-sand/48">
                      Enter the recipient's user ID or leave a note for the steward.
                    </p>
                    <button
                      type="button"
                      className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-sand/68 hover:bg-white/[0.06]"
                      onClick={() => setShowUserSearch(false)}
                    >
                      Use as entered: {recipientUserSearch}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Recipient room selector */}
            {recipientType === "room" && (
              <div>
                <label className="mb-1 block text-sm text-sand/68">Room</label>
                <select
                  value={recipientRoomId}
                  onChange={(e) => setRecipientRoomId(e.target.value)}
                  className="w-full rounded-xl border border-sand/15 bg-white/[0.045] px-4 py-3 text-sand focus:border-ember/50 focus:outline-none focus:ring-1 focus:ring-ember/30"
                >
                  <option value="">Select a room...</option>
                  {availableRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Subject */}
            <div>
              <label className="mb-1 block text-sm text-sand/68">Subject</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What is your letter about..."
                maxLength={160}
                required
              />
            </div>

            {/* Body */}
            <div>
              <label className="mb-1 block text-sm text-sand/68">Letter</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write something thoughtful..."
                maxLength={50000}
                className="w-full min-h-[200px] rounded-xl border border-sand/15 bg-white/[0.045] px-4 py-3 text-sand placeholder:text-sand/38 focus:border-ember/50 focus:outline-none focus:ring-1 focus:ring-ember/30"
                rows={8}
                required
              />
              <p className="mt-1 text-xs text-sand/48">{body.length}/50000 characters</p>
            </div>

            {/* Delivery window */}
            <div>
              <label className="mb-1 block text-sm text-sand/68">Delivery window</label>
              <select
                value={deliveryWindow}
                onChange={(e) => setDeliveryWindow(e.target.value as DeliveryWindow)}
                className="w-full rounded-xl border border-sand/15 bg-white/[0.045] px-4 py-3 text-sand focus:border-ember/50 focus:outline-none focus:ring-1 focus:ring-ember/30"
              >
                {Object.entries(deliveryWindowLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setComposing(false)}>
                Discard
              </Button>
              <Button
                type="submit"
                disabled={
                  sending ||
                  !subject.trim() ||
                  !body.trim() ||
                  (recipientType === "user" && !recipientUserId.trim()) ||
                  (recipientType === "room" && !recipientRoomId.trim())
                }
              >
                {sending ? "Sending..." : "Send letter"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Inbox / Letters list */}
      {letters.length === 0 ? (
        <GentleEmptyState
          title="No letters yet"
          description="Letters are thoughtful, long-form messages. Write one to someone or to a room."
          icon={<ScrollText className="h-6 w-6" />}
          action={
            <Button variant="outline" onClick={() => setComposing(true)}>
              Write your first letter
            </Button>
          }
        />
      ) : (
        <section className="section-stack">
          <h2 className="text-display-sm">Your letters</h2>
          <div className="grid gap-3">
            {letters.map((letter) => {
              const isExpanded = expandedLetter === letter.id;
              const isSent = letter.authorId !== letter.recipientUserId;
              const recipientLabel = letter.recipientDisplayName ?? letter.recipientRoomName ?? "Unknown";
              const authorLabel = letter.authorDisplayName ?? "Unknown";

              return (
                <button
                  key={letter.id}
                  onClick={() => setExpandedLetter(isExpanded ? null : letter.id)}
                  className="lodge-surface page-enter block w-full cursor-pointer p-5 text-left transition-colors hover:bg-white/[0.06]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-serif">{letter.subject}</h3>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${
                          letter.deliveryWindow === "now"
                            ? "border border-pine/40 bg-pine/15 text-pine-300"
                            : "border border-sand/20 bg-white/[0.045] text-sand/68"
                        }`}>
                          <Clock className="h-3 w-3" />
                          {deliveryWindowLabels[letter.deliveryWindow]}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-sand/48">
                        <span>
                          {isSent ? `To: ${recipientLabel}` : `From: ${authorLabel}`}
                        </span>
                        <span>{new Date(letter.createdAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        {letter.deliveredAt && (
                          <span className="text-pine-300">Delivered</span>
                        )}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0 text-sand/48" /> : <ChevronDown className="h-4 w-4 shrink-0 text-sand/48" />}
                  </div>

                  {isExpanded && letter.bodyPlaintext && (
                    <div className="mt-4 border-t border-sand/10 pt-4">
                      <p className="whitespace-pre-wrap text-body text-sand/78">{letter.bodyPlaintext}</p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <GentleEmptyState
        title="Thoughtful words take time"
        description="Letters are not instant messages. They are meant to be savored, written slowly, and delivered when the time is right."
        icon={<ScrollText className="h-6 w-6" />}
      />
    </div>
  );
}