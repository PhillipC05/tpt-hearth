import {
  handleApiRequest,
  emptyBodySchema,
  listLetters,
  createLetter
} from "@/lib/api-server";
import { letterInputSchema } from "@tpt-hearth/shared";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleApiRequest(request, emptyBodySchema, async (_, { user }) => {
    return listLetters(user.id);
  });
}

export async function POST(request: Request) {
  return handleApiRequest(request, letterInputSchema, async (input, { user }) => {
    return createLetter(input, user.id);
  });
}