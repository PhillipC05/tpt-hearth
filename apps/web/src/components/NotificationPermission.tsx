"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@tpt-hearth/ui";
import { Bell, BellOff } from "lucide-react";

const NOTIFICATION_PERMISSION_KEY = "tpt-hearth:notification-opt-in";

/**
 * A gentle notification permission prompt.
 *
 * Disabled by default — the user must explicitly opt in.
 * No red badges, no urgent copy.
 */
export function NotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [optedIn, setOptedIn] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    setPermission(Notification.permission);

    // Check if user has previously opted in
    try {
      const stored = localStorage.getItem(NOTIFICATION_PERMISSION_KEY);
      if (stored === "true") {
        setOptedIn(true);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const handleEnable = useCallback(async () => {
    if (!("Notification" in window)) return;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        setOptedIn(true);
        try {
          localStorage.setItem(NOTIFICATION_PERMISSION_KEY, "true");
        } catch {
          // localStorage unavailable
        }

        // Register push subscription if service worker is active
        await registerPushSubscription();
      }
    } catch {
      // Permission request failed silently
    }
  }, []);

  const handleDisable = useCallback(() => {
    setOptedIn(false);
    setPermission("default");
    try {
      localStorage.removeItem(NOTIFICATION_PERMISSION_KEY);
    } catch {
      // localStorage unavailable
    }
  }, []);

  // If notifications aren't supported, show nothing
  if (typeof window !== "undefined" && !("Notification" in window)) {
    return null;
  }

  // If opted in and granted, show the enabled state
  if (optedIn && permission === "granted") {
    return (
      <div className="flex items-center gap-2 rounded-full border border-pine/30 bg-pine/10 px-3 py-1.5">
        <Bell className="h-3.5 w-3.5 text-pine-300" aria-hidden="true" />
        <span className="text-xs text-pine-200">Notifications on</span>
        <button
          onClick={handleDisable}
          className="ml-1 rounded-full px-2 py-0.5 text-xs text-sand/48 transition-colors hover:bg-white/[0.06] hover:text-sand/68"
          aria-label="Disable notifications"
        >
          Disable
        </button>
      </div>
    );
  }

  // If denied by browser, show disabled state
  if (permission === "denied") {
    return (
      <div className="flex items-center gap-2 rounded-full border border-sand/15 bg-white/[0.04] px-3 py-1.5">
        <BellOff className="h-3.5 w-3.5 text-sand/48" aria-hidden="true" />
        <span className="text-xs text-sand/48">Notifications blocked</span>
      </div>
    );
  }

  // Default: show the opt-in prompt (gentle, no urgency)
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border border-sand/15 bg-white/[0.04] px-3 py-1.5 transition-colors hover:border-ember/30"
      )}
    >
      <Bell className="h-3.5 w-3.5 text-sand/48" aria-hidden="true" />
      <span className="text-xs text-sand/48">Notifications off</span>
      <button
        onClick={handleEnable}
        className="ml-1 rounded-full px-2 py-0.5 text-xs text-ember transition-colors hover:bg-ember/10"
        aria-label="Enable gentle notifications"
      >
        Enable
      </button>
    </div>
  );
}

async function registerPushSubscription() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();

    if (existing) {
      return existing;
    }

    // Push notifications are prepared but the server-side VAPID keys
    // are not yet configured. This is a no-op placeholder.
    // When VAPID keys are added, the subscribe call would look like:
    //
    // const subscription = await registration.pushManager.subscribe({
    //   userVisibleOnly: true,
    //   applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
    // });
    //
    // await fetch("/api/push/subscribe", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(subscription)
    // });

    return null;
  } catch {
    return null;
  }
}