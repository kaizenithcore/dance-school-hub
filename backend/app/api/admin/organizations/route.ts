import type { NextRequest } from "next/server";
import { handleCorsPreFlight } from "@/lib/cors";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import type { OrganizationRole } from "@/types/domain";
import { examSuiteFeatureService } from "@/lib/services/examSuiteFeatureService";
import { featureEntitlementsService } from "@/lib/services/featureEntitlementsService";

type TenantRole = "owner" | "admin" | "staff";

interface LinkedSchool {
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
}

interface OrganizationMember {
  userId: string;
  role: OrganizationRole;
  isActive: boolean;
  email: string | null;
  displayName: string | null;
}

interface OrganizationAccessSnapshot {
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
  linkedSchools: LinkedSchool[];
  members: OrganizationMember[];
  availableSchoolsToLink: Array<{
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
  }>;
}

function canManageOrganization(role: OrganizationRole | null | undefined) {
  return role === "owner" || role === "admin";
}

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeOrganizationRole(value: unknown): OrganizationRole | null {
  if (value === "owner" || value === "admin" || value === "manager" || value === "member") {
    return value;
  }

  return null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractPublicProfile(enrollmentConfig: unknown): { address: string | null; city: string | null } {
  const config = asRecord(enrollmentConfig);
  const source = asRecord(config.public_profile ?? config.publicProfile);

  return {
    address: asTrimmedString(source.address),
    city: asTrimmedString(source.city),
  };
}

function mapOrganizationRoleToTenantRole(role: OrganizationRole): TenantRole {
  if (role === "owner") {
    return "owner";
  }

  if (role === "admin" || role === "manager") {
    return "admin";
  }

  return "staff";
}

async function ensureLinkedTenantMemberships(
  organizationId: string,
  userId: string,
  organizationRole: OrganizationRole,
  isActive: boolean
) {
  const { data: links, error: linksError } = await supabaseAdmin
    .from("organization_tenants")
    .select("tenant_id")
    .eq("organization_id", organizationId);

  if (linksError) {
    throw new Error(`No se pudieron cargar las escuelas vinculadas: ${linksError.message}`);
  }

  const rows = (links ?? []).map((link) => ({
    tenant_id: link.tenant_id,
    user_id: userId,
    role: mapOrganizationRoleToTenantRole(organizationRole),
    is_active: isActive,
  }));

  if (rows.length === 0) {
    return;
  }

  const { error: upsertError } = await supabaseAdmin.from("tenant_memberships").upsert(rows, {
    onConflict: "tenant_id,user_id",
  });

  if (upsertError) {
    throw new Error(`No se pudieron sincronizar accesos por escuela: ${upsertError.message}`);
  }
}

async function getSnapshot(userId: string, organizationId: string, tenantId: string): Promise<OrganizationAccessSnapshot> {
  const { data: organization, error: organizationError } = await supabaseAdmin
    .from("organizations")
    .select("id, name, slug, kind")
    .eq("id", organizationId)
    .single();

  if (organizationError || !organization) {
    throw new Error("No se encontró la organización activa.");
  }

  const { data: myMembership, error: myMembershipError } = await supabaseAdmin
    .from("organization_memberships")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (myMembershipError || !myMembership) {
    throw new Error("No tienes membresía activa en esta organización.");
  }

  const { data: linkedSchoolsRows, error: linkedSchoolsError } = await supabaseAdmin
    .from("organization_tenants")
    .select("tenant_id, is_primary, tenants(name, slug)")
    .eq("organization_id", organizationId)
    .order("display_order", { ascending: true });

  if (linkedSchoolsError) {
    throw new Error(`No se pudieron cargar las escuelas vinculadas: ${linkedSchoolsError.message}`);
  }

  const linkedSchools = (linkedSchoolsRows ?? [])
    .map((row): LinkedSchool | null => {
      const tenant = Array.isArray(row.tenants) ? row.tenants[0] : row.tenants;
      if (!tenant?.name || !tenant.slug) {
        return null;
      }

      return {
        tenantId: row.tenant_id,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        isPrimary: Boolean(row.is_primary),
        address: null,
        city: null,
        stats: {
          students: 0,
          classes: 0,
          teachers: 0,
          confirmedEnrollments: 0,
        },
      };
    })
    .filter((row): row is LinkedSchool => row !== null);

  const linkedTenantIds = linkedSchools.map((item) => item.tenantId);

  const { data: schoolSettingsRows, error: schoolSettingsError } = await supabaseAdmin
    .from("school_settings")
    .select("tenant_id, enrollment_config")
    .in("tenant_id", linkedTenantIds);

  if (schoolSettingsError) {
    throw new Error(`No se pudo cargar configuración pública de sedes: ${schoolSettingsError.message}`);
  }

  const profileByTenantId = new Map<string, { address: string | null; city: string | null }>();
  for (const row of schoolSettingsRows ?? []) {
    profileByTenantId.set(row.tenant_id, extractPublicProfile(row.enrollment_config));
  }

  const statsByTenantId = new Map<
    string,
    {
      students: number;
      classes: number;
      teachers: number;
      confirmedEnrollments: number;
    }
  >();

  await Promise.all(
    linkedTenantIds.map(async (linkedTenantId) => {
      const [studentsResult, classesResult, teachersResult, enrollmentsResult] = await Promise.all([
        supabaseAdmin
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", linkedTenantId)
          .eq("status", "active"),
        supabaseAdmin
          .from("classes")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", linkedTenantId)
          .eq("status", "active"),
        supabaseAdmin
          .from("teachers")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", linkedTenantId)
          .eq("status", "active"),
        supabaseAdmin
          .from("enrollments")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", linkedTenantId)
          .eq("status", "confirmed"),
      ]);

      if (studentsResult.error) {
        throw new Error(`No se pudo contar alumnos por sede: ${studentsResult.error.message}`);
      }

      if (classesResult.error) {
        throw new Error(`No se pudo contar clases por sede: ${classesResult.error.message}`);
      }

      if (teachersResult.error) {
        throw new Error(`No se pudo contar profesorado por sede: ${teachersResult.error.message}`);
      }

      if (enrollmentsResult.error) {
        throw new Error(`No se pudo contar matrículas por sede: ${enrollmentsResult.error.message}`);
      }

      statsByTenantId.set(linkedTenantId, {
        students: studentsResult.count ?? 0,
        classes: classesResult.count ?? 0,
        teachers: teachersResult.count ?? 0,
        confirmedEnrollments: enrollmentsResult.count ?? 0,
      });
    })
  );

  const linkedSchoolsWithStats = linkedSchools.map((school) => {
    const profile = profileByTenantId.get(school.tenantId) ?? { address: null, city: null };
    const stats = statsByTenantId.get(school.tenantId) ?? {
      students: 0,
      classes: 0,
      teachers: 0,
      confirmedEnrollments: 0,
    };

    return {
      ...school,
      address: profile.address,
      city: profile.city,
      stats,
    };
  });

  const { data: membersRows, error: membersError } = await supabaseAdmin
    .from("organization_memberships")
    .select("user_id, role, is_active")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (membersError) {
    throw new Error(`No se pudieron cargar los miembros: ${membersError.message}`);
  }

  const memberUserIds = Array.from(new Set((membersRows ?? []).map((row) => row.user_id)));

  const { data: profileRows, error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .select("id, email, display_name")
    .in("id", memberUserIds);

  if (profileError) {
    throw new Error(`No se pudieron cargar los perfiles de usuario: ${profileError.message}`);
  }

  const profileByUserId = new Map(
    (profileRows ?? []).map((row) => [row.id, { email: row.email ?? null, displayName: row.display_name ?? null }])
  );

  const members = (membersRows ?? []).map((row) => {
    const profile = profileByUserId.get(row.user_id) ?? { email: null, displayName: null };
    return {
      userId: row.user_id,
      role: row.role,
      isActive: Boolean(row.is_active),
      email: profile.email,
      displayName: profile.displayName,
    } satisfies OrganizationMember;
  });

  const { data: myTenantRows, error: myTenantRowsError } = await supabaseAdmin
    .from("tenant_memberships")
    .select("tenant_id, role, tenants(name, slug)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .in("role", ["owner", "admin"]);

  if (myTenantRowsError) {
    throw new Error(`No se pudieron cargar las escuelas disponibles para vincular: ${myTenantRowsError.message}`);
  }

  const availableSchoolsToLink = (myTenantRows ?? [])
    .map((row) => {
      const tenant = Array.isArray(row.tenants) ? row.tenants[0] : row.tenants;
      if (!tenant?.name || !tenant.slug) {
        return null;
      }

      return {
        tenantId: row.tenant_id,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
      };
    })
    .filter((row): row is { tenantId: string; tenantName: string; tenantSlug: string } => row !== null)
    .filter((tenant) => !linkedTenantIds.includes(tenant.tenantId));

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      kind: organization.kind,
      role: myMembership.role,
    },
    billing: {
      planType: await resolveTenantPlanType(tenantId),
      multiSiteEnabled: await isEnterpriseMultiSiteEnabled(tenantId),
    },
    linkedSchools: linkedSchoolsWithStats,
    members,
    availableSchoolsToLink,
  };
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.user || !auth.activeOrganization || !auth.context) {
    return auth.response;
  }

  const featureEnabled = await examSuiteFeatureService.isEnabledForTenant(auth.context.tenantId);
  if (!featureEnabled) {
    return fail({ code: "feature_disabled", message: "Función disponible en planes Pro o ExamSuite" }, 403, origin);
  }

  try {
    const snapshot = await getSnapshot(auth.user.id, auth.activeOrganization.organizationId, auth.context.tenantId);
    return ok(snapshot, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar la gestión de organización.";
    return fail({ code: "organization_access_fetch_failed", message }, 500, origin);
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.user || !auth.activeOrganization || !auth.context) {
    return auth.response;
  }

  const featureEnabled = await examSuiteFeatureService.isEnabledForTenant(auth.context.tenantId);
  if (!featureEnabled) {
    return fail({ code: "feature_disabled", message: "Función disponible en planes Pro o ExamSuite" }, 403, origin);
  }

  if (!canManageOrganization(auth.context?.organizationRole)) {
    return fail({ code: "forbidden", message: "No tienes permisos para gestionar esta organización." }, 403, origin);
  }

  const organizationId = auth.activeOrganization.organizationId;

  try {
    const body = await request.json();
    const action = typeof body?.action === "string" ? body.action : "";

    if (action === "addMember") {
      const email = normalizeEmail(body.email);
      const role = normalizeOrganizationRole(body.role);
      const inviteRedirectUrl = typeof body.inviteRedirectUrl === "string" ? body.inviteRedirectUrl.trim() : "";

      if (!email || !role) {
        return fail({ code: "invalid_request", message: "email y role son obligatorios." }, 400, origin);
      }

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("user_profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (profileError) {
        return fail({ code: "profile_fetch_failed", message: profileError.message }, 500, origin);
      }

      if (!profile) {
        const inviteResult = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          redirectTo: inviteRedirectUrl || undefined,
        });

        if (inviteResult.error || !inviteResult.data?.user?.id) {
          return fail(
            {
              code: "invite_failed",
              message: inviteResult.error?.message || "No se pudo enviar la invitación por email.",
            },
            500,
            origin
          );
        }

        const invitedUserId = inviteResult.data.user.id;
        const { error: profileUpsertError } = await supabaseAdmin.from("user_profiles").upsert(
          {
            id: invitedUserId,
            email,
            display_name: null,
          },
          { onConflict: "id" }
        );

        if (profileUpsertError) {
          return fail({ code: "profile_upsert_failed", message: profileUpsertError.message }, 500, origin);
        }

        const { error: membershipError } = await supabaseAdmin.from("organization_memberships").upsert(
          {
            organization_id: organizationId,
            user_id: invitedUserId,
            role,
            is_active: true,
          },
          {
            onConflict: "organization_id,user_id",
          }
        );

        if (membershipError) {
          return fail({ code: "membership_upsert_failed", message: membershipError.message }, 500, origin);
        }

        await ensureLinkedTenantMemberships(organizationId, invitedUserId, role, true);

        const snapshot = await getSnapshot(auth.user.id, organizationId, auth.context.tenantId);
        return ok(snapshot, 200, origin);
      }

      const { error: membershipError } = await supabaseAdmin.from("organization_memberships").upsert(
        {
          organization_id: organizationId,
          user_id: profile.id,
          role,
          is_active: true,
        },
        {
          onConflict: "organization_id,user_id",
        }
      );

      if (membershipError) {
        return fail({ code: "membership_upsert_failed", message: membershipError.message }, 500, origin);
      }

      await ensureLinkedTenantMemberships(organizationId, profile.id, role, true);
    } else if (action === "createLinkedSchool") {
      const tenantName = typeof body.tenantName === "string" ? body.tenantName.trim() : "";
      const tenantSlug = typeof body.tenantSlug === "string" ? body.tenantSlug.trim() : "";
      const copyTeachers = body.copyTeachers === true;

      if (!tenantName) {
        return fail({ code: "invalid_request", message: "tenantName es obligatorio." }, 400, origin);
      }

      const multiSiteEnabled = await isEnterpriseMultiSiteEnabled(auth.context.tenantId);
      if (!multiSiteEnabled) {
        return fail({ code: "feature_disabled", message: "Multi-sede disponible solo en plan Enterprise." }, 403, origin);
      }

      await createLinkedSchool({
        organizationId,
        tenantName,
        tenantSlug: tenantSlug || undefined,
        copyTeachersFromTenantId: copyTeachers ? auth.context.tenantId : undefined,
      });
    } else if (action === "linkSchool") {
      const tenantId = typeof body.tenantId === "string" ? body.tenantId : "";

      if (!tenantId) {
        return fail({ code: "invalid_request", message: "tenantId es obligatorio." }, 400, origin);
      }

      const multiSiteEnabled = await isEnterpriseMultiSiteEnabled(auth.context.tenantId);
      if (!multiSiteEnabled) {
        return fail({ code: "feature_disabled", message: "Multi-sede disponible solo en plan Enterprise." }, 403, origin);
      }

      const { error: linkError } = await supabaseAdmin.from("organization_tenants").upsert(
        {
          organization_id: organizationId,
          tenant_id: tenantId,
          is_primary: false,
        },
        {
          onConflict: "organization_id,tenant_id",
        }
      );

      if (linkError) {
        return fail({ code: "link_school_failed", message: linkError.message }, 500, origin);
      }

      const { data: memberRows, error: memberRowsError } = await supabaseAdmin
        .from("organization_memberships")
        .select("user_id, role, is_active")
        .eq("organization_id", organizationId);

      if (memberRowsError) {
        return fail({ code: "membership_fetch_failed", message: memberRowsError.message }, 500, origin);
      }

      for (const member of memberRows ?? []) {
        const { error: tenantMembershipError } = await supabaseAdmin.from("tenant_memberships").upsert(
          {
            tenant_id: tenantId,
            user_id: member.user_id,
            role: mapOrganizationRoleToTenantRole(member.role),
            is_active: member.is_active,
          },
          {
            onConflict: "tenant_id,user_id",
          }
        );

        if (tenantMembershipError) {
          return fail({ code: "tenant_membership_sync_failed", message: tenantMembershipError.message }, 500, origin);
        }
      }
    } else {
      return fail({ code: "invalid_request", message: "Acción no soportada." }, 400, origin);
    }

    const snapshot = await getSnapshot(auth.user.id, organizationId, auth.context.tenantId);
    return ok(snapshot, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo procesar la acción.";
    return fail({ code: "organization_access_action_failed", message }, 500, origin);
  }
}

