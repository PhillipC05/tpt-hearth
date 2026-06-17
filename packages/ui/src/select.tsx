import * as React from "react";
import { cn } from "./cn";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, ...props }, ref) => {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm text-sand outline-none transition-colors focus:border-ember/60 focus:ring-2 focus:ring-ember/40",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Select.displayName = "Select";