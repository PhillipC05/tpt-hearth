import crypto from "node:crypto";
import { getGoogleOAuthConfig } from "@/lib/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  const config = getGoogleOAuthConfig();

  if (!config) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "oauth_not_configured",
          message: "Google OAuth is not configured for this deployment."
        }
      },
      { status: 501 }
    );
  }

  const redirectUri =
    process.env.OAUTH_GOOGLE_REDIRECT_URI ??
    `${(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/api/auth/oauth/google/callback`;
  const state = crypto.randomBytes(16).toString("base64url");
  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  authorizationUrl.searchParams.set("client_id", config.clientId);
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", "openid email profile");
  authorizationUrl.searchParams.set("access_type", "offline");
  authorizationUrl.searchParams.set("prompt", "consent");
  authorizationUrl.searchParams.set("state", state);

  return NextResponse.redirect(authorizationUrl);
}