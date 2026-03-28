import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import type { UpgradeExamToProInput } from "@/lib/validators/examCoreSchemas";

interface OrganizationScope {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "manager" | "member";
}

interface TenantRow {
  id: string;
  name: string;
  slug: string;
}

interface SourceSessionRow {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  enrollment_start: string | null;
  enrollment_end: string | null;
  status: "draft" | "published" | "enrollment_open" | "closed" | "evaluated" | "certified";
}

interface SourceEnrollmentRow {
  id: string;
  exam_session_id: string;
  student_id: string | null;
  external_student_name: string | null;
  external_student_email: string | null;
  status: "pending" | "confirmed" | "cancelled";
  students:
    | {
        name: string | null;
        email: string | null;
        phone: string | null;
        date_of_birth: string | null;
      }
    | Array<{
        name: string | null;
        email: string | null;
        phone: string | null;
        date_of_birth: string | null;
      }>
    | null;
}

interface SourceResultRow {
  id: string;
  enrollment_id: string;
  scores: Record<string, number>;
  final_score: number | null;
  status: "pass" | "fail" | "pending";
  manual_override: boolean;
}

interface SourceCertificateRow {
  id: string;
  result_id: string;
  generated_pdf_url: string;
}

interface UpgradeInput {
  actorUserId: string;
  payload: UpgradeExamToProInput;
  origin?: string | null;
}

