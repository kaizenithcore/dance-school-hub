import { ok, fail } from "@/lib/http";
import { getEnv } from "@/lib/env";
import { handleCorsPreFlight } from "@/lib/cors";

export async function OPTIONS(request: Request) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: Request) {
  try {
    getEnv();

    return ok(
      {
        status: "ok",
        service: "dance-school-hub-backend",
        timestamp: new Date().toISOString(),
      },
      200,
      request.headers.get("origin")
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return fail(
      {
        code: "healthcheck_failed",
        message,
      },
      503,
      request.headers.get("origin")
    );
  }
}
