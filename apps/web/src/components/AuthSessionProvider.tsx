"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type AuthSession = {
  id: string;
  userId: string;
  token: string;
  displayName: string;
  expiresAt: string;
  createdAt: string;
  authProvider: "invite_code" | "magic_link" | "username" | "oauth" | "local_demo";
};

type AuthSessionContextValue = {
  session: AuthSession | null;
  setSession: (session: AuthSession | null) => void;
  clearSession: () => void;
};

export const SESSION_STORAGE_KEY = "tpt-hearth.session.v1";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(null);

  useEffect(() => {
    // Check for OAuth session cookie set by the Google callback redirect
    try {
      const oauthCookie = document.cookie
        .split("; ")
        .find((c) => c.startsWith("oauth_session="))
        ?.split("=")
        .slice(1)
        .join("=");

      if (oauthCookie) {
        const parsed = JSON.parse(decodeURIComponent(oauthCookie)) as Partial<AuthSession>;
        // Clear the cookie immediately
        document.cookie = "oauth_session=; Max-Age=0; path=/";

        if (isPersistableSession(parsed)) {
          const normalized = normalizeSession(parsed);
          setSessionState(normalized);
          window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(normalized));
          return;
        }
      }
    } catch {
      document.cookie = "oauth_session=; Max-Age=0; path=/";
    }

    try {
      const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);

      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as Partial<AuthSession>;

      if (isPersistableSession(parsed)) {
        const normalized = normalizeSession(parsed);
        setSessionState(normalized);
        window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(normalized));
        return;
      }

      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      try {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {
        // Ignore storage cleanup failures in locked-down browser contexts.
      }
    }
  }, []);

  const setSession = useCallback((nextSession: AuthSession | null) => {
    setSessionState(nextSession);

    try {
      if (nextSession) {
        window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
        return;
      }

      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // The in-memory session still works when localStorage is unavailable.
    }
  }, []);

  const clearSession = useCallback(() => {
    setSession(null);
  }, [setSession]);

  const value = useMemo<AuthSessionContextValue>(() => ({ session, setSession, clearSession }), [session, setSession, clearSession]);

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error("useAuthSession must be used within AuthSessionProvider");
  }

  return context;
}

function isPersistableSession(session: Partial<AuthSession>): session is AuthSession {
  if (
    typeof session.id !== "string" ||
    typeof session.userId !== "string" ||
    typeof session.token !== "string" ||
    typeof session.displayName !== "string" ||
    typeof session.expiresAt !== "string" ||
    typeof session.createdAt !== "string" ||
    typeof session.authProvider !== "string"
  ) {
    return false;
  }

  if (session.token.length < 16) {
    return false;
  }

  const expiresAt = Date.parse(session.expiresAt);

  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return false;
  }

  return true;
}

function normalizeSession(session: Partial<AuthSession>): AuthSession {
  return {
    id: session.id ?? `local-${crypto.randomUUID()}`,
    userId: session.userId ?? "local-user",
    token: session.token ?? `local-${crypto.randomUUID()}`,
    displayName: session.displayName ?? "Hearth Guest",
    expiresAt: session.expiresAt ?? new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    createdAt: session.createdAt ?? new Date().toISOString(),
    authProvider: session.authProvider ?? "local_demo"
  };
}