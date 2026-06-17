import { cn } from "@tpt-hearth/ui";

type MoodTone = "ember" | "pine" | "sand" | "ash";

type MoodPillProps = {
  mood: string;
  tone?: MoodTone;
  className?: string;
};

const toneClasses: Record<MoodTone, string> = {
  ember: "border-ember/35 bg-ember/10 text-sand",
  pine: "border-pine/45 bg-pine/25 text-sand",
  sand: "border-sand/35 bg-sand/10 text-sand",
  ash: "border-white/10 bg-white/[0.045] text-sand/78"
};

export function MoodPill({ mood, tone = "ember", className }: MoodPillProps) {
  return (
    <span className={cn("rounded-full border px-3 py-1 text-xs tracking-wide", toneClasses[tone], className)}>
      {mood}
    </span>
  );
}