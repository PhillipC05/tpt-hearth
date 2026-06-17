"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PwaStatus = {
  online: boolean;
  installable: boolean;
  /** Whether the service worker is actively controlling the page */
  swControlling: boolean;
};

const PwaStatusContext = createContext<PwaStatus | null>(null);

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [swControlling, setSwControlling] = useState(false);
  const swRegistered = useRef(false);

  useEffect(() => {
    async function registerServiceWorker() {
      if (!("serviceWorker" in navigator) || swRegistered.current) {
        return;
      }

      swRegistered.current = true;

      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

        setSwControlling(Boolean(registration.active));

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "activated") {
                setSwControlling(true);
              }
            });
          }
        });

        // Re-check controlling status if the page is already controlled
        if (navigator.serviceWorker.controller) {
          setSwControlling(true);
        }
      } catch {
        // The app shell remains usable without a registered service worker.
      }
    }

    registerServiceWorker();

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
    };
  }, []);

  const status = useMemo<PwaStatus>(
    () => ({ online, installable: Boolean(installPrompt), swControlling }),
    [installPrompt, online, swControlling]
  );

  return <PwaStatusContext.Provider value={status}>{children}</PwaStatusContext.Provider>;
}

export function usePwaStatus() {
  const context = useContext(PwaStatusContext);

  if (!context) {
    throw new Error("usePwaStatus must be used within PwaProvider");
  }

  return context;
}
