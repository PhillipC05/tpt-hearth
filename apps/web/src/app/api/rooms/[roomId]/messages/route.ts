import { NextResponse } from "next/server";
import {
  handleApiError,
  getRouteParam,
  listRoomMessages,
  requireAuthenticatedRequest,
  emptyBodySchema
} from "@/lib/api-server";
import type { RouteParams } from "@/lib/api-server";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: RouteParams }) {
  try {
    const roomId = await getRouteParam(params, "roomId");
    const context = await requireAuthenticatedRequest(request);
    const result = listRoomMessages(roomId, context.user.id, request);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}