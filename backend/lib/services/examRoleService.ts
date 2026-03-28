import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import type {
  ListExamRoleAssignmentsInput,
  UpsertExamRoleAssignmentInput,
} from "@/lib/validators/examCoreSchemas";

export type ExamFineRole = "examiner" | "grader" | "supervisor" | "association_admin";
export type ExamRolePermission =
  | "lifecycle.manage"
  | "evaluation.manage"
  | "results.edit"
  | "results.read"
  | "certificates.generate"
  | "notifications.trigger"
  | "audit.read";

interface SessionScope {
  organization_id: string | null;
  school_id: string | null;
}

interface RoleScope {
  organizationIds: string[];
  schoolIds: string[];
}

const ROLE_PERMISSIONS: Record<ExamFineRole, ExamRolePermission[]> = {
  association_admin: [
    "lifecycle.manage",
    "evaluation.manage",
    "results.edit",
    "results.read",
    "certificates.generate",
    "notifications.trigger",
    "audit.read",
  ],
  supervisor: [
    "lifecycle.manage",
    "evaluation.manage",
    "results.edit",
    "results.read",
    "certificates.generate",
    "notifications.trigger",
    "audit.read",
  ],
  grader: ["evaluation.manage", "results.edit", "results.read", "audit.read"],
  examiner: ["results.read"],
};

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((item) => item?.trim()).filter((item): item is string => Boolean(item))));
}

function roleHasPermission(role: ExamFineRole, permission: ExamRolePermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

function escapeIn(values: string[]): string {
  return values.map((value) => `"${value}"`).join(",");
}

async function listLegacyManageableScope(userId: string): Promise<RoleScope> {
  const [{ data: orgRows, error: orgError }, { data: schoolRows, error: schoolError }] = await Promise.all([
    supabaseAdmin
      .from("organization_memberships")
      .select("organization_id, role")
      .eq("user_id", userId)
      .eq("is_active", true),
    supabaseAdmin
      .from("tenant_memberships")
      .select("tenant_id, role")
      .eq("user_id", userId)
      .eq("is_active", true),
  ]);

  if (orgError) {
    throw new Error(`Failed to resolve organization memberships: ${orgError.message}`);
  }

  if (schoolError) {
    throw new Error(`Failed to resolve tenant memberships: ${schoolError.message}`);
  }

  return {
    organizationIds: uniqueStrings(
      (orgRows || [])
        .filter((row) => ["owner", "admin", "manager"].includes(String(row.role || "")))
        .map((row) => String(row.organization_id))
    ),
    schoolIds: uniqueStrings(
      (schoolRows || [])
        .filter((row) => ["owner", "admin"].includes(String(row.role || "")))
        .map((row) => String(row.tenant_id))
    ),
  };
}

export const examRoleService = {
  async hasAnyActiveRole(userId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from("exam_user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to inspect exam roles: ${error.message}`);
    }

    return Boolean(data);
  },

  async hasSessionPermission(userId: string, session: SessionScope, permission: ExamRolePermission): Promise<boolean> {
    const legacy = await listLegacyManageableScope(userId);
    if (
      (session.organization_id && legacy.organizationIds.includes(session.organization_id))
      || (session.school_id && legacy.schoolIds.includes(session.school_id))
    ) {
      return true;
    }

    if (!session.organization_id) {
      return false;
    }

    let query = supabaseAdmin
      .from("exam_user_roles")
      .select("role, school_id")
      .eq("user_id", userId)
      .eq("organization_id", session.organization_id)
      .eq("is_active", true);

    if (session.school_id) {
      query = query.or(`school_id.is.null,school_id.eq.${session.school_id}`);
    } else {
      query = query.is("school_id", null);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to resolve session exam roles: ${error.message}`);
    }

    const roles = (data || []).map((row) => row.role as ExamFineRole);
    return roles.some((role) => roleHasPermission(role, permission));
  },

  async listManageableScopeByPermission(userId: string, permission: ExamRolePermission): Promise<RoleScope> {
    const legacy = await listLegacyManageableScope(userId);

    const { data: roleRows, error } = await supabaseAdmin
      .from("exam_user_roles")
      .select("organization_id, school_id, role")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) {
      throw new Error(`Failed to resolve role-based exam scope: ${error.message}`);
    }

    const fineOrgIds = [] as string[];
    const fineSchoolIds = [] as string[];
    for (const row of roleRows || []) {
      const role = row.role as ExamFineRole;
      if (!roleHasPermission(role, permission)) {
        continue;
      }

      if (row.organization_id) {
        fineOrgIds.push(String(row.organization_id));
      }

      if (row.school_id) {
        fineSchoolIds.push(String(row.school_id));
      }
    }

    return {
      organizationIds: uniqueStrings([...legacy.organizationIds, ...fineOrgIds]),
      schoolIds: uniqueStrings([...legacy.schoolIds, ...fineSchoolIds]),
    };
  },

  async listRoleAssignments(userId: string, input: ListExamRoleAssignmentsInput) {
    const legacy = await listLegacyManageableScope(userId);
    if (!legacy.organizationIds.includes(input.organization_id)) {
      throw new Error("Forbidden");
    }

    let query = supabaseAdmin
      .from("exam_user_roles")
      .select("id, organization_id, school_id, user_id, role, is_active, metadata, created_at, updated_at")
      .eq("organization_id", input.organization_id)
      .order("created_at", { ascending: false })
      .limit(input.limit || 100);

    if (input.school_id) {
      query = query.eq("school_id", input.school_id);
    }

    if (input.user_id) {
      query = query.eq("user_id", input.user_id);
    }

    if (input.role) {
      query = query.eq("role", input.role);
    }

    if (input.active_only !== false) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to list exam role assignments: ${error.message}`);
    }

    return {
      items: data || [],
      summary: {
        total: (data || []).length,
        association_admin: (data || []).filter((row) => row.role === "association_admin").length,
        supervisor: (data || []).filter((row) => row.role === "supervisor").length,
        grader: (data || []).filter((row) => row.role === "grader").length,
        examiner: (data || []).filter((row) => row.role === "examiner").length,
      },
    };
  },

  async upsertRoleAssignment(userId: string, input: UpsertExamRoleAssignmentInput) {
    const legacy = await listLegacyManageableScope(userId);
    if (!legacy.organizationIds.includes(input.organization_id)) {
      throw new Error("Forbidden");
    }

    const { data, error } = await supabaseAdmin
      .from("exam_user_roles")
      .upsert(
        {
          organization_id: input.organization_id,
          school_id: input.school_id || null,
          user_id: input.user_id,
          role: input.role,
          is_active: input.is_active,
          metadata: input.metadata || {},
        },
        { onConflict: "organization_id,school_id,user_id,role" }
      )
      .select("id, organization_id, school_id, user_id, role, is_active, metadata, created_at, updated_at")
      .single();

    if (error || !data) {
      throw new Error(`Failed to upsert exam role assignment: ${error?.message || "unknown error"}`);
    }

    return data;
  },

  buildScopedOrFilter(scope: RoleScope): string {
    const chunks = [] as string[];
    if (scope.organizationIds.length > 0) {
      chunks.push(`organization_id.in.(${escapeIn(scope.organizationIds)})`);
    }
    if (scope.schoolIds.length > 0) {
      chunks.push(`school_id.in.(${escapeIn(scope.schoolIds)})`);
    }

    return chunks.join(",");
  },
};
