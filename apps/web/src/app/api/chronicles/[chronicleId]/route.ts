import { NextResponse } from "next/server";
import {
  handleApiError,
  getRouteParam,
  requireAuthenticatedRequest,
  patchChronicle,
  deleteChronicle,
  chroniclePatchInputSchema
} from "@/lib/api-server";
import type { RouteParams } from "@/lib/api-server";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: RouteParams }) {
  try {
    const chronicleId = await getRouteParam(params, "chronicleId");
    const context = await requireAuthenticatedRequest(request);
    const body = await request.json();
    const parsed = chroniclePatchInputSchema.safeParse(body);

    if (!parsed.success) {
      const { apiError, zodErrorMessage } = await import("@tpt-hearth/shared");
      return NextResponse.json(apiError("validation_error", zodErrorMessage(parsed.error)), { status: 400 });
    }

    const result = patchChronicle(chronicleId, context.user.id, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: RouteParams }) {
  try {
    const chronicleId = await getRouteParam(params, "chronicleId");
    const context = await requireAuthenticatedRequest(request);
    const result = deleteChronicle(chronicleId, context.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}