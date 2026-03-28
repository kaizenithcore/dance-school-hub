import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { examSubscriptionService } from "@/lib/services/examSubscriptionService";
import { examUsageBillingService } from "@/lib/services/examUsageBillingService";
import type {
  CreateExamMembershipInput,
  CreateExamOrganizationInput,
  CreateExamSessionInput,
} from "@/lib/validators/examCoreSchemas";

interface UserOrganizationMembership {
  organization_id: string;
  role: "owner" | "admin" | "manager" | "member";
}

interface UserTenantMembership {
  tenant_id: string;
  role: "owner" | "admin" | "staff";
}

interface SessionListRow {
  id: string;
  organization_id: string | null;
  school_id: string | null;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  enrollment_start: string | null;
  enrollment_end: string | null;
  status: string;
  created_at: string;
}

interface InvitedSessionRow {
  school_id: string;
  exam_sessions: SessionListRow | SessionListRow[] | null;
}

async function getUserOrganizationMemberships(userId: string): Promise<UserOrganizationMembership[]> {
  const { data, error } = await supabaseAdmin
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    throw new Error(`Failed to resolve organization memberships: ${error.message}`);
  }

  return (data || []) as UserOrganizationMembership[];
}

async function getUserTenantMemberships(userId: string): Promise<UserTenantMembership[]> {
  const { data, error } = await supabaseAdmin
    .from("tenant_memberships")
    .select("tenant_id, role")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    throw new Error(`Failed to resolve tenant memberships: ${error.message}`);
  }

  return (data || []) as UserTenantMembership[];
}

function canManageOrganization(role: string | null | undefined) {
  return role === "owner" || role === "admin" || role === "manager";
}

function canManageTenant(role: string | null | undefined) {
  return role === "owner" || role === "admin";
}

