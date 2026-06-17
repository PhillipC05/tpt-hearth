"use client";

import { cn } from "@tpt-hearth/ui";

type PresenceTone = "warm" | "quiet" | "pine";

type PresenceIndicatorProps = {
  count?: number;
  label?: string;
  tone?: PresenceTone;
  className?: string;
};

const toneClasses: Record<PresenceTone, string> = {
  warm: "border-ember/35 bg-ember/10 text-sand",
  quiet: "border-sand/20 bg-white/[0.035] text-sand/62",
  pine: "border-pine/45 bg-pine/25 text-sand"
};

export function PresenceIndicator({ count, label, tone = "warm", className }: PresenceIndicatorProps) {
  const text = label ?? (count === undefined ? "Quiet for now" : count === 1 ? "1 person present" : `${count} people present`);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs transition-opacity",
        toneClasses[tone],
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-slow-pulse rounded-full bg-ember" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-ember" />
      </span>
      <span>{text}</span>
    </span>
  );
}