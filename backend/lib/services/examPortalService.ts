import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { resolveStudentData } from "@/lib/services/examEnrollmentService";
import { resolveExamCertificateDownloadUrl } from "@/lib/services/examCertificateService";
import { studentPortalService } from "@/lib/services/studentPortalService";
import { examSubscriptionService, type ExamPlan } from "@/lib/services/examSubscriptionService";

interface ExamPortalProfile {
  id: string;
  user_id: string;
  organization_id: string | null;
  public_profile_enabled: boolean;
  created_at: string;
}

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

async function getUserEmail(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load user profile: ${error.message}`);
  }

  const email = data?.email;
  if (!email || typeof email !== "string") {
    return null;
  }

  return email;
}

async function getPortalMembershipContext(userId: string) {
  const [tenantMemberships, organizationMemberships] = await Promise.all([
    supabaseAdmin
      .from("tenant_memberships")
      .select("tenant_id")
      .eq("user_id", userId)
      .eq("is_active", true),
    supabaseAdmin
      .from("organization_memberships")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("is_active", true),
  ]);

  if (tenantMemberships.error) {
    throw new Error(`Failed to resolve tenant memberships: ${tenantMemberships.error.message}`);
  }

  if (organizationMemberships.error) {
    throw new Error(`Failed to resolve organization memberships: ${organizationMemberships.error.message}`);
  }

  const tenantIds = Array.from(new Set((tenantMemberships.data || []).map((row) => row.tenant_id as string)));
  const organizationIds = Array.from(
    new Set((organizationMemberships.data || []).map((row) => row.organization_id as string))
  );

  return {
    tenantIds,
    organizationIds,
    mode: tenantIds.length === 0 ? ("lite" as const) : ("full" as const),
  };
}

async function ensureStudentExamProfile(userId: string, organizationIds: string[]): Promise<ExamPortalProfile> {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("student_exam_profiles")
    .select("id, user_id, organization_id, public_profile_enabled, created_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to load student exam profile: ${existingError.message}`);
  }

  if (existing) {
    return existing as ExamPortalProfile;
  }

  const { data: created, error: createError } = await supabaseAdmin
    .from("student_exam_profiles")
    .insert({
      user_id: userId,
      organization_id: organizationIds[0] || null,
      public_profile_enabled: true,
    })
    .select("id, user_id, organization_id, public_profile_enabled, created_at")
    .single();

  if (createError || !created) {
    throw new Error(`Failed to create student exam profile: ${createError?.message || "unknown error"}`);
  }

  return created as ExamPortalProfile;
}

