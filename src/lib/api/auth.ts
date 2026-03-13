import { apiRequest } from "./client";

export interface TenantMembership {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantCreatedAt: string;
  role: "owner" | "admin" | "staff";
}

export interface AuthContextResponse {
  user: {
    id: string;
    email: string | null;
  };
  tenant: {
    id: string;
    role: "owner" | "admin" | "staff";
  };
  memberships: TenantMembership[];
}

export interface CreateTenantRequest {
  tenantName: string;
  tenantSlug: string;
  ownerEmail: string;
  ownerDisplayName?: string;
  ownerPassword: string;
}

export interface CreateTenantResponse {
  tenantId: string;
  tenantSlug: string;
  ownerUserId: string;
  role: "owner" | "admin" | "staff";
}

export async function createTenant(payload: CreateTenantRequest) {
  return apiRequest<CreateTenantResponse>("/api/tenants", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAuthContext(tenantId?: string) {
  const endpoint = tenantId ? `/api/auth/me?tenantId=${tenantId}` : "/api/auth/me";
  return apiRequest<AuthContextResponse>(endpoint);
}
