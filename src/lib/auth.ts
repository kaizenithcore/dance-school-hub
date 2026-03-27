import { supabase } from "@/lib/supabase";
import { createTenant, getAuthContext } from "@/lib/api/auth";
import type { AuthContextResponse } from "@/lib/api/auth";
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

export const REMEMBER_ME_STORAGE_KEY = "dancehub:auth:remember-me";

const AUTH_CONTEXT_TIMEOUT_MS = 10000;

async function getAuthContextWithTimeout(): Promise<Awaited<ReturnType<typeof getAuthContext>>> {
  return Promise.race([
    getAuthContext(),
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
    const contextResult = await getAuthContextWithTimeout();

    if (!contextResult.success || !contextResult.data) {
      // Auth succeeded but no tenant membership found
      await supabase.auth.signOut();
      return {
        success: false,
        error: contextResult.error?.message || "No school associated with this account",
      };
    }

    return {
      success: true,
      context: contextResult.data,
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

    const contextResult = await getAuthContext({
      tenantId: getSelectedAdminTenantId() ?? undefined,
      organizationId: getSelectedAdminOrganizationId() ?? undefined,
    });
    if (!contextResult.success || !contextResult.data) {
      return null;
    }

    syncSelectedAdminContext(contextResult.data);

    return contextResult.data;
  }

  const contextResult = await getAuthContext({
    tenantId: getSelectedAdminTenantId() ?? undefined,
    organizationId: getSelectedAdminOrganizationId() ?? undefined,
  });

  if (!contextResult.success || !contextResult.data) {
    return null;
  }

  syncSelectedAdminContext(contextResult.data);

  return contextResult.data;
}
