import { handleApiRequest, emptyBodySchema, listModerationActions, createModerationAction, requireAdmin, ApiFailure } from "@/lib/api-server";
import { moderationActionInputSchema } from "@tpt-hearth/shared";
import { getDb } from "@tpt-hearth/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleApiRequest(request, emptyBodySchema, async (_input, { user }) => {
    requireAdmin(user);
    return listModerationActions();
  });
}

export async function POST(request: Request) {
  return handleApiRequest(request, moderationActionInputSchema, async (input, { user }) => {
    if (!user.isAdmin) {
      if (!input.targetRoomId) {
        throw new ApiFailure("forbidden", "Only admins may take moderation actions without a room context.", 403);
      }
      const db = getDb();
      const membership = db
        .prepare(`select role from room_members where room_id = ? and user_id = ? and left_at is null`)
        .get(input.targetRoomId, user.id) as { role: string } | undefined;
      const isSteward =
        membership?.role === "steward" ||
        (db.prepare(`select 1 from rooms where id = ? and steward_id = ?`).get(input.targetRoomId, user.id) != null);
      if (!isSteward) {
        throw new ApiFailure("forbidden", "Only room stewards and admins may take moderation actions.", 403);
      }
    }
    return createModerationAction(input, user.id);
  });
}