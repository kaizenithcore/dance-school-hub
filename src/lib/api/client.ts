import { supabase } from "@/lib/supabase";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

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

  const headers = new Headers(options.headers || undefined);

  // Only set JSON content type when the request has a body.
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
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
