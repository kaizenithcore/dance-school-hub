import { resolveAccessToken } from "./client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export type CrmStatus = "new" | "contacted" | "active" | "at_risk" | "churned";

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  ownerEmail: string;
  planType: string;
  trialPaymentCompleted: boolean;
  trialExpiresAt: string | null;
  daysUntilTrialExpiry: number | null;
  activeStudents: number;
  maxStudents: number;
  usagePct: number;
  totalEnrollments: number;
  totalPaymentsCents: number;
  lastStudentAt: string | null;
  isNew: boolean;
  crmStatus: CrmStatus;
  crmLastNote: string | null;
}

export interface CrmNote {
  id: string;
  tenantId: string;
  note: string | null;
  status: CrmStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TenantDetail extends TenantSummary {
  crmNotes: CrmNote[];
}

async function platformFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await resolveAccessToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers: { ...headers, ...options?.headers } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: { message?: string } })?.error?.message || `HTTP ${res.status}`);
  }
  const body = await res.json() as { data: T };
  return body.data;
}

export const getAllTenants = () => platformFetch<TenantSummary[]>("/api/platform/tenants");
export const getTenantDetail = (id: string) => platformFetch<TenantDetail>(`/api/platform/tenants/${id}`);
export const saveCrmNote = (id: string, note: string, status: CrmStatus) =>
  platformFetch<CrmNote>(`/api/platform/tenants/${id}/crm`, {
    method: "POST",
    body: JSON.stringify({ note, status }),
  });
export const updateCrmStatus = (id: string, status: CrmStatus) =>
  platformFetch(`/api/platform/tenants/${id}/crm`, {
    method: "POST",
    body: JSON.stringify({ note: "", status }),
  });