async function listLiteExamFeedItems(userId: string, organizationIds: string[], email: string | null) {
  if (organizationIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("exam_enrollments")
    .select(
      `
      id,
      exam_session_id,
      student_id,
      external_student_name,
      external_student_email,
      school_id,
      status,
      created_at,
      students(user_id, name, first_name, last_name, email, phone, date_of_birth),
      exam_sessions!inner(id, title, start_date, end_date, organization_id),
      exam_results(id, final_score, status, created_at, exam_certificates(id, generated_pdf_url, created_at))
    `
    )
    .in("exam_sessions.organization_id", organizationIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list exam enrollments for lite profile: ${error.message}`);
  }

  const normalized = (data || [])
    .filter((row: any) => {
      const student = pickFirst(row.students);
      const matchesByUser = student?.user_id === userId;
      const matchesByEmail = Boolean(email) && String(row.external_student_email || "").toLowerCase() === String(email).toLowerCase();
      return matchesByUser || matchesByEmail;
    })
    .map((row: any) => {
      const session = pickFirst(row.exam_sessions);
      const result = pickFirst(row.exam_results);
      const certificate = result ? pickFirst(result.exam_certificates) : null;
      const student = resolveStudentData(row);

      return {
        enrollmentId: row.id,
        sessionId: row.exam_session_id,
        sessionTitle: session?.title || "Convocatoria",
        sessionStartDate: session?.start_date || null,
        sessionEndDate: session?.end_date || null,
        enrollmentStatus: row.status,
        studentId: student.studentId,
        studentName: student.studentName,
        studentEmail: student.studentEmail,
        finalScore: result?.final_score ?? null,
        resultStatus: result?.status || "pending",
        resultCreatedAt: result?.created_at || null,
        certificateId: certificate?.id || null,
        certificateGeneratedPdfUrl: certificate?.generated_pdf_url || null,
        certificateCreatedAt: certificate?.created_at || null,
        createdAt: row.created_at,
      };
    });

  const enriched: Array<{
    enrollmentId: string;
    sessionId: string;
    sessionTitle: string;
    sessionStartDate: string | null;
    sessionEndDate: string | null;
    enrollmentStatus: string;
    studentId: string | null;
    studentName: string | null;
    studentEmail: string | null;
    finalScore: number | null;
    resultStatus: string;
    resultCreatedAt: string | null;
    certificateId: string | null;
    certificateGeneratedPdfUrl: string | null;
    certificateCreatedAt: string | null;
    createdAt: string;
    certificateUrl: string | null;
  }> = [];

  for (const item of normalized) {
    const certificateUrl = item.certificateGeneratedPdfUrl
      ? await resolveExamCertificateDownloadUrl(item.certificateGeneratedPdfUrl)
      : null;

    enriched.push({
      ...item,
      certificateUrl,
    });
  }

  return enriched;
}

function paginate<T>(items: T[], limit: number, offset: number) {
  return {
    total: items.length,
    limit,
    offset,
    items: items.slice(offset, offset + limit),
  };
}

export const examPortalService = {
  async assertUserHasExamPlan(userId: string, requiredPlan: ExamPlan = "lite") {
    const { tenantIds, organizationIds, mode } = await getPortalMembershipContext(userId);

    if (mode === "full") {
      if (tenantIds.length === 0) {
        throw new Error("Exam subscription required");
      }

      await examSubscriptionService.requireExamPlan({ tenantId: tenantIds[0] }, requiredPlan);
      return;
    }

    if (organizationIds.length === 0) {
      throw new Error("Exam subscription required");
    }

    let hasActivePlan = false;
    for (const organizationId of organizationIds) {
      try {
        await examSubscriptionService.requireExamPlan({ organizationId }, requiredPlan);
        hasActivePlan = true;
        break;
      } catch {
        // Continue checking remaining organizations.
      }
    }

    if (!hasActivePlan) {
      throw new Error("Exam subscription required");
    }
  },

  async getExamFeed(userId: string, input: { limit: number; offset: number }) {
    const { tenantIds, organizationIds, mode } = await getPortalMembershipContext(userId);
    await this.assertUserHasExamPlan(userId, "lite");
    const profile = await ensureStudentExamProfile(userId, organizationIds);

    const capabilities = {
      canViewResults: true,
      canViewCertificates: true,
      canViewFullPortal: mode === "full",
    };

    if (mode === "full") {
      let fullItems = [] as Awaited<ReturnType<typeof studentPortalService.getStudentExams>>;
      try {
        fullItems = await studentPortalService.getStudentExams(userId);
      } catch {
        fullItems = [];
      }

      const schedule = await studentPortalService.getStudentSchedule(userId).catch(() => ({ weeklySchedule: [] as any[] }));
      const paged = paginate(fullItems, input.limit, input.offset);

      return {
        mode,
        profile,
        tenantIds,
        organizationIds,
        capabilities,
        schedule: {
          weeklyCount: Array.isArray(schedule.weeklySchedule) ? schedule.weeklySchedule.length : 0,
        },
        ...paged,
      };
    }

    const email = await getUserEmail(userId);
    const liteItems = await listLiteExamFeedItems(userId, organizationIds, email);
    const paged = paginate(liteItems, input.limit, input.offset);

    return {
      mode,
      profile,
      tenantIds,
      organizationIds,
      capabilities,
      ...paged,
    };
  },
};
