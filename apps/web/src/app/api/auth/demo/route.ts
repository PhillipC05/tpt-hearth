import { authenticateWithDemo, demoAuthInputSchema, handleAuthRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleAuthRequest(request, demoAuthInputSchema, authenticateWithDemo);
}