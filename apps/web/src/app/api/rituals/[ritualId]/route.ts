import {
  handleApiRequest,
  patchRitual,
  getRouteParam,
  ritualPatchInputSchema
} from "@/lib/api-server";
import type { RouteParams } from "@/lib/api-server";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: RouteParams }) {
  return handleApiRequest(request, ritualPatchInputSchema, async (input, { user }) => {
    const ritualId = await getRouteParam(params, "ritualId");
    return patchRitual(ritualId, user.id, input);
  });
}