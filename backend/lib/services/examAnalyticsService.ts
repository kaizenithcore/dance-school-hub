import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { examSubscriptionService } from "@/lib/services/examSubscriptionService";
import type { ExamAnalyticsQueryInput } from "@/lib/validators/examCoreSchemas";

interface UpgradeOrganizationScope {
  id: string;
  role: "owner" | "admin" | "manager" | "member";
}

interface OrganizationMembershipRow {
  organization_id: string;
  role: UpgradeOrganizationScope["role"];
}

interface ExamSessionRow {
  id: string;
  start_date: string;
  school_id: string | null;
}

interface ExamEnrollmentRow {
  id: string;
  school_id: string;
  exam_session_id: string;
  status: "pending" | "confirmed" | "cancelled";
}

interface ExamSchoolAccessRow {
  exam_session_id: string;
  school_id: string;
}

interface ExamEnrollmentFieldRow {
  data: unknown;
}

interface ExamResultRow {
  status: "pass" | "fail" | "pending";
}

const DEFAULT_ESTIMATED_REVENUE_EUR_PER_ENROLLMENT = 35;

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function getNestedValue(source: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = source;
  for (const key of path) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function resolveDateRange(input: ExamAnalyticsQueryInput) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const from = input.from || "1900-01-01";
  const to = input.to || todayIso;

  return {
    from,
    to,
    todayIso,
  };
}

function toPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 10000) / 100;
}

async function resolveManageableOrganization(input: {
  userId: string;
  requestedOrganizationId?: string;
}): Promise<UpgradeOrganizationScope> {
  const { data, error } = await supabaseAdmin
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", input.userId)
    .eq("is_active", true)
    .in("role", ["owner", "admin", "manager"]);

  if (error) {
    throw new Error(`Failed to resolve organizations for exam analytics: ${error.message}`);
  }

  const memberships = ((data || []) as OrganizationMembershipRow[]).map((row) => ({
    id: row.organization_id as string,
    role: row.role as UpgradeOrganizationScope["role"],
  }));

  if (memberships.length === 0) {
    throw new Error("Forbidden");
  }

  if (input.requestedOrganizationId) {
    const selected = memberships.find((item) => item.id === input.requestedOrganizationId);
    if (!selected) {
      throw new Error("Forbidden");
    }
    return selected;
  }

  return memberships[0];
}

async function listOrganizationSessions(input: {
  organizationId: string;
  from: string;
  to: string;
}): Promise<ExamSessionRow[]> {
  const { data, error } = await supabaseAdmin
    .from("exam_sessions")
    .select("id, start_date, school_id")
    .eq("organization_id", input.organizationId)
    .gte("start_date", input.from)
    .lte("start_date", input.to);

  if (error) {
    throw new Error(`Failed to list exam sessions for analytics: ${error.message}`);
  }

  return (data || []) as ExamSessionRow[];
}