export async function PATCH(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.user || !auth.activeOrganization || !auth.context) {
    return auth.response;
  }

  const featureEnabled = await examSuiteFeatureService.isEnabledForTenant(auth.context.tenantId);
  if (!featureEnabled) {
    return fail({ code: "feature_disabled", message: "Función disponible en planes Pro o ExamSuite" }, 403, origin);
  }

  if (!canManageOrganization(auth.context?.organizationRole)) {
    return fail({ code: "forbidden", message: "No tienes permisos para gestionar esta organización." }, 403, origin);
  }

  const organizationId = auth.activeOrganization.organizationId;

  try {
    const body = await request.json();
    const action = typeof body?.action === "string" ? body.action : "";

    if (action === "updateMemberRole") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const role = normalizeOrganizationRole(body.role);

      if (!userId || !role) {
        return fail({ code: "invalid_request", message: "userId y role son obligatorios." }, 400, origin);
      }

      const { error: updateError } = await supabaseAdmin
        .from("organization_memberships")
        .update({ role })
        .eq("organization_id", organizationId)
        .eq("user_id", userId);

      if (updateError) {
        return fail({ code: "membership_update_failed", message: updateError.message }, 500, origin);
      }

      await ensureLinkedTenantMemberships(organizationId, userId, role, true);
    } else if (action === "toggleMemberActive") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const isActive = body.isActive === true;

      if (!userId) {
        return fail({ code: "invalid_request", message: "userId es obligatorio." }, 400, origin);
      }

      const { data: membershipRow, error: membershipFetchError } = await supabaseAdmin
        .from("organization_memberships")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .maybeSingle();

      if (membershipFetchError || !membershipRow) {
        return fail({ code: "membership_not_found", message: "No se encontró la membresía." }, 404, origin);
      }

      const { error: updateError } = await supabaseAdmin
        .from("organization_memberships")
        .update({ is_active: isActive })
        .eq("organization_id", organizationId)
        .eq("user_id", userId);

      if (updateError) {
        return fail({ code: "membership_update_failed", message: updateError.message }, 500, origin);
      }

      await ensureLinkedTenantMemberships(organizationId, userId, membershipRow.role, isActive);
    } else if (action === "updateLinkedSchool") {
      const tenantId = typeof body.tenantId === "string" ? body.tenantId.trim() : "";
      const tenantName = typeof body.tenantName === "string" ? body.tenantName.trim() : "";
      const tenantSlug = typeof body.tenantSlug === "string" ? body.tenantSlug.trim() : "";

      if (!tenantId) {
        return fail({ code: "invalid_request", message: "tenantId es obligatorio." }, 400, origin);
      }

      if (!tenantName) {
        return fail({ code: "invalid_request", message: "tenantName es obligatorio." }, 400, origin);
      }

      const multiSiteEnabled = await isEnterpriseMultiSiteEnabled(auth.context.tenantId);
      if (!multiSiteEnabled) {
        return fail({ code: "feature_disabled", message: "Multi-sede disponible solo en plan Enterprise." }, 403, origin);
      }

      const { data: linkRow, error: linkError } = await supabaseAdmin
        .from("organization_tenants")
        .select("tenant_id")
        .eq("organization_id", organizationId)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (linkError) {
        return fail({ code: "link_fetch_failed", message: linkError.message }, 500, origin);
      }

      if (!linkRow) {
        return fail({ code: "not_found", message: "La sede indicada no está vinculada a esta organización." }, 404, origin);
      }

      const { data: currentTenant, error: currentTenantError } = await supabaseAdmin
        .from("tenants")
        .select("id, slug")
        .eq("id", tenantId)
        .maybeSingle();

      if (currentTenantError || !currentTenant) {
        return fail({ code: "tenant_not_found", message: "No se encontró la sede a editar." }, 404, origin);
      }

      const nextSlug = tenantSlug ? normalizeSlug(tenantSlug) : currentTenant.slug;
      if (!nextSlug) {
        return fail({ code: "invalid_request", message: "El slug de la sede es inválido." }, 400, origin);
      }

      const { data: existingTenantBySlug, error: existingTenantBySlugError } = await supabaseAdmin
        .from("tenants")
        .select("id")
        .eq("slug", nextSlug)
        .neq("id", tenantId)
        .limit(1);

      if (existingTenantBySlugError) {
        return fail({ code: "slug_validation_failed", message: existingTenantBySlugError.message }, 500, origin);
      }

      if ((existingTenantBySlug ?? []).length > 0) {
        return fail({ code: "slug_conflict", message: "El slug de la sede ya está en uso." }, 400, origin);
      }

      const { error: updateTenantError } = await supabaseAdmin
        .from("tenants")
        .update({ name: tenantName, slug: nextSlug })
        .eq("id", tenantId);

      if (updateTenantError) {
        return fail({ code: "tenant_update_failed", message: updateTenantError.message }, 500, origin);
      }

      const { error: updateOrganizationError } = await supabaseAdmin
        .from("organizations")
        .update({ name: tenantName, slug: nextSlug })
        .eq("id", tenantId);

      if (updateOrganizationError) {
        return fail({ code: "organization_update_failed", message: updateOrganizationError.message }, 500, origin);
      }
    } else if (action === "setPrimarySchool") {
      const tenantId = typeof body.tenantId === "string" ? body.tenantId : "";
      if (!tenantId) {
        return fail({ code: "invalid_request", message: "tenantId es obligatorio." }, 400, origin);
      }

      const multiSiteEnabled = await isEnterpriseMultiSiteEnabled(auth.context.tenantId);
      if (!multiSiteEnabled) {
        return fail({ code: "feature_disabled", message: "Multi-sede disponible solo en plan Enterprise." }, 403, origin);
      }

      const { error: resetPrimaryError } = await supabaseAdmin
        .from("organization_tenants")
        .update({ is_primary: false })
        .eq("organization_id", organizationId);

      if (resetPrimaryError) {
        return fail({ code: "primary_reset_failed", message: resetPrimaryError.message }, 500, origin);
      }

      const { error: setPrimaryError } = await supabaseAdmin
        .from("organization_tenants")
        .update({ is_primary: true })
        .eq("organization_id", organizationId)
        .eq("tenant_id", tenantId);

      if (setPrimaryError) {
        return fail({ code: "primary_set_failed", message: setPrimaryError.message }, 500, origin);
      }
    } else {
      return fail({ code: "invalid_request", message: "Acción no soportada." }, 400, origin);
    }

    const snapshot = await getSnapshot(auth.user.id, organizationId, auth.context.tenantId);
    return ok(snapshot, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo procesar la acción.";
    return fail({ code: "organization_access_action_failed", message }, 500, origin);
  }
}

