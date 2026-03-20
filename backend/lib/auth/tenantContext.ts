import type { NextRequest } from "next/server";
import type { OrganizationMembership, TenantMembership } from "@/types/domain";

function parseBearerToken(authorization: string | null): string | null {
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (!scheme || !token) {
    return null;
  }

  if (scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token.trim() || null;
}

export function getAccessTokenFromRequest(request: NextRequest): string | null {
  const fromHeader = parseBearerToken(request.headers.get("authorization"));
  if (fromHeader) {
    return fromHeader;
  }

  const cookieToken = request.cookies.get("sb-access-token")?.value;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

export function getSelectedTenantId(request: NextRequest, memberships: TenantMembership[]): string | null {
  const requestedTenantId = request.headers.get("x-tenant-id") ?? request.nextUrl.searchParams.get("tenantId");
  if (requestedTenantId) {
    const matchingMembership = memberships.find((membership) => membership.tenantId === requestedTenantId);
    if (matchingMembership) {
      return matchingMembership.tenantId;
    }
  }

  if (memberships.length === 0) {
    return null;
  }

  return memberships[0].tenantId;
}

export function getSelectedOrganizationId(
  request: NextRequest,
  organizations: OrganizationMembership[]
): string | null {
  const requestedOrganizationId =
    request.headers.get("x-organization-id") ?? request.nextUrl.searchParams.get("organizationId");

  if (requestedOrganizationId) {
    const matchingOrganization = organizations.find(
      (organization) => organization.organizationId === requestedOrganizationId
    );
    if (matchingOrganization) {
      return matchingOrganization.organizationId;
    }
  }

  if (organizations.length === 0) {
    return null;
  }

  return organizations[0].organizationId;
}

export function findMembershipByTenantId(
  memberships: TenantMembership[],
  tenantId: string
): TenantMembership | null {
  const membership = memberships.find((item) => item.tenantId === tenantId);
  if (!membership) {
    return null;
  }

  return membership;
}

export function buildTenantContextFromMembership(userId: string, membership: TenantMembership) {
  return {
    userId,
    tenantId: membership.tenantId,
    role: membership.role,
    organizationId: membership.organizationId,
    organizationRole: membership.organizationRole,
  };
}