async function listSessionEnrollments(sessionIds: string[]): Promise<ExamEnrollmentRow[]> {
  if (sessionIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("exam_enrollments")
    .select("id, status, school_id, exam_session_id")
    .in("exam_session_id", sessionIds);

  if (error) {
    throw new Error(`Failed to list exam enrollments for analytics: ${error.message}`);
  }

  return (data || []) as ExamEnrollmentRow[];
}

async function listSessionAccessSchools(sessionIds: string[]): Promise<ExamSchoolAccessRow[]> {
  if (sessionIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("exam_school_access")
    .select("exam_session_id, school_id")
    .in("exam_session_id", sessionIds);

  if (error) {
    throw new Error(`Failed to list school access for analytics: ${error.message}`);
  }

  return (data || []) as ExamSchoolAccessRow[];
}

async function listResults(enrollmentIds: string[]): Promise<ExamResultRow[]> {
  if (enrollmentIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("exam_results")
    .select("status")
    .in("enrollment_id", enrollmentIds);

  if (error) {
    throw new Error(`Failed to list exam results for analytics: ${error.message}`);
  }

  return (data || []) as ExamResultRow[];
}

async function estimateRevenueFromFields(enrollmentIds: string[]): Promise<number> {
  if (enrollmentIds.length === 0) {
    return 0;
  }

  const { data, error } = await supabaseAdmin
    .from("exam_enrollment_fields")
    .select("data")
    .in("enrollment_id", enrollmentIds);

  if (error) {
    throw new Error(`Failed to list enrollment fields for analytics: ${error.message}`);
  }

  const amountPaths = [
    ["amount_cents"],
    ["amount"],
    ["price"],
    ["fee"],
    ["payment", "amount_cents"],
    ["payment", "amount"],
    ["payment", "price"],
    ["pricing", "amount_cents"],
    ["pricing", "amount"],
  ];

  let totalRevenueEur = 0;

  for (const row of (data || []) as ExamEnrollmentFieldRow[]) {
    const fieldData = asObject(row.data);

    for (const path of amountPaths) {
      const resolved = getNestedValue(fieldData, path);
      if (typeof resolved !== "number" || Number.isNaN(resolved) || resolved <= 0) {
        continue;
      }

      if (path[path.length - 1] === "amount_cents") {
        totalRevenueEur += resolved / 100;
      } else {
        totalRevenueEur += resolved;
      }

      break;
    }
  }

  return totalRevenueEur;
}

async function persistDailyMetrics(input: {
  organizationId: string;
  date: string;
  metrics: Record<string, number>;
}) {
  const rows = Object.entries(input.metrics).map(([metric, value]) => ({
    organization_id: input.organizationId,
    metric,
    value,
    date: input.date,
  }));

  const { error } = await supabaseAdmin
    .from("exam_analytics")
    .upsert(rows, { onConflict: "organization_id,metric,date" });

  if (error) {
    throw new Error(`Failed to persist exam analytics metrics: ${error.message}`);
  }
}

async function loadHistoricalMetrics(input: {
  organizationId: string;
  from: string;
  to: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("exam_analytics")
    .select("metric, value, date")
    .eq("organization_id", input.organizationId)
    .gte("date", input.from)
    .lte("date", input.to)
    .order("date", { ascending: true });

  if (error) {
    throw new Error(`Failed to load exam analytics history: ${error.message}`);
  }

  return data || [];
}

export const examAnalyticsService = {
  async getAnalytics(userId: string, input: ExamAnalyticsQueryInput) {
    const organization = await resolveManageableOrganization({
      userId,
      requestedOrganizationId: input.organization_id,
    });

    await examSubscriptionService.requireExamFeature({ organizationId: organization.id }, "analytics.read");

    const range = resolveDateRange(input);
    const sessions = await listOrganizationSessions({
      organizationId: organization.id,
      from: range.from,
      to: range.to,
    });

    const accessRows = await listSessionAccessSchools(sessions.map((session) => session.id));

    const enrollments = await listSessionEnrollments(sessions.map((session) => session.id));
    const results = await listResults(enrollments.map((enrollment) => enrollment.id));

    const eligibleSchoolIds = new Set<string>();
    for (const session of sessions) {
      if (session.school_id) {
        eligibleSchoolIds.add(session.school_id);
      }
    }
    for (const access of accessRows) {
      eligibleSchoolIds.add(access.school_id);
    }

    const participatingSchoolIds = new Set(
      enrollments
        .filter((enrollment) => enrollment.status !== "cancelled")
        .map((enrollment) => enrollment.school_id)
    );
    const convertedSchoolIds = new Set(
      enrollments
        .filter((enrollment) => enrollment.status === "confirmed")
        .map((enrollment) => enrollment.school_id)
    );

    const totalEnrollments = enrollments.length;
    const confirmedEnrollments = enrollments.filter((row) => row.status === "confirmed").length;

    const evaluatedResults = results.filter((result) => result.status === "pass" || result.status === "fail");
    const passCount = evaluatedResults.filter((result) => result.status === "pass").length;
    const passRate = toPercent(passCount, evaluatedResults.length);

    const eligibleSchoolsCount = eligibleSchoolIds.size;
    const participatingSchoolsCount = participatingSchoolIds.size;
    const convertedSchoolsCount = convertedSchoolIds.size;

    const participationRatePct = toPercent(participatingSchoolsCount, eligibleSchoolsCount);
    const schoolToExamConversionPct = toPercent(convertedSchoolsCount, eligibleSchoolsCount);

    const extractedRevenueEur = await estimateRevenueFromFields(enrollments.map((enrollment) => enrollment.id));
    const fallbackRevenueEur = totalEnrollments * DEFAULT_ESTIMATED_REVENUE_EUR_PER_ENROLLMENT;
    const usedFallbackRevenue = extractedRevenueEur <= 0;
    const estimatedRevenueEur = Math.round((usedFallbackRevenue ? fallbackRevenueEur : extractedRevenueEur) * 100) / 100;

    const metrics = {
      enrolled_count: totalEnrollments,
      pass_rate_pct: passRate,
      participation_rate_pct: participationRatePct,
      school_to_exam_conversion_pct: schoolToExamConversionPct,
      estimated_revenue_eur: estimatedRevenueEur,
    };

    if (input.persist !== false) {
      await persistDailyMetrics({
        organizationId: organization.id,
        date: range.todayIso,
        metrics,
      });
    }

    const history = await loadHistoricalMetrics({
      organizationId: organization.id,
      from: range.from,
      to: range.to,
    });

    return {
      organization_id: organization.id,
      period: {
        from: range.from,
        to: range.to,
      },
      metrics: {
        sessions_count: sessions.length,
        eligible_schools_count: eligibleSchoolsCount,
        participating_schools_count: participatingSchoolsCount,
        converted_schools_count: convertedSchoolsCount,
        enrolled_count: totalEnrollments,
        confirmed_enrollments: confirmedEnrollments,
        pass_count: passCount,
        evaluated_count: evaluatedResults.length,
        pass_rate_pct: passRate,
        participation_rate_pct: participationRatePct,
        school_to_exam_conversion_pct: schoolToExamConversionPct,
        estimated_revenue_eur: estimatedRevenueEur,
      },
      assumptions: {
        used_fallback_revenue: usedFallbackRevenue,
        fallback_revenue_eur_per_enrollment: DEFAULT_ESTIMATED_REVENUE_EUR_PER_ENROLLMENT,
      },
      history,
    };
  },
};
