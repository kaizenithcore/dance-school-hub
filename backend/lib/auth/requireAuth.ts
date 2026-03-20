import type { NextRequest } from "next/server";
import { fail } from "@/lib/http";
import {
  buildTenantContextFromMembership,
  findMembershipByTenantId,
  getAccessTokenFromRequest,
  getSelectedOrganizationId,
} from "@/lib/auth/tenantContext";
import { isDemoTenantSlug } from "@/lib/constants/demoTenant";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import type {
  AuthenticatedUser,
  OrganizationKind,
  OrganizationMembership,
  OrganizationRole,
  TenantMembership,
} from "@/types/domain";

interface OrganizationTenantLinkRow {
  organization_id: string;
  tenant_id: string;
  is_primary: boolean;
}

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface OrganizationMembershipRow {
  organization_id: string;
  role: OrganizationRole;
  organizations:
    | {
        name: string;
        slug: string;
        kind: OrganizationKind;
      }
    | Array<{
        name: string;
        slug: string;
        kind: OrganizationKind;
      }>
    | null;
}

export interface AuthResult {
  authorized: boolean;
  user?: AuthenticatedUser;
  memberships?: TenantMembership[];
  organizations?: OrganizationMembership[];
  activeOrganization?: OrganizationMembership | null;
  context?: ReturnType<typeof buildTenantContextFromMembership>;
  response?: ReturnType<typeof fail>;
}

async function fetchTenantMemberships(userId: string): Promise<TenantMembership[]> {
  const { data, error } = await supabaseAdmin
    .from("tenant_memberships")
    .select("tenant_id, role, tenants(name, slug, created_at)")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    throw new Error(`Unable to resolve tenant memberships: ${error.message}`);
  }

  return (data ?? [])
    .map((row): TenantMembership | null => {
      const tenant = Array.isArray(row.tenants) ? row.tenants[0] : row.tenants;
      if (!tenant?.name || !tenant.slug || !tenant.created_at) {
        return null;
      }

      return {
        tenantId: row.tenant_id,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        tenantCreatedAt: tenant.created_at,
        role: row.role,
        organizationId: null,
        organizationName: null,
        organizationSlug: null,
        organizationKind: null,
        organizationRole: null,
      };
    })
    .filter((item): item is TenantMembership => item !== null);
}

async function fetchOrganizationMemberships(userId: string): Promise<OrganizationMembership[]> {
  const { data, error } = await supabaseAdmin
    .from("organization_memberships")
    .select("organization_id, role, organizations(name, slug, kind)")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    if (error.message.toLowerCase().includes("organization_memberships")) {
      return [];
    }
    throw new Error(`Unable to resolve organization memberships: ${error.message}`);
  }

  const rows = (data ?? []) as OrganizationMembershipRow[];
  if (rows.length === 0) {
    return [];
  }

  const organizationIds = rows.map((row) => row.organization_id);
  const { data: tenantLinks, error: tenantLinksError } = await supabaseAdmin
    .from("organization_tenants")
    .select("organization_id, tenant_id, is_primary")
    .in("organization_id", organizationIds);

  if (tenantLinksError) {
    throw new Error(`Unable to resolve organization tenants: ${tenantLinksError.message}`);
  }

  const linksByOrganization = new Map<string, OrganizationTenantLinkRow[]>();
  for (const link of (tenantLinks ?? []) as OrganizationTenantLinkRow[]) {
    const bucket = linksByOrganization.get(link.organization_id) ?? [];
    bucket.push(link);
    linksByOrganization.set(link.organization_id, bucket);
  }

  return rows
    .map((row) => {
      const organization = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;
      if (!organization?.name || !organization.slug || !organization.kind) {
        return null;
      }

      const links = linksByOrganization.get(row.organization_id) ?? [];
      const primaryLink = links.find((link) => link.is_primary) ?? null;

      return {
        organizationId: row.organization_id,
        organizationName: organization.name,
        organizationSlug: organization.slug,
        organizationKind: organization.kind,
        role: row.role,
        tenantIds: links.map((link) => link.tenant_id),
        primaryTenantId: primaryLink?.tenant_id ?? null,
      } satisfies OrganizationMembership;
    })
    .filter((item): item is OrganizationMembership => item !== null);
}

function mapOrganizationRoleToTenantRole(role: OrganizationRole): TenantMembership["role"] {
  if (role === "owner") {
    return "owner";
  }

  if (role === "admin" || role === "manager") {
    return "admin";
  }

  return "staff";
}

async function fetchTenantsByIds(tenantIds: string[]): Promise<TenantRow[]> {
  if (tenantIds.length === 0) {
    return [];
  }

  const uniqueTenantIds = Array.from(new Set(tenantIds));
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("id, name, slug, created_at")
    .in("id", uniqueTenantIds)
    .eq("is_active", true);

  if (error) {
    throw new Error(`Unable to load tenants for organization memberships: ${error.message}`);
  }

  return (data ?? []) as TenantRow[];
}