export async function DELETE(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.user || !auth.activeOrganization || !auth.context) {
    return auth.response;
  }

  const featureEnabled = await examSuiteFeatureService.isEnabledForTenant(auth.context.tenantId);
  if (!featureEnabled) {
    return fail({ code: "feature_disabled", message: "Función disponible en planes Pro o ExamSuite" }, 403, origin);
  }

  if (!canManageOrganization(auth.context?.organizationRole)) {
    return fail({ code: "forbidden", message: "No tienes permisos para gestionar esta organización." }, 403, origin);
  }

  const organizationId = auth.activeOrganization.organizationId;
  const url = request.nextUrl;
  const action = url.searchParams.get("action") ?? "";

  try {
    if (action === "removeMember") {
      const userId = url.searchParams.get("userId") ?? "";
      if (!userId) {
        return fail({ code: "invalid_request", message: "userId es obligatorio." }, 400, origin);
      }

      const { error: deleteError } = await supabaseAdmin
        .from("organization_memberships")
        .delete()
        .eq("organization_id", organizationId)
        .eq("user_id", userId);

      if (deleteError) {
        return fail({ code: "membership_delete_failed", message: deleteError.message }, 500, origin);
      }

      const { data: linkedSchools, error: linkedSchoolsError } = await supabaseAdmin
        .from("organization_tenants")
        .select("tenant_id")
        .eq("organization_id", organizationId);

      if (linkedSchoolsError) {
        return fail({ code: "linked_schools_fetch_failed", message: linkedSchoolsError.message }, 500, origin);
      }

      const linkedTenantIds = (linkedSchools ?? []).map((school) => school.tenant_id);
      if (linkedTenantIds.length > 0) {
        const { error: deactivateTenantMembershipsError } = await supabaseAdmin
          .from("tenant_memberships")
          .update({ is_active: false })
          .eq("user_id", userId)
          .in("tenant_id", linkedTenantIds);

        if (deactivateTenantMembershipsError) {
          return fail({ code: "tenant_membership_update_failed", message: deactivateTenantMembershipsError.message }, 500, origin);
        }
      }
    } else if (action === "unlinkSchool") {
      const tenantId = url.searchParams.get("tenantId") ?? "";
      if (!tenantId) {
        return fail({ code: "invalid_request", message: "tenantId es obligatorio." }, 400, origin);
      }

      const multiSiteEnabled = await isEnterpriseMultiSiteEnabled(auth.context.tenantId);
      if (!multiSiteEnabled) {
        return fail({ code: "feature_disabled", message: "Multi-sede disponible solo en plan Enterprise." }, 403, origin);
      }

      const { data: linkRows, error: linkRowsError } = await supabaseAdmin
        .from("organization_tenants")
        .select("tenant_id, is_primary")
        .eq("organization_id", organizationId);

      if (linkRowsError) {
        return fail({ code: "link_fetch_failed", message: linkRowsError.message }, 500, origin);
      }

      const linkedCount = (linkRows ?? []).length;
      const currentLink = (linkRows ?? []).find((row) => row.tenant_id === tenantId) ?? null;

      if (!currentLink) {
        return fail({ code: "not_found", message: "La escuela no está vinculada a la organización." }, 404, origin);
      }

      if (currentLink.is_primary && linkedCount <= 1) {
        return fail({ code: "invalid_operation", message: "No puedes desvincular la única escuela principal." }, 400, origin);
      }

      const { error: unlinkError } = await supabaseAdmin
        .from("organization_tenants")
        .delete()
        .eq("organization_id", organizationId)
        .eq("tenant_id", tenantId);

      if (unlinkError) {
        return fail({ code: "unlink_school_failed", message: unlinkError.message }, 500, origin);
      }

      if (currentLink.is_primary && linkedCount > 1) {
        const fallbackTenantId = (linkRows ?? []).find((row) => row.tenant_id !== tenantId)?.tenant_id ?? null;
        if (fallbackTenantId) {
          await supabaseAdmin
            .from("organization_tenants")
            .update({ is_primary: true })
            .eq("organization_id", organizationId)
            .eq("tenant_id", fallbackTenantId);
        }
      }
    } else {
      return fail({ code: "invalid_request", message: "Acción no soportada." }, 400, origin);
    }

    const snapshot = await getSnapshot(auth.user.id, organizationId, auth.context.tenantId);
    return ok(snapshot, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo procesar la acción.";
    return fail({ code: "organization_access_action_failed", message }, 500, origin);
  }
}

