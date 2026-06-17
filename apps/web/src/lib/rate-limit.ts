import { NextResponse } from "next/server";

type RateLimitEntry = { count: number; resetAt: number };

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes to prevent unbounded memory growth
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }, 5 * 60 * 1000).unref?.();
}

export type RateLimitOptions = {
  /** Maximum requests allowed within the window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
};

/**
 * Returns a 429 response if the key exceeds the limit, otherwise null.
 * Key is typically derived from the requester's IP address.
 */
export function checkRateLimit(key: string, options: RateLimitOptions): NextResponse | null {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return null;
  }

  entry.count += 1;

  if (entry.count > options.limit) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { ok: false, error: { code: "rate_limited", message: "Too many requests. Please wait a moment." } },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(options.limit),
          "X-RateLimit-Reset": String(Math.ceil(entry.resetAt / 1000))
        }
      }
    );
  }

  return null;
}

export function getRequestIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