function resolveMembershipOrganization(
  tenantId: string,
  organizations: OrganizationMembership[]
): OrganizationMembership | null {
  const linkedOrganizations = organizations.filter((organization) => organization.tenantIds.includes(tenantId));
  if (linkedOrganizations.length === 0) {
    return null;
  }

  const directSchoolOrganization = linkedOrganizations.find(
    (organization) =>
      organization.organizationKind === "school" && organization.primaryTenantId === tenantId
  );

  return directSchoolOrganization ?? linkedOrganizations[0];
}

async function buildTenantMembershipsFromOrganizations(
  organizations: OrganizationMembership[]
): Promise<TenantMembership[]> {
  const tenantIds = organizations.flatMap((organization) => organization.tenantIds);
  const tenants = await fetchTenantsByIds(tenantIds);

  const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant]));
  const result: TenantMembership[] = [];

  for (const organization of organizations) {
    for (const tenantId of organization.tenantIds) {
      const tenant = tenantById.get(tenantId);
      if (!tenant) {
        continue;
      }

      result.push({
        tenantId,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        tenantCreatedAt: tenant.created_at,
        role: mapOrganizationRoleToTenantRole(organization.role),
        organizationId: organization.organizationId,
        organizationName: organization.organizationName,
        organizationSlug: organization.organizationSlug,
        organizationKind: organization.organizationKind,
        organizationRole: organization.role,
      });
    }
  }

  return result;
}

function mergeTenantMemberships(
  tenantMemberships: TenantMembership[],
  organizationMemberships: TenantMembership[],
  organizations: OrganizationMembership[]
): TenantMembership[] {
  const mergedByTenantId = new Map<string, TenantMembership>();

  for (const membership of tenantMemberships) {
    mergedByTenantId.set(membership.tenantId, membership);
  }

  for (const membership of organizationMemberships) {
    if (!mergedByTenantId.has(membership.tenantId)) {
      mergedByTenantId.set(membership.tenantId, membership);
    }
  }

  return Array.from(mergedByTenantId.values()).map((membership) => {
    const organization = resolveMembershipOrganization(membership.tenantId, organizations);
    if (!organization) {
      return membership;
    }

    return {
      ...membership,
      organizationId: organization.organizationId,
      organizationName: organization.organizationName,
      organizationSlug: organization.organizationSlug,
      organizationKind: organization.organizationKind,
      organizationRole: organization.role,
    };
  });
}

function resolveActiveOrganization(
  selectedMembership: TenantMembership,
  organizations: OrganizationMembership[]
): OrganizationMembership | null {
  const directSchoolOrganization = organizations.find(
    (organization) =>
      organization.organizationKind === "school" && organization.primaryTenantId === selectedMembership.tenantId
  );
  if (directSchoolOrganization) {
    return directSchoolOrganization;
  }

  return (
    organizations.find((organization) => organization.tenantIds.includes(selectedMembership.tenantId)) ?? null
  );
}

function getTenantCandidatesByOrganization(
  memberships: TenantMembership[],
  organizations: OrganizationMembership[],
  organizationId: string | null
): TenantMembership[] {
  if (!organizationId) {
    return memberships;
  }

  const organization = organizations.find((item) => item.organizationId === organizationId);
  if (!organization) {
    return [];
  }

  const tenantIds = new Set(organization.tenantIds);
  return memberships.filter((membership) => tenantIds.has(membership.tenantId));
}

function resolveTenantIdWithinOrganization(
  request: NextRequest,
  memberships: TenantMembership[],
  organizations: OrganizationMembership[],
  organizationId: string | null
): string | null {
  const candidateMemberships = getTenantCandidatesByOrganization(memberships, organizations, organizationId);
  if (candidateMemberships.length === 0) {
    return null;
  }

  const requestedTenantId =
    request.headers.get("x-tenant-id") ?? request.nextUrl.searchParams.get("tenantId");
  if (requestedTenantId) {
    const requestedMembership = candidateMemberships.find(
      (membership) => membership.tenantId === requestedTenantId
    );
    if (requestedMembership) {
      return requestedMembership.tenantId;
    }
  }

  if (!organizationId) {
    return candidateMemberships[0]?.tenantId ?? null;
  }

  const organization = organizations.find((item) => item.organizationId === organizationId) ?? null;
  if (!organization) {
    return null;
  }

  if (organization.primaryTenantId) {
    const preferredMembership = candidateMemberships.find(
      (membership) => membership.tenantId === organization.primaryTenantId
    );
    if (preferredMembership) {
      return preferredMembership.tenantId;
    }
  }

  return candidateMemberships[0]?.tenantId ?? null;
}

