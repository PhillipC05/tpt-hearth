import { handleApiRequest, emptyBodySchema, listTransparencyLogs } from "@/lib/api-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleApiRequest(request, emptyBodySchema, async () => {
    return listTransparencyLogs();
  });
}