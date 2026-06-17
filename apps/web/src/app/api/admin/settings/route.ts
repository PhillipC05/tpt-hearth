import { NextResponse } from "next/server";
import { handleApiRequest, emptyBodySchema, listSettings, updateSetting, requireAdmin } from "@/lib/api-server";
import { serverSettingInputSchema } from "@tpt-hearth/shared";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleApiRequest(request, emptyBodySchema, async (_input, { user }) => {
    requireAdmin(user);
    return listSettings();
  });
}

export async function POST(request: Request) {
  return handleApiRequest(request, serverSettingInputSchema, async (input, { user }) => {
    requireAdmin(user);
    return updateSetting(input.key, input.value);
  });
}