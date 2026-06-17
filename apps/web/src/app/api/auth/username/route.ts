import { authenticateWithUsername, handleAuthRequest, usernameAuthInputSchema } from "@/lib/auth";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = checkRateLimit(`username:${getRequestIp(request)}`, { limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  return handleAuthRequest(request, usernameAuthInputSchema, authenticateWithUsername);
}