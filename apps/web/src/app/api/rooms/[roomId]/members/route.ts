import {
  handleApiRequest,
  addRoomMember,
  getRouteParam,
  roomMemberInputSchema
} from "@/lib/api-server";
import type { RouteParams } from "@/lib/api-server";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: RouteParams }) {
  return handleApiRequest(request, roomMemberInputSchema, async (input, { user }) => {
    const roomId = await getRouteParam(params, "roomId");
    return addRoomMember(roomId, user.id, { ...input, role: input.role ?? "member" });
  });
}