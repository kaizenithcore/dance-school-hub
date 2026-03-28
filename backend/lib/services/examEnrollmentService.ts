import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { examSubscriptionService } from "@/lib/services/examSubscriptionService";
import { examUsageBillingService } from "@/lib/services/examUsageBillingService";
import type { CreateExamEnrollmentInput } from "@/lib/validators/examCoreSchemas";

interface SessionScope {
  id: string;
  organization_id: string | null;
  school_id: string | null;
  title: string;
  enrollment_start: string | null;
  enrollment_end: string | null;
  status: "draft" | "published" | "enrollment_open" | "closed" | "evaluated" | "certified";
}

interface EnrollmentStudentRow {
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
}

interface EnrollmentStudentSource {
  student_id?: string | null;
  external_student_name?: string | null;
  external_student_email?: string | null;
  students?: EnrollmentStudentRow | EnrollmentStudentRow[] | null;
}

interface EnrollmentFieldsRow {
  data?: Record<string, unknown> | null;
}

interface EnrollmentListRow extends EnrollmentStudentSource {
  id: string;
  exam_session_id: string;
  student_id: string | null;
  school_id: string;
  status: "pending" | "confirmed" | "cancelled";
  created_at: string;
  exam_enrollment_fields?: EnrollmentFieldsRow | EnrollmentFieldsRow[] | null;
}

export type EnrollmentErrorCode =
  | "duplicate_enrollment"
  | "enrollment_out_of_window"
  | "enrollment_capacity_full";

export class EnrollmentDomainError extends Error {
  code: EnrollmentErrorCode;

  constructor(code: EnrollmentErrorCode, message: string) {
    super(message);
    this.name = "EnrollmentDomainError";
    this.code = code;
  }
}

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function buildStudentName(student: EnrollmentStudentRow | null): string | null {
  if (!student) {
    return null;
  }

  const directName = student.name?.trim();
  if (directName) {
    return directName;
  }

  const first = student.first_name?.trim() || "";
  const last = student.last_name?.trim() || "";
  const fullName = `${first} ${last}`.trim();

  return fullName || null;
}

export function resolveStudentData(enrollment: EnrollmentStudentSource) {
  const student = pickOne(enrollment.students);
  const studentName = buildStudentName(student);

  return {
    studentId: enrollment.student_id || null,
    studentName: studentName || enrollment.external_student_name || null,
    studentEmail: student?.email || enrollment.external_student_email || null,
    studentPhone: student?.phone || null,
    studentBirthDate: student?.date_of_birth || null,
  };
}

function toIsoDay(value: Date): string {
  return value.toISOString().split("T")[0];
}

function isWithinEnrollmentWindow(session: SessionScope): boolean {
  const today = toIsoDay(new Date());

  if (session.enrollment_start && today < session.enrollment_start) {
    return false;
  }

  if (session.enrollment_end && today > session.enrollment_end) {
    return false;
  }

  return true;
}

async function getSession(sessionId: string): Promise<SessionScope> {
  const { data, error } = await supabaseAdmin
    .from("exam_sessions")
    .select("id, organization_id, school_id, title, enrollment_start, enrollment_end, status")
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

async function ensureSchoolIsMember(organizationId: string, schoolId: string) {
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
    throw new Error("School is not a member of this exam organization");
  }
}

async function resolveSchoolId(session: SessionScope, payload: CreateExamEnrollmentInput): Promise<string> {
  if (session.school_id) {
    if (payload.school_id && payload.school_id !== session.school_id) {
      throw new Error("school_id does not match session scope");
    }

    return session.school_id;
  }

  if (!session.organization_id) {
    throw new Error("Invalid session scope");
  }

  if (!payload.school_id) {
    throw new Error("school_id is required for organization sessions");
  }

  await ensureSchoolIsMember(session.organization_id, payload.school_id);
  return payload.school_id;
}

