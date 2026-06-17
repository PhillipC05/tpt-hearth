import {
  handleApiRequest,
  listChronicles,
  createChronicle,
  emptyBodySchema
} from "@/lib/api-server";
import { chronicleInputSchema } from "@tpt-hearth/shared";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleApiRequest(request, emptyBodySchema, async (_, { user }) => {
    return listChronicles(user.id);
  });
}

export async function POST(request: Request) {
  return handleApiRequest(request, chronicleInputSchema, async (input, { user }) => {
    return createChronicle(input, user.id);
  });
}