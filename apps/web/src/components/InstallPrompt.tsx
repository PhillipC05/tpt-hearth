"use client";

import { useState, useEffect } from "react";
import { cn } from "@tpt-hearth/ui";
import { Download } from "lucide-react";
import { usePwaStatus } from "./PwaProvider";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallPrompt() {
  const { installable } = usePwaStatus();
  const [dismissed, setDismissed] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as InstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  if (!installable || !deferredPrompt || dismissed) {
    return null;
  }

  return (
    <div
      className={cn(
        "page-enter lodge-surface fixed bottom-6 left-1/2 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 items-center gap-4 px-5 py-4 shadow-lg"
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ember/10 text-ember">
        <Download className="h-5 w-5" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-sand">Install tpt hearth</p>
        <p className="text-xs text-sand/68">
          Add to your home screen for a quieter, more present experience.
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        <button
          onClick={handleDismiss}
          className="rounded-full px-3 py-1.5 text-xs text-sand/68 transition-colors hover:bg-white/[0.08] hover:text-sand"
          aria-label="Dismiss install prompt"
        >
          Not now
        </button>
        <button
          onClick={handleInstall}
          className="rounded-full bg-ember px-4 py-1.5 text-xs font-medium text-ash transition-colors hover:bg-ember/90"
        >
          Install
        </button>
      </div>
    </div>
  );
}