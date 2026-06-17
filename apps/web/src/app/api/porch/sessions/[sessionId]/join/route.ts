import {
  handleApiRequest,
  joinPorchSession,
  getRouteParam,
  emptyBodySchema
} from "@/lib/api-server";
import type { RouteParams } from "@/lib/api-server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: RouteParams }
) {
  return handleApiRequest(request, emptyBodySchema, async (_, { user }) => {
    const sessionId = await getRouteParam(params, "sessionId");
    return joinPorchSession(sessionId, user.id);
  });
}