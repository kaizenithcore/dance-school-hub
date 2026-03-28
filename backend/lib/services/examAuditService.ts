import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { examRoleService } from "@/lib/services/examRoleService";
import type { ListExamAuditEventsInput } from "@/lib/validators/examCoreSchemas";

type ExamAuditAction = "evaluation_edited" | "grade_modified" | "certificate_generated";

interface AuditScope {
  organizationIds: string[];
  schoolIds: string[];
}

interface LogExamAuditEventInput {
  organizationId?: string | null;
  schoolId?: string | null;
  sessionId?: string | null;
  actorUserId?: string | null;
  action: ExamAuditAction;
  entityType: string;
  entityId?: string | null;
  previousData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

async function listManageableScope(userId: string): Promise<AuditScope> {
  return examRoleService.listManageableScopeByPermission(userId, "audit.read");
}

function escapeIn(values: string[]): string {
  return values.map((value) => `"${value}"`).join(",");
}

export const examAuditService = {
  async logEvent(input: LogExamAuditEventInput) {
    if (!input.organizationId && !input.schoolId) {
      return;
    }

    const payload = {
      organization_id: input.organizationId || null,
      school_id: input.schoolId || null,
      exam_session_id: input.sessionId || null,
      actor_user_id: input.actorUserId || null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId || null,
      previous_data: input.previousData || {},
      new_data: input.newData || {},
      metadata: input.metadata || {},
    };

    const { error } = await supabaseAdmin.from("exam_audit_events").insert(payload);
    if (error) {
      throw new Error(`Failed to create exam audit event: ${error.message}`);
    }
  },

  async listEvents(userId: string, input: ListExamAuditEventsInput) {
    const scope = await listManageableScope(userId);
    if (scope.organizationIds.length === 0 && scope.schoolIds.length === 0) {
      return {
        items: [],
        summary: {
          total: 0,
          evaluation_edited: 0,
          grade_modified: 0,
          certificate_generated: 0,
        },
      };
    }

    let query = supabaseAdmin
      .from("exam_audit_events")
      .select("id, organization_id, school_id, exam_session_id, actor_user_id, action, entity_type, entity_id, previous_data, new_data, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(input.limit || 100);

    if (scope.organizationIds.length > 0 && scope.schoolIds.length > 0) {
      query = query.or(`organization_id.in.(${escapeIn(scope.organizationIds)}),school_id.in.(${escapeIn(scope.schoolIds)})`);
    } else if (scope.organizationIds.length > 0) {
      query = query.in("organization_id", scope.organizationIds);
    } else {
      query = query.in("school_id", scope.schoolIds);
    }

    if (input.session_id) {
      query = query.eq("exam_session_id", input.session_id);
    }

    if (input.school_id) {
      query = query.eq("school_id", input.school_id);
    }

    if (input.action) {
      query = query.eq("action", input.action);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to list exam audit events: ${error.message}`);
    }

    const items = data || [];
    return {
      items,
      summary: {
        total: items.length,
        evaluation_edited: items.filter((item) => item.action === "evaluation_edited").length,
        grade_modified: items.filter((item) => item.action === "grade_modified").length,
        certificate_generated: items.filter((item) => item.action === "certificate_generated").length,
      },
    };
  },
};
