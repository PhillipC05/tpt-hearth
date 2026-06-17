"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export type KeyboardShortcut = {
  keys: string;
  description: string;
  action: () => void;
};

const NAV_SHORTCUTS: Array<{ chord: [string, string]; path: string; label: string }> = [
  { chord: ["g", "h"], path: "/hearth", label: "Go to Hearth" },
  { chord: ["g", "p"], path: "/porch", label: "Go to Porch" },
  { chord: ["g", "e"], path: "/embers", label: "Go to Embers" },
  { chord: ["g", "g"], path: "/grove", label: "Go to Grove" },
  { chord: ["g", "l"], path: "/letters", label: "Go to Letters" },
  { chord: ["g", "c"], path: "/chronicles", label: "Go to Chronicles" },
  { chord: ["g", "r"], path: "/rituals", label: "Go to Rituals" },
  { chord: ["g", "a"], path: "/admin", label: "Go to Admin" }
];

export const SHORTCUT_DESCRIPTIONS = [
  ...NAV_SHORTCUTS.map((s) => ({ keys: s.chord.join(" then "), description: s.label })),
  { keys: "?", description: "Show keyboard shortcuts" }
];

/**
 * Two-key chord navigation (e.g. g→h goes to /hearth).
 * Only fires when the user is not typing in an input, textarea, or contenteditable.
 */
export function useKeyboardNav(onShowHelp: () => void) {
  const router = useRouter();
  const pendingKey = useRef<string | null>(null);
  const chordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function isTyping(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target)) return;

      const key = event.key.toLowerCase();

      if (key === "?" || (event.shiftKey && event.key === "?")) {
        event.preventDefault();
        onShowHelp();
        return;
      }

      if (pendingKey.current === "g") {
        if (chordTimer.current) clearTimeout(chordTimer.current);
        pendingKey.current = null;

        const match = NAV_SHORTCUTS.find((s) => s.chord[0] === "g" && s.chord[1] === key);
        if (match) {
          event.preventDefault();
          router.push(match.path);
        }
        return;
      }

      if (key === "g") {
        event.preventDefault();
        pendingKey.current = "g";
        chordTimer.current = setTimeout(() => { pendingKey.current = null; }, 1500);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (chordTimer.current) clearTimeout(chordTimer.current);
    };
  }, [router, onShowHelp]);
}
