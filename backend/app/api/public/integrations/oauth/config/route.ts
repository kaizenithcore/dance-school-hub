import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { getEnv } from "@/lib/env";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");

  try {
    const env = getEnv();
    const authBase = `${env.SUPABASE_URL}/auth/v1`;

    return ok(
      {
        issuer: env.SUPABASE_URL,
        authorizationEndpoint: `${authBase}/authorize`,
        tokenEndpoint: `${authBase}/token`,
        userInfoEndpoint: `${authBase}/user`,
        grantTypesSupported: ["authorization_code", "refresh_token"],
        scopesSupported: ["openid", "profile", "email"],
      },
      200,
      origin
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load OAuth config";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}
