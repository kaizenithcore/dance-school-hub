import { supabase } from "@/lib/supabase";
import { getDemoAdminTenantSlug } from "@/lib/demoAdmin";
import { getSelectedAdminOrganizationId, getSelectedAdminTenantId } from "@/lib/adminContextSelection";

const API_BASE_URL = import.meta.env.VITE_API_URL;

function buildApiBaseCandidates(): string[] {
  const candidates = new Set<string>();

  if (typeof API_BASE_URL === "string" && API_BASE_URL.trim().length > 0) {
    candidates.add(API_BASE_URL.trim().replace(/\/$/, ""));
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    candidates.add(window.location.origin.replace(/\/$/, ""));
  }

  candidates.add("http://localhost:3000");
  return Array.from(candidates);
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export async function resolveAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  const key = Object.keys(window.localStorage).find(
    (k) => k.startsWith("sb-") && k.endsWith("-auth-token")
  );

  if (!key) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      access_token?: string;
      currentSession?: { access_token?: string };
      session?: { access_token?: string };
    };

    const token =
      parsed.access_token
      || parsed.currentSession?.access_token
      || parsed.session?.access_token;

    if (token) {
      return token;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const accessToken = await resolveAccessToken();
  const demoTenantSlug = getDemoAdminTenantSlug();
  const method = String(options.method || "GET").toUpperCase();
  const selectedTenantId = getSelectedAdminTenantId();
  const selectedOrganizationId = getSelectedAdminOrganizationId();
  const shouldAttachContext = endpoint.startsWith("/api/admin") || endpoint.startsWith("/api/auth/me");
  const buildRequestUrl = (baseUrl: string) => {
    const [basePath, rawQuery = ""] = endpoint.split("?");
    const params = new URLSearchParams(rawQuery);

    if (demoTenantSlug) {
      params.set("demo", demoTenantSlug);
    }

    if (shouldAttachContext) {
      if (selectedTenantId) {
        params.set("tenantId", selectedTenantId);
      }
      if (selectedOrganizationId) {
        params.set("organizationId", selectedOrganizationId);
      }
    }

    const query = params.toString();
    return query ? `${baseUrl}${basePath}?${query}` : `${baseUrl}${basePath}`;
  };

  const headers = new Headers(options.headers || undefined);

  // Only set JSON content type when the request has a body.
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (demoTenantSlug && !["GET", "HEAD", "OPTIONS"].includes(method)) {
    return {
      success: false,
      error: {
        code: "demo_mode",
        message: "Modo demo: las funciones de guardado están deshabilitadas.",
      },
    };
  }

  try {
    let lastError: Error | null = null;

    for (const baseUrl of buildApiBaseCandidates()) {
      const requestUrl = buildRequestUrl(baseUrl);

      try {
        const response = await fetch(requestUrl, {
          ...options,
          headers,
        });

        const contentType = response.headers.get("content-type") || "";
        const isJson = contentType.toLowerCase().includes("application/json");

        if (!isJson) {
          // In dev, wrong origins can return HTML. Try the next candidate.
          continue;
        }

        const data = (await response.json()) as ApiResponse<T>;

        if (!response.ok) {
          // Return first explicit API error response.
          return {
            success: false,
            error: data.error || {
              code: "unknown_error",
              message: "An unexpected error occurred",
            },
          };
        }

        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Network request failed");
      }
    }

    throw lastError || new Error("Network request failed");
  } catch (error) {
    return {
      success: false,
      error: {
        code: "network_error",
        message:
          error instanceof Error ? error.message : "Network request failed",
      },
    };
  }
}
