import {
  handleApiRequest,
  addRitualSummary,
  getRouteParam,
  ritualSummaryInputSchema
} from "@/lib/api-server";
import type { RouteParams } from "@/lib/api-server";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: RouteParams }) {
  return handleApiRequest(request, ritualSummaryInputSchema, async (input, { user }) => {
    const ritualId = await getRouteParam(params, "ritualId");
    return addRitualSummary(ritualId, user.id, input);
  });
}