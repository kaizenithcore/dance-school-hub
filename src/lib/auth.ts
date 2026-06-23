import { supabase } from "@/lib/supabase";
import { createTenant, getAuthContext } from "@/lib/api/auth";
import type { AuthContextResponse, TenantMembership } from "@/lib/api/auth";
import { clearDemoAdminSession, getDemoAdminTenantSlug } from "@/lib/demoAdmin";
import {
  clearSelectedAdminContext,
  getSelectedAdminOrganizationId,
  getSelectedAdminTenantId,
  syncSelectedAdminContext,
} from "@/lib/adminContextSelection";

export interface RegisterSchoolData {
  schoolName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  phone?: string;
  city?: string;
  plan?: string;
  addOns?: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  context?: AuthContextResponse;
}

export const REMEMBER_ME_STORAGE_KEY = "nexa:auth:remember-me";

const AUTH_CONTEXT_TIMEOUT_MS = 10000;

// ── Supabase-direct fallback ──────────────────────────────────────────────────
// Used when the backend API is unreachable. Queries tenant_memberships directly
// from Supabase so the user can access the app even if Next.js isn't running.

interface TenantMembershipRow {
  tenant_id: string;
  role: "owner" | "admin" | "staff";
  tenants: { id: string; name: string; slug: string; created_at: string } | Array<{ id: string; name: string; slug: string; created_at: string }> | null;
}

async function buildAuthContextFromSupabase(userId: string, email: string | null): Promise<AuthContextResponse | null> {
  try {
    const { data, error } = await supabase
      .from("tenant_memberships")
      .select("tenant_id, role, tenants(id, name, slug, created_at)")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error || !data || data.length === 0) return null;

    const memberships: TenantMembership[] = (data as TenantMembershipRow[])
      .map((row): TenantMembership | null => {
        const tenant = Array.isArray(row.tenants) ? row.tenants[0] : row.tenants;
        if (!tenant) return null;
        return {
          tenantId: row.tenant_id,
          tenantName: tenant.name,
          tenantSlug: tenant.slug,
          tenantCreatedAt: tenant.created_at,
          role: row.role,
          organizationId: null,
          organizationName: null,
          organizationSlug: null,
          organizationKind: null,
          organizationRole: null,
        };
      })
      .filter((m): m is TenantMembership => m !== null);

    if (memberships.length === 0) return null;

    const selectedTenantId = getSelectedAdminTenantId();
    const activeMembership =
      (selectedTenantId ? memberships.find((m) => m.tenantId === selectedTenantId) : null)
      ?? memberships[0];

    return {
      user: { id: userId, email },
      tenant: { id: activeMembership.tenantId, role: activeMembership.role, organizationId: null, organizationRole: null },
      memberships,
      organizations: [],
      activeOrganization: null,
    };
  } catch {
    return null;
  }
}

/**
 * Returns true when the backend error is NOT a business-logic rejection
 * (e.g. wrong credentials, no membership) and we should try the Supabase
 * direct fallback instead.
 *
 * We bypass the backend when:
 *   - network_error / timeout  → backend is unreachable
 *   - unauthorized             → backend token validation failed (JWT config
 *                                mismatch, stale token, etc.) even though
 *                                Supabase auth itself succeeded
 *
 * We do NOT bypass on "forbidden" (no membership) — that's a real access
 * denial that the Supabase query would also return null for.
 */
function shouldTrySupabaseFallback(code?: string): boolean {
  return (
    code === "network_error" ||
    code === "timeout" ||
    code === "unauthorized" // backend JWT validation failed; Supabase auth succeeded
  );
}

async function getAuthContextWithTimeout(options?: {
  tenantId?: string;
  organizationId?: string;
}): Promise<Awaited<ReturnType<typeof getAuthContext>>> {
  return Promise.race([
    getAuthContext(options),
    new Promise<Awaited<ReturnType<typeof getAuthContext>>>((resolve) => {
      window.setTimeout(() => {
        resolve({
          success: false,
          error: {
            code: "timeout",
            message: "No se pudo validar la sesión a tiempo.",
          },
        });
      }, AUTH_CONTEXT_TIMEOUT_MS);
    }),
  ]);
}

/**
 * Generates a URL-friendly slug from school name
 */
