"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Library, ScrollText, ShieldCheck, Sprout, Trees, Keyboard, Sun, Moon } from "lucide-react";
import { cn } from "@tpt-hearth/ui";
import { useTheme } from "./ThemeProvider";

const navItems = [
  { href: "/", label: "Hearth", icon: Flame },
  { href: "/porch", label: "Porch", icon: Sprout },
  { href: "/embers", label: "Embers", icon: Flame },
  { href: "/grove", label: "Grove", icon: Trees },
  { href: "/letters", label: "Letters", icon: ScrollText },
  { href: "/chronicles", label: "Chronicles", icon: Library },
  { href: "/rituals", label: "Rituals", icon: Flame },
  { href: "/admin", label: "Admin", icon: ShieldCheck }
];

export function LodgeNav() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <nav aria-label="Lodge navigation" className="lodge-surface page-enter px-3 py-3 sm:px-4">
      <ul className="flex items-center gap-2 overflow-x-auto overscroll-x-contain scrollbar-thin scrollbar-track-transparent scrollbar-thumb-ember/30">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "group flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors",
                  isActive ? "bg-ember text-ash shadow-ember" : "text-sand/78 hover:bg-white/10 hover:text-sand"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="ml-auto flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={toggle}
            className="flex min-h-11 items-center gap-1.5 rounded-full px-3 py-2 text-xs text-sand/58 hover:bg-white/10 hover:text-sand transition-colors"
            title={theme === "dark" ? "Switch to warm light" : "Switch to warm dark"}
            aria-label={theme === "dark" ? "Switch to warm light theme" : "Switch to warm dark theme"}
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" aria-hidden="true" /> : <Moon className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
          <span
            className="flex min-h-11 cursor-default items-center gap-1.5 rounded-full px-3 py-2 text-xs text-sand/36"
            title="Press ? for keyboard shortcuts"
            aria-label="Press ? for keyboard shortcuts"
          >
            <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
            <kbd className="font-mono">?</kbd>
          </span>
        </li>
      </ul>
    </nav>
  );
}