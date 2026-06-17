"use client";

import { useEffect, useState, useCallback } from "react";
import { Button, Card, Input, Textarea } from "@tpt-hearth/ui";
import { getJson, postJson } from "@/lib/api";
import { GentleEmptyState } from "@/components";
import { Flame, Calendar, Clock, BookOpen, Plus, Loader2, ChevronDown, ChevronUp, FileText } from "lucide-react";
import type { Ritual, Room } from "@tpt-hearth/shared";

type RitualWithMeta = Ritual & {
  roomName?: string | null;
  isPast?: boolean;
};

export default function RitualsPage() {
  const [rituals, setRituals] = useState<RitualWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedRitual, setExpandedRitual] = useState<string | null>(null);
  const [editingSummary, setEditingSummary] = useState<string | null>(null);
  const [summaryText, setSummaryText] = useState("");
  const [summarySaving, setSummarySaving] = useState(false);

  // Create form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [roomId, setRoomId] = useState("");

  // Available rooms
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);

  const fetchRituals = useCallback(async () => {
    const result = await getJson<Ritual[]>("/api/rituals");
    if (result.ok) {
      const now = new Date().toISOString();
      setRituals(
        result.data.map((r) => ({
          ...r,
          isPast: r.startsAt < now
        }))
      );
    }
    setLoading(false);
  }, []);

  const fetchRooms = useCallback(async () => {
    const result = await getJson<Room[]>("/api/rooms");
    if (result.ok) {
      setAvailableRooms(result.data);
    }
  }, []);

  useEffect(() => {
    fetchRituals();
    fetchRooms();
  }, [fetchRituals, fetchRooms]);

  const handleCreateRitual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !startsAt) return;

    setSaving(true);
    const result = await postJson<Ritual>("/api/rituals", {
      title: title.trim(),
      description: description.trim(),
      startsAt: new Date(startsAt).toISOString(),
      roomId: roomId.trim() || null
    });

    if (result.ok) {
      setCreating(false);
      setTitle("");
      setDescription("");
      setStartsAt("");
      setRoomId("");
      fetchRituals();
    }
    setSaving(false);
  };

  const handleSaveSummary = async (ritualId: string) => {
    if (!summaryText.trim()) return;
    setSummarySaving(true);
    const result = await postJson(`/api/rituals/${ritualId}/summary`, {
      summary: summaryText.trim()
    });
    if (result.ok) {
      setEditingSummary(null);
      setSummaryText("");
      fetchRituals();
    }
    setSummarySaving(false);
  };

  const upcomingRituals = rituals.filter((r) => !r.isPast);
  const pastRituals = rituals.filter((r) => r.isPast);

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
            <h1 className="text-display">Rituals</h1>
            <p className="mt-2 max-w-2xl text-body text-sand/68">
              Optional user-hosted gatherings. Storytelling circles, philosophy salons, poetry readings, and quiet game nights.
            </p>
          </div>
          <Button onClick={() => setCreating(!creating)}>
            <Plus className="mr-2 h-4 w-4" />
            {creating ? "Cancel" : "Create ritual"}
          </Button>
        </div>
      </section>

      {/* Create form */}
      {creating && (
        <Card className="page-enter p-6">
          <form onSubmit={handleCreateRitual} className="calm-stack">
            <h2 className="text-display-sm">New ritual</h2>

            <div>
              <label className="mb-1 block text-sm text-sand/68">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Evening Poetry Reading"
                maxLength={160}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-sand/68">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A quiet evening of shared poetry. Bring a verse that moves you."
                maxLength={2000}
                className="w-full min-h-[100px] rounded-xl border border-sand/15 bg-white/[0.045] px-4 py-3 text-sand placeholder:text-sand/38 focus:border-ember/50 focus:outline-none focus:ring-1 focus:ring-ember/30"
                rows={4}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-sand/68">Date and time</label>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-sand/68">Associated room (optional)</label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full rounded-xl border border-sand/15 bg-white/[0.045] px-4 py-3 text-sand focus:border-ember/50 focus:outline-none focus:ring-1 focus:ring-ember/30"
              >
                <option value="">No room</option>
                {availableRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                Discard
              </Button>
              <Button type="submit" disabled={saving || !title.trim() || !description.trim() || !startsAt}>
                {saving ? "Creating..." : "Create ritual"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Upcoming rituals */}
      <section>
        <h2 className="text-display-sm flex items-center gap-2">
          <Calendar className="h-5 w-5 text-ember" />
          Upcoming
        </h2>
        {upcomingRituals.length === 0 ? (
          <GentleEmptyState
            title="No upcoming rituals"
            description="Rituals are optional gatherings hosted by users. Create one to invite others to a storytelling circle, salon, or quiet gathering."
            icon={<Flame className="h-6 w-6" />}
            action={
              <Button variant="outline" onClick={() => setCreating(true)}>
                Host a ritual
              </Button>
            }
          />
        ) : (
          <div className="section-stack mt-4">
            {upcomingRituals.map((ritual) => (
              <div key={ritual.id} className="lodge-surface page-enter p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4 text-ember" />
                      <h3 className="text-lg font-serif">{ritual.title}</h3>
                    </div>
                    <p className="mt-1 text-sm text-sand/68">{ritual.description}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-sand/48">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(ritual.startsAt).toLocaleDateString([], {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                      {ritual.roomName && (
                        <span>Room: {ritual.roomName}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Past rituals with summaries */}
      {pastRituals.length > 0 && (
        <section>
          <h2 className="text-display-sm flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-ember" />
            Past rituals
          </h2>
          <div className="section-stack mt-4">
            {pastRituals.map((ritual) => {
              const isExpanded = expandedRitual === ritual.id;
              const isEditingSummary = editingSummary === ritual.id;

              return (
                <div key={ritual.id} className="lodge-surface page-enter p-5">
                  <button
                    onClick={() => setExpandedRitual(isExpanded ? null : ritual.id)}
                    className="flex w-full items-start justify-between gap-4 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-sand/48" />
                        <h3 className="text-lg font-serif">{ritual.title}</h3>
                      </div>
                      <p className="mt-1 text-xs text-sand/48">
                        {new Date(ritual.startsAt).toLocaleDateString([], {
                          month: "long",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </p>
                      {ritual.summary && (
                        <p className="mt-2 text-sm text-sand/68 line-clamp-2">{ritual.summary}</p>
                      )}
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0 text-sand/48" /> : <ChevronDown className="h-4 w-4 shrink-0 text-sand/48" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-4 border-t border-sand/10 pt-4">
                      {ritual.summary ? (
                        <div>
                          <p className="whitespace-pre-wrap text-body-sm text-sand/78">{ritual.summary}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-3"
                            onClick={() => {
                              setEditingSummary(ritual.id);
                              setSummaryText(ritual.summary ?? "");
                            }}
                          >
                            Edit summary
                          </Button>
                        </div>
                      ) : (
                        <div>
                          {isEditingSummary ? (
                            <div className="calm-stack">
                              <label className="text-sm text-sand/68">Gentle summary for those who could not attend</label>
                              <textarea
                                value={summaryText}
                                onChange={(e) => setSummaryText(e.target.value)}
                                placeholder="Write a gentle summary of what happened..."
                                maxLength={10000}
                                className="w-full min-h-[120px] rounded-xl border border-sand/15 bg-white/[0.045] px-4 py-3 text-sand placeholder:text-sand/38 focus:border-ember/50 focus:outline-none focus:ring-1 focus:ring-ember/30"
                                rows={5}
                              />
                              <div className="flex gap-2 justify-end">
                                <Button variant="ghost" size="sm" onClick={() => setEditingSummary(null)}>
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveSummary(ritual.id)}
                                  disabled={summarySaving || !summaryText.trim()}
                                >
                                  {summarySaving ? "Saving..." : "Save summary"}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingSummary(ritual.id);
                                setSummaryText("");
                              }}
                            >
                              <FileText className="mr-2 h-3 w-3" />
                              Add gentle summary
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Empty state for all rituals */}
      {rituals.length === 0 && !creating && (
        <GentleEmptyState
          title="No rituals yet"
          description="Rituals are optional user-hosted gatherings with calendar-like clarity but no obligation."
          icon={<Flame className="h-6 w-6" />}
        />
      )}
    </div>
  );
}