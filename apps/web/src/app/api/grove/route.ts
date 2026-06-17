import { emptyBodySchema, handleApiRequest, searchGrove } from "@/lib/api-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleApiRequest(request, emptyBodySchema, async (_, { user }) => {
    return searchGrove(request);
  });
}