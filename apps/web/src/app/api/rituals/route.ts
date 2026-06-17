import {
  handleApiRequest,
  listRituals,
  createRitual,
  emptyBodySchema
} from "@/lib/api-server";
import { ritualInputSchema } from "@tpt-hearth/shared";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleApiRequest(request, emptyBodySchema, async (_, { user }) => {
    return listRituals(user.id);
  });
}

export async function POST(request: Request) {
  return handleApiRequest(request, ritualInputSchema, async (input, { user }) => {
    return createRitual(input, user.id);
  });
}