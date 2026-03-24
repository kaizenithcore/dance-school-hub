import { apiRequest } from "@/lib/api/client";

export type PortalTelemetryCategory = "engagement" | "funnel" | "adoption" | "retention";

interface TrackPortalEventInput {
  eventName: string;
  category: PortalTelemetryCategory;
  tenantId?: string | null;
  metadata?: Record<string, unknown>;
}

const SESSION_STORAGE_KEY = "portal.telemetry.session";

function getSessionId(): string {
  if (typeof window === "undefined") {
    return `server-${Date.now()}`;
  }

  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const created = `portal-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, created);
  return created;
}

export function trackPortalEvent(input: TrackPortalEventInput): void {
  void apiRequest<{ tracked: boolean }>("/api/public/portal/analytics/track", {
    method: "POST",
    body: JSON.stringify({
      eventName: input.eventName,
      category: input.category,
      tenantId: input.tenantId ?? null,
      metadata: input.metadata ?? {},
      sessionId: getSessionId(),
    }),
  });
}