function normalizeSlug(rawSlug: string): string {
  return rawSlug
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function resolveTenantPlanType(tenantId: string): Promise<"starter" | "pro" | "enterprise"> {
  const { data, error } = await supabaseAdmin
    .from("school_settings")
    .select("payment_config")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo resolver el plan del tenant: ${error.message}`);
  }

  const paymentConfig =
    data?.payment_config && typeof data.payment_config === "object"
      ? (data.payment_config as Record<string, unknown>)
      : {};

  const resolved = featureEntitlementsService.resolveFromPaymentConfig(paymentConfig);
  return resolved.planType;
}

async function isEnterpriseMultiSiteEnabled(tenantId: string): Promise<boolean> {
  const planType = await resolveTenantPlanType(tenantId);
  return planType === "enterprise";
}

async function cloneTeachersToTenant(sourceTenantId: string, targetTenantId: string) {
  const { data: sourceTeachers, error: sourceError } = await supabaseAdmin
    .from("teachers")
    .select("name, email, phone, bio, status")
    .eq("tenant_id", sourceTenantId);

  if (sourceError) {
    throw new Error(`No se pudo cargar profesorado de la sede origen: ${sourceError.message}`);
  }

  const rows = (sourceTeachers ?? []).map((teacher) => ({
    tenant_id: targetTenantId,
    name: teacher.name,
    email: teacher.email,
    phone: teacher.phone,
    bio: teacher.bio,
    status: teacher.status,
  }));

  if (rows.length === 0) {
    return;
  }

  const { error: insertError } = await supabaseAdmin.from("teachers").upsert(rows, {
    onConflict: "tenant_id,name",
  });

  if (insertError) {
    throw new Error(`No se pudo copiar profesorado a la nueva sede: ${insertError.message}`);
  }
}

async function createLinkedSchool(input: {
  organizationId: string;
  tenantName: string;
  tenantSlug?: string;
  copyTeachersFromTenantId?: string;
}) {
  const normalizedSlug = normalizeSlug(input.tenantSlug || input.tenantName);
  if (!normalizedSlug) {
    throw new Error("El slug de la sede es inválido.");
  }

  const { data: existingTenantBySlug, error: existingTenantBySlugError } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .eq("slug", normalizedSlug)
    .limit(1);

  if (existingTenantBySlugError) {
    throw new Error(`No se pudo validar el slug de sede: ${existingTenantBySlugError.message}`);
  }

  if ((existingTenantBySlug ?? []).length > 0) {
    throw new Error("El slug de sede ya está en uso.");
  }

  const { data: tenantRow, error: createTenantError } = await supabaseAdmin
    .from("tenants")
    .insert({
      name: input.tenantName,
      slug: normalizedSlug,
      is_active: true,
    })
    .select("id, slug")
    .single();

  if (createTenantError || !tenantRow) {
    throw new Error(createTenantError?.message || "No se pudo crear la nueva sede.");
  }

  const tenantId = tenantRow.id;

  const { error: settingsError } = await supabaseAdmin.from("school_settings").insert({
    tenant_id: tenantId,
    branding: {},
    enrollment_config: {},
    payment_config: {},
    schedule_config: {},
    notification_config: {},
  });

  if (settingsError) {
    await supabaseAdmin.from("tenants").delete().eq("id", tenantId);
    throw new Error(`No se pudo crear configuración de sede: ${settingsError.message}`);
  }

  const { error: organizationError } = await supabaseAdmin.from("organizations").upsert(
    {
      id: tenantId,
      name: input.tenantName,
      slug: tenantRow.slug,
      kind: "school",
      is_active: true,
      metadata: {
        source: "organization_multisite_create",
      },
    },
    {
      onConflict: "id",
    }
  );

  if (organizationError) {
    await supabaseAdmin.from("school_settings").delete().eq("tenant_id", tenantId);
    await supabaseAdmin.from("tenants").delete().eq("id", tenantId);
    throw new Error(`No se pudo crear organización de sede: ${organizationError.message}`);
  }

  const { error: schoolOrganizationLinkError } = await supabaseAdmin.from("organization_tenants").upsert(
    {
      organization_id: tenantId,
      tenant_id: tenantId,
      is_primary: true,
      display_order: 0,
    },
    {
      onConflict: "organization_id,tenant_id",
    }
  );

  if (schoolOrganizationLinkError) {
    await supabaseAdmin.from("organizations").delete().eq("id", tenantId);
    await supabaseAdmin.from("school_settings").delete().eq("tenant_id", tenantId);
    await supabaseAdmin.from("tenants").delete().eq("id", tenantId);
    throw new Error(`No se pudo enlazar sede con su organización: ${schoolOrganizationLinkError.message}`);
  }

  const { data: linkedRows, error: linkedRowsError } = await supabaseAdmin
    .from("organization_tenants")
    .select("display_order")
    .eq("organization_id", input.organizationId)
    .order("display_order", { ascending: false })
    .limit(1);

  if (linkedRowsError) {
    await supabaseAdmin.from("organization_tenants").delete().eq("organization_id", tenantId).eq("tenant_id", tenantId);
    await supabaseAdmin.from("organizations").delete().eq("id", tenantId);
    await supabaseAdmin.from("school_settings").delete().eq("tenant_id", tenantId);
    await supabaseAdmin.from("tenants").delete().eq("id", tenantId);
    throw new Error(`No se pudo calcular orden de la nueva sede: ${linkedRowsError.message}`);
  }

  const nextDisplayOrder = Number(linkedRows?.[0]?.display_order ?? -1) + 1;

  const { error: associationLinkError } = await supabaseAdmin.from("organization_tenants").upsert(
    {
      organization_id: input.organizationId,
      tenant_id: tenantId,
      is_primary: false,
      display_order: nextDisplayOrder,
    },
    {
      onConflict: "organization_id,tenant_id",
    }
  );

  if (associationLinkError) {
    await supabaseAdmin.from("organization_tenants").delete().eq("organization_id", tenantId).eq("tenant_id", tenantId);
    await supabaseAdmin.from("organizations").delete().eq("id", tenantId);
    await supabaseAdmin.from("school_settings").delete().eq("tenant_id", tenantId);
    await supabaseAdmin.from("tenants").delete().eq("id", tenantId);
    throw new Error(`No se pudo vincular sede a la organización: ${associationLinkError.message}`);
  }

  const { data: membersRows, error: membersRowsError } = await supabaseAdmin
    .from("organization_memberships")
    .select("user_id, role, is_active")
    .eq("organization_id", input.organizationId);

  if (membersRowsError) {
    throw new Error(`No se pudieron cargar miembros para asignar acceso a sede: ${membersRowsError.message}`);
  }

  const tenantMembershipRows = (membersRows ?? []).map((member) => ({
    tenant_id: tenantId,
    user_id: member.user_id,
    role: mapOrganizationRoleToTenantRole(member.role),
    is_active: member.is_active,
  }));

  if (tenantMembershipRows.length > 0) {
    const { error: tenantMembershipsError } = await supabaseAdmin.from("tenant_memberships").upsert(tenantMembershipRows, {
      onConflict: "tenant_id,user_id",
    });

    if (tenantMembershipsError) {
      throw new Error(`No se pudieron asignar accesos a la nueva sede: ${tenantMembershipsError.message}`);
    }
  }

  if (input.copyTeachersFromTenantId) {
    await cloneTeachersToTenant(input.copyTeachersFromTenantId, tenantId);
  }
}