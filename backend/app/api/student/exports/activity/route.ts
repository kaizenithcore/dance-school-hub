import type { NextRequest } from "next/server";
import { fail } from "@/lib/http";
import { corsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { requireUserAuth } from "@/lib/auth/requireUserAuth";
import { studentPortalService } from "@/lib/services/studentPortalService";
import { exportActivityQuerySchema, listPaginationSchema } from "@/lib/validators/studentPortalSchemas";

function csvEscape(value: string): string {
  const escaped = value.replace(/\"/g, "\"\"");
  return `\"${escaped}\"`;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireUserAuth(request);

  if (!auth.authorized || !auth.userId) {
    return auth.response;
  }

  const parsedPagination = listPaginationSchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    offset: request.nextUrl.searchParams.get("offset") ?? undefined,
  });

  if (!parsedPagination.success) {
    return fail(
      {
        code: "invalid_request",
        message: "Invalid pagination",
        details: parsedPagination.error.flatten(),
      },
      400,
      origin
    );
  }

  const parsedQuery = exportActivityQuerySchema.safeParse({
    format: request.nextUrl.searchParams.get("format") ?? undefined,
  });

  if (!parsedQuery.success) {
    return fail(
      {
        code: "invalid_request",
        message: "Invalid export format",
        details: parsedQuery.error.flatten(),
      },
      400,
      origin
    );
  }

  try {
    const data = await studentPortalService.getStudentActivityHistory(auth.userId, parsedPagination.data);
    const filenameBase = `portal-activity-${new Date().toISOString().slice(0, 10)}`;

    if (parsedQuery.data.format === "csv") {
      const lines = ["id,type,title,details,createdAt"];
      for (const item of data.items) {
        lines.push([
          csvEscape(item.id),
          csvEscape(item.type),
          csvEscape(item.title),
          csvEscape(item.details),
          csvEscape(item.createdAt),
        ].join(","));
      }

      return new Response(lines.join("\n"), {
        status: 200,
        headers: {
          ...corsHeaders(origin),
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=\"${filenameBase}.csv\"`,
        },
      });
    }

    return new Response(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders(origin),
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"${filenameBase}.json\"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to export activity";
    const status = message === "Student context not found" ? 404 : 500;
    return fail({ code: "export_failed", message }, status, origin);
  }
}
