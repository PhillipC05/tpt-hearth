"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@tpt-hearth/ui";
import { getJson, postJson } from "@/lib/api";
import { GentleEmptyState, MoodPill } from "@/components";
import { Sprout, Clock, ArrowRight, ArrowLeft, Loader2, Sparkles, LogOut } from "lucide-react";
import type { PorchSession, Room, PorchMode } from "@tpt-hearth/shared";

type PorchSessionSummary = PorchSession & {
  room: Pick<Room, "id" | "name" | "mood" | "topic" | "visibility" | "privacyMode" | "stewardId" | "archivedAt">;
};

const DURATION_MINUTES = 20;
const EXTEND_DURATION_MINUTES = 20;

export default function PorchPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<PorchSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [mode, setMode] = useState<PorchMode>("open_lobby");
  const [currentSession, setCurrentSession] = useState<PorchSessionSummary | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [extending, setExtending] = useState(false);
  const [exchangingEmbers, setExchangingEmbers] = useState(false);
  const [steppingAway, setSteppingAway] = useState(false);

  const fetchSessions = useCallback(async () => {
    const result = await getJson<PorchSessionSummary[]>("/api/porch/sessions");
    if (result.ok) {
      setSessions(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Timer for active session
  useEffect(() => {
    if (!currentSession) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const remaining = new Date(currentSession.endsAt).getTime() - Date.now();
      if (remaining <= 0) {
        setTimeLeft(0);
        setCurrentSession(null);
      } else {
        setTimeLeft(remaining);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1_000);
    return () => clearInterval(interval);
  }, [currentSession]);

  const formatTimeLeft = (ms: number): string => {
    const minutes = Math.floor(ms / 60_000);
    const seconds = Math.floor((ms % 60_000) / 1_000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleSitForAWhile = async () => {
    setCreating(true);
    const result = await postJson<PorchSessionSummary>("/api/porch/sessions", {
      mode,
      durationMinutes: DURATION_MINUTES
    });

    if (result.ok) {
      setCurrentSession(result.data);
      setSessions((prev) => [...prev, result.data]);
    }
    setCreating(false);
  };

  const handleJoin = async (sessionId: string) => {
    const result = await postJson<PorchSessionSummary>(`/api/porch/sessions/${sessionId}/join`, {});
    if (result.ok) {
      setCurrentSession(result.data);
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? result.data : s)));
    }
  };

  const handleStayLonger = async () => {
    if (!currentSession) return;
    setExtending(true);
    const result = await postJson<PorchSessionSummary>(
      `/api/porch/sessions/${currentSession.id}/extend`,
      { durationMinutes: EXTEND_DURATION_MINUTES }
    );
    if (result.ok) {
      setCurrentSession(result.data);
    }
    setExtending(false);
  };

  const handleExchangeEmbers = async () => {
    if (!currentSession) return;
    setExchangingEmbers(true);
    const result = await postJson<PorchSessionSummary>(
      `/api/porch/sessions/${currentSession.id}/exchange-embers`,
      {}
    );
    if (result.ok) {
      setCurrentSession(null);
    }
    setExchangingEmbers(false);
  };

  const handleStepAway = async () => {
    if (!currentSession) return;
    setSteppingAway(true);
    const result = await postJson<PorchSessionSummary>(
      `/api/porch/sessions/${currentSession.id}/leave`,
      {}
    );
    if (result.ok) {
      setCurrentSession(null);
    }
    setSteppingAway(false);
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
            <h1 className="text-display">Porch</h1>
            <p className="mt-2 max-w-2xl text-body text-sand/68">
              A temporary place for gentle first meetings. No pressure. Kind exits are welcome.
            </p>
          </div>
        </div>
      </section>

      {/* Active session */}
      {currentSession ? (
        <Card className="page-enter p-6">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="rounded-full bg-pine/20 p-4">
              <Sprout className="h-8 w-8 text-pine-300" />
            </div>
            <div>
              <h2 className="text-display-sm">You're sitting on the porch</h2>
              <p className="mt-2 text-body text-sand/68">
                Room: {currentSession.room.name}
              </p>
            </div>

            {timeLeft !== null && (
              <div className="flex items-center gap-3 text-4xl font-serif text-ember">
                <Clock className="h-8 w-8" />
                <span>{formatTimeLeft(timeLeft)}</span>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={handleStayLonger} disabled={extending}>
                <ArrowRight className="mr-2 h-4 w-4" />
                {extending ? "Extending..." : "Stay longer"}
              </Button>
              <Button variant="outline" onClick={handleExchangeEmbers} disabled={exchangingEmbers}>
                <Sparkles className="mr-2 h-4 w-4" />
                {exchangingEmbers ? "Exchanging..." : "Exchange embers"}
              </Button>
              <Button variant="ghost" onClick={handleStepAway} disabled={steppingAway}>
                <LogOut className="mr-2 h-4 w-4" />
                {steppingAway ? "Stepping away..." : "Step away"}
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/hearth/${currentSession.room.id}`)}
              >
                Go to room
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="page-enter p-6">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="rounded-full bg-ember/10 p-4">
              <Sprout className="h-8 w-8 text-ember" />
            </div>
            <div>
              <h2 className="text-display-sm">Sit for a while</h2>
              <p className="mt-2 max-w-lg text-body text-sand/68">
                Set a timer for {DURATION_MINUTES} minutes. Someone may join you. If they don't, the
                quiet is yours. You can always stay longer or step away.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-sand/68">Matching mode:</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as PorchMode)}
                className="rounded-xl border border-sand/15 bg-white/[0.045] px-4 py-2 text-sand focus:border-ember/50 focus:outline-none focus:ring-1 focus:ring-ember/30"
              >
                <option value="open_lobby">Open lobby</option>
                <option value="random_matching">Random matching</option>
              </select>
            </div>

            <Button size="lg" onClick={handleSitForAWhile} disabled={creating}>
              <Sprout className="mr-2 h-5 w-5" />
              {creating ? "Finding a spot..." : "Sit for a while"}
            </Button>
          </div>
        </Card>
      )}

      {/* Available sessions */}
      <section>
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-display-sm">Others on the porch</h2>
            <p className="mt-1 text-sm text-sand/68">
              Open sessions waiting for company.
            </p>
          </div>
        </div>

        {sessions.length === 0 ? (
          <GentleEmptyState
            title="No one else is sitting"
            description="Start a session and someone may join you."
          />
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {sessions
              .filter((s) => s.status === "waiting" || s.status === "active")
              .map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleJoin(session.id)}
                  disabled={currentSession !== null}
                  className="lodge-surface page-enter block w-full cursor-pointer p-5 text-left transition-transform hover:-translate-y-0.5 hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl">{session.room.name}</h3>
                        <MoodPill mood={session.room.mood} />
                      </div>
                      <p className="mt-2 text-sm text-sand/68">
                        {session.status === "waiting" ? "Waiting for company..." : "Active"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-sm text-sand/48">
                      <div>{new Date(session.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-sand/48">
                    <Clock className="h-3.5 w-3.5" />
                    {session.status === "waiting" ? (
                      <span>Waiting</span>
                    ) : (
                      <span>Active until {new Date(session.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    )}
                  </div>
                </button>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}