function normalizeSlug(rawSlug: string): string {
  return rawSlug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function toStudentName(enrollment: SourceEnrollmentRow): string {
  const student = pickOne(enrollment.students);
  const fromStudent = student?.name?.trim();
  if (fromStudent) {
    return fromStudent;
  }

  const fromExternal = enrollment.external_student_name?.trim();
  if (fromExternal) {
    return fromExternal;
  }

  return "Alumno/a migrado";
}

function toStudentEmail(enrollment: SourceEnrollmentRow): string {
  const student = pickOne(enrollment.students);
  const fromStudent = student?.email?.trim();
  if (fromStudent) {
    return fromStudent.toLowerCase();
  }

  const fromExternal = enrollment.external_student_email?.trim();
  if (fromExternal) {
    return fromExternal.toLowerCase();
  }

  return `migrated-${enrollment.id}@exam.local`;
}

function toStudentPhone(enrollment: SourceEnrollmentRow): string {
  const student = pickOne(enrollment.students);
  return student?.phone?.trim() || "000000000";
}

async function resolveManageableOrganization(input: {
  userId: string;
  requestedOrganizationId?: string;
}): Promise<OrganizationScope> {
  const { data, error } = await supabaseAdmin
    .from("organization_memberships")
    .select("organization_id, role, organizations!inner(id, name, slug)")
    .eq("user_id", input.userId)
    .eq("is_active", true)
    .in("role", ["owner", "admin"]);

  if (error) {
    throw new Error(`Failed to resolve organizations for upgrade: ${error.message}`);
  }

  const organizations = (data || []).map((row: any) => ({
    id: row.organization_id as string,
    role: row.role as OrganizationScope["role"],
    name: (Array.isArray(row.organizations) ? row.organizations[0] : row.organizations)?.name as string,
    slug: (Array.isArray(row.organizations) ? row.organizations[0] : row.organizations)?.slug as string,
  }));

  if (organizations.length === 0) {
    throw new Error("Forbidden");
  }

  if (input.requestedOrganizationId) {
    const selected = organizations.find((item) => item.id === input.requestedOrganizationId);
    if (!selected) {
      throw new Error("Forbidden");
    }
    return selected;
  }

  return organizations[0];
}

async function resolvePrimaryTenant(organizationId: string): Promise<TenantRow | null> {
  const { data, error } = await supabaseAdmin
    .from("organization_tenants")
    .select("tenant_id, is_primary")
    .eq("organization_id", organizationId)
    .eq("is_primary", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve existing organization tenant: ${error.message}`);
  }

  if (!data?.tenant_id) {
    return null;
  }

  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from("tenants")
    .select("id, name, slug")
    .eq("id", data.tenant_id)
    .maybeSingle();

  if (tenantError) {
    throw new Error(`Failed to resolve existing tenant data: ${tenantError.message}`);
  }

  return (tenant as TenantRow | null) || null;
}

async function ensureUniqueTenantSlug(baseSlug: string): Promise<string> {
  const normalized = normalizeSlug(baseSlug);
  if (!normalized) {
    return "pro-school";
  }

  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("slug")
    .ilike("slug", `${normalized}%`);

  if (error) {
    throw new Error(`Failed to validate tenant slug uniqueness: ${error.message}`);
  }

  const existing = new Set((data || []).map((row: any) => String(row.slug).toLowerCase()));
  if (!existing.has(normalized)) {
    return normalized;
  }

  let index = 2;
  while (existing.has(`${normalized}-${index}`)) {
    index += 1;
  }

  return `${normalized}-${index}`;
}

async function createProTenant(input: {
  organization: OrganizationScope;
  actorUserId: string;
}): Promise<TenantRow> {
  const tenantName = `${input.organization.name} Pro`;
  const tenantSlug = await ensureUniqueTenantSlug(`${input.organization.slug}-pro`);

  const { data: createdTenant, error: tenantError } = await supabaseAdmin
    .from("tenants")
    .insert({
      name: tenantName,
      slug: tenantSlug,
    })
    .select("id, name, slug")
    .single();

  if (tenantError || !createdTenant) {
    throw new Error(`Failed to create pro tenant: ${tenantError?.message || "unknown error"}`);
  }

  const { error: membershipError } = await supabaseAdmin
    .from("tenant_memberships")
    .upsert(
      {
        tenant_id: createdTenant.id,
        user_id: input.actorUserId,
        role: "owner",
        is_active: true,
      },
      { onConflict: "tenant_id,user_id" }
    );

  if (membershipError) {
    throw new Error(`Failed to grant owner membership to pro tenant: ${membershipError.message}`);
  }

  const { data: settingsRow, error: settingsError } = await supabaseAdmin
    .from("school_settings")
    .upsert(
      {
        tenant_id: createdTenant.id,
        branding: {},
        enrollment_config: {},
        payment_config: {
          billing: {
            planType: "pro",
            source: "exam_upgrade_v1",
          },
          features: {
            examSuite: true,
          },
        },
        schedule_config: {},
        notification_config: {},
      },
      { onConflict: "tenant_id" }
    )
    .select("payment_config")
    .single();

  if (settingsError) {
    throw new Error(`Failed to initialize pro tenant settings: ${settingsError.message}`);
  }

  const paymentConfig = asObject(settingsRow?.payment_config);
  const mergedPaymentConfig = {
    ...paymentConfig,
    billing: {
      ...asObject(paymentConfig.billing),
      planType: "pro",
      source: "exam_upgrade_v1",
    },
    features: {
      ...asObject(paymentConfig.features),
      examSuite: true,
    },
  };

  const { error: updateSettingsError } = await supabaseAdmin
    .from("school_settings")
    .update({ payment_config: mergedPaymentConfig })
    .eq("tenant_id", createdTenant.id);

  if (updateSettingsError) {
    throw new Error(`Failed to finalize pro tenant settings: ${updateSettingsError.message}`);
  }

  await supabaseAdmin
    .from("organization_tenants")
    .update({ is_primary: false })
    .eq("organization_id", input.organization.id);

  const { error: orgTenantError } = await supabaseAdmin
    .from("organization_tenants")
    .upsert(
      {
        organization_id: input.organization.id,
        tenant_id: createdTenant.id,
        is_primary: true,
        display_order: 0,
      },
      { onConflict: "organization_id,tenant_id" }
    );

  if (orgTenantError) {
    throw new Error(`Failed to link organization to pro tenant: ${orgTenantError.message}`);
  }

  return createdTenant as TenantRow;
}

async function listAlreadyMigratedSourceSessions(tenantId: string): Promise<Set<string>> {
  const { data, error } = await supabaseAdmin
    .from("audit_log")
    .select("metadata")
    .eq("tenant_id", tenantId)
    .eq("action", "exam_upgrade_session_migrated")
    .eq("entity_type", "exam_session")
    .limit(5000);

  if (error) {
    throw new Error(`Failed to read existing migration markers: ${error.message}`);
  }

  const sourceIds = new Set<string>();
  for (const row of data || []) {
    const metadata = asObject((row as any).metadata);
    const sourceSessionId = metadata.sourceSessionId;
    if (typeof sourceSessionId === "string") {
      sourceIds.add(sourceSessionId);
    }
  }

  return sourceIds;
}

async function migrateExamData(input: {
  organizationId: string;
  targetTenantId: string;
  actorUserId: string;
}) {
  const summary = {
    migratedStudents: 0,
    migratedSessions: 0,
    migratedEnrollments: 0,
    migratedResults: 0,
    migratedCertificates: 0,
  };

  const { data: sourceSessions, error: sourceSessionsError } = await supabaseAdmin
    .from("exam_sessions")
    .select("id, title, description, start_date, end_date, enrollment_start, enrollment_end, status")
    .eq("organization_id", input.organizationId)
    .order("start_date", { ascending: true });

  if (sourceSessionsError) {
    throw new Error(`Failed to list source exam sessions: ${sourceSessionsError.message}`);
  }

  const sessions = (sourceSessions || []) as SourceSessionRow[];
  if (sessions.length === 0) {
    return summary;
  }

  const migratedSourceSessionIds = await listAlreadyMigratedSourceSessions(input.targetTenantId);

  for (const sourceSession of sessions) {
    if (migratedSourceSessionIds.has(sourceSession.id)) {
      continue;
    }

    const { data: createdSession, error: createSessionError } = await supabaseAdmin
      .from("exam_sessions")
      .insert({
        organization_id: null,
        school_id: input.targetTenantId,
        title: sourceSession.title,
        description: sourceSession.description,
        start_date: sourceSession.start_date,
        end_date: sourceSession.end_date,
        enrollment_start: sourceSession.enrollment_start,
        enrollment_end: sourceSession.enrollment_end,
        status: sourceSession.status,
      })
      .select("id")
      .single();

    if (createSessionError || !createdSession) {
      throw new Error(`Failed to migrate exam session '${sourceSession.title}': ${createSessionError?.message || "unknown error"}`);
    }

    summary.migratedSessions += 1;

    const { data: sourceEnrollments, error: sourceEnrollmentsError } = await supabaseAdmin
      .from("exam_enrollments")
      .select(
        `
        id,
        exam_session_id,
        student_id,
        external_student_name,
        external_student_email,
        status,
        students(name, email, phone, date_of_birth)
      `
      )
      .eq("exam_session_id", sourceSession.id)
      .order("created_at", { ascending: true });

    if (sourceEnrollmentsError) {
      throw new Error(`Failed to load enrollments for session '${sourceSession.title}': ${sourceEnrollmentsError.message}`);
    }

    const enrollments = (sourceEnrollments || []) as SourceEnrollmentRow[];

    const enrollmentIdToNewStudentId = new Map<string, string>();
    const emailToStudentId = new Map<string, string>();

    const existingEmails = Array.from(
      new Set(
        enrollments
          .map((row) => toStudentEmail(row))
          .filter((email) => !email.endsWith("@exam.local"))
      )
    );

    if (existingEmails.length > 0) {
      const { data: existingStudents } = await supabaseAdmin
        .from("students")
        .select("id, email")
        .eq("tenant_id", input.targetTenantId)
        .in("email", existingEmails);

      for (const row of existingStudents || []) {
        emailToStudentId.set(String(row.email).toLowerCase(), String(row.id));
      }
    }

    for (const enrollment of enrollments) {
      const normalizedEmail = toStudentEmail(enrollment).toLowerCase();
      let studentId = emailToStudentId.get(normalizedEmail);

      if (!studentId) {
        const { data: createdStudent, error: createStudentError } = await supabaseAdmin
          .from("students")
          .insert({
            tenant_id: input.targetTenantId,
            name: toStudentName(enrollment),
            email: normalizedEmail,
            phone: toStudentPhone(enrollment),
            date_of_birth: pickOne(enrollment.students)?.date_of_birth || null,
            status: "active",
            payment_type: "none",
            notes: "Migrado desde ExamSuit Lite",
          })
          .select("id")
          .single();

        if (createStudentError || !createdStudent) {
          throw new Error(`Failed to migrate student for enrollment '${enrollment.id}': ${createStudentError?.message || "unknown error"}`);
        }

        studentId = String(createdStudent.id);
        emailToStudentId.set(normalizedEmail, studentId);
        summary.migratedStudents += 1;
      }

      enrollmentIdToNewStudentId.set(enrollment.id, studentId);
    }

    const sourceEnrollmentIds = enrollments.map((row) => row.id);

    const { data: sourceFields, error: sourceFieldsError } = sourceEnrollmentIds.length
      ? await supabaseAdmin
          .from("exam_enrollment_fields")
          .select("enrollment_id, data")
          .in("enrollment_id", sourceEnrollmentIds)
      : { data: [], error: null };

    if (sourceFieldsError) {
      throw new Error(`Failed to load enrollment fields for session '${sourceSession.title}': ${sourceFieldsError.message}`);
    }

    const fieldsByEnrollmentId = new Map<string, Record<string, unknown>>();
    for (const row of sourceFields || []) {
      fieldsByEnrollmentId.set(String((row as any).enrollment_id), asObject((row as any).data));
    }

    const sourceEnrollmentIdToNewEnrollmentId = new Map<string, string>();

    for (const sourceEnrollment of enrollments) {
      const mappedStudentId = enrollmentIdToNewStudentId.get(sourceEnrollment.id);
      if (!mappedStudentId) {
        continue;
      }

      const { data: createdEnrollment, error: createdEnrollmentError } = await supabaseAdmin
        .from("exam_enrollments")
        .insert({
          exam_session_id: createdSession.id,
          student_id: mappedStudentId,
          external_student_name: sourceEnrollment.external_student_name,
          external_student_email: sourceEnrollment.external_student_email,
          school_id: input.targetTenantId,
          status: sourceEnrollment.status,
        })
        .select("id")
        .single();

      if (createdEnrollmentError || !createdEnrollment) {
        throw new Error(`Failed to migrate enrollment '${sourceEnrollment.id}': ${createdEnrollmentError?.message || "unknown error"}`);
      }

      sourceEnrollmentIdToNewEnrollmentId.set(sourceEnrollment.id, String(createdEnrollment.id));
      summary.migratedEnrollments += 1;

      const fields = fieldsByEnrollmentId.get(sourceEnrollment.id) || {};
      const { error: fieldsInsertError } = await supabaseAdmin.from("exam_enrollment_fields").insert({
        enrollment_id: createdEnrollment.id,
        data: fields,
      });

      if (fieldsInsertError) {
        throw new Error(`Failed to migrate enrollment fields for '${sourceEnrollment.id}': ${fieldsInsertError.message}`);
      }
    }

    const { data: sourceResults, error: sourceResultsError } = sourceEnrollmentIds.length
      ? await supabaseAdmin
          .from("exam_results")
          .select("id, enrollment_id, scores, final_score, status, manual_override")
          .in("enrollment_id", sourceEnrollmentIds)
      : { data: [], error: null };

    if (sourceResultsError) {
      throw new Error(`Failed to load results for session '${sourceSession.title}': ${sourceResultsError.message}`);
    }

    const results = (sourceResults || []) as SourceResultRow[];
    const sourceResultIdToNewResultId = new Map<string, string>();

    for (const sourceResult of results) {
      const newEnrollmentId = sourceEnrollmentIdToNewEnrollmentId.get(sourceResult.enrollment_id);
      if (!newEnrollmentId) {
        continue;
      }

      const { data: createdResult, error: createdResultError } = await supabaseAdmin
        .from("exam_results")
        .insert({
          enrollment_id: newEnrollmentId,
          scores: sourceResult.scores || {},
          final_score: sourceResult.final_score,
          status: sourceResult.status,
          evaluated_by: input.actorUserId,
          manual_override: sourceResult.manual_override,
        })
        .select("id")
        .single();

      if (createdResultError || !createdResult) {
        throw new Error(`Failed to migrate result '${sourceResult.id}': ${createdResultError?.message || "unknown error"}`);
      }

      sourceResultIdToNewResultId.set(sourceResult.id, String(createdResult.id));
      summary.migratedResults += 1;
    }

    const sourceResultIds = results.map((row) => row.id);
    const { data: sourceCertificates, error: sourceCertificatesError } = sourceResultIds.length
      ? await supabaseAdmin
          .from("exam_certificates")
          .select("id, result_id, generated_pdf_url")
          .in("result_id", sourceResultIds)
      : { data: [], error: null };

    if (sourceCertificatesError) {
      throw new Error(`Failed to load certificates for session '${sourceSession.title}': ${sourceCertificatesError.message}`);
    }

    for (const sourceCertificate of (sourceCertificates || []) as SourceCertificateRow[]) {
      const newResultId = sourceResultIdToNewResultId.get(sourceCertificate.result_id);
      if (!newResultId) {
        continue;
      }

      const { error: createCertificateError } = await supabaseAdmin
        .from("exam_certificates")
        .insert({
          result_id: newResultId,
          template_id: null,
          generated_pdf_url: sourceCertificate.generated_pdf_url,
        });

      if (createCertificateError) {
        throw new Error(`Failed to migrate certificate '${sourceCertificate.id}': ${createCertificateError.message}`);
      }

      summary.migratedCertificates += 1;
    }

    await supabaseAdmin.from("audit_log").insert({
      tenant_id: input.targetTenantId,
      actor_user_id: input.actorUserId,
      action: "exam_upgrade_session_migrated",
      entity_type: "exam_session",
      entity_id: createdSession.id,
      metadata: {
        sourceSessionId: sourceSession.id,
      },
    });
  }

  return summary;
}

function buildRedirectUrl(input: { baseUrl?: string; tenantSlug: string }): string {
  const base = input.baseUrl || "http://localhost:8081";
  return `${base.replace(/\/$/, "")}/admin/settings?tab=billing&tenant=${encodeURIComponent(input.tenantSlug)}&source=exam-upgrade`;
}

export const examUpgradeService = {
  async upgradeToPro(input: UpgradeInput) {
    const organization = await resolveManageableOrganization({
      userId: input.actorUserId,
      requestedOrganizationId: input.payload.organization_id,
    });

    let targetTenant = await resolvePrimaryTenant(organization.id);
    let createdTenant = false;

    if (!targetTenant) {
      targetTenant = await createProTenant({
        organization,
        actorUserId: input.actorUserId,
      });
      createdTenant = true;
    }

    const migration = await migrateExamData({
      organizationId: organization.id,
      targetTenantId: targetTenant.id,
      actorUserId: input.actorUserId,
    });

    await supabaseAdmin.from("audit_log").insert({
      tenant_id: targetTenant.id,
      actor_user_id: input.actorUserId,
      action: "exam_upgrade_to_pro",
      entity_type: "organization",
      entity_id: organization.id,
      metadata: {
        createdTenant,
        migrated: migration,
      },
    });

    return {
      success: true,
      organization_id: organization.id,
      tenant_id: targetTenant.id,
      tenant_slug: targetTenant.slug,
      created_tenant: createdTenant,
      migrated: migration,
      redirect_url: buildRedirectUrl({
        baseUrl: input.payload.redirect_base_url || input.origin || undefined,
        tenantSlug: targetTenant.slug,
      }),
    };
  },
};
