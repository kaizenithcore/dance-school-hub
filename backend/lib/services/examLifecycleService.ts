import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { examSubscriptionService } from "@/lib/services/examSubscriptionService";
import { examRoleService } from "@/lib/services/examRoleService";
import type { TransitionExamSessionLifecycleInput } from "@/lib/validators/examCoreSchemas";

type ExamLifecycleStatus = "draft" | "published" | "enrollment_open" | "closed" | "evaluated" | "certified";

type LegacyExamStatus = "open" | "completed";

type RawExamStatus = ExamLifecycleStatus | LegacyExamStatus;

interface SessionScope {
  id: string;
  title: string;
  organization_id: string | null;
  school_id: string | null;
  status: RawExamStatus;
}

const NEXT_ALLOWED: Record<ExamLifecycleStatus, ExamLifecycleStatus[]> = {
  draft: ["published"],
  published: ["enrollment_open"],
  enrollment_open: ["closed"],
  closed: ["evaluated"],
  evaluated: ["certified"],
  certified: [],
};

function toCanonicalStatus(value: RawExamStatus): ExamLifecycleStatus {
  if (value === "open") {
    return "enrollment_open";
  }

  if (value === "completed") {
    return "certified";
  }

  return value;
}

async function getSession(sessionId: string): Promise<SessionScope> {
  const { data, error } = await supabaseAdmin
    .from("exam_sessions")
    .select("id, title, organization_id, school_id, status")
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

async function assertCanManageLifecycle(userId: string, session: SessionScope) {
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

  const allowedByFineRole = await examRoleService.hasSessionPermission(userId, session, "lifecycle.manage");
  if (!allowedByFineRole) {
    throw new Error("Forbidden");
  }
}

async function loadLifecycleMetrics(sessionId: string) {
  const { count: enrollmentsCount, error: enrollmentsError } = await supabaseAdmin
    .from("exam_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("exam_session_id", sessionId)
    .neq("status", "cancelled");

  if (enrollmentsError) {
    throw new Error(`Failed to count enrollments: ${enrollmentsError.message}`);
  }

  const { data: enrollmentRows, error: enrollmentRowsError } = await supabaseAdmin
    .from("exam_enrollments")
    .select("id")
    .eq("exam_session_id", sessionId)
    .neq("status", "cancelled");

  if (enrollmentRowsError) {
    throw new Error(`Failed to load enrollments for lifecycle checks: ${enrollmentRowsError.message}`);
  }

  const enrollmentIds = (enrollmentRows || []).map((row) => row.id as string);

  let resultsCount = 0;
  let pendingResultsCount = 0;
  let passResultsCount = 0;
  let certificatesCount = 0;

  if (enrollmentIds.length > 0) {
    const { data: results, error: resultsError } = await supabaseAdmin
      .from("exam_results")
      .select("id, status")
      .in("enrollment_id", enrollmentIds);

    if (resultsError) {
      throw new Error(`Failed to load results for lifecycle checks: ${resultsError.message}`);
    }

    const resultRows = (results || []) as Array<{ id: string; status: "pass" | "fail" | "pending" }>;
    resultsCount = resultRows.length;
    pendingResultsCount = resultRows.filter((row) => row.status === "pending").length;
    passResultsCount = resultRows.filter((row) => row.status === "pass").length;

    const passResultIds = resultRows.filter((row) => row.status === "pass").map((row) => row.id);
    if (passResultIds.length > 0) {
      const { count: certCount, error: certificatesError } = await supabaseAdmin
        .from("exam_certificates")
        .select("id", { count: "exact", head: true })
        .in("result_id", passResultIds);

      if (certificatesError) {
        throw new Error(`Failed to count certificates for lifecycle checks: ${certificatesError.message}`);
      }

      certificatesCount = certCount || 0;
    }
  }

  return {
    enrollments_count: enrollmentsCount || 0,
    results_count: resultsCount,
    pending_results_count: pendingResultsCount,
    pass_results_count: passResultsCount,
    certificates_count: certificatesCount,
  };
}

function assertTransitionAllowed(current: ExamLifecycleStatus, target: ExamLifecycleStatus) {
  if (current === target) {
    return;
  }

  const allowed = NEXT_ALLOWED[current];
  if (!allowed.includes(target)) {
    throw new Error(`Invalid lifecycle transition: ${current} -> ${target}`);
  }
}

function assertTransitionPreconditions(target: ExamLifecycleStatus, metrics: {
  enrollments_count: number;
  results_count: number;
  pending_results_count: number;
  pass_results_count: number;
  certificates_count: number;
}) {
  if (target === "evaluated") {
    if (metrics.enrollments_count === 0) {
      throw new Error("Cannot move to evaluated without enrollments");
    }

    if (metrics.results_count === 0 || metrics.pending_results_count > 0) {
      throw new Error("Cannot move to evaluated while pending results exist");
    }
  }

  if (target === "certified") {
    if (metrics.results_count === 0 || metrics.pending_results_count > 0) {
      throw new Error("Cannot move to certified while pending results exist");
    }

    if (metrics.pass_results_count > 0 && metrics.certificates_count < metrics.pass_results_count) {
      throw new Error("Cannot move to certified until all passing results have certificates");
    }
  }
}

export const examLifecycleService = {
  async getLifecycle(userId: string, sessionId: string) {
    const session = await getSession(sessionId);
    await examSubscriptionService.requireExamFeature({ sessionId: session.id }, "results.read");
    await assertCanManageLifecycle(userId, session);

    const current = toCanonicalStatus(session.status);
    const metrics = await loadLifecycleMetrics(session.id);

    return {
      session_id: session.id,
      title: session.title,
      current_status: current,
      next_allowed_statuses: NEXT_ALLOWED[current],
      metrics,
    };
  },

  async transition(userId: string, sessionId: string, input: TransitionExamSessionLifecycleInput) {
    const session = await getSession(sessionId);
    await examSubscriptionService.requireExamFeature({ sessionId: session.id }, "evaluation.manage");
    await assertCanManageLifecycle(userId, session);

    const current = toCanonicalStatus(session.status);
    const target = input.status;

    assertTransitionAllowed(current, target);

    const metrics = await loadLifecycleMetrics(session.id);
    assertTransitionPreconditions(target, metrics);

    if (current !== target) {
      const { data, error } = await supabaseAdmin
        .from("exam_sessions")
        .update({ status: target })
        .eq("id", session.id)
        .select("id, status")
        .single();

      if (error || !data) {
        throw new Error(`Failed to update exam lifecycle: ${error?.message || "unknown error"}`);
      }
    }

    if (session.school_id) {
      await supabaseAdmin.from("audit_log").insert({
        tenant_id: session.school_id,
        actor_user_id: userId,
        action: "exam_lifecycle_transitioned",
        entity_type: "exam_session",
        entity_id: session.id,
        metadata: {
          from_status: current,
          to_status: target,
          reason: input.reason || null,
          metrics,
        },
      });
    }

    return {
      session_id: session.id,
      previous_status: current,
      current_status: target,
      next_allowed_statuses: NEXT_ALLOWED[target],
      metrics,
    };
  },
};
