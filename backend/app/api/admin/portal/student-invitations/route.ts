import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { inviteStudentsSchema, listInvitationsSchema } from "@/lib/validators/portalFoundationSchemas";
import { portalFoundationService } from "@/lib/services/portalFoundationService";

function canManagePortal(role: string | null | undefined) {
  return role === "owner" || role === "admin" || role === "staff";
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

  if (!canManagePortal(auth.context.role)) {
    return fail({ code: "forbidden", message: "Insufficient role" }, 403, origin);
  }

  const parsed = listInvitationsSchema.safeParse({
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    offset: request.nextUrl.searchParams.get("offset") ?? undefined,
  });

  if (!parsed.success) {
    return fail(
      {
        code: "invalid_request",
        message: "Invalid query parameters",
        details: parsed.error.flatten(),
      },
      400,
      origin
    );
  }

  try {
    const data = await portalFoundationService.listSchoolInvitations(auth.context.tenantId, parsed.data);
    return ok(data, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list invitations";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context || !auth.user?.id) {
    return auth.response;
  }

  if (!canManagePortal(auth.context.role)) {
    return fail({ code: "forbidden", message: "Insufficient role" }, 403, origin);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = inviteStudentsSchema.safeParse(body);

    if (!parsed.success) {
      return fail(
        {
          code: "invalid_request",
          message: "Invalid payload",
          details: parsed.error.flatten(),
        },
        400,
        origin
      );
    }

    const data = await portalFoundationService.inviteStudentsToSchool(auth.context.tenantId, auth.user.id, parsed.data);
    return ok(data, 201, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create invitations";
    return fail({ code: "create_failed", message }, 500, origin);
  }
}
