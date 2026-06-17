import Link from "next/link";
import { DoorOpen, Lock, Users } from "lucide-react";
import { cn } from "@tpt-hearth/ui";
import type { RoomPrivacyMode, RoomVisibility } from "@tpt-hearth/shared";
import { MoodPill } from "./MoodPill";
import { PresenceIndicator } from "./PresenceIndicator";

type RoomCardRoom = {
  id: string;
  name: string;
  description: string;
  mood: string;
  topic: string;
  privacyMode: RoomPrivacyMode;
  visibility: RoomVisibility;
  capacity: 12;
  presenceCount?: number;
};

type RoomCardProps = {
  room: RoomCardRoom;
  href?: string;
  className?: string;
};

const privacyLabels: Record<RoomPrivacyMode, string> = {
  private_e2e: "Private E2E",
  open_plaintext: "Open room"
};

const visibilityLabels: Record<RoomVisibility, string> = {
  private_invite_only: "Invite only",
  link_only: "Link only",
  open_directory: "In Grove",
  open_porch_eligible: "Porch eligible"
};

export function RoomCard({ room, href = `/rooms/${room.id}`, className }: RoomCardProps) {
  const presenceCount = room.presenceCount ?? Math.max(0, Math.min(room.capacity, 3));

  return (
    <Link
      href={href}
      className={cn(
        "lodge-surface page-enter block p-5 transition-transform hover:-translate-y-0.5 hover:bg-white/[0.06]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-2xl">{room.name}</h3>
            {room.privacyMode === "private_e2e" ? (
              <Lock className="h-4 w-4 text-ember/80" aria-label="Private room" />
            ) : (
              <DoorOpen className="h-4 w-4 text-pine-300" aria-label="Open room" />
            )}
          </div>
          <p className="mt-2 max-w-2xl text-body">{room.description}</p>
        </div>
        <PresenceIndicator count={presenceCount} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <MoodPill mood={room.mood} />
        <span className="rounded-full border border-sand/15 bg-white/[0.035] px-3 py-1 text-xs text-sand/68">{room.topic}</span>
        <span className="rounded-full border border-sand/15 bg-white/[0.035] px-3 py-1 text-xs text-sand/68">
          {visibilityLabels[room.visibility]}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-sand/15 bg-white/[0.035] px-3 py-1 text-xs text-sand/68">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          {presenceCount}/{room.capacity}
        </span>
        <span className="rounded-full border border-sand/15 bg-white/[0.035] px-3 py-1 text-xs text-sand/68">
          {privacyLabels[room.privacyMode]}
        </span>
      </div>
    </Link>
  );
}