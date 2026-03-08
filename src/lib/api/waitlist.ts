import { apiRequest } from "./client";

export interface WaitlistClassQueue {
  classId: string;
  className: string;
  capacity: number;
  confirmedEnrollments: number;
  pendingWaitlist: number;
  offeredWaitlist: number;
}

export interface WaitlistEntry {
  id: string;
  position: number;
  classId: string;
  status: "pending" | "offered" | "enrolled" | "expired" | "cancelled";
  requestedAt: string;
  offeredAt: string | null;
  expiresAt: string | null;
  name: string;
  email: string;
  phone?: string;
}

export async function getWaitlistOverview(classId?: string) {
  const query = classId ? `?classId=${encodeURIComponent(classId)}` : "";
  const response = await apiRequest<{
    classes: WaitlistClassQueue[];
    entries: WaitlistEntry[];
    selectedClassId: string | null;
  }>(`/api/admin/waitlist${query}`);

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo cargar la lista de espera");
  }

  return response.data;
}

export async function addWaitlistEntry(payload: {
  classId: string;
  name: string;
  email: string;
  phone?: string;
}) {
  const response = await apiRequest<{ waitlistId: string; created: boolean }>("/api/admin/waitlist", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo crear la solicitud");
  }

  return response.data;
}

export async function offerNextWaitlistSpot(classId: string) {
  const response = await apiRequest<{
    offered: boolean;
    reason?: "already_offered" | "empty_queue";
    waitlistId?: string;
    waitlistOfferId?: string;
    recipient?: { name: string; email: string };
    expiresAt?: string;
  }>("/api/admin/waitlist/offers", {
    method: "POST",
    body: JSON.stringify({ action: "offer_next", classId }),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo ofrecer la plaza");
  }

  return response.data;
}

export async function processExpiredWaitlistOffers(classId?: string) {
  const response = await apiRequest<{ expiredCount: number }>("/api/admin/waitlist/offers", {
    method: "POST",
    body: JSON.stringify({ action: "process_expired", classId }),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron procesar expiraciones");
  }

  return response.data;
}