function generateSlug(schoolName: string): string {
  return schoolName
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Register a new school and owner account
 */
export async function registerSchool(data: RegisterSchoolData): Promise<AuthResult> {
  try {
    const tenantSlug = generateSlug(data.schoolName);

    const result = await createTenant({
      tenantName: data.schoolName,
      tenantSlug,
      ownerEmail: data.ownerEmail,
      ownerDisplayName: data.ownerName,
      ownerPassword: data.ownerPassword,
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error?.message || "Failed to register school",
      };
    }

    // After successful registration, automatically log in
    const loginResult = await login({
      email: data.ownerEmail,
      password: data.ownerPassword,
    });

    return loginResult;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Registration failed",
    };
  }
}

/**
 * Log in with email and password
 */
export async function login(credentials: LoginCredentials): Promise<AuthResult> {
  try {
    clearDemoAdminSession();
    clearSelectedAdminContext();

    const shouldRemember = credentials.rememberMe === true;
    window.localStorage.setItem(REMEMBER_ME_STORAGE_KEY, shouldRemember ? "1" : "0");

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (authError || !authData.session) {
      return {
        success: false,
        error: authError?.message || "Invalid credentials",
      };
    }

    // Fetch tenant context from backend
    const contextResult = await getAuthContextWithTimeout({
      tenantId: getSelectedAdminTenantId() ?? undefined,
      organizationId: getSelectedAdminOrganizationId() ?? undefined,
    });

    if (contextResult.success && contextResult.data) {
      return { success: true, context: contextResult.data };
    }

    // Backend failed — try Supabase direct fallback.
    // Triggers for: network errors, timeouts, and backend JWT validation errors.
    // Security: buildAuthContextFromSupabase checks tenant_memberships (RLS).
    if (shouldTrySupabaseFallback(contextResult.error?.code)) {
      const fallback = await buildAuthContextFromSupabase(
        authData.user.id,
        authData.user.email ?? null,
      );
      if (fallback) {
        syncSelectedAdminContext(fallback);
        return { success: true, context: fallback };
      }
    }

    // Supabase auth succeeded but user has no tenant membership — sign out.
    await supabase.auth.signOut();
    return {
      success: false,
      error: "No hay ninguna escuela asociada a esta cuenta. Contacta con tu administrador.",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Login failed",
    };
  }
}

/**
 * Log out current user
 */
export async function logout(): Promise<void> {
  clearDemoAdminSession();
  clearSelectedAdminContext();
  window.localStorage.removeItem(REMEMBER_ME_STORAGE_KEY);
  await supabase.auth.signOut();
}

export function isRememberMeEnabled(): boolean {
  return window.localStorage.getItem(REMEMBER_ME_STORAGE_KEY) === "1";
}

/**
 * Get current auth state and tenant context
 */
export async function getCurrentAuthContext(): Promise<AuthContextResponse | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const demoTenantSlug = getDemoAdminTenantSlug();
    if (!demoTenantSlug) {
      return null;
    }

    const contextResult = await getAuthContextWithTimeout({
      tenantId: getSelectedAdminTenantId() ?? undefined,
      organizationId: getSelectedAdminOrganizationId() ?? undefined,
    });
    if (contextResult.success && contextResult.data) {
      syncSelectedAdminContext(contextResult.data);
      return contextResult.data;
    }

    // Fallback for demo mode/context selection when timeout races first.
    const fallbackResult = await getAuthContext({
      tenantId: getSelectedAdminTenantId() ?? undefined,
      organizationId: getSelectedAdminOrganizationId() ?? undefined,
    });
    if (!fallbackResult.success || !fallbackResult.data) {
      return null;
    }

    syncSelectedAdminContext(fallbackResult.data);

    return fallbackResult.data;
  }

  const contextResult = await getAuthContextWithTimeout({
    tenantId: getSelectedAdminTenantId() ?? undefined,
    organizationId: getSelectedAdminOrganizationId() ?? undefined,
  });

  if (contextResult.success && contextResult.data) {
    syncSelectedAdminContext(contextResult.data);
    return contextResult.data;
  }

  // Backend failed (unreachable, timeout, or JWT validation error) —
  // build context from Supabase directly.
  if (shouldTrySupabaseFallback(contextResult.error?.code)) {
    const fallback = await buildAuthContextFromSupabase(
      session.user.id,
      session.user.email ?? null,
    );
    if (fallback) {
      syncSelectedAdminContext(fallback);
      return fallback;
    }
  }

  return null;
}
