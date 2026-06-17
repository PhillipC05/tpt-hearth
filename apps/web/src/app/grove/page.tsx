"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@tpt-hearth/ui";
import { getJson } from "@/lib/api";
import { GentleEmptyState, MoodPill } from "@/components";
import { Trees, Search, DoorOpen, Loader2 } from "lucide-react";
import type { Room } from "@tpt-hearth/shared";

type GroveRoom = Room & { memberCount: number };

export default function GrovePage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<GroveRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [moodFilter, setMoodFilter] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const fetchGrove = useCallback(async (query?: string, mood?: string | null) => {
    setSearching(true);
    const params = new URLSearchParams();
    if (query?.trim()) params.set("q", query.trim());
    if (mood) params.set("mood", mood);
    const qs = params.toString();
    const result = await getJson<GroveRoom[]>(`/api/grove${qs ? `?${qs}` : ""}`);
    if (result.ok) {
      setRooms(result.data);
    }
    setSearching(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGrove();
  }, [fetchGrove]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGrove(searchQuery, moodFilter);
  };

  const handleMoodClick = (mood: string) => {
    const next = mood === moodFilter ? null : mood;
    setMoodFilter(next);
    fetchGrove(searchQuery, next);
  };

  // Extract unique moods from rooms
  const moods = [...new Set(rooms.map((r) => r.mood))].sort();

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
            <h1 className="text-display">Grove</h1>
            <p className="mt-2 max-w-2xl text-body text-sand/68">
              Open rooms. No ranking. No popularity. Just rooms waiting for company.
            </p>
          </div>
        </div>
      </section>

      {/* Search */}
      <section className="page-enter">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sand/48" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by mood, topic, or room name..."
              className="pl-11"
            />
          </div>
          <Button type="submit" disabled={searching}>
            {searching ? "Searching..." : "Search"}
          </Button>
        </form>
      </section>

      {/* Mood filters */}
      {moods.length > 0 && (
        <section className="page-enter flex flex-wrap gap-2">
          <button
            onClick={() => handleMoodClick("")}
            className={`rounded-full border px-4 py-1.5 text-xs tracking-wide transition-colors ${
              !moodFilter
                ? "border-ember/35 bg-ember/10 text-sand"
                : "border-sand/15 bg-white/[0.035] text-sand/68 hover:border-ember/25 hover:text-sand"
            }`}
          >
            All moods
          </button>
          {moods.map((mood) => (
            <button
              key={mood}
              onClick={() => handleMoodClick(mood)}
              className={`rounded-full border px-4 py-1.5 text-xs tracking-wide transition-colors ${
                moodFilter === mood
                  ? "border-ember/35 bg-ember/10 text-sand"
                  : "border-sand/15 bg-white/[0.035] text-sand/68 hover:border-ember/25 hover:text-sand"
              }`}
            >
              {mood}
            </button>
          ))}
        </section>
      )}

      {/* Results */}
      {searching ? (
        <div className="flex min-h-[20vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-ember" />
        </div>
      ) : rooms.length === 0 ? (
        <GentleEmptyState
          title="No open rooms found"
          description={
            searchQuery || moodFilter
              ? "Try a different search term or mood. Only rooms with open visibility appear here."
              : "No rooms are currently listed in the Grove. Open rooms will appear here when created."
          }
          icon={<Trees className="h-6 w-6" />}
        />
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => router.push(`/hearth/${room.id}`)}
              className="lodge-surface page-enter block w-full cursor-pointer p-5 text-left transition-transform hover:-translate-y-0.5 hover:bg-white/[0.06]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-xl">{room.name}</h3>
                  {room.description && (
                    <p className="mt-1 text-sm text-sand/68 line-clamp-2">{room.description}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <MoodPill mood={room.mood} />
                <span className="rounded-full border border-sand/15 bg-white/[0.035] px-3 py-1 text-xs text-sand/68">
                  {room.topic}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-sand/15 bg-white/[0.035] px-3 py-1 text-xs text-sand/68">
                  <DoorOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  {room.memberCount}/{room.capacity}
                </span>
              </div>
            </button>
          ))}
        </section>
      )}

      <GentleEmptyState
        title="No algorithms here"
        description="Rooms are ordered by creation time only. No ranking, no popularity, no engagement metrics. Find a room that feels right."
        icon={<Trees className="h-6 w-6" />}
      />
    </div>
  );
}