export type TenantRole = "owner" | "admin" | "staff";

export interface TenantContext {
  userId: string;
  tenantId: string;
  role: TenantRole;
}

export interface TenantMembership {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  role: TenantRole;
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
