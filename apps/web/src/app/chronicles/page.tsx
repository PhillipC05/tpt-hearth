"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Textarea } from "@tpt-hearth/ui";
import { getJson, postJson, deleteJson } from "@/lib/api";
import { GentleEmptyState } from "@/components";
import { Library, BookOpen, DoorOpen, ScrollText, Flame, FileText, Plus, Loader2, Trash2, PenLine } from "lucide-react";
import type { Chronicle, Room, Letter } from "@tpt-hearth/shared";

type ChronicleWithMeta = Chronicle & {
  rooms?: Room[];
  letters?: Letter[];
};

const chronicleKindIcons: Record<string, React.ReactNode> = {
  room: <DoorOpen className="h-4 w-4" />,
  letter: <ScrollText className="h-4 w-4" />,
  ritual: <Flame className="h-4 w-4" />,
  note: <FileText className="h-4 w-4" />
};

const chronicleKindLabels: Record<string, string> = {
  room: "Room",
  letter: "Letter",
  ritual: "Ritual",
  note: "Note"
};

export default function ChroniclesPage() {
  const router = useRouter();
  const [chronicles, setChronicles] = useState<ChronicleWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [kindFilter, setKindFilter] = useState<string | null>(null);

  // Create chronicle form
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"room" | "letter" | "ritual" | "note">("note");

  const fetchChronicles = useCallback(async () => {
    const result = await getJson<Chronicle[]>("/api/chronicles");
    if (result.ok) {
      setChronicles(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchChronicles();
  }, [fetchChronicles]);

  const handleCreateChronicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    const result = await postJson<Chronicle>("/api/chronicles", {
      kind,
      title: title.trim(),
      body: body.trim() || null,
      metadataJson: "{}"
    });

    if (result.ok) {
      setCreating(false);
      setTitle("");
      setBody("");
      setKind("note");
      fetchChronicles();
    }
    setSaving(false);
  };

  const handleDeleteChronicle = async (chronicleId: string) => {
    const result = await deleteJson(`/api/chronicles/${chronicleId}`);
    if (result.ok) {
      setChronicles((prev) => prev.filter((c) => c.id !== chronicleId));
    }
  };

  const filteredChronicles = kindFilter
    ? chronicles.filter((c) => c.kind === kindFilter)
    : chronicles;

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
            <h1 className="text-display">Chronicles</h1>
            <p className="mt-2 max-w-2xl text-body text-sand/68">
              Your private archive. Rooms inhabited, letters kept, ritual summaries, and personal notes.
            </p>
          </div>
          <Button onClick={() => setCreating(!creating)}>
            <Plus className="mr-2 h-4 w-4" />
            {creating ? "Cancel" : "New entry"}
          </Button>
        </div>
      </section>

      {/* Create form */}
      {creating && (
        <Card className="page-enter p-6">
          <form onSubmit={handleCreateChronicle} className="calm-stack">
            <h2 className="text-display-sm">New chronicle entry</h2>

            {/* Kind selector */}
            <div>
              <label className="mb-1 block text-sm text-sand/68">Kind</label>
              <div className="flex flex-wrap gap-2">
                {(["room", "letter", "ritual", "note"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${
                      kind === k
                        ? "bg-ember text-ash"
                        : "border border-sand/15 bg-white/[0.035] text-sand/68 hover:border-ember/30"
                    }`}
                  >
                    {chronicleKindIcons[k]}
                    {chronicleKindLabels[k]}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="mb-1 block text-sm text-sand/68">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="A memorable title..."
                maxLength={160}
                required
              />
            </div>

            {/* Body */}
            <div>
              <label className="mb-1 block text-sm text-sand/68">
                {kind === "note" ? "Notes" : kind === "room" ? "Reflections on this room" : kind === "letter" ? "Letter you kept" : "Ritual summary"}
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your reflections..."
                maxLength={100000}
                className="w-full min-h-[150px] rounded-xl border border-sand/15 bg-white/[0.045] px-4 py-3 text-sand placeholder:text-sand/38 focus:border-ember/50 focus:outline-none focus:ring-1 focus:ring-ember/30"
                rows={6}
              />
              <p className="mt-1 text-xs text-sand/48">{body.length}/100000 characters</p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                Discard
              </Button>
              <Button type="submit" disabled={saving || !title.trim()}>
                {saving ? "Saving..." : "Save to chronicles"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Kind filter pills */}
      <section className="page-enter flex flex-wrap gap-2">
        <button
          onClick={() => setKindFilter(null)}
          className={`rounded-full border px-4 py-1.5 text-xs tracking-wide transition-colors ${
            !kindFilter
              ? "border-ember/35 bg-ember/10 text-sand"
              : "border-sand/15 bg-white/[0.035] text-sand/68 hover:border-ember/25 hover:text-sand"
          }`}
        >
          All entries
        </button>
        {(["room", "letter", "ritual", "note"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKindFilter(kindFilter === k ? null : k)}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs tracking-wide transition-colors ${
              kindFilter === k
                ? "border-ember/35 bg-ember/10 text-sand"
                : "border-sand/15 bg-white/[0.035] text-sand/68 hover:border-ember/25 hover:text-sand"
            }`}
          >
            {chronicleKindIcons[k]}
            {chronicleKindLabels[k]}
          </button>
        ))}
      </section>

      {/* Chronicle entries */}
      {filteredChronicles.length === 0 ? (
        <GentleEmptyState
          title="Your chronicles are empty"
          description="Chronicles are your private archive. Save reflections on rooms you've inhabited, letters you've kept, rituals you've attended, or personal notes."
          icon={<Library className="h-6 w-6" />}
          action={
            <Button variant="outline" onClick={() => setCreating(true)}>
              Write your first entry
            </Button>
          }
        />
      ) : (
        <section className="section-stack">
          {filteredChronicles.map((chronicle) => (
            <div
              key={chronicle.id}
              className="lodge-surface page-enter p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-ember/30 bg-ember/10 px-2.5 py-0.5 text-xs text-sand">
                      {chronicleKindIcons[chronicle.kind]}
                      {chronicleKindLabels[chronicle.kind]}
                    </span>
                    <h3 className="text-lg font-serif">{chronicle.title}</h3>
                  </div>
                  <p className="mt-1 text-xs text-sand/48">
                    {new Date(chronicle.createdAt).toLocaleDateString([], {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteChronicle(chronicle.id)}
                  className="shrink-0 rounded-full p-2 text-sand/48 transition-colors hover:bg-red-900/20 hover:text-red-400"
                  aria-label="Delete chronicle entry"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {chronicle.bodyPlaintext && (
                <div className="mt-4 border-t border-sand/10 pt-4">
                  <p className="whitespace-pre-wrap text-body-sm text-sand/78">{chronicle.bodyPlaintext}</p>
                </div>
              )}

              {chronicle.metadataJson && chronicle.metadataJson !== "{}" && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-sand/48 hover:text-sand/68">
                    Metadata
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-white/[0.03] p-3 text-xs text-sand/48">
                    {JSON.stringify(JSON.parse(chronicle.metadataJson), null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </section>
      )}

      <GentleEmptyState
        title="A quiet library"
        description="Your chronicles are entirely private. They hold the rooms you've visited, the letters you've written, the rituals you've shared, and the notes only you will read."
        icon={<Library className="h-6 w-6" />}
      />
    </div>
  );
}