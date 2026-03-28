import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { examSubscriptionService } from "@/lib/services/examSubscriptionService";
import { examAuditService } from "@/lib/services/examAuditService";
import { examRoleService } from "@/lib/services/examRoleService";
import type { CreateExamEvaluationInput, UpsertExamResultInput } from "@/lib/validators/examCoreSchemas";

interface SessionScope {
  id: string;
  organization_id: string | null;
  school_id: string | null;
}

interface EvaluationConfigItem {
  name: string;
  weight: number;
}

interface SessionResultRow {
  id: string;
  scores: Record<string, number> | null;
  final_score: number | null;
  status: "pass" | "fail" | "pending";
  evaluated_by: string | null;
  created_at: string;
  manual_override: boolean;
}

interface EnrollmentWithResultRow {
  id: string;
  exam_session_id: string;
  student_id: string | null;
  external_student_name: string | null;
  external_student_email: string | null;
  exam_results: SessionResultRow | SessionResultRow[] | null;
}

async function getSession(sessionId: string): Promise<SessionScope> {
  const { data, error } = await supabaseAdmin
    .from("exam_sessions")
    .select("id, organization_id, school_id")
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

async function assertUserCanManageSession(userId: string, session: SessionScope) {
  const [{ data: orgMembership }, { data: tenantMembership }] = await Promise.all([
    session.organization_id
      ? supabaseAdmin
          .from("organization_memberships")
          .select("id, role")
          .eq("organization_id", session.organization_id)
          .eq("user_id", userId)
          .eq("is_active", true)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    session.school_id
      ? supabaseAdmin
          .from("tenant_memberships")
          .select("id, role")
          .eq("tenant_id", session.school_id)
          .eq("user_id", userId)
          .eq("is_active", true)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const orgAllowed = Boolean(orgMembership && ["owner", "admin", "manager"].includes(orgMembership.role));
  const schoolAllowed = Boolean(tenantMembership && ["owner", "admin"].includes(tenantMembership.role));

  if (orgAllowed || schoolAllowed) {
    return;
  }

  const allowedByFineRole = await examRoleService.hasSessionPermission(userId, session, "evaluation.manage");
  if (!allowedByFineRole) {
    throw new Error("Forbidden");
  }
}

async function assertUserCanReadSession(userId: string, session: SessionScope) {
  const [{ data: orgMembership }, { data: tenantMemberships }] = await Promise.all([
    session.organization_id
      ? supabaseAdmin
          .from("organization_memberships")
          .select("id")
          .eq("organization_id", session.organization_id)
          .eq("user_id", userId)
          .eq("is_active", true)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabaseAdmin
      .from("tenant_memberships")
      .select("tenant_id")
      .eq("user_id", userId)
      .eq("is_active", true),
  ]);

  if (orgMembership) {
    return;
  }

  const tenantIds = new Set((tenantMemberships || []).map((membership) => membership.tenant_id));

  if (session.school_id && tenantIds.has(session.school_id)) {
    return;
  }

  if (session.organization_id) {
    const { data: organizationSchools } = await supabaseAdmin
      .from("exam_memberships")
      .select("school_id")
      .eq("organization_id", session.organization_id);

    const hasSchoolAccess = (organizationSchools || []).some((row) => tenantIds.has(row.school_id));
    if (hasSchoolAccess) {
      return;
    }
  }

  const allowedByFineRole = await examRoleService.hasSessionPermission(userId, session, "results.read");
  if (!allowedByFineRole) {
    throw new Error("Forbidden");
  }
}

function computeWeightedScore(scores: Record<string, number>, config: EvaluationConfigItem[]) {
  if (config.length === 0) {
    return null;
  }

  let total = 0;
  for (const item of config) {
    const value = scores[item.name];
    if (typeof value !== "number") {
      return null;
    }

    total += value * item.weight;
  }

  return Math.round(total * 100) / 100;
}

function resolveResultStatus(finalScore: number | null, passingScore: number) {
  if (finalScore === null || Number.isNaN(finalScore)) {
    return "pending" as const;
  }

  return finalScore >= passingScore ? ("pass" as const) : ("fail" as const);
}

export const examEvaluationService = {
  async upsertEvaluation(sessionId: string, userId: string, input: CreateExamEvaluationInput) {
    const session = await getSession(sessionId);
    await examSubscriptionService.requireExamFeature({ sessionId: session.id }, "evaluation.manage");
    await assertUserCanManageSession(userId, session);

    const { data: previous } = await supabaseAdmin
      .from("exam_evaluations")
      .select("id, config, passing_score")
      .eq("exam_session_id", session.id)
      .maybeSingle();

    const { data, error } = await supabaseAdmin
      .from("exam_evaluations")
      .upsert(
        {
          exam_session_id: session.id,
          config: input.config,
          passing_score: input.passing_score,
        },
        { onConflict: "exam_session_id" }
      )
      .select("id, exam_session_id, config, passing_score, created_at")
      .single();

    if (error || !data) {
      throw new Error(`Failed to save exam evaluation config: ${error?.message || "unknown error"}`);
    }

    await examAuditService.logEvent({
      organizationId: session.organization_id,
      schoolId: session.school_id,
      sessionId: session.id,
      actorUserId: userId,
      action: "evaluation_edited",
      entityType: "exam_evaluation",
      entityId: data.id,
      previousData: {
        config: previous?.config || null,
        passing_score: previous?.passing_score ?? null,
      },
      newData: {
        config: data.config,
        passing_score: data.passing_score,
      },
      metadata: {
        reason: previous ? "updated" : "created",
        exam_session_id: session.id,
      },
    });

    return data;
  },

  async upsertResult(userId: string, input: UpsertExamResultInput) {
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from("exam_enrollments")
      .select("id, exam_session_id")
      .eq("id", input.enrollment_id)
      .maybeSingle();

    if (enrollmentError) {
      throw new Error(`Failed to load exam enrollment: ${enrollmentError.message}`);
    }

    if (!enrollment) {
      throw new Error("Exam enrollment not found");
    }

    const session = await getSession(enrollment.exam_session_id);
    await examSubscriptionService.requireExamFeature({ sessionId: session.id }, "evaluation.manage");
    await assertUserCanManageSession(userId, session);

    const { data: evaluation } = await supabaseAdmin
      .from("exam_evaluations")
      .select("config, passing_score")
      .eq("exam_session_id", session.id)
      .maybeSingle();

    const config = (evaluation?.config || []) as EvaluationConfigItem[];
    const passingScore = Number(evaluation?.passing_score ?? 60);

    const autoScore = computeWeightedScore(input.scores || {}, config);
    const finalScore: number | null = typeof input.manual_final_score === "number"
      ? input.manual_final_score
      : (autoScore ?? null);
    const hasManualScore = typeof input.manual_final_score === "number";
    const status = resolveResultStatus(finalScore, passingScore);

    const { data: previousResult } = await supabaseAdmin
      .from("exam_results")
      .select("id, scores, final_score, status, manual_override")
      .eq("enrollment_id", enrollment.id)
      .maybeSingle();

    const { data, error } = await supabaseAdmin
      .from("exam_results")
      .upsert(
        {
          enrollment_id: enrollment.id,
          scores: input.scores || {},
          final_score: finalScore,
          status,
          evaluated_by: userId,
          manual_override: hasManualScore,
        },
        { onConflict: "enrollment_id" }
      )
      .select("id, enrollment_id, scores, final_score, status, evaluated_by, created_at, manual_override")
      .single();

    if (error || !data) {
      throw new Error(`Failed to save exam result: ${error?.message || "unknown error"}`);
    }

    await examAuditService.logEvent({
      organizationId: session.organization_id,
      schoolId: session.school_id,
      sessionId: session.id,
      actorUserId: userId,
      action: "grade_modified",
      entityType: "exam_result",
      entityId: data.id,
      previousData: {
        scores: previousResult?.scores || {},
        final_score: previousResult?.final_score ?? null,
        status: previousResult?.status || null,
        manual_override: Boolean(previousResult?.manual_override),
      },
      newData: {
        scores: data.scores || {},
        final_score: data.final_score ?? null,
        status: data.status,
        manual_override: Boolean(data.manual_override),
      },
      metadata: {
        enrollment_id: enrollment.id,
        exam_session_id: session.id,
      },
    });

    return data;
  },

  async listResultsBySession(sessionId: string, userId: string) {
    const session = await getSession(sessionId);
    await examSubscriptionService.requireExamFeature({ sessionId: session.id }, "results.read");
    await assertUserCanReadSession(userId, session);

    const { data, error } = await supabaseAdmin
      .from("exam_enrollments")
      .select(
        `
        id,
        exam_session_id,
        student_id,
        external_student_name,
        external_student_email,
        exam_results(id, scores, final_score, status, evaluated_by, created_at, manual_override)
      `
      )
      .eq("exam_session_id", session.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list exam results: ${error.message}`);
    }

    return ((data || []) as EnrollmentWithResultRow[]).map((row) => {
      const result = Array.isArray(row.exam_results) ? row.exam_results[0] : row.exam_results;

      return {
        enrollment_id: row.id,
        exam_session_id: row.exam_session_id,
        student_id: row.student_id,
        student_name: row.external_student_name || null,
        student_email: row.external_student_email || null,
        scores: result?.scores || {},
        final_score: result?.final_score ?? null,
        status: result?.status || "pending",
        evaluated_by: result?.evaluated_by || null,
        result_created_at: result?.created_at || null,
        manual_override: Boolean(result?.manual_override),
      };
    });
  },
};
