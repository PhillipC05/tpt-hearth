import { cn } from "@tpt-hearth/ui";
import { Flame } from "lucide-react";

type GentleEmptyStateProps = {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

export function GentleEmptyState({ title, description, icon, action, className }: GentleEmptyStateProps) {
  return (
    <section className={cn("lodge-surface page-enter p-8 text-center sm:p-10", className)}>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ember/10 text-ember shadow-ember">
        {icon ?? <Flame className="h-6 w-6" aria-hidden="true" />}
      </div>
      <h2 className="mt-5 text-display-sm">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-body">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </section>
  );
}