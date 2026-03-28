import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { permissionService } from "@/lib/services/permissionService";
import { examCoreService } from "@/lib/services/examCoreService";
import { createExamOrganizationSchema } from "@/lib/validators/examCoreSchemas";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

function hasExamPermission(authContext: NonNullable<Awaited<ReturnType<typeof requireAuth>>["context"]>) {
  return permissionService.canManageExams({
    tenantRole: authContext.role,
    organizationRole: authContext.organizationRole,
  });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response;
  }

  if (!hasExamPermission(auth.context)) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  try {
    const organizations = await examCoreService.listOrganizationsForUser(auth.user.id);
    return ok(organizations, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load exam organizations";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response;
  }

  if (!hasExamPermission(auth.context)) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  try {
    const body = await request.json();
    const parsed = createExamOrganizationSchema.safeParse(body);

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

    const created = await examCoreService.createOrganization(auth.user.id, parsed.data);
    return ok(created, 201, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create exam organization";
    return fail({ code: "create_failed", message }, 500, origin);
  }
}
