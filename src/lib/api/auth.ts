import { apiRequest } from "./client";

export type OrganizationKind = "school" | "association";
export type OrganizationRole = "owner" | "admin" | "manager" | "member";

export interface TenantMembership {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantCreatedAt: string;
  role: "owner" | "admin" | "staff";
  organizationId: string | null;
  organizationName: string | null;
  organizationSlug: string | null;
  organizationKind: OrganizationKind | null;
  organizationRole: OrganizationRole | null;
}

export interface OrganizationMembership {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationKind: OrganizationKind;
  role: OrganizationRole;
  tenantIds: string[];
  primaryTenantId: string | null;
}

export interface AuthContextResponse {
  user: {
    id: string;
    email: string | null;
  };
  tenant: {
    id: string;
    role: "owner" | "admin" | "staff";
    organizationId: string | null;
    organizationRole: OrganizationRole | null;
  };
  memberships: TenantMembership[];
  organizations: OrganizationMembership[];
  activeOrganization: OrganizationMembership | null;
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

interface GetAuthContextOptions {
  tenantId?: string;
  organizationId?: string;
}

export async function getAuthContext(options: GetAuthContextOptions = {}) {
  const params = new URLSearchParams();
  if (options.tenantId) {
    params.set("tenantId", options.tenantId);
  }
  if (options.organizationId) {
    params.set("organizationId", options.organizationId);
  }

  const endpoint = params.size > 0 ? `/api/auth/me?${params.toString()}` : "/api/auth/me";
  return apiRequest<AuthContextResponse>(endpoint);
}
