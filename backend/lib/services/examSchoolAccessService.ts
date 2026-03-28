import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { examSubscriptionService } from "@/lib/services/examSubscriptionService";
import type { InviteSchoolToExamSessionInput } from "@/lib/validators/examCoreSchemas";

interface SessionScope {
  id: string;
  organization_id: string | null;
  school_id: string | null;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  enrollment_start: string | null;
  enrollment_end: string | null;
  status: "draft" | "published" | "enrollment_open" | "closed" | "evaluated" | "certified";
}

async function getSessionScope(sessionId: string): Promise<SessionScope> {
  const { data, error } = await supabaseAdmin
    .from("exam_sessions")
    .select("id, organization_id, school_id, title, description, start_date, end_date, enrollment_start, enrollment_end, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load exam session: ${error.message}`);
  }

  if (!data) {
    throw new Error("Exam session not found");
  }

  return data as SessionScope;
}

async function assertUserCanInviteSchool(userId: string, session: SessionScope) {
  if (!session.organization_id) {
    throw new Error("School invitation is only available for organization sessions");
  }

  const { data, error } = await supabaseAdmin
    .from("organization_memberships")
    .select("role")
    .eq("organization_id", session.organization_id)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to validate organization permissions: ${error.message}`);
  }

  const role = data?.role;
  if (!role || !["owner", "admin", "manager"].includes(role)) {
    throw new Error("Forbidden");
  }
}

async function assertSchoolBelongsToOrganization(organizationId: string, schoolId: string) {
  const { data, error } = await supabaseAdmin
    .from("exam_memberships")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to validate organization-school membership: ${error.message}`);
  }

  if (!data) {
    throw new Error("School does not belong to this exam organization");
  }
}

async function getUserTenantMemberships(userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    throw new Error(`Failed to resolve tenant memberships: ${error.message}`);
  }

  return Array.from(new Set((data || []).map((row) => row.tenant_id as string)));
}

export const examSchoolAccessService = {
  async inviteSchool(sessionId: string, userId: string, input: InviteSchoolToExamSessionInput) {
    const session = await getSessionScope(sessionId);
    await examSubscriptionService.requireExamFeature({ sessionId: session.id }, "school_access.invite");
    await assertUserCanInviteSchool(userId, session);

    if (!session.organization_id) {
      throw new Error("Organization session is required to invite schools");
    }

    await assertSchoolBelongsToOrganization(session.organization_id, input.school_id);

    const { data, error } = await supabaseAdmin
      .from("exam_school_access")
      .upsert(
        {
          exam_session_id: session.id,
          school_id: input.school_id,
          invited_by: userId,
          invited_at: new Date().toISOString(),
        },
        { onConflict: "exam_session_id,school_id" }
      )
      .select("id, exam_session_id, school_id, invited_at, invited_by, created_at")
      .single();

    if (error || !data) {
      throw new Error(`Failed to invite school to exam session: ${error?.message || "unknown error"}`);
    }

    return data;
  },

  async listAvailableForSchool(userId: string) {
    const tenantIds = await getUserTenantMemberships(userId);

    if (tenantIds.length === 0) {
      return [];
    }

    const planChecks = await Promise.all(
      tenantIds.map(async (tenantId) => {
        try {
          await examSubscriptionService.requireExamFeature({ tenantId }, "school_access.invite");
          return tenantId;
        } catch {
          return null;
        }
      })
    );

    const enabledTenantIds = planChecks.filter((item): item is string => Boolean(item));

    if (enabledTenantIds.length === 0) {
      throw new Error("Exam plan 'core' is required");
    }

    const [schoolScoped, invitedScoped] = await Promise.all([
      supabaseAdmin
        .from("exam_sessions")
        .select("id, organization_id, school_id, title, description, start_date, end_date, enrollment_start, enrollment_end, status, created_at")
        .in("school_id", enabledTenantIds)
        .order("start_date", { ascending: true }),
      supabaseAdmin
        .from("exam_school_access")
        .select(
          `
          id,
          invited_at,
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
        .in("school_id", enabledTenantIds)
        .order("invited_at", { ascending: false }),
    ]);

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
      access_type: "direct" | "invited";
      invited_at: string | null;
      invited_school_id: string | null;
    }>();

    for (const row of schoolScoped.data || []) {
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
        access_type: "direct",
        invited_at: null,
        invited_school_id: null,
      });
    }

    for (const row of invitedScoped.data || []) {
      const session = Array.isArray((row as any).exam_sessions)
        ? (row as any).exam_sessions[0]
        : (row as any).exam_sessions;

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
        access_type: "invited",
        invited_at: (row as any).invited_at as string,
        invited_school_id: (row as any).school_id as string,
      });
    }

    return Array.from(byId.values()).sort((a, b) => a.start_date.localeCompare(b.start_date));
  },
};
