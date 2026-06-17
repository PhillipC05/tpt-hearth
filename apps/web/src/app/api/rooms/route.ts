import {
  handleApiRequest,
  listRooms,
  createRoom,
  emptyBodySchema
} from "@/lib/api-server";
import { roomInputSchema } from "@tpt-hearth/shared";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleApiRequest(request, emptyBodySchema, async (_, { user }) => {
    return listRooms(user.id);
  });
}

export async function POST(request: Request) {
  return handleApiRequest(request, roomInputSchema, async (input, { user }) => {
    return createRoom(input, user.id);
  });
}