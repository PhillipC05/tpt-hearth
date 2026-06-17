import { Button } from "@tpt-hearth/ui";
import { GentleEmptyState, MoodPill, RoomCard } from "@/components";

const demoRooms = [
  {
    id: "quiet-hearth",
    name: "Quiet Hearth",
    description: "A soft room for low-pressure conversation and sitting together.",
    mood: "Gentle",
    topic: "Presence",
    privacyMode: "private_e2e" as const,
    visibility: "open_directory" as const,
    capacity: 12 as const,
    presenceCount: 3
  },
  {
    id: "porch-sitting",
    name: "Porch Sitting",
    description: "A brief open session for meeting someone without urgency.",
    mood: "Open",
    topic: "New company",
    privacyMode: "open_plaintext" as const,
    visibility: "open_porch_eligible" as const,
    capacity: 12 as const,
    presenceCount: 2
  }
];

export default function HomePage() {
  return (
    <div className="section-stack">
      <section className="lodge-surface page-enter p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <MoodPill mood="A quiet digital lodge" tone="sand" />
            <h1 className="mt-4 text-display-lg">Come sit. Stay awhile. Just be.</h1>
            <p className="mt-4 max-w-2xl text-body-lg">
              tpt hearth is a calm web shell for rooms, letters, rituals, and presence without the noise of engagement-first social apps.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg">Enter the hearth</Button>
              <Button variant="outline" size="lg">
                Browse the grove
              </Button>
            </div>
          </div>

          <div className="rounded-4xl border border-sand/15 bg-white/[0.04] p-5">
            <h2 className="text-display-sm">Tonight in the lodge</h2>
            <div className="mt-4 grid gap-3">
              <div className="flex items-center justify-between gap-4 rounded-3xl bg-white/[0.045] p-4">
                <div>
                  <p className="text-sm text-sand/68">Rooms open</p>
                  <p className="font-serif text-2xl text-sand">2</p>
                </div>
                <div>
                  <p className="text-sm text-sand/68">Mood</p>
                  <p className="font-serif text-2xl text-sand">Gentle</p>
                </div>
                <div>
                  <p className="text-sm text-sand/68">Notifications</p>
                  <p className="font-serif text-2xl text-sand">Off</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-stack">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-display">Hearth rooms</h2>
            <p className="mt-2 max-w-2xl">Small rooms, clear moods, and no pressure to perform.</p>
          </div>
          <Button variant="ghost">View all rooms</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {demoRooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      </section>

      <GentleEmptyState
        title="No urgent notices here"
        description="The shell is ready for cached visits, gentle presence, and local drafts. Notifications stay off unless you choose otherwise."
      />
    </div>
  );
}