"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@tpt-hearth/ui";
import { getJson } from "@/lib/api";
import { GentleEmptyState, MoodPill } from "@/components";
import { Flame, Headphones, TvMinimal, Users, Music, CloudRain, BookOpen, Moon, Sun, Waves, Loader2 } from "lucide-react";
import type { Room } from "@tpt-hearth/shared";

type EmberRoom = Room & { memberCount: number };

const moodRooms: Array<{
  id: string;
  name: string;
  description: string;
  mood: string;
  topic: string;
  audioLoop: string;
  visual: string;
  icon: React.ReactNode;
}> = [
  {
    id: "embers-rain",
    name: "Rain in Wellington",
    description: "Soft rain against the window. A blanket. A warm drink.",
    mood: "Rainy",
    topic: "Ambient weather",
    audioLoop: "https://cdn.example.com/audio/rain-wellington.mp3",
    visual: "rain",
    icon: <CloudRain className="h-5 w-5" />
  },
  {
    id: "embers-fireplace",
    name: "Quiet Fireplace",
    description: "Crackling fire. Dim light. No words needed.",
    mood: "Warm",
    topic: "Fire & embers",
    audioLoop: "https://cdn.example.com/audio/fireplace.mp3",
    visual: "fireplace",
    icon: <Flame className="h-5 w-5" />
  },
  {
    id: "embers-reading",
    name: "Synchronized Reading Hour",
    description: "Everyone reads their own book. Together in silence.",
    mood: "Focused",
    topic: "Quiet reading",
    audioLoop: "https://cdn.example.com/audio/reading-hour.mp3",
    visual: "library",
    icon: <BookOpen className="h-5 w-5" />
  },
  {
    id: "embers-music",
    name: "Gentle Music Channel",
    description: "Soft instrumental music. Come and go as you please.",
    mood: "Melodic",
    topic: "Ambient music",
    audioLoop: "https://cdn.example.com/audio/gentle-music.mp3",
    visual: "vinyl",
    icon: <Music className="h-5 w-5" />
  },
  {
    id: "embers-coastal",
    name: "Coastal Morning",
    description: "Waves lapping the shore. Seagulls in the distance.",
    mood: "Coastal",
    topic: "Ocean sounds",
    audioLoop: "https://cdn.example.com/audio/coastal-morning.mp3",
    visual: "coast",
    icon: <Waves className="h-5 w-5" />
  },
  {
    id: "embers-dusk",
    name: "Twilight Garden",
    description: "Crickets at dusk. Warm earth. Fading light.",
    mood: "Dusk",
    topic: "Evening garden",
    audioLoop: "https://cdn.example.com/audio/twilight-garden.mp3",
    visual: "garden",
    icon: <Moon className="h-5 w-5" />
  }
];

export default function EmbersPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<EmberRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAudio, setActiveAudio] = useState<string | null>(null);
  const [activeVisual, setActiveVisual] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    const result = await getJson<EmberRoom[]>("/api/rooms");
    if (result.ok) {
      setRooms(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const emberRooms = rooms.filter((r) => r.mood.toLowerCase().includes("embers") || r.visibility === "link_only");

  const filteredMoodRooms = selectedMood
    ? moodRooms.filter((r) => r.mood.toLowerCase() === selectedMood.toLowerCase())
    : moodRooms;

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
            <h1 className="text-display">Embers</h1>
            <p className="mt-2 max-w-2xl text-body text-sand/68">
              Ambient co-presence spaces. Sit quietly. No conversation required.
            </p>
          </div>
        </div>
      </section>

      {/* Mood filter pills */}
      <section className="page-enter flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedMood(null)}
          className={`rounded-full border px-4 py-1.5 text-xs tracking-wide transition-colors ${
            !selectedMood
              ? "border-ember/35 bg-ember/10 text-sand"
              : "border-sand/15 bg-white/[0.035] text-sand/68 hover:border-ember/25 hover:text-sand"
          }`}
        >
          All moods
        </button>
        {["Rainy", "Warm", "Focused", "Melodic", "Coastal", "Dusk"].map((mood) => (
          <button
            key={mood}
            onClick={() => setSelectedMood(mood === selectedMood ? null : mood)}
            className={`rounded-full border px-4 py-1.5 text-xs tracking-wide transition-colors ${
              selectedMood === mood
                ? "border-ember/35 bg-ember/10 text-sand"
                : "border-sand/15 bg-white/[0.035] text-sand/68 hover:border-ember/25 hover:text-sand"
            }`}
          >
            {mood}
          </button>
        ))}
      </section>

      {/* Ambient mood rooms */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredMoodRooms.map((moodRoom) => (
          <Card key={moodRoom.id} className="page-enter p-5">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ember/10 text-ember">
                  {moodRoom.icon}
                </div>
                <MoodPill mood={moodRoom.mood} />
              </div>

              <div>
                <h3 className="text-xl">{moodRoom.name}</h3>
                <p className="mt-1 text-sm text-sand/68">{moodRoom.description}</p>
              </div>

              {/* Visual atmosphere indicator */}
              <div className="flex items-center gap-3 rounded-xl border border-sand/15 bg-white/[0.035] px-3 py-2">
                <TvMinimal className="h-4 w-4 text-sand/48" />
                <span className="text-xs text-sand/68 capitalize">{moodRoom.visual} atmosphere</span>
              </div>

              {/* Audio loop toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveAudio(activeAudio === moodRoom.id ? null : moodRoom.id)}
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition-colors ${
                    activeAudio === moodRoom.id
                      ? "bg-ember text-ash"
                      : "border border-sand/15 bg-white/[0.035] text-sand/68 hover:border-ember/30"
                  }`}
                >
                  <Headphones className="h-3.5 w-3.5" />
                  {activeAudio === moodRoom.id ? "Playing" : "Audio loop"}
                </button>
              </div>

              {/* Presence & enter */}
              <div className="flex items-center justify-between border-t border-sand/10 pt-3">
                <div className="flex items-center gap-1.5 text-xs text-sand/48">
                  <Users className="h-3.5 w-3.5" />
                  <span>present</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => router.push(`/hearth/${moodRoom.id}`)}
                >
                  Enter
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </section>

      {/* Your active ember rooms */}
      {emberRooms.length > 0 && (
        <section>
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-display-sm">Your ember rooms</h2>
              <p className="mt-1 text-sm text-sand/68">
                Rooms you've created or joined with an ember mood.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {emberRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => router.push(`/hearth/${room.id}`)}
                className="lodge-surface page-enter block w-full cursor-pointer p-5 text-left transition-transform hover:-translate-y-0.5 hover:bg-white/[0.06]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-xl">{room.name}</h3>
                    {room.description && (
                      <p className="mt-1 text-sm text-sand/68">{room.description}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <MoodPill mood={room.mood} />
                  <span className="text-xs text-sand/48">{room.topic}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <GentleEmptyState
        title="Just be"
        description="Embers are for sitting quietly with others. No performance. No conversation required. The embers glow whether you speak or not."
        icon={<Flame className="h-6 w-6" />}
      />
    </div>
  );
}