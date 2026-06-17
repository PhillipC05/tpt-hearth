import { handleAuthRequest, magicLinkRequestInputSchema, requestMagicLink } from "@/lib/auth";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = checkRateLimit(`magic:${getRequestIp(request)}`, { limit: 5, windowMs: 60_000 });
  if (limited) return limited;
  return handleAuthRequest(request, magicLinkRequestInputSchema, requestMagicLink);
}