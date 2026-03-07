import type { NextRequest } from "next/server";
import { fail } from "@/lib/http";
import {
  buildTenantContextFromMembership,
  findMembershipByTenantId,
  getAccessTokenFromRequest,
  getSelectedTenantId,
} from "@/lib/auth/tenantContext";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import type { AuthenticatedUser, TenantMembership } from "@/types/domain";

export interface AuthResult {
  authorized: boolean;
  user?: AuthenticatedUser;
  memberships?: TenantMembership[];
  context?: ReturnType<typeof buildTenantContextFromMembership>;
  response?: ReturnType<typeof fail>;
}

async function fetchTenantMemberships(userId: string): Promise<TenantMembership[]> {
  const { data, error } = await supabaseAdmin
    .from("tenant_memberships")
    .select("tenant_id, role, tenants(name, slug)")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    throw new Error(`Unable to resolve tenant memberships: ${error.message}`);
  }

  return (data ?? [])
    .map((row) => {
      const tenant = Array.isArray(row.tenants) ? row.tenants[0] : row.tenants;
      if (!tenant?.name || !tenant.slug) {
        return null;
      }

      return {
        tenantId: row.tenant_id,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        role: row.role,
      };
    })
    .filter((item): item is TenantMembership => item !== null);
}

export async function requireAuth(request: NextRequest): Promise<AuthResult> {
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
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !user) {
    return {
      authorized: false,
      response: fail(
        {
          code: "unauthorized",
          message: "Invalid or expired token.",
          details: userError?.message,
        },
        401
      ),
    };
  }

  let memberships: TenantMembership[];

  try {
    memberships = await fetchTenantMemberships(user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load memberships.";
    return {
      authorized: false,
      response: fail(
        {
          code: "auth_context_failed",
          message,
        },
        500
      ),
    };
  }

  if (memberships.length === 0) {
    return {
      authorized: false,
      response: fail(
        {
          code: "forbidden",
          message: "User has no active tenant memberships.",
        },
        403
      ),
    };
  }

  const selectedTenantId = getSelectedTenantId(request, memberships);

  if (!selectedTenantId) {
    return {
      authorized: false,
      response: fail(
        {
          code: "forbidden",
          message: "Unable to determine active tenant.",
        },
        403
      ),
    };
  }

  const selectedMembership = findMembershipByTenantId(memberships, selectedTenantId);

  if (!selectedMembership) {
    return {
      authorized: false,
      response: fail(
        {
          code: "forbidden",
          message: "Requested tenant is not available for this user.",
        },
        403
      ),
    };
  }

  return {
    authorized: true,
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    memberships,
    context: buildTenantContextFromMembership(user.id, selectedMembership),
  };
}
