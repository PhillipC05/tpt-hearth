import { NextResponse } from "next/server";
import {
  handleApiError,
  deleteMessage,
  archiveMessage,
  getRouteParam,
  requireAuthenticatedRequest
} from "@/lib/api-server";
import type { RouteParams } from "@/lib/api-server";

export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: RouteParams }) {
  try {
    const messageId = await getRouteParam(params, "messageId");
    const context = await requireAuthenticatedRequest(request);
    const result = deleteMessage(messageId, context.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: RouteParams }) {
  try {
    const messageId = await getRouteParam(params, "messageId");
    const context = await requireAuthenticatedRequest(request);
    const result = archiveMessage(messageId, context.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}