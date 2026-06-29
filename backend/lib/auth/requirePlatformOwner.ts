import type { NextRequest } from "next/server";
import { fail } from "@/lib/http";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { getAccessTokenFromRequest } from "@/lib/auth/tenantContext";

/**
 * Guard for /api/platform/* routes.
 * Validates that the authenticated user's email matches PLATFORM_OWNER_EMAIL.
 */
export async function requirePlatformOwner(request: NextRequest) {
  const origin = request.headers.get("origin");
  const ownerEmail = process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase();

  if (!ownerEmail) {
    return { authorized: false, response: fail({ code: "forbidden", message: "Platform owner not configured" }, 403, origin) };
  }

  const token = getAccessTokenFromRequest(request);
  if (!token) {
    return { authorized: false, response: fail({ code: "unauthorized", message: "No token" }, 401, origin) };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return { authorized: false, response: fail({ code: "unauthorized", message: "Invalid token" }, 401, origin) };
  }

  const userEmail = data.user.email?.trim().toLowerCase() ?? "";
  if (userEmail !== ownerEmail) {
    return { authorized: false, response: fail({ code: "forbidden", message: "Forbidden" }, 403, origin) };
  }

  return { authorized: true, userId: data.user.id, email: userEmail };
}
