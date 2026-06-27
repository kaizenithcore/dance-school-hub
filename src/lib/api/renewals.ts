import { apiRequest } from "./client";

export type RenewalCampaignStatus = "draft" | "active" | "closed" | "cancelled";
export type RenewalOfferStatus = "pending" | "confirmed" | "changed" | "released";

export interface RenewalCampaign {
  id: string;
  name: string;
  fromPeriod: string;
  toPeriod: string;
  status: RenewalCampaignStatus;
  expiresAt: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
  counts: {
    pending: number;
    confirmed: number;
    changed: number;
    released: number;
    total: number;
  };
}

export interface RenewalOffer {
  id: string;
  campaignId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  currentClassIds: string[];
  proposedClassIds: string[];
  status: RenewalOfferStatus;
  expiresAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export async function getRenewalCampaigns() {
  const response = await apiRequest<RenewalCampaign[]>("/api/admin/renewals");

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron cargar las campañas");
  }

  return response.data;
}

export async function createRenewalCampaign(payload: {
  name: string;
  fromPeriod: string;
  toPeriod: string;
  expiresAt?: string;
  fromCourse?: string;
  toCourse?: string;
  scheduleText?: string;
  scheduleUrl?: string;
}) {
  const response = await apiRequest<{ campaignId: string; offersCount: number }>("/api/admin/renewals", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo crear la campaña");
  }

  return response.data;
}

export async function getRenewalOffers(campaignId: string, status?: RenewalOfferStatus) {
  const query = new URLSearchParams({ campaignId });
  if (status) {
    query.set("status", status);
  }

  const response = await apiRequest<RenewalOffer[]>(`/api/admin/renewals/offers?${query.toString()}`);

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron cargar las ofertas");
  }

  return response.data;
}

export async function updateRenewalOffer(payload: {
  campaignId: string;
  offerId: string;
  action: "confirm" | "change" | "release";
  proposedClassIds?: string[];
}) {
  const response = await apiRequest<{ id: string; status: RenewalOfferStatus }>("/api/admin/renewals/offers", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo actualizar la oferta");
  }

  return response.data;
}

export async function getRenewalEmailPreview(campaignId: string, opts?: { scheduleText?: string; scheduleUrl?: string; scheduleHtml?: string }): Promise<string> {
  const params = new URLSearchParams({ campaignId });
  if (opts?.scheduleText) params.set("scheduleText", opts.scheduleText);
  if (opts?.scheduleUrl)  params.set("scheduleUrl",  opts.scheduleUrl);
  if (opts?.scheduleHtml) params.set("scheduleHtml", opts.scheduleHtml);
  const response = await apiRequest<{ html: string }>(`/api/admin/renewals/preview?${params.toString()}`);
  if (!response.success || !response.data) throw new Error(response.error?.message || "No se pudo generar la vista previa");
  return response.data.html;
}

export interface PublicOfferDetails {
  studentName: string;
  schoolName: string;
  fromCourse: string;
  toCourse: string;
  classes: Array<{ id: string; name: string }>;
  expiresAt: string | null;
  status: string;
}

export async function getPublicRenewalOffer(offerId: string): Promise<PublicOfferDetails> {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const response = await fetch(`${apiUrl}/api/public/renewals/offer?id=${encodeURIComponent(offerId)}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { error?: { message?: string } })?.error?.message || "Oferta no encontrada");
  }
  const wrapper = await response.json() as { data: PublicOfferDetails };
  return wrapper.data;
}

export async function sendRenewalNotifications(payload: {
  campaignId: string;
  offerIds?: string[];
  scheduledAt?: string;
  scheduleText?: string;
  scheduleUrl?: string;
  scheduleHtml?: string;
}): Promise<{ sent: number; failed: number; skipped: number; scheduledAt?: string }> {
  const response = await apiRequest<{ sent: number; failed: number; skipped: number; scheduledAt?: string }>(
    "/api/admin/renewals/notify",
    { method: "POST", body: JSON.stringify(payload) }
  );
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron enviar las notificaciones");
  }
  return response.data;
}

export async function respondToRenewalOffer(payload: {
  offerId: string;
  action: "confirm" | "reject";
  selectedClassIds?: string[];
}): Promise<{ studentName: string; status: string; confirmedClasses: string[]; releasedClasses: string[] }> {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const response = await fetch(`${apiUrl}/api/public/renewals/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { error?: { message?: string } })?.error?.message || "No se pudo procesar la respuesta");
  }
  return response.json() as Promise<{ studentName: string; status: string }>;
}
