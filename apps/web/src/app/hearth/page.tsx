"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Card } from "@tpt-hearth/ui";
import { getJson, postJson, getSessionToken, type SessionToken, SESSION_STORAGE_KEY } from "@/lib/api";
import { GentleEmptyState, MoodPill } from "@/components";
import { Plus, DoorOpen, Loader2 } from "lucide-react";
import type { Room } from "@tpt-hearth/shared";

type RoomSummary = Room & { memberCount: number };

export default function HearthPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Create room form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mood, setMood] = useState("gentle");
  const [topic, setTopic] = useState("");
  const [visibility, setVisibility] = useState<"link_only" | "private_invite_only" | "open_directory" | "open_porch_eligible">("link_only");
  const [privacyMode, setPrivacyMode] = useState<"private_e2e" | "open_plaintext">("private_e2e");
  const [rules, setRules] = useState("");

  const fetchRooms = useCallback(async () => {
    const token = getSessionToken();
    if (!token) {
      setLoading(false);
      return;
    }
    const result = await getJson<RoomSummary[]>("/api/rooms");
    if (result.ok) {
      setRooms(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !topic.trim()) return;

    setCreating(true);
    const result = await postJson<RoomSummary>("/api/rooms", {
      name: name.trim(),
      description: description.trim(),
      mood: mood.trim(),
      topic: topic.trim(),
      visibility,
      privacyMode,
      rules: rules.trim()
    });

    if (result.ok) {
      setRooms((prev) => [...prev, result.data]);
      setShowForm(false);
      setName("");
      setDescription("");
      setTopic("");
      setRules("");
      router.push(`/hearth/${result.data.id}`);
    }
    setCreating(false);
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
            <h1 className="text-display">Hearth</h1>
            <p className="mt-2 max-w-2xl text-body text-sand/68">
              Your active rooms. All the small fires you tend.
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" />
            New room
          </Button>
        </div>
      </section>

      {showForm && (
        <Card className="page-enter p-6">
          <form onSubmit={handleCreateRoom} className="calm-stack">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-sand/68">Room name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="A quiet corner"
                  maxLength={80}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-sand/68">Mood</label>
                <Input
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  placeholder="gentle, warm, quiet..."
                  maxLength={40}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm text-sand/68">Topic</label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="What brings folks here?"
                  maxLength={80}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm text-sand/68">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A short welcome for those who find this room..."
                  maxLength={500}
                  className="w-full rounded-xl border border-sand/15 bg-white/[0.045] px-4 py-3 text-sand placeholder:text-sand/38 focus:border-ember/50 focus:outline-none focus:ring-1 focus:ring-ember/30"
                  rows={2}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-sand/68">Visibility</label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as typeof visibility)}
                  className="w-full rounded-xl border border-sand/15 bg-white/[0.045] px-4 py-3 text-sand focus:border-ember/50 focus:outline-none focus:ring-1 focus:ring-ember/30"
                >
                  <option value="link_only">Link only</option>
                  <option value="private_invite_only">Invite only</option>
                  <option value="open_directory">Open (in Grove)</option>
                  <option value="open_porch_eligible">Porch eligible</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-sand/68">Privacy</label>
                <select
                  value={privacyMode}
                  onChange={(e) => setPrivacyMode(e.target.value as typeof privacyMode)}
                  className="w-full rounded-xl border border-sand/15 bg-white/[0.045] px-4 py-3 text-sand focus:border-ember/50 focus:outline-none focus:ring-1 focus:ring-ember/30"
                >
                  <option value="private_e2e">Private (E2E encrypted)</option>
                  <option value="open_plaintext">Open (plaintext)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm text-sand/68">Room rules</label>
                <textarea
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  placeholder="Speak slowly. Leave space. Step away kindly."
                  maxLength={1000}
                  className="w-full rounded-xl border border-sand/15 bg-white/[0.045] px-4 py-3 text-sand placeholder:text-sand/38 focus:border-ember/50 focus:outline-none focus:ring-1 focus:ring-ember/30"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !name.trim() || !topic.trim()}>
                {creating ? "Creating..." : "Create room"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {rooms.length === 0 && !showForm ? (
        <GentleEmptyState
          title="No rooms yet"
          description="Create a room to start a quiet conversation."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => router.push(`/hearth/${room.id}`)}
              className="lodge-surface page-enter block w-full cursor-pointer p-5 text-left transition-transform hover:-translate-y-0.5 hover:bg-white/[0.06]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl">{room.name}</h3>
                    {room.privacyMode === "private_e2e" ? (
                      <span className="inline-flex rounded-full border border-ember/40 bg-ember/10 px-2.5 py-0.5 text-xs text-sand">Private</span>
                    ) : (
                      <span className="inline-flex rounded-full border border-ember/40 bg-ember/10 px-2.5 py-0.5 text-xs text-sand">Open</span>
                    )}
                  </div>
                  {room.description && (
                    <p className="mt-2 max-w-2xl text-body text-sand/68">{room.description}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <MoodPill mood={room.mood} />
                <span className="rounded-full border border-sand/15 bg-white/[0.035] px-3 py-1 text-xs text-sand/68">{room.topic}</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-sand/15 bg-white/[0.035] px-3 py-1 text-xs text-sand/68">
                  <DoorOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  {room.memberCount}/{room.capacity}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}