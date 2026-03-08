import { apiRequest } from "./client";

export type AudienceType = "all" | "class" | "discipline";
export type CommunicationChannel = "email" | "whatsapp_link";

export interface CommunicationAudience {
  type: AudienceType;
  classId?: string;
  disciplineId?: string;
}

export interface CampaignRecord {
  id: string;
  createdAt: string;
  channel: CommunicationChannel;
  audience: CommunicationAudience;
  subject: string;
  status: "queued" | "processing" | "ready" | "sent" | "partial" | "failed";
  queuedCount: number;
  sentCount: number;
  failedCount: number;
}

export interface DeliveryRecord {
  id: string;
  campaignId: string;
  studentId?: string;
  studentName: string;
  email?: string;
  phone?: string;
  status: "queued" | "processing" | "ready" | "sent" | "failed" | "skipped";
  provider?: string;
  providerMessageId?: string;
  errorMessage?: string;
  waLink?: string;
  sentAt?: string;
  createdAt: string;
}

export async function getEmailCampaigns(): Promise<CampaignRecord[]> {
  const response = await apiRequest<CampaignRecord[]>("/api/admin/communications/email");
  return response.success && response.data ? response.data : [];
}

export async function previewEmailAudience(payload: {
  channel: CommunicationChannel;
  audience: CommunicationAudience;
  subject: string;
  message: string;
}) {
  const response = await apiRequest<{
    channel: CommunicationChannel;
    recipientsCount: number;
    recipientsPreview: Array<{ studentId: string; studentName: string; email?: string; phone?: string }>;
  }>("/api/admin/communications/email", {
    method: "POST",
    body: JSON.stringify({ ...payload, previewOnly: true }),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo calcular el público");
  }

  return response.data;
}

export async function queueEmailCampaign(payload: {
  channel: CommunicationChannel;
  audience: CommunicationAudience;
  subject: string;
  message: string;
}) {
  const response = await apiRequest<{
    campaignId: string;
    channel: CommunicationChannel;
    queuedCount: number;
    recipients: Array<{ studentId: string; studentName: string; email?: string; phone?: string }>;
  }>("/api/admin/communications/email", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo preparar el envío");
  }

  return response.data;
}

export async function getCampaignDeliveries(campaignId: string): Promise<DeliveryRecord[]> {
  const response = await apiRequest<DeliveryRecord[]>(`/api/admin/communications/email?campaignId=${encodeURIComponent(campaignId)}`);
  return response.success && response.data ? response.data : [];
}

export async function tickJobs(limit = 30) {
  const response = await apiRequest<{
    processed: number;
    sent: number;
    failed: number;
    remainingApprox: number;
  }>("/api/admin/jobs/tick", {
    method: "POST",
    body: JSON.stringify({ limit }),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron completar los envíos pendientes");
  }

  return response.data;
}
