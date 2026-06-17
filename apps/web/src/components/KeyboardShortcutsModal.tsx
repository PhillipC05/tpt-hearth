"use client";

import { useEffect } from "react";
import { SHORTCUT_DESCRIPTIONS } from "@/lib/use-keyboard-nav";

export function KeyboardShortcutsModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ash/80 backdrop-blur-sm page-enter"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
    >
      <div
        className="lodge-surface mx-4 w-full max-w-sm rounded-3xl p-6 calm-stack"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl text-sand">Keyboard shortcuts</h2>
          <button
            onClick={onClose}
            className="rounded-full px-3 py-1 text-xs text-sand/58 hover:bg-white/10 hover:text-sand"
            aria-label="Close"
          >
            Esc
          </button>
        </div>

        <ul className="calm-stack">
          {SHORTCUT_DESCRIPTIONS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-sand/72">{s.description}</span>
              <kbd className="rounded-md border border-sand/15 bg-white/[0.06] px-2 py-0.5 font-mono text-xs text-sand/60 whitespace-nowrap">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>

        <p className="text-xs text-sand/42">
          Navigation chords start with <kbd className="font-mono">g</kbd>. Press the second key within 1.5 s.
        </p>
      </div>
    </div>
  );
}
