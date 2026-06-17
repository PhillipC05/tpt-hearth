import { NextResponse } from "next/server";
import {
  removeRoomMember,
  getRouteParam,
  handleApiError,
  requireAuthenticatedRequest,
  emptyBodySchema
} from "@/lib/api-server";
import type { RouteParams } from "@/lib/api-server";

export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: RouteParams }) {
  try {
    const roomId = await getRouteParam(params, "roomId");
    const targetUserId = await getRouteParam(params, "userId");
    const context = await requireAuthenticatedRequest(request);
    const result = removeRoomMember(roomId, context.user.id, targetUserId);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}