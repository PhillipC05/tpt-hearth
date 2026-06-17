import { NextResponse } from "next/server";
import {
  handleApiError,
  handleMarkdownExportRequest,
  getLetter,
  buildLetterMarkdown,
  getRouteParam,
  requireAuthenticatedRequest
} from "@/lib/api-server";
import type { RouteParams } from "@/lib/api-server";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: RouteParams }) {
  try {
    const letterId = await getRouteParam(params, "letterId");
    const url = new URL(request.url);

    if (url.searchParams.get("format") === "markdown") {
      return handleMarkdownExportRequest(request, async () => {
        return buildLetterMarkdown(letterId, (await requireAuthenticatedRequest(request)).user.id);
      });
    }

    const context = await requireAuthenticatedRequest(request);
    const result = getLetter(letterId, context.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}