import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail } from "@/lib/http";
import { corsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { attendanceService } from "@/lib/services/attendanceService";
import { attendanceSheetQuerySchema } from "@/lib/validators/incidentSchemas";

export const runtime = "nodejs";

function canDownloadAttendance(role: string) {
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

  if (!canDownloadAttendance(auth.context.role)) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  try {
    const parsed = attendanceSheetQuerySchema.safeParse({
      classId: request.nextUrl.searchParams.get("classId"),
      month: request.nextUrl.searchParams.get("month"),
    });

    if (!parsed.success) {
      return fail(
        {
          code: "invalid_query",
          message: "classId and month are required",
          details: parsed.error.flatten(),
        },
        400,
        origin
      );
    }

    const { classId, month } = parsed.data;
    const pdfBuffer = await attendanceService.buildAttendanceSheetPdf(auth.context.tenantId, classId, month);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        ...corsHeaders(origin),
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=hoja-asistencia-${month}-${classId}.pdf`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate attendance sheet";
    let status = 500;

    if (message.includes("not found")) {
      status = 404;
    } else if (message.includes("NO_SCHEDULE") || message.toLowerCase().includes("no schedule")) {
      status = 409;
    }

    return fail({ code: "download_failed", message: message.replace(/^NO_SCHEDULE:\s*/, "") }, status, origin);
  }
}
