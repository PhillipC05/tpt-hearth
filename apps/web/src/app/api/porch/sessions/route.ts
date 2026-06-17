import {
  handleApiRequest,
  listPorchSessions,
  createPorchSession,
  emptyBodySchema
} from "@/lib/api-server";
import { porchSessionInputSchema } from "@tpt-hearth/shared";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleApiRequest(request, emptyBodySchema, async () => {
    return listPorchSessions();
  });
}

export async function POST(request: Request) {
  return handleApiRequest(request, porchSessionInputSchema, async (input, { user }) => {
    return createPorchSession(input, user.id);
  });
}