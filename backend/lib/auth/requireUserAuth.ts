import type { NextRequest } from "next/server";
import { fail } from "@/lib/http";
import { getAccessTokenFromRequest } from "@/lib/auth/tenantContext";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

export interface UserAuthResult {
  authorized: boolean;
  userId?: string;
  email?: string;
  response?: ReturnType<typeof fail>;
}

export async function requireUserAuth(request: NextRequest): Promise<UserAuthResult> {
  const accessToken = getAccessTokenFromRequest(request);

  if (!accessToken) {
    return {
      authorized: false,
      response: fail(
        {
          code: "unauthorized",
          message: "Missing bearer token.",
        },
        401
      ),
    };
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (error || !user) {
    return {
      authorized: false,
      response: fail(
        {
          code: "unauthorized",
          message: "Invalid or expired token.",
          details: error?.message,
        },
        401
      ),
    };
  }

  return {
    authorized: true,
    userId: user.id,
    email: user.email ?? undefined,
  };
}
