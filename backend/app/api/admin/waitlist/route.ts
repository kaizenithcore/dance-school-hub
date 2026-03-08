import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { waitlistService } from "@/lib/services/waitlistService";

function canManageWaitlist(role: string) {
  return role === "owner" || role === "admin";
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  if (!canManageWaitlist(auth.context.role)) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  try {
    const classId = request.nextUrl.searchParams.get("classId");

    const [classes, entries] = await Promise.all([
      waitlistService.listClassQueues(auth.context.tenantId),
      classId ? waitlistService.listByClass(auth.context.tenantId, classId) : Promise.resolve([]),
    ]);

    return ok({ classes, entries, selectedClassId: classId || null }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load waitlist";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  if (!canManageWaitlist(auth.context.role)) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  try {
    const body = await request.json();
    const classId = typeof body?.classId === "string" ? body.classId : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

    if (!classId || !name || !email) {
      return fail({ code: "invalid_request", message: "classId, name and email are required" }, 400, origin);
    }

    const created = await waitlistService.enqueuePublicRequest({
      tenantId: auth.context.tenantId,
      classId,
      contactSnapshot: { name, email, phone: phone || undefined },
      metadata: {
        source: "admin_manual",
      },
    });

    return ok(created, 201, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create waitlist entry";
    return fail({ code: "create_failed", message }, 500, origin);
  }
}
