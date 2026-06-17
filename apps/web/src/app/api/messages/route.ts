import {
  handleApiRequest,
  createMessage
} from "@/lib/api-server";
import { messageInputSchema } from "@tpt-hearth/shared";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleApiRequest(request, messageInputSchema, async (input, { user }) => {
    return createMessage(input, user.id);
  });
}