import { NextResponse } from "next/server";
import {
  handleApiRequest,
  getRoom,
  patchRoom,
  getRouteParam,
  roomPatchInputSchema,
  handleApiError,
  requireAuthenticatedRequest,
  emptyBodySchema
} from "@/lib/api-server";
import type { RouteParams } from "@/lib/api-server";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: RouteParams }) {
  try {
    const roomId = await getRouteParam(params, "roomId");
    const context = await requireAuthenticatedRequest(request);
    const result = getRoom(roomId, context.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: RouteParams }) {
  return handleApiRequest(request, roomPatchInputSchema, async (input, { user }) => {
    const roomId = await getRouteParam(params, "roomId");
    return patchRoom(roomId, user.id, input);
  });
}