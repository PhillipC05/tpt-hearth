import { handleApiRequest, emptyBodySchema, seedDemoData, requireAdmin } from "@/lib/api-server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: { code: "forbidden", message: "Seed is disabled in production." } }, { status: 403 });
  }
  return handleApiRequest(request, emptyBodySchema, async (_input, { user }) => {
    requireAdmin(user);
    return seedDemoData();
  });
}