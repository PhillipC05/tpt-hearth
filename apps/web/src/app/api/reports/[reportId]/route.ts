import { NextResponse } from "next/server";
import { handleApiRequest, getReport, updateReportStatus, getRouteParam, emptyBodySchema } from "@/lib/api-server";
import { reportStatusSchema } from "@tpt-hearth/shared";
import { z } from "zod";
import type { RouteParams } from "@/lib/api-server";

export const runtime = "nodejs";

const updateStatusSchema = z.object({
  status: reportStatusSchema
});

export async function GET(request: Request, { params }: { params: RouteParams }) {
  return handleApiRequest(request, emptyBodySchema, async () => {
    const reportId = await getRouteParam(params, "reportId");
    return getReport(reportId);
  });
}

export async function PATCH(request: Request, { params }: { params: RouteParams }) {
  return handleApiRequest(request, updateStatusSchema, async (input) => {
    const reportId = await getRouteParam(params, "reportId");
    return updateReportStatus(reportId, input.status);
  });
}