async function resolveDemoMembership(tenantSlug: string): Promise<TenantMembership | null> {
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("id, name, slug, created_at")
    .eq("slug", tenantSlug)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    tenantId: data.id,
    tenantName: data.name,
    tenantSlug: data.slug,
    tenantCreatedAt: data.created_at,
    role: "owner",
    organizationId: data.id,
    organizationName: data.name,
    organizationSlug: data.slug,
    organizationKind: "school",
    organizationRole: "owner",
  };
}

export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const demoTenantSlug = request.headers.get("x-demo-tenant") ?? request.nextUrl.searchParams.get("demo");
  if (isDemoTenantSlug(String(demoTenantSlug || ""))) {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) {
      return {
        authorized: false,
        response: fail(
          {
            code: "demo_mode",
            message: "Modo demo: las funciones de guardado están deshabilitadas.",
          },
          403
        ),
      };
    }

    const membership = await resolveDemoMembership(demoTenantSlug as string);
    if (!membership) {
      return {
        authorized: false,
        response: fail(
          {
            code: "not_found",
            message: "Demo tenant no disponible.",
          },
          404
        ),
      };
    }

    return {
      authorized: true,
      user: {
        id: "demo-user",
        email: "demo@dancehub.es",
      },
      memberships: [membership],
      organizations: [
        {
          organizationId: membership.organizationId ?? membership.tenantId,
          organizationName: membership.organizationName ?? membership.tenantName,
          organizationSlug: membership.organizationSlug ?? membership.tenantSlug,
          organizationKind: membership.organizationKind ?? "school",
          role: membership.organizationRole ?? "owner",
          tenantIds: [membership.tenantId],
          primaryTenantId: membership.tenantId,
        },
      ],
      activeOrganization: {
        organizationId: membership.organizationId ?? membership.tenantId,
        organizationName: membership.organizationName ?? membership.tenantName,
        organizationSlug: membership.organizationSlug ?? membership.tenantSlug,
        organizationKind: membership.organizationKind ?? "school",
        role: membership.organizationRole ?? "owner",
        tenantIds: [membership.tenantId],
        primaryTenantId: membership.tenantId,
      },
      context: buildTenantContextFromMembership("demo-user", membership),
    };
  }

  const accessToken = getAccessTokenFromRequest(request);

  if (!accessToken) {
    return {
      authorized: false,
      response: fail(
        {
          code: "unauthorized",
          message: "Missing bearer token.",
        },
        401
      ),
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !user) {
    return {
      authorized: false,
      response: fail(
        {
          code: "unauthorized",
          message: "Invalid or expired token.",
          details: userError?.message,
        },
        401
      ),
    };
  }

  let memberships: TenantMembership[];
  let organizations: OrganizationMembership[];

  try {
    memberships = await fetchTenantMemberships(user.id);
    organizations = await fetchOrganizationMemberships(user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load memberships.";
    return {
      authorized: false,
      response: fail(
        {
          code: "auth_context_failed",
          message,
        },
        500
      ),
    };
  }

  let mergedMemberships: TenantMembership[];
  try {
    const organizationDerivedMemberships = await buildTenantMembershipsFromOrganizations(organizations);
    mergedMemberships = mergeTenantMemberships(memberships, organizationDerivedMemberships, organizations);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to resolve memberships from organizations.";
    return {
      authorized: false,
      response: fail(
        {
          code: "auth_context_failed",
          message,
        },
        500
      ),
    };
  }

  if (mergedMemberships.length === 0) {
    return {
      authorized: false,
      response: fail(
        {
          code: "forbidden",
          message: "User has no active memberships for any tenant.",
        },
        403
      ),
    };
  }

  const selectedOrganizationId = getSelectedOrganizationId(request, organizations);

  const selectedTenantId = resolveTenantIdWithinOrganization(
    request,
    mergedMemberships,
    organizations,
    selectedOrganizationId
  );

  if (!selectedTenantId) {
    return {
      authorized: false,
      response: fail(
        {
          code: "forbidden",
          message: "Unable to determine active tenant for the selected organization.",
        },
        403
      ),
    };
  }

  const enrichedSelectedMembership = findMembershipByTenantId(mergedMemberships, selectedTenantId);
  if (!enrichedSelectedMembership) {
    return {
      authorized: false,
      response: fail(
        {
          code: "forbidden",
          message: "Requested tenant is not available for this user.",
        },
        403
      ),
    };
  }

  const activeOrganization = selectedOrganizationId
    ? organizations.find((organization) => organization.organizationId === selectedOrganizationId) ?? null
    : resolveActiveOrganization(enrichedSelectedMembership, organizations);

  return {
    authorized: true,
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    memberships: mergedMemberships,
    organizations,
    activeOrganization,
    context: buildTenantContextFromMembership(user.id, enrichedSelectedMembership),
  };
}
