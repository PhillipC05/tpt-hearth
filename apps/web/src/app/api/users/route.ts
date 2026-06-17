import { handleApiRequest, emptyBodySchema, listUsers } from "@/lib/api-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleApiRequest(request, emptyBodySchema, async () => {
    return listUsers();
  });
}