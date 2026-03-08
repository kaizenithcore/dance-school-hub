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
