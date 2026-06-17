"use client";

import { useState } from "react";
import { LodgeNav } from "./LodgeNav";
import { InstallPrompt } from "./InstallPrompt";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";
import { usePwaStatus } from "./PwaProvider";
import { useKeyboardNav } from "@/lib/use-keyboard-nav";
import { WifiOff } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { online } = usePwaStatus();
  const [showShortcuts, setShowShortcuts] = useState(false);
  useKeyboardNav(() => setShowShortcuts(true));

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <span className="ember-orb left-[-8rem] top-[-8rem]" />
        <span className="ember-orb right-[-10rem] top-24 opacity-60" />
        <span className="ember-orb bottom-[-12rem] left-1/3 h-24 w-24 opacity-40" />
      </div>

      <InstallPrompt />
      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {/* Offline indicator — gentle, no red badges */}
      {!online && (
        <div
          className="page-enter fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-ash/90 px-4 py-2 text-xs text-sand/68 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
          <span>You're offline. Composing and saved drafts are still available.</span>
        </div>
      )}

      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <LodgeNav />
        <main className="flex-1 py-2 sm:py-4">{children}</main>
        <footer className="py-4 text-center text-xs text-sand/42">
          Come sit. Stay awhile. Just be.
        </footer>
      </div>
    </div>
  );
}
