import { authenticateWithGoogleOAuth, getGoogleOAuthConfig } from "@/lib/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const config = getGoogleOAuthConfig();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (!config) {
    return NextResponse.json(
      { ok: false, error: { code: "oauth_not_configured", message: "Google OAuth is not configured for this deployment." } },
      { status: 501 }
    );
  }

  if (error) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.redirect(`${appUrl}/auth?error=oauth_denied`);
  }

  if (!code) {
    return NextResponse.json(
      { ok: false, error: { code: "oauth_callback_missing_params", message: "The OAuth callback did not include a code." } },
      { status: 400 }
    );
  }

  const redirectUri =
    process.env.OAUTH_GOOGLE_REDIRECT_URI ??
    `${(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/api/auth/oauth/google/callback`;

  const result = await authenticateWithGoogleOAuth(code, redirectUri);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const response = NextResponse.redirect(`${appUrl}/hearth`);

  // Deliver full session via a short-lived JS-readable cookie so the client can hydrate localStorage
  response.cookies.set("oauth_session", JSON.stringify(result.data.session), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60,
    path: "/"
  });

  return response;
}
