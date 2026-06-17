import { handleApiRequest, emptyBodySchema, listReports, updateReportStatus, requireAdmin } from "@/lib/api-server";
import { reportStatusSchema } from "@tpt-hearth/shared";
import { z } from "zod";

export const runtime = "nodejs";

const updateStatusSchema = z.object({
  reportId: z.string().min(1),
  status: reportStatusSchema
});

export async function GET(request: Request) {
  return handleApiRequest(request, emptyBodySchema, async (_input, { user }) => {
    requireAdmin(user);
    return listReports();
  });
}

export async function PATCH(request: Request) {
  return handleApiRequest(request, updateStatusSchema, async (input, { user }) => {
    requireAdmin(user);
    return updateReportStatus(input.reportId, input.status);
  });
}