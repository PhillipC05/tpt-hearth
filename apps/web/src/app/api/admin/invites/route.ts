import { handleApiRequest, emptyBodySchema, listInvites, createInvite, requireAdmin } from "@/lib/api-server";
import { z } from "zod";

export const runtime = "nodejs";

const createInviteSchema = z.object({
  maxUses: z.number().int().positive().default(1),
  expiresAt: z.string().datetime().nullable().default(null)
});

export async function GET(request: Request) {
  return handleApiRequest(request, emptyBodySchema, async (_input, { user }) => {
    requireAdmin(user);
    return listInvites();
  });
}

export async function POST(request: Request) {
  return handleApiRequest(request, createInviteSchema, async (input, { user }) => {
    requireAdmin(user);
    return createInvite({
      maxUses: input.maxUses ?? null,
      expiresAt: input.expiresAt ?? null
    }, user.id);
  });
}
