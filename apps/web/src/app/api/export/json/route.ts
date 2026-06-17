import {
  handleApiRequest,
  exportJson,
  emptyBodySchema
} from "@/lib/api-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleApiRequest(request, emptyBodySchema, async (_, { user }) => {
    return exportJson(user.id);
  });
}