export const examCoreService = {
  async listOrganizationsForUser(userId: string) {
    const { data, error } = await supabaseAdmin
      .from("exam_organizations")
      .select(
        `
        id,
        name,
        slug,
        contact_email,
        active,
        created_at,
        exam_memberships(id, school_id, role, created_at)
      `
      )
      .in(
        "id",
        (
          await getUserOrganizationMemberships(userId)
        ).map((membership) => membership.organization_id)
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list exam organizations: ${error.message}`);
    }

    return data || [];
  },

  async createOrganization(userId: string, input: CreateExamOrganizationInput) {
    const { data: organization, error: organizationError } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: input.name,
        slug: input.slug,
        kind: "association",
        is_active: input.active,
        metadata: { source: "examsuit_core" },
      })
      .select("id")
      .single();

    if (organizationError || !organization) {
      throw new Error(`Failed to create base organization: ${organizationError?.message || "unknown error"}`);
    }

    const { error: membershipError } = await supabaseAdmin
      .from("organization_memberships")
      .insert({
        organization_id: organization.id,
        user_id: userId,
        role: "owner",
        is_active: true,
      });

    if (membershipError) {
      throw new Error(`Failed to create organization membership: ${membershipError.message}`);
    }

    const { data: examOrganization, error: examOrganizationError } = await supabaseAdmin
      .from("exam_organizations")
      .insert({
        id: organization.id,
        contact_email: input.contact_email ?? null,
        active: input.active,
      })
      .select("id, name, slug, contact_email, active, created_at")
      .single();

    if (examOrganizationError || !examOrganization) {
      throw new Error(`Failed to create exam organization: ${examOrganizationError?.message || "unknown error"}`);
    }

    return examOrganization;
  },

  async listMemberships(userId: string, organizationId?: string) {
    const organizationMemberships = await getUserOrganizationMemberships(userId);
    const manageableOrganizationIds = organizationMemberships
      .filter((membership) => canManageOrganization(membership.role))
      .map((membership) => membership.organization_id);

    const targetOrganizationIds = organizationId
      ? manageableOrganizationIds.filter((id) => id === organizationId)
      : manageableOrganizationIds;

    if (targetOrganizationIds.length === 0) {
      return [];
    }

    const { data, error } = await supabaseAdmin
      .from("exam_memberships")
      .select("id, organization_id, school_id, role, created_at")
      .in("organization_id", targetOrganizationIds)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list exam memberships: ${error.message}`);
    }

    return data || [];
  },

  async upsertMembership(userId: string, input: CreateExamMembershipInput) {
    const organizationMemberships = await getUserOrganizationMemberships(userId);
    const canManage = organizationMemberships.some(
      (membership) => membership.organization_id === input.organization_id && canManageOrganization(membership.role)
    );

    if (!canManage) {
      throw new Error("Forbidden to manage this exam organization");
    }

    const { data: existingMembership, error: existingMembershipError } = await supabaseAdmin
      .from("exam_memberships")
      .select("id")
      .eq("organization_id", input.organization_id)
      .eq("school_id", input.school_id)
      .maybeSingle();

    if (existingMembershipError) {
      throw new Error(`Failed to validate existing exam membership: ${existingMembershipError.message}`);
    }

    if (!existingMembership) {
      await examSubscriptionService.assertCanAddSchoolToAssociation(input.organization_id);
    }

    const { data, error } = await supabaseAdmin
      .from("exam_memberships")
      .upsert(
        {
          organization_id: input.organization_id,
          school_id: input.school_id,
          role: input.role,
        },
        { onConflict: "organization_id,school_id" }
      )
      .select("id, organization_id, school_id, role, created_at")
      .single();

    if (error || !data) {
      throw new Error(`Failed to upsert exam membership: ${error?.message || "unknown error"}`);
    }

    return data;
  },

  async listSessionsForUser(userId: string) {
    const [organizationMemberships, tenantMemberships] = await Promise.all([
      getUserOrganizationMemberships(userId),
      getUserTenantMemberships(userId),
    ]);

    const directOrganizationIds = organizationMemberships.map((membership) => membership.organization_id);
    const tenantIds = tenantMemberships.map((membership) => membership.tenant_id);

    const [organizationScoped, schoolScoped, invitedScoped] = await Promise.all([
      directOrganizationIds.length > 0
        ? supabaseAdmin
            .from("exam_sessions")
            .select("id, organization_id, school_id, title, description, start_date, end_date, enrollment_start, enrollment_end, status, created_at")
            .in("organization_id", directOrganizationIds)
            .order("start_date", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      tenantIds.length > 0
        ? supabaseAdmin
            .from("exam_sessions")
            .select("id, organization_id, school_id, title, description, start_date, end_date, enrollment_start, enrollment_end, status, created_at")
            .in("school_id", tenantIds)
            .order("start_date", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      tenantIds.length > 0
        ? supabaseAdmin
            .from("exam_school_access")
            .select(
              `
              school_id,
              exam_sessions!inner(
                id,
                organization_id,
                school_id,
                title,
                description,
                start_date,
                end_date,
                enrollment_start,
                enrollment_end,
                status,
                created_at
              )
            `
            )
            .in("school_id", tenantIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (organizationScoped.error) {
      throw new Error(`Failed to list organization-scoped exam sessions: ${organizationScoped.error.message}`);
    }

    if (schoolScoped.error) {
      throw new Error(`Failed to list school-scoped exam sessions: ${schoolScoped.error.message}`);
    }

    if (invitedScoped.error) {
      throw new Error(`Failed to list invited exam sessions: ${invitedScoped.error.message}`);
    }

    const byId = new Map<string, {
      id: string;
      organization_id: string | null;
      school_id: string | null;
      title: string;
      description: string | null;
      start_date: string;
      end_date: string;
      enrollment_start: string | null;
      enrollment_end: string | null;
      status: string;
      created_at: string;
    }>();

    for (const row of [...(organizationScoped.data || []), ...(schoolScoped.data || [])]) {
      byId.set(row.id as string, {
        id: row.id as string,
        organization_id: (row.organization_id as string | null) ?? null,
        school_id: (row.school_id as string | null) ?? null,
        title: row.title as string,
        description: (row.description as string | null) ?? null,
        start_date: row.start_date as string,
        end_date: row.end_date as string,
        enrollment_start: (row.enrollment_start as string | null) ?? null,
        enrollment_end: (row.enrollment_end as string | null) ?? null,
        status: row.status as string,
        created_at: row.created_at as string,
      });
    }

    for (const row of (invitedScoped.data || []) as InvitedSessionRow[]) {
      const sessionRef = row.exam_sessions;
      const session = Array.isArray(sessionRef) ? sessionRef[0] : sessionRef;

      if (!session) {
        continue;
      }

      byId.set(session.id as string, {
        id: session.id as string,
        organization_id: (session.organization_id as string | null) ?? null,
        school_id: (session.school_id as string | null) ?? null,
        title: session.title as string,
        description: (session.description as string | null) ?? null,
        start_date: session.start_date as string,
        end_date: session.end_date as string,
        enrollment_start: (session.enrollment_start as string | null) ?? null,
        enrollment_end: (session.enrollment_end as string | null) ?? null,
        status: session.status as string,
        created_at: session.created_at as string,
      });
    }

    return Array.from(byId.values()).sort((a, b) => b.start_date.localeCompare(a.start_date));
  },

  async createSession(userId: string, input: CreateExamSessionInput) {
    const [organizationMemberships, tenantMemberships] = await Promise.all([
      getUserOrganizationMemberships(userId),
      getUserTenantMemberships(userId),
    ]);

    if (input.organization_id) {
      const canManage = organizationMemberships.some(
        (membership) => membership.organization_id === input.organization_id && canManageOrganization(membership.role)
      );

      if (!canManage) {
        throw new Error("Forbidden to create session in this organization");
      }

      const { data: examOrg, error: examOrgError } = await supabaseAdmin
        .from("exam_organizations")
        .select("id")
        .eq("id", input.organization_id)
        .maybeSingle();

      if (examOrgError || !examOrg) {
        throw new Error("Exam organization not found");
      }

      await examSubscriptionService.assertCanCreateSession({ organizationId: input.organization_id });
    }

    if (input.school_id) {
      const canManage = tenantMemberships.some(
        (membership) => membership.tenant_id === input.school_id && canManageTenant(membership.role)
      );

      if (!canManage) {
        throw new Error("Forbidden to create school session for this tenant");
      }

      await examSubscriptionService.assertCanCreateSession({ tenantId: input.school_id });
    }

    const { data, error } = await supabaseAdmin
      .from("exam_sessions")
      .insert({
        organization_id: input.organization_id ?? null,
        school_id: input.school_id ?? null,
        title: input.title,
        description: input.description ?? null,
        start_date: input.start_date,
        end_date: input.end_date,
        enrollment_start: input.enrollment_start ?? null,
        enrollment_end: input.enrollment_end ?? null,
        status: input.status,
      })
      .select("id, organization_id, school_id, title, description, start_date, end_date, enrollment_start, enrollment_end, status, created_at")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create exam session: ${error?.message || "unknown error"}`);
    }

    await examUsageBillingService.trackUsageEvent({
      eventType: "session_created",
      entityId: data.id,
      organizationId: input.organization_id ?? null,
      schoolId: input.school_id ?? null,
      metadata: {
        source: "exam_core_service",
      },
    });

    return data;
  },
};
