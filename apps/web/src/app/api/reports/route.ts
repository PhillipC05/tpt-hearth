import { handleApiRequest, listReports, createReport, emptyBodySchema } from "@/lib/api-server";
import { reportInputSchema } from "@tpt-hearth/shared";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleApiRequest(request, emptyBodySchema, async () => {
    return listReports();
  });
}

export async function POST(request: Request) {
  return handleApiRequest(request, reportInputSchema, async (input, { user }) => {
    return createReport(input, user.id);
  });
}