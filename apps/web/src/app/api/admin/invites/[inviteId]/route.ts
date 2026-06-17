import { handleApiRequest, deleteInvite, getRouteParam, emptyBodySchema, requireAdmin } from "@/lib/api-server";
import type { RouteParams } from "@/lib/api-server";

export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: RouteParams }) {
  return handleApiRequest(request, emptyBodySchema, async (_input, { user }) => {
    requireAdmin(user);
    const inviteId = await getRouteParam(params, "inviteId");
    return deleteInvite(inviteId);
  });
}