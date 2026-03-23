import { apiRequest } from "./client";

export type OrganizationRole = "owner" | "admin" | "manager" | "member";

export interface OrganizationAccessSnapshot {
  organization: {
    id: string;
    name: string;
    slug: string;
    kind: "school" | "association";
    role: OrganizationRole;
  };
  billing: {
    planType: "starter" | "pro" | "enterprise";
    multiSiteEnabled: boolean;
  };
  linkedSchools: Array<{
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    isPrimary: boolean;
    address: string | null;
    city: string | null;
    stats: {
      students: number;
      classes: number;
      teachers: number;
      confirmedEnrollments: number;
    };
  }>;
  members: Array<{
    userId: string;
    role: OrganizationRole;
    isActive: boolean;
    email: string | null;
    displayName: string | null;
  }>;
  availableSchoolsToLink: Array<{
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
  }>;
}

async function expectSnapshotResponse(
  promise: Promise<{ success: boolean; data?: OrganizationAccessSnapshot; error?: { message: string } }>
): Promise<OrganizationAccessSnapshot> {
  const response = await promise;
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo cargar la gestión de organización.");
  }

  return response.data;
}

export async function getOrganizationAccessSnapshot() {
  return expectSnapshotResponse(apiRequest<OrganizationAccessSnapshot>("/api/admin/organizations"));
}

export async function addOrganizationMember(input: { email: string; role: OrganizationRole; inviteRedirectUrl?: string }) {
  return expectSnapshotResponse(
    apiRequest<OrganizationAccessSnapshot>("/api/admin/organizations", {
      method: "POST",
      body: JSON.stringify({
        action: "addMember",
        email: input.email,
        role: input.role,
        inviteRedirectUrl: input.inviteRedirectUrl || undefined,
      }),
    })
  );
}

export async function updateOrganizationMemberRole(input: { userId: string; role: OrganizationRole }) {
  return expectSnapshotResponse(
    apiRequest<OrganizationAccessSnapshot>("/api/admin/organizations", {
      method: "PATCH",
      body: JSON.stringify({
        action: "updateMemberRole",
        userId: input.userId,
        role: input.role,
      }),
    })
  );
}

export async function toggleOrganizationMemberActive(input: { userId: string; isActive: boolean }) {
  return expectSnapshotResponse(
    apiRequest<OrganizationAccessSnapshot>("/api/admin/organizations", {
      method: "PATCH",
      body: JSON.stringify({
        action: "toggleMemberActive",
        userId: input.userId,
        isActive: input.isActive,
      }),
    })
  );
}

export async function removeOrganizationMember(userId: string) {
  const query = new URLSearchParams({ action: "removeMember", userId });
  return expectSnapshotResponse(
    apiRequest<OrganizationAccessSnapshot>(`/api/admin/organizations?${query.toString()}`, {
      method: "DELETE",
    })
  );
}

export async function linkSchoolToOrganization(tenantId: string) {
  return expectSnapshotResponse(
    apiRequest<OrganizationAccessSnapshot>("/api/admin/organizations", {
      method: "POST",
      body: JSON.stringify({
        action: "linkSchool",
        tenantId,
      }),
    })
  );
}

export async function unlinkSchoolFromOrganization(tenantId: string) {
  const query = new URLSearchParams({ action: "unlinkSchool", tenantId });
  return expectSnapshotResponse(
    apiRequest<OrganizationAccessSnapshot>(`/api/admin/organizations?${query.toString()}`, {
      method: "DELETE",
    })
  );
}

export async function setOrganizationPrimarySchool(tenantId: string) {
  return expectSnapshotResponse(
    apiRequest<OrganizationAccessSnapshot>("/api/admin/organizations", {
      method: "PATCH",
      body: JSON.stringify({
        action: "setPrimarySchool",
        tenantId,
      }),
    })
  );
}

export async function updateOrganizationLinkedSchool(input: {
  tenantId: string;
  tenantName: string;
  tenantSlug?: string;
}) {
  return expectSnapshotResponse(
    apiRequest<OrganizationAccessSnapshot>("/api/admin/organizations", {
      method: "PATCH",
      body: JSON.stringify({
        action: "updateLinkedSchool",
        tenantId: input.tenantId,
        tenantName: input.tenantName,
        tenantSlug: input.tenantSlug || undefined,
      }),
    })
  );
}

export async function createOrganizationLinkedSchool(input: {
  tenantName: string;
  tenantSlug?: string;
  copyTeachers?: boolean;
}) {
  return expectSnapshotResponse(
    apiRequest<OrganizationAccessSnapshot>("/api/admin/organizations", {
      method: "POST",
      body: JSON.stringify({
        action: "createLinkedSchool",
        tenantName: input.tenantName,
        tenantSlug: input.tenantSlug || undefined,
        copyTeachers: input.copyTeachers === true,
      }),
    })
  );
}