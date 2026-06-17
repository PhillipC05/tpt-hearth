import * as React from "react";
import { cn } from "./cn";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-flex rounded-full border border-ember/40 bg-ember/10 px-3 py-1 text-xs text-sand", className)} {...props} />;
}