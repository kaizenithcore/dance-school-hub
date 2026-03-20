export type TenantRole = "owner" | "admin" | "staff";
export type OrganizationKind = "school" | "association";
export type OrganizationRole = "owner" | "admin" | "manager" | "member";

export interface TenantContext {
  userId: string;
  tenantId: string;
  role: TenantRole;
  organizationId: string | null;
  organizationRole: OrganizationRole | null;
}

export interface TenantMembership {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantCreatedAt: string;
  role: TenantRole;
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

export interface AuthenticatedUser {
  id: string;
  email: string | null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
