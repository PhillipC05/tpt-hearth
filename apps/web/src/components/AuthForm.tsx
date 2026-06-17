"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@tpt-hearth/ui";
import type { AuthenticatedResult, AuthenticatedSession, MagicLinkRequestResult } from "@/lib/auth";
import { useAuthSession } from "./AuthSessionProvider";

type AuthModeKey = "invite" | "magic" | "username" | "demo";

type AuthResponseBody<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error?: {
        message?: string;
      };
    };

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

const authTabs: Array<{ key: AuthModeKey; label: string; description: string }> = [
  { key: "invite", label: "Invite code", description: "Enter a quiet door code from the lodge keeper." },
  { key: "magic", label: "Magic link", description: "Request an email link for this MVP demo." },
  { key: "username", label: "Username", description: "Create a low-friction local account." },
  { key: "demo", label: "Local demo", description: "Use an offline-friendly demo account." }
];

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, setSession, clearSession } = useAuthSession();
  const tokenFromUrl = searchParams.get("token");
  const showDemoMode = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_AUTH_MODE === "local_demo";
  const showOAuth = process.env.NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED === "true";
  const [mode, setMode] = useState<AuthModeKey>(process.env.NEXT_PUBLIC_AUTH_MODE === "local_demo" ? "demo" : "invite");
  const [inviteCode, setInviteCode] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugLink, setDebugLink] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenFromUrl) {
      return;
    }

    void confirmMagicLink(tokenFromUrl);
  }, [tokenFromUrl]);

  useEffect(() => {
    setError(null);
    setStatus(null);
    setDebugLink(null);
  }, [mode]);

  async function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Opening the door…");
    setError(null);
    setDebugLink(null);
    setIsSubmitting(true);

    try {
      const result = await postAuth<AuthenticatedResult>("/api/auth/invite-code", {
        code: inviteCode,
        ...(displayName.trim() ? { displayName: displayName.trim() } : {})
      });

      setSession(result.session);
      router.push("/");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
      setStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Preparing a magic link…");
    setError(null);
    setDebugLink(null);
    setIsSubmitting(true);

    try {
      const result = await postAuth<MagicLinkRequestResult>("/api/auth/magic-link/request", { email });

      setDebugLink(result.debugLink ?? null);
      setStatus(result.debugLink ? "Magic link ready. Open the debug link below to confirm." : "Magic link requested.");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
      setStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Setting a gentle name for the hearth…");
    setError(null);
    setDebugLink(null);
    setIsSubmitting(true);

    try {
      const result = await postAuth<AuthenticatedResult>("/api/auth/username", {
        ...(username.trim() ? { handle: username.trim() } : {}),
        ...(displayName.trim() ? { displayName: displayName.trim() } : {})
      });

      setSession(result.session);
      router.push("/");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
      setStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitDemo() {
    setStatus("Lighting a local hearth…");
    setError(null);
    setDebugLink(null);
    setIsSubmitting(true);

    try {
      const result = await postAuth<AuthenticatedResult>("/api/auth/demo", {
        ...(displayName.trim() ? { displayName: displayName.trim() } : {})
      });

      setSession(result.session);
      router.push("/");
    } catch (caughtError) {
      if (showDemoMode) {
        setSession(createOfflineDemoSession(displayName));
        setStatus("Offline demo session created locally.");
        router.push("/");
        return;
      }

      setError(getErrorMessage(caughtError));
      setStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmMagicLink(token: string) {
    setStatus("Confirming your magic link…");
    setError(null);
    setDebugLink(null);
    setIsSubmitting(true);

    try {
      const result = await postAuth<AuthenticatedResult>("/api/auth/magic-link/confirm", { token });

      setSession(result.session);
      router.push("/");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
      setStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto max-w-3xl page-enter">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Auth</Badge>
          <p className="text-xs uppercase tracking-[0.28em] text-sand/48">tpt hearth</p>
        </div>
        <CardTitle>Choose how to enter the lodge</CardTitle>
        <CardDescription>
          Invite-code and magic-link flows are the primary paths. Username and local demo modes are available for quiet local deployments.
        </CardDescription>
      </CardHeader>
      <CardContent className="calm-stack">
        {session ? (
          <SignedInPanel session={session} clearSession={clearSession} />
        ) : (
          <>
            <AuthModeTabs mode={mode} showDemoMode={showDemoMode} onChange={setMode} />

            {mode === "invite" && (
              <form onSubmit={submitInvite} className="calm-stack" aria-busy={isSubmitting}>
                <Field label="Invite code">
                  <Input value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} placeholder="e.g. HEARTH-123" autoComplete="off" />
                </Field>
                <Field label="Display name">
                  <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="How should the lodge greet you?" />
                </Field>
                <Button type="submit" disabled={!inviteCode.trim() || isSubmitting}>
                  Enter with invite code
                </Button>
              </form>
            )}

            {mode === "magic" && (
              <form onSubmit={submitMagicLink} className="calm-stack" aria-busy={isSubmitting}>
                <Field label="Email address">
                  <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" />
                </Field>
                <Button type="submit" disabled={!email.trim() || isSubmitting}>
                  Request magic link
                </Button>
                {debugLink && (
                  <a href={debugLink} className="rounded-3xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-sand">
                    Open demo magic link
                  </a>
                )}
              </form>
            )}

            {mode === "username" && (
              <form onSubmit={submitUsername} className="calm-stack" aria-busy={isSubmitting}>
                <Field label="Username">
                  <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="hearth-guest" autoComplete="username" />
                </Field>
                <Field label="Display name">
                  <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="How should the lodge greet you?" />
                </Field>
                <Button type="submit" disabled={isSubmitting}>
                  Continue with username
                </Button>
              </form>
            )}

            {showDemoMode && mode === "demo" && (
              <div className="calm-stack">
                <Field label="Display name">
                  <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Local Listener" />
                </Field>
                <Button type="button" onClick={submitDemo} disabled={isSubmitting}>
                  Continue with local demo
                </Button>
                <p className="text-sm text-sand/58">
                  If the local API is unavailable, this creates an offline demo session in this browser.
                </p>
              </div>
            )}

            {showOAuth && (
              <Button type="button" variant="secondary" onClick={() => window.location.assign("/api/auth/oauth/google")}>
                Continue with Google
              </Button>
            )}

            <AuthStatus error={error} status={status} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SignedInPanel({
  session,
  clearSession
}: {
  session: AuthenticatedSession;
  clearSession: () => void;
}) {
  const router = useRouter();

  return (
    <div className="rounded-3xl border border-sand/15 bg-white/[0.04] p-5 calm-stack">
      <div>
        <p className="text-sm text-sand/58">Signed in as</p>
        <p className="font-serif text-3xl text-sand">{session.displayName}</p>
        <p className="mt-1 text-xs text-sand/48">{session.authProvider}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => router.push("/")}>Continue to the hearth</Button>
        <Button variant="outline" onClick={clearSession}>
          Sign out
        </Button>
      </div>
    </div>
  );
}

function AuthModeTabs({
  mode,
  showDemoMode,
  onChange
}: {
  mode: AuthModeKey;
  showDemoMode: boolean;
  onChange: (mode: AuthModeKey) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {authTabs
        .filter((tab) => tab.key !== "demo" || showDemoMode)
        .map((tab) => {
          const isActive = mode === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={
                isActive
                  ? "rounded-full bg-ember px-4 py-2 text-sm text-ash shadow-ember"
                  : "rounded-full border border-sand/15 px-4 py-2 text-sm text-sand/72 hover:bg-white/10 hover:text-sand"
              }
              aria-pressed={isActive}
            >
              {tab.label}
            </button>
          );
        })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="calm-stack">
      <span className="text-sm text-sand/72">{label}</span>
      {children}
    </label>
  );
}

function AuthStatus({ error, status }: { error: string | null; status: string | null }) {
  if (error) {
    return (
      <div role="alert" className="rounded-3xl border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-sand">
        {error}
      </div>
    );
  }

  if (status) {
    return (
      <div role="status" className="rounded-3xl border border-sand/15 bg-white/[0.04] px-4 py-3 text-sm text-sand/72">
        {status}
      </div>
    );
  }

  return null;
}

async function postAuth<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  const responseBody = (await response.json().catch(() => ({}))) as AuthResponseBody<T>;

  if (!response.ok) {
    if (responseBody.ok === false) {
      throw new Error(responseBody.error?.message ?? "Unable to complete auth request.");
    }

    throw new Error("Unable to complete auth request.");
  }

  if (responseBody.ok === false) {
    throw new Error(responseBody.error?.message ?? "Unable to complete auth request.");
  }

  if (responseBody.ok !== true) {
    throw new Error("Unable to complete auth request.");
  }

  return responseBody.data;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to complete auth request.";
}

function createOfflineDemoSession(displayName?: string): AuthenticatedSession {
  const now = new Date();
  const trimmedName = displayName?.trim() || "Local Demo";

  return {
    id: `offline-${crypto.randomUUID()}`,
    userId: "offline-demo-user",
    token: `local-demo-${crypto.randomUUID()}`,
    displayName: trimmedName.slice(0, 80),
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
    createdAt: now.toISOString(),
    authProvider: "local_demo"
  };
}