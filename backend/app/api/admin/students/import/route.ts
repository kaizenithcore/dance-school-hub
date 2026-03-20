import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { importService } from "@/lib/services/importService";
import { importStudentsSchema } from "@/lib/validators/importSchemas";
import { StudentLimitError } from "@/lib/services/studentQuotaService";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

/** POST /api/admin/students/import — Detect mapping from headers */
export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const headersParam = searchParams.get("headers");

  if (!headersParam) {
    return fail({ code: "missing_param", message: "El parámetro 'headers' es requerido" }, 400, origin);
  }

  let headers: string[];
  try {
    headers = JSON.parse(headersParam) as string[];
    if (!Array.isArray(headers)) throw new Error();
  } catch {
    return fail({ code: "invalid_param", message: "El parámetro 'headers' debe ser un array JSON" }, 400, origin);
  }

  const mapping = importService.detectMapping(headers);
  return ok({ mapping }, 200, origin);
}

/** POST /api/admin/students/import — Execute the student import */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail({ code: "invalid_json", message: "Cuerpo JSON inválido" }, 400, origin);
  }

  const parsed = importStudentsSchema.safeParse(body);
  if (!parsed.success) {
    return fail(
      { code: "invalid_request", message: "Payload inválido", details: parsed.error.flatten() },
      400,
      origin
    );
  }

  try {
    const result = await importService.runImport(
      auth.context.tenantId,
      auth.context.userId,
      parsed.data
    );
    return ok(result, 200, origin);
  } catch (error) {
    if (error instanceof StudentLimitError) {
      return fail(
        { code: error.code, message: error.message, details: error.details },
        422,
        origin
      );
    }

    const message = error instanceof Error ? error.message : "Error durante la importación";
    return fail({ code: "import_failed", message }, 500, origin);
  }
}
