import * as React from "react";
import { cn } from "./cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm text-sand outline-none transition-colors placeholder:text-sand/40 focus:border-ember/60 focus:ring-2 focus:ring-ember/40",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = "Input";