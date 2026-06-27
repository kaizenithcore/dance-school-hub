import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail } from "@/lib/http";
import { corsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { attendanceService } from "@/lib/services/attendanceService";
import { permissionService } from "@/lib/services/permissionService";
import { z } from "zod";

export const runtime = "nodejs";

const querySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM"),
});

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  if (!permissionService.canDownloadAttendance({
    tenantRole: auth.context.role,
    organizationRole: auth.context.organizationRole,
  })) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  const parsed = querySchema.safeParse({
    month: request.nextUrl.searchParams.get("month"),
  });

  if (!parsed.success) {
    return fail({ code: "invalid_query", message: "month is required (YYYY-MM)" }, 400, origin);
  }

  try {
    const pdfBuffer = await attendanceService.buildBulkAttendanceSheetPdf(
      auth.context.tenantId,
      parsed.data.month
    );

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        ...corsHeaders(origin),
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=listados-asistencia-${parsed.data.month}.pdf`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate bulk attendance PDF";
    let status = 500;
    if (message.startsWith("NO_CLASSES") || message.startsWith("NO_SCHEDULE")) status = 409;
    return fail(
      { code: "download_failed", message: message.replace(/^NO_\w+:\s*/, "") },
      status,
      origin
    );
  }
}
