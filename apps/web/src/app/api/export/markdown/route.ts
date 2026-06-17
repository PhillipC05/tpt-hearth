import {
  handleMarkdownExportRequest,
  buildMarkdownExport
} from "@/lib/api-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleMarkdownExportRequest(request, async ({ user }) => {
    return buildMarkdownExport(user.id);
  });
}