async function resolveStudentIdentity(input: {
  studentId?: string | null;
  externalName?: string | null;
  externalEmail?: string | null;
  schoolId: string;
}) {
  if (!input.studentId) {
    return {
      studentId: null,
      externalName: input.externalName || null,
      externalEmail: input.externalEmail || null,
    };
  }

  const { data: student, error } = await supabaseAdmin
    .from("students")
    .select("id, tenant_id, name, email")
    .eq("id", input.studentId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve student: ${error.message}`);
  }

  if (!student) {
    throw new Error("Student not found");
  }

  if (student.tenant_id !== input.schoolId) {
    throw new Error("Student does not belong to selected school");
  }

  return {
    studentId: student.id,
    externalName: student.name || input.externalName || null,
    externalEmail: student.email || input.externalEmail || null,
  };
}

async function assertNoDuplicateEnrollment(input: {
  sessionId: string;
  schoolId: string;
  studentId: string | null;
  externalEmail: string | null;
}) {
  const normalizedEmail = input.externalEmail?.trim().toLowerCase() || null;

  if (!input.studentId && !normalizedEmail) {
    return;
  }

  let query = supabaseAdmin
    .from("exam_enrollments")
    .select("id")
    .eq("exam_session_id", input.sessionId)
    .eq("school_id", input.schoolId)
    .neq("status", "cancelled");

  if (input.studentId) {
    query = query.eq("student_id", input.studentId);
  } else if (normalizedEmail) {
    query = query.ilike("external_student_email", normalizedEmail);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new Error(`Failed to validate duplicate enrollment: ${error.message}`);
  }

  if (data) {
    throw new EnrollmentDomainError(
      "duplicate_enrollment",
      "Student is already enrolled in this exam session"
    );
  }
}

async function assertUserCanReadSessionEnrollments(userId: string, session: SessionScope) {
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

  const tenantIds = new Set((tenantMemberships || []).map((membership) => membership.tenant_id));

  if (session.school_id) {
    if (!tenantIds.has(session.school_id)) {
      throw new Error("Forbidden");
    }
    return;
  }

  if (orgMembership) {
    return;
  }

  if (!session.organization_id) {
    throw new Error("Forbidden");
  }

  const { data: organizationSchools } = await supabaseAdmin
    .from("exam_memberships")
    .select("school_id")
    .eq("organization_id", session.organization_id);

  const intersects = (organizationSchools || []).some((row) => tenantIds.has(row.school_id));
  if (!intersects) {
    throw new Error("Forbidden");
  }
}

export const examEnrollmentService = {
  async enroll(sessionId: string, input: CreateExamEnrollmentInput) {
    const session = await getSession(sessionId);
    await examSubscriptionService.requireExamFeature({ sessionId: session.id }, "enrollments.create");

    try {
      await examSubscriptionService.assertCanCreateEnrollmentForSession(session.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to validate enrollment capacity";
      if (message.toLowerCase().includes("max enrollments per session") || message.toLowerCase().includes("limit exceeded")) {
        throw new EnrollmentDomainError("enrollment_capacity_full", "Enrollment capacity is full for this session");
      }
      throw error;
    }

    if (session.status !== "enrollment_open") {
      throw new EnrollmentDomainError("enrollment_out_of_window", "Enrollment is not open for this session");
    }

    if (!isWithinEnrollmentWindow(session)) {
      throw new EnrollmentDomainError("enrollment_out_of_window", "Enrollment window is closed for this session");
    }

    const schoolId = await resolveSchoolId(session, input);
    const identity = await resolveStudentIdentity({
      studentId: input.student_id,
      externalName: input.external_student_name,
      externalEmail: input.external_student_email,
      schoolId,
    });

    await assertNoDuplicateEnrollment({
      sessionId: session.id,
      schoolId,
      studentId: identity.studentId,
      externalEmail: identity.externalEmail,
    });

    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from("exam_enrollments")
      .insert({
        exam_session_id: session.id,
        student_id: identity.studentId,
        external_student_name: identity.externalName,
        external_student_email: identity.externalEmail,
        school_id: schoolId,
        status: input.status || "pending",
      })
      .select("id, exam_session_id, student_id, external_student_name, external_student_email, school_id, status, created_at")
      .single();

    if (enrollmentError || !enrollment) {
      throw new Error(`Failed to create exam enrollment: ${enrollmentError?.message || "unknown error"}`);
    }

    const formData = input.form_values || {};
    const { error: fieldsError } = await supabaseAdmin
      .from("exam_enrollment_fields")
      .insert({
        enrollment_id: enrollment.id,
        data: formData,
      });

    if (fieldsError) {
      throw new Error(`Failed to persist enrollment fields: ${fieldsError.message}`);
    }

    await examUsageBillingService.trackUsageEvent({
      eventType: "enrollment_created",
      entityId: enrollment.id,
      organizationId: session.organization_id,
      schoolId,
      metadata: {
        sessionId: session.id,
      },
    });

    return {
      ...enrollment,
      fields: formData,
    };
  },

  async listEnrollments(sessionId: string, userId: string) {
    const session = await getSession(sessionId);
    await examSubscriptionService.requireExamFeature({ sessionId: session.id }, "enrollments.read");
    await assertUserCanReadSessionEnrollments(userId, session);

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
        students(name, email, phone, date_of_birth),
        exam_enrollment_fields(data)
      `
      )
      .eq("exam_session_id", sessionId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list exam enrollments: ${error.message}`);
    }

    return ((data || []) as EnrollmentListRow[]).map((row) => {
      const studentData = resolveStudentData(row);
      const fieldsRow = Array.isArray(row.exam_enrollment_fields) ? row.exam_enrollment_fields[0] : row.exam_enrollment_fields;

      return {
        id: row.id,
        exam_session_id: row.exam_session_id,
        student_id: row.student_id,
        school_id: row.school_id,
        status: row.status,
        created_at: row.created_at,
        student_name: studentData.studentName,
        student_email: studentData.studentEmail,
        student_phone: studentData.studentPhone,
        student_birth_date: studentData.studentBirthDate,
        fields: fieldsRow?.data || {},
      };
    });
  },
};
