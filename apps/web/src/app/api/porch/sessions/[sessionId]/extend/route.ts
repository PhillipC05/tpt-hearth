import {
  handleApiRequest,
  extendPorchSession,
  getRouteParam,
  porchSessionExtendInputSchema
} from "@/lib/api-server";
import type { RouteParams } from "@/lib/api-server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: RouteParams }
) {
  return handleApiRequest(request, porchSessionExtendInputSchema, async (input, { user }) => {
    const sessionId = await getRouteParam(params, "sessionId");
    return extendPorchSession(sessionId, user.id, input);
  });
}