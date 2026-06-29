import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { requirePlatformOwner } from "@/lib/auth/requirePlatformOwner";
import { platformAdminService, type CrmStatus } from "@/lib/services/platformAdminService";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  const auth = await requirePlatformOwner(request);
  if (!auth.authorized) return auth.response!;

  const { id } = await params;
  try {
    const body = await request.json();
    const note = typeof body.note === "string" ? body.note.trim() : "";
    const status = (["new","contacted","active","at_risk","churned"].includes(body.status) ? body.status : "new") as CrmStatus;

    if (note) {
      const saved = await platformAdminService.saveCrmNote(id, note, status);
      return ok(saved, 201, origin);
    } else {
      await platformAdminService.updateCrmStatus(id, status);
      return ok({ ok: true }, 200, origin);
    }
  } catch (error) {
    return fail({ code: "save_failed", message: error instanceof Error ? error.message : "Failed" }, 500, origin);
  }
}
