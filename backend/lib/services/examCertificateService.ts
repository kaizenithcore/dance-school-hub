import { chromium } from "playwright";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { outboxService } from "@/lib/services/outboxService";
import { resolveStudentData } from "@/lib/services/examEnrollmentService";
import { examSubscriptionService } from "@/lib/services/examSubscriptionService";
import { examUsageBillingService } from "@/lib/services/examUsageBillingService";
import { examAuditService } from "@/lib/services/examAuditService";
import { examRoleService } from "@/lib/services/examRoleService";
import type {
  GenerateExamCertificateInput,
  ListExamCertificateJobsInput,
  QueueExamCertificateBatchInput,
  QueueExamCertificateInput,
} from "@/lib/validators/examCoreSchemas";

const EXAM_CERTIFICATES_BUCKET = "exam-certificates";

interface SessionScope {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  organization_id: string | null;
  school_id: string | null;
}

interface EvaluationResultContext {
  id: string;
  final_score: number | null;
  status: "pass" | "fail" | "pending";
  exam_enrollments: {
    id: string;
    school_id: string;
    student_id: string | null;
    external_student_name: string | null;
    external_student_email: string | null;
    students: {
      name: string | null;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    } | null;
    exam_sessions: SessionScope;
  };
}

interface CertificateTemplateRow {
  id: string;
  organization_id: string | null;
  name: string;
  template_html: string;
}

interface CertificateRecordRow {
  id: string;
  result_id: string;
  template_id: string | null;
  generated_pdf_url: string;
  created_at: string;
}

interface CertificateDetailResultRow {
  status: "pass" | "fail" | "pending";
  final_score: number | null;
  exam_enrollments: {
    id: string;
    school_id: string;
    student_id: string | null;
    external_student_name: string | null;
    external_student_email: string | null;
    students: {
      name: string | null;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    } | null;
    exam_sessions: SessionScope;
  };
}

interface CertificateDetailRow extends CertificateRecordRow {
  exam_results: CertificateDetailResultRow;
}

interface StudentExamEnrollmentRow {
  id: string;
  exam_session_id: string;
  student_id: string | null;
  external_student_name: string | null;
  external_student_email: string | null;
  school_id: string;
  status: string;
  created_at: string;
  students:
    | {
      name: string | null;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      phone: string | null;
      date_of_birth: string | null;
    }
    | Array<{
      name: string | null;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      phone: string | null;
      date_of_birth: string | null;
    }>
    | null;
  exam_sessions:
    | { id: string; title: string; start_date: string; end_date: string }
    | Array<{ id: string; title: string; start_date: string; end_date: string }>;
  exam_results:
    | {
      id: string;
      final_score: number | null;
      status: "pass" | "fail" | "pending";
      created_at: string;
      exam_certificates:
        | { id: string; generated_pdf_url: string; created_at: string }
        | Array<{ id: string; generated_pdf_url: string; created_at: string }>
        | null;
    }
    | Array<{
      id: string;
      final_score: number | null;
      status: "pass" | "fail" | "pending";
      created_at: string;
      exam_certificates:
        | { id: string; generated_pdf_url: string; created_at: string }
        | Array<{ id: string; generated_pdf_url: string; created_at: string }>
        | null;
    }>
    | null;
}

type CertificateJobStatus = "queued" | "processing" | "completed" | "failed";

interface CertificateJobRow {
  id: string;
  organization_id: string | null;
  school_id: string;
  exam_session_id: string;
  result_id: string;
  template_id: string | null;
  requested_by: string | null;
  status: CertificateJobStatus;
  attempts: number;
  max_attempts: number;
  next_attempt_at: string;
  started_at: string | null;
  completed_at: string | null;
  last_error: string | null;
  certificate_id: string | null;
  generated_pdf_url: string | null;
  processing_logs: unknown;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

function injectTemplateVariables(template: string, variables: Record<string, unknown>): string {
  return template.replace(/{{\s*([a-zA-Z0-9_.]+)\s*}}/g, (_match, path: string) => {
    const value = path.split(".").reduce<unknown>((acc, key) => {
      if (!acc || typeof acc !== "object") {
        return undefined;
      }

      return (acc as Record<string, unknown>)[key];
    }, variables);

    if (value === undefined || value === null) {
      return "";
    }

    return String(value);
  });
}

async function renderHtmlToPdfBuffer(templateHtml: string, variables: Record<string, unknown>): Promise<Buffer> {
  const interpolated = injectTemplateVariables(templateHtml, variables);
  const html = interpolated.includes("<html")
    ? interpolated
    : `<!doctype html><html><head><meta charset="UTF-8" /></head><body>${interpolated}</body></html>`;

  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", right: "10mm", bottom: "12mm", left: "10mm" },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function getDefaultTemplateHtml(): string {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; padding: 40px; color: #111827;">
        <div style="border: 2px solid #111827; padding: 32px; border-radius: 12px;">
          <h1 style="font-size: 34px; margin: 0 0 12px;">Certificado ExamSuit</h1>
          <p style="font-size: 16px; margin: 0 0 20px;">Se certifica que</p>
          <h2 style="font-size: 28px; margin: 0 0 20px;">{{student.name}}</h2>
          <p style="font-size: 16px; margin: 0 0 10px;">ha completado la convocatoria</p>
          <p style="font-size: 20px; margin: 0 0 10px;"><strong>{{session.title}}</strong></p>
          <p style="font-size: 16px; margin: 0 0 8px;">Puntaje final: <strong>{{result.final_score}}</strong></p>
          <p style="font-size: 16px; margin: 0 0 8px;">Estado: <strong>{{result.status_label}}</strong></p>
          <p style="font-size: 14px; margin-top: 32px;">Emitido el {{certificate.issued_at}}</p>
        </div>
      </body>
    </html>
  `;
}

function formatScore(score: number | null): string {
  if (typeof score !== "number" || Number.isNaN(score)) {
    return "-";
  }

  return score.toFixed(2);
}

function toStatusLabel(status: "pass" | "fail" | "pending") {
  if (status === "pass") return "Aprobado";
  if (status === "fail") return "No aprobado";
  return "Pendiente";
}

function toIsoDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 10);
}

function asLogs(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    : [];
}

function nextRetryIso(attempt: number): string {
  const backoffMinutes = Math.min(60, Math.max(1, attempt * 2));
  return new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();
}

function isPermanentGenerationError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("forbidden")
    || lower.includes("not found")
    || lower.includes("does not belong")
    || lower.includes("invalid")
    || lower.includes("not enabled");
}

function resolveStudentName(resultContext: EvaluationResultContext) {
  const resolved = resolveStudentData(resultContext.exam_enrollments);
  return resolved.studentName || "Alumno/a";
}

function resolveStudentEmail(resultContext: EvaluationResultContext) {
  const resolved = resolveStudentData(resultContext.exam_enrollments);
  return resolved.studentEmail;
}

async function ensureCertificatesBucket() {
  const inspected = await supabaseAdmin.storage.getBucket(EXAM_CERTIFICATES_BUCKET);

  if (inspected.error && !inspected.error.message.toLowerCase().includes("not found")) {
    throw new Error(`Failed to inspect certificates bucket: ${inspected.error.message}`);
  }

  if (inspected.data) {
    return;
  }

  const { error } = await supabaseAdmin.storage.createBucket(EXAM_CERTIFICATES_BUCKET, {
    public: false,
    fileSizeLimit: "25MB",
  });

  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw new Error(`Failed to create certificates bucket: ${error.message}`);
  }
}

async function getSession(sessionId: string): Promise<SessionScope> {
  const { data, error } = await supabaseAdmin
    .from("exam_sessions")
    .select("id, title, start_date, end_date, organization_id, school_id")
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

  const allowedByFineRole = await examRoleService.hasSessionPermission(userId, session, "certificates.generate");
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

async function loadEvaluationResultContext(resultId: string): Promise<EvaluationResultContext> {
  const { data, error } = await supabaseAdmin
    .from("exam_results")
    .select(
      `
      id,
      final_score,
      status,
      exam_enrollments!inner(
        id,
        school_id,
        student_id,
        external_student_name,
        external_student_email,
        students(name, first_name, last_name, email),
        exam_sessions!inner(id, title, start_date, end_date, organization_id, school_id)
      )
    `
    )
    .eq("id", resultId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load exam result: ${error.message}`);
  }

  if (!data) {
    throw new Error("Exam result not found");
  }

  return data as unknown as EvaluationResultContext;
}

async function resolveTemplateForResult(
  resultContext: EvaluationResultContext,
  templateId?: string | null
): Promise<CertificateTemplateRow | null> {
  const session = resultContext.exam_enrollments.exam_sessions;

  if (templateId) {
    const { data, error } = await supabaseAdmin
      .from("exam_certificate_templates")
      .select("id, organization_id, name, template_html")
      .eq("id", templateId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load certificate template: ${error.message}`);
    }

    if (!data) {
      throw new Error("Certificate template not found");
    }

    const typed = data as CertificateTemplateRow;

    if (session.organization_id && typed.organization_id !== session.organization_id) {
      throw new Error("Certificate template does not belong to this organization");
    }

    if (!session.organization_id && typed.organization_id) {
      throw new Error("Certificate template is not valid for this school session");
    }

    return typed;
  }

  if (!session.organization_id) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("exam_certificate_templates")
    .select("id, organization_id, name, template_html")
    .eq("organization_id", session.organization_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load organization certificate template: ${error.message}`);
  }

  return (data as CertificateTemplateRow | null) || null;
}

function parseSupabaseUrl(value: string): { bucket: string; path: string } | null {
  if (!value.startsWith("supabase://")) {
    return null;
  }

  const raw = value.slice("supabase://".length);
  const separator = raw.indexOf("/");
  if (separator <= 0 || separator >= raw.length - 1) {
    return null;
  }

  return {
    bucket: raw.slice(0, separator),
    path: raw.slice(separator + 1),
  };
}

export async function resolveExamCertificateDownloadUrl(value: string): Promise<string> {
  const parsed = parseSupabaseUrl(value);
  if (!parsed) {
    return value;
  }

  const { data, error } = await supabaseAdmin.storage.from(parsed.bucket).createSignedUrl(parsed.path, 60 * 60 * 24 * 7);

  if (error || !data?.signedUrl) {
    return value;
  }

  return data.signedUrl;
}

async function findCertificateByResultId(resultId: string) {
  const { data, error } = await supabaseAdmin
    .from("exam_certificates")
    .select("id, result_id, template_id, generated_pdf_url, created_at")
    .eq("result_id", resultId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load existing exam certificate: ${error.message}`);
  }

  return data as {
    id: string;
    result_id: string;
    template_id: string | null;
    generated_pdf_url: string;
    created_at: string;
  } | null;
}

async function listManageableScope(userId: string) {
  return examRoleService.listManageableScopeByPermission(userId, "certificates.generate");
}

async function enqueueCertificateJob(input: {
  actorUserId: string;
  resultContext: EvaluationResultContext;
  templateId?: string | null;
  maxAttempts: number;
}) {
  const session = input.resultContext.exam_enrollments.exam_sessions;

  const existingActive = await supabaseAdmin
    .from("exam_certificate_generation_jobs")
    .select("id, status, attempts, max_attempts, next_attempt_at")
    .eq("result_id", input.resultContext.id)
    .in("status", ["queued", "processing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingActive.error) {
    throw new Error(`Failed to inspect active certificate jobs: ${existingActive.error.message}`);
  }

  if (existingActive.data) {
    return {
      id: existingActive.data.id as string,
      status: existingActive.data.status as CertificateJobStatus,
      attempts: Number(existingActive.data.attempts || 0),
      max_attempts: Number(existingActive.data.max_attempts || input.maxAttempts),
      next_attempt_at: String(existingActive.data.next_attempt_at || new Date().toISOString()),
      reused: true,
    };
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("exam_certificate_generation_jobs")
    .insert({
      organization_id: session.organization_id,
      school_id: input.resultContext.exam_enrollments.school_id,
      exam_session_id: session.id,
      result_id: input.resultContext.id,
      template_id: input.templateId || null,
      requested_by: input.actorUserId,
      status: "queued",
      attempts: 0,
      max_attempts: input.maxAttempts,
      next_attempt_at: new Date().toISOString(),
      metadata: {
        source: "exam_certificate_api",
      },
      processing_logs: [{ at: new Date().toISOString(), status: "queued", message: "Queued for async generation" }],
    })
    .select("id, status, attempts, max_attempts, next_attempt_at")
    .single();

  if (insertError || !inserted) {
    if (insertError?.code === "23505") {
      const fallback = await supabaseAdmin
        .from("exam_certificate_generation_jobs")
        .select("id, status, attempts, max_attempts, next_attempt_at")
        .eq("result_id", input.resultContext.id)
        .in("status", ["queued", "processing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallback.error) {
        throw new Error(`Failed to inspect queued certificate job after conflict: ${fallback.error.message}`);
      }

      if (fallback.data) {
        return {
          id: fallback.data.id as string,
          status: fallback.data.status as CertificateJobStatus,
          attempts: Number(fallback.data.attempts || 0),
          max_attempts: Number(fallback.data.max_attempts || input.maxAttempts),
          next_attempt_at: String(fallback.data.next_attempt_at || new Date().toISOString()),
          reused: true,
        };
      }
    }

    throw new Error(`Failed to enqueue certificate job: ${insertError?.message || "unknown error"}`);
  }

  return {
    id: inserted.id as string,
    status: inserted.status as CertificateJobStatus,
    attempts: Number(inserted.attempts || 0),
    max_attempts: Number(inserted.max_attempts || input.maxAttempts),
    next_attempt_at: String(inserted.next_attempt_at || new Date().toISOString()),
    reused: false,
  };
}

export const examCertificateService = {
  async generateCertificate(userId: string, input: GenerateExamCertificateInput) {
    const resultContext = await loadEvaluationResultContext(input.result_id);
    const session = resultContext.exam_enrollments.exam_sessions;
    await examSubscriptionService.requireExamFeature({ sessionId: session.id }, "certificates.generate");
    await examSubscriptionService.assertCanGenerateCertificateForSession(session.id);

    await assertUserCanManageSession(userId, await getSession(session.id));

    const existing = await findCertificateByResultId(resultContext.id);
    if (existing) {
      return {
        ...existing,
        download_url: await resolveExamCertificateDownloadUrl(existing.generated_pdf_url),
      };
    }

    const template = await resolveTemplateForResult(resultContext, input.template_id || undefined);

    const studentName = resolveStudentName(resultContext);
    const studentEmail = resolveStudentEmail(resultContext);
    const now = new Date().toISOString();

    const variables = {
      student: {
        name: studentName,
        email: studentEmail || "",
      },
      session: {
        title: session.title,
        start_date: toIsoDate(session.start_date),
        end_date: toIsoDate(session.end_date),
      },
      result: {
        final_score: formatScore(resultContext.final_score),
        status: resultContext.status,
        status_label: toStatusLabel(resultContext.status),
      },
      certificate: {
        issued_at: toIsoDate(now),
      },
    };

    const templateHtml = template?.template_html || getDefaultTemplateHtml();
    const pdfBuffer = await renderHtmlToPdfBuffer(templateHtml, variables);

    await ensureCertificatesBucket();

    const scopePrefix = session.organization_id || session.school_id || "shared";
    const filePath = `${scopePrefix}/${session.id}/${resultContext.id}-${Date.now()}.pdf`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(EXAM_CERTIFICATES_BUCKET)
      .upload(filePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload certificate PDF: ${uploadError.message}`);
    }

    const generatedPdfUrl = `supabase://${EXAM_CERTIFICATES_BUCKET}/${filePath}`;

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("exam_certificates")
      .insert({
        result_id: resultContext.id,
        template_id: template?.id || null,
        generated_pdf_url: generatedPdfUrl,
      })
      .select("id, result_id, template_id, generated_pdf_url, created_at")
      .single();

    if (insertError || !inserted) {
      throw new Error(`Failed to create exam certificate record: ${insertError?.message || "unknown error"}`);
    }

    if (studentEmail) {
      await outboxService.enqueueEmail({
        tenantId: resultContext.exam_enrollments.school_id,
        actorUserId: userId,
        template: "exam_result_certificate_available",
        to: studentEmail,
        subject: `Certificado disponible - ${session.title}`,
        html: `<p>Hola ${studentName},</p><p>Tu certificado de la convocatoria <strong>${session.title}</strong> ya esta disponible.</p>`,
        metadata: {
          resultId: resultContext.id,
          certificateId: inserted.id,
          generatedPdfUrl,
        },
      }).catch(() => undefined);
    }

    await examUsageBillingService.trackUsageEvent({
      eventType: "certificate_generated",
      entityId: inserted.id,
      organizationId: session.organization_id,
      schoolId: resultContext.exam_enrollments.school_id,
      metadata: {
        sessionId: session.id,
        resultId: resultContext.id,
      },
    });

    await examAuditService.logEvent({
      organizationId: session.organization_id,
      schoolId: resultContext.exam_enrollments.school_id,
      sessionId: session.id,
      actorUserId: userId,
      action: "certificate_generated",
      entityType: "exam_certificate",
      entityId: inserted.id,
      previousData: {
        result_id: resultContext.id,
      },
      newData: {
        template_id: inserted.template_id,
        generated_pdf_url: inserted.generated_pdf_url,
      },
      metadata: {
        result_id: resultContext.id,
        student_email: studentEmail,
      },
    });

    return {
      ...inserted,
      download_url: await resolveExamCertificateDownloadUrl(generatedPdfUrl),
    };
  },

  async enqueueCertificateGeneration(userId: string, input: QueueExamCertificateInput) {
    const resultContext = await loadEvaluationResultContext(input.result_id);
    const session = resultContext.exam_enrollments.exam_sessions;
    await examSubscriptionService.requireExamFeature({ sessionId: session.id }, "certificates.generate");
    await examSubscriptionService.assertCanGenerateCertificateForSession(session.id);
    await assertUserCanManageSession(userId, await getSession(session.id));

    const existing = await findCertificateByResultId(resultContext.id);
    if (existing) {
      return {
        accepted: true,
        already_completed: true,
        certificate: {
          ...existing,
          download_url: await resolveExamCertificateDownloadUrl(existing.generated_pdf_url),
        },
        job: null,
      };
    }

    const job = await enqueueCertificateJob({
      actorUserId: userId,
      resultContext,
      templateId: input.template_id || null,
      maxAttempts: input.max_attempts || 3,
    });

    let processed = null as null | { processed: number; completed: number; failed: number; retried: number; remainingApprox: number };
    if (input.process_now) {
      processed = await this.processCertificateQueue({
        actorUserId: userId,
        limit: 20,
        schoolId: resultContext.exam_enrollments.school_id,
      });
    }

    return {
      accepted: true,
      already_completed: false,
      certificate: null,
      job,
      ...(processed ? { processed } : {}),
    };
  },

  async enqueueCertificateBatch(userId: string, input: QueueExamCertificateBatchInput) {
    const session = await getSession(input.session_id);
    await examSubscriptionService.requireExamFeature({ sessionId: session.id }, "certificates.generate");
    await examSubscriptionService.assertCanGenerateCertificateForSession(session.id);
    await assertUserCanManageSession(userId, session);

    let query = supabaseAdmin
      .from("exam_results")
      .select(
        `
        id,
        final_score,
        status,
        exam_enrollments!inner(
          id,
          school_id,
          student_id,
          external_student_name,
          external_student_email,
          students(name, first_name, last_name, email),
          exam_sessions!inner(id, title, start_date, end_date, organization_id, school_id)
        )
      `
      )
      .eq("exam_enrollments.exam_session_id", input.session_id)
      .order("created_at", { ascending: true })
      .limit(input.limit || 1000);

    if (input.only_passed !== false) {
      query = query.eq("status", "pass");
    } else {
      query = query.neq("status", "pending");
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to load results for certificate batch queue: ${error.message}`);
    }

    const contexts = (data || []) as unknown as EvaluationResultContext[];
    if (contexts.length === 0) {
      return {
        scanned: 0,
        queued: 0,
        reusedJobs: 0,
        alreadyCompleted: 0,
        processed: null,
      };
    }

    let queued = 0;
    let reusedJobs = 0;
    let alreadyCompleted = 0;

    for (const resultContext of contexts) {
      const existing = await findCertificateByResultId(resultContext.id);
      if (existing) {
        alreadyCompleted += 1;
        continue;
      }

      const job = await enqueueCertificateJob({
        actorUserId: userId,
        resultContext,
        templateId: input.template_id || null,
        maxAttempts: input.max_attempts || 3,
      });

      if (job.reused) {
        reusedJobs += 1;
      } else {
        queued += 1;
      }
    }

    let processed = null as null | { processed: number; completed: number; failed: number; retried: number; remainingApprox: number };
    if (input.process_now) {
      processed = await this.processCertificateQueue({
        actorUserId: userId,
        limit: Math.min(200, Math.max(20, queued)),
        schoolId: session.school_id || undefined,
      });
    }

    return {
      scanned: contexts.length,
      queued,
      reusedJobs,
      alreadyCompleted,
      processed,
    };
  },

  async processCertificateQueue(input: {
    actorUserId: string;
    limit: number;
    schoolId?: string;
  }) {
    const scope = await listManageableScope(input.actorUserId);
    if (scope.organizationIds.length === 0 && scope.schoolIds.length === 0) {
      throw new Error("Forbidden");
    }

    const nowIso = new Date().toISOString();
    let query = supabaseAdmin
      .from("exam_certificate_generation_jobs")
      .select("id, organization_id, school_id, exam_session_id, result_id, template_id, requested_by, status, attempts, max_attempts, next_attempt_at, started_at, completed_at, last_error, certificate_id, generated_pdf_url, processing_logs, metadata, created_at, updated_at")
      .in("status", ["queued", "failed"])
      .lte("next_attempt_at", nowIso)
      .order("next_attempt_at", { ascending: true })
      .limit(Math.max(1, Math.min(input.limit, 500)));

    if (input.schoolId) {
      query = query.eq("school_id", input.schoolId);
    }

    if (scope.organizationIds.length > 0 && scope.schoolIds.length > 0) {
      query = query.or(`organization_id.in.(${scope.organizationIds.join(",")}),school_id.in.(${scope.schoolIds.join(",")})`);
    } else if (scope.organizationIds.length > 0) {
      query = query.in("organization_id", scope.organizationIds);
    } else {
      query = query.in("school_id", scope.schoolIds);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to load certificate generation queue: ${error.message}`);
    }

    const jobs = (data || []) as CertificateJobRow[];
    let processed = 0;
    let completed = 0;
    let failed = 0;
    let retried = 0;

    for (const job of jobs) {
      if (job.attempts >= job.max_attempts) {
        continue;
      }

      const startLog = asLogs(job.processing_logs);
      startLog.push({ at: new Date().toISOString(), status: "processing", message: "Processing certificate job" });

      const { error: lockError } = await supabaseAdmin
        .from("exam_certificate_generation_jobs")
        .update({
          status: "processing",
          started_at: new Date().toISOString(),
          processing_logs: startLog.slice(-30),
        })
        .eq("id", job.id)
        .eq("status", job.status);

      if (lockError) {
        continue;
      }

      processed += 1;
      const requestedBy = job.requested_by || input.actorUserId;

      try {
        const certificate = await this.generateCertificate(requestedBy, {
          result_id: job.result_id,
          template_id: job.template_id,
        });

        const doneLogs = asLogs(startLog);
        doneLogs.push({
          at: new Date().toISOString(),
          status: "completed",
          certificateId: certificate.id,
        });

        const { error: completeError } = await supabaseAdmin
          .from("exam_certificate_generation_jobs")
          .update({
            status: "completed",
            attempts: job.attempts + 1,
            completed_at: new Date().toISOString(),
            last_error: null,
            certificate_id: certificate.id,
            generated_pdf_url: certificate.generated_pdf_url,
            processing_logs: doneLogs.slice(-30),
          })
          .eq("id", job.id);

        if (completeError) {
          throw new Error(`Failed to mark certificate job as completed: ${completeError.message}`);
        }

        completed += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to generate certificate";
        const nextAttempts = job.attempts + 1;
        const permanent = isPermanentGenerationError(message);
        const canRetry = !permanent && nextAttempts < job.max_attempts;

        const failLogs = asLogs(startLog);
        failLogs.push({
          at: new Date().toISOString(),
          status: canRetry ? "queued" : "failed",
          error: message,
          attempts: nextAttempts,
        });

        const { error: failUpdateError } = await supabaseAdmin
          .from("exam_certificate_generation_jobs")
          .update({
            status: canRetry ? "queued" : "failed",
            attempts: nextAttempts,
            next_attempt_at: canRetry ? nextRetryIso(nextAttempts) : job.next_attempt_at,
            last_error: message,
            completed_at: canRetry ? null : new Date().toISOString(),
            processing_logs: failLogs.slice(-30),
          })
          .eq("id", job.id);

        if (failUpdateError) {
          throw new Error(`Failed to update failed certificate job: ${failUpdateError.message}`);
        }

        if (canRetry) {
          retried += 1;
        } else {
          failed += 1;
        }
      }
    }

    return {
      processed,
      completed,
      failed,
      retried,
      remainingApprox: Math.max(0, jobs.length - processed),
    };
  },

  async listCertificateJobs(userId: string, input: ListExamCertificateJobsInput) {
    const scope = await listManageableScope(userId);
    if (scope.organizationIds.length === 0 && scope.schoolIds.length === 0) {
      return {
        items: [] as CertificateJobRow[],
        summary: { total: 0, queued: 0, processing: 0, completed: 0, failed: 0 },
      };
    }

    let query = supabaseAdmin
      .from("exam_certificate_generation_jobs")
      .select("id, organization_id, school_id, exam_session_id, result_id, template_id, requested_by, status, attempts, max_attempts, next_attempt_at, started_at, completed_at, last_error, certificate_id, generated_pdf_url, processing_logs, metadata, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(input.limit || 100);

    if (scope.organizationIds.length > 0 && scope.schoolIds.length > 0) {
      query = query.or(`organization_id.in.(${scope.organizationIds.join(",")}),school_id.in.(${scope.schoolIds.join(",")})`);
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

    if (input.status) {
      query = query.eq("status", input.status);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to list certificate jobs: ${error.message}`);
    }

    const rawItems = (data || []) as CertificateJobRow[];
    const items = [] as Array<CertificateJobRow & { download_url: string | null }>;
    for (const row of rawItems) {
      items.push({
        ...row,
        download_url: row.generated_pdf_url
          ? await resolveExamCertificateDownloadUrl(row.generated_pdf_url)
          : null,
      });
    }

    return {
      items,
      summary: {
        total: items.length,
        queued: items.filter((item) => item.status === "queued").length,
        processing: items.filter((item) => item.status === "processing").length,
        completed: items.filter((item) => item.status === "completed").length,
        failed: items.filter((item) => item.status === "failed").length,
      },
    };
  },

  async getCertificateById(certificateId: string, userId: string) {
    const { data, error } = await supabaseAdmin
      .from("exam_certificates")
      .select(
        `
        id,
        result_id,
        template_id,
        generated_pdf_url,
        created_at,
        exam_results!inner(
          id,
          status,
          final_score,
          exam_enrollments!inner(
            id,
            school_id,
            external_student_name,
            external_student_email,
            students(name, first_name, last_name, email),
            exam_sessions!inner(id, title, start_date, end_date, organization_id, school_id)
          )
        )
      `
      )
      .eq("id", certificateId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load exam certificate: ${error.message}`);
    }

    if (!data) {
      throw new Error("Exam certificate not found");
    }

    const typed = data as unknown as CertificateDetailRow;
    const result = typed.exam_results;
    const enrollment = result?.exam_enrollments;
    const session = enrollment?.exam_sessions as SessionScope | undefined;

    if (!session) {
      throw new Error("Invalid certificate data");
    }

    await examSubscriptionService.requireExamFeature({ sessionId: session.id }, "certificates.read");

    await assertUserCanReadSession(userId, await getSession(session.id));

    const studentData = resolveStudentData(enrollment);
    const downloadUrl = await resolveExamCertificateDownloadUrl(typed.generated_pdf_url);

    return {
      id: typed.id,
      result_id: typed.result_id,
      template_id: typed.template_id,
      generated_pdf_url: typed.generated_pdf_url,
      download_url: downloadUrl,
      created_at: typed.created_at,
      session: {
        id: session.id,
        title: session.title,
        start_date: session.start_date,
        end_date: session.end_date,
      },
      student: {
        name: studentData.studentName,
        email: studentData.studentEmail,
      },
      result: {
        status: result.status,
        final_score: result.final_score,
      },
    };
  },

  async listStudentExams(tenantId: string, studentId: string) {
    await examSubscriptionService.requireExamFeature({ tenantId }, "certificates.read");

    const { data: studentRow, error: studentError } = await supabaseAdmin
      .from("students")
      .select("id, email")
      .eq("id", studentId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (studentError) {
      throw new Error(`Failed to resolve student for exam history: ${studentError.message}`);
    }

    if (!studentRow) {
      return [];
    }

    const [linkedByStudentId, linkedByEmail] = await Promise.all([
      supabaseAdmin
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
          students(name, first_name, last_name, email, phone, date_of_birth),
          exam_sessions!inner(id, title, start_date, end_date),
          exam_results(id, final_score, status, created_at, exam_certificates(id, generated_pdf_url, created_at))
        `
        )
        .eq("school_id", tenantId)
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),
      studentRow.email
        ? supabaseAdmin
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
              students(name, first_name, last_name, email, phone, date_of_birth),
              exam_sessions!inner(id, title, start_date, end_date),
              exam_results(id, final_score, status, created_at, exam_certificates(id, generated_pdf_url, created_at))
            `
            )
            .eq("school_id", tenantId)
            .is("student_id", null)
            .ilike("external_student_email", studentRow.email)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null as { message: string } | null }),
    ]);

    if (linkedByStudentId.error) {
      throw new Error(`Failed to list student exam enrollments: ${linkedByStudentId.error.message}`);
    }

    if (linkedByEmail.error) {
      throw new Error(`Failed to list external student exam enrollments: ${linkedByEmail.error.message}`);
    }

    const merged = [
      ...((linkedByStudentId.data || []) as StudentExamEnrollmentRow[]),
      ...((linkedByEmail.data || []) as StudentExamEnrollmentRow[]),
    ];
    const uniqueByEnrollment = new Map<string, StudentExamEnrollmentRow>();
    for (const item of merged) {
      uniqueByEnrollment.set(item.id, item);
    }

    const normalized = Array.from(uniqueByEnrollment.values())
      .map((row) => {
        const session = Array.isArray(row.exam_sessions) ? row.exam_sessions[0] : row.exam_sessions;
        const result = Array.isArray(row.exam_results) ? row.exam_results[0] : row.exam_results;
        const certificate = result
          ? Array.isArray(result.exam_certificates)
            ? result.exam_certificates[0]
            : result.exam_certificates
          : null;
        const student = resolveStudentData(row);

        return {
          enrollment_id: row.id,
          session_id: row.exam_session_id,
          session_title: session?.title || "Convocatoria",
          session_start_date: session?.start_date || null,
          session_end_date: session?.end_date || null,
          enrollment_status: row.status,
          student_id: student.studentId,
          student_name: student.studentName,
          student_email: student.studentEmail,
          final_score: result?.final_score ?? null,
          result_status: result?.status || "pending",
          result_created_at: result?.created_at || null,
          certificate_id: certificate?.id || null,
          certificate_generated_pdf_url: certificate?.generated_pdf_url || null,
          certificate_download_url: certificate?.generated_pdf_url || null,
          certificate_created_at: certificate?.created_at || null,
          created_at: row.created_at,
        };
      })
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

    const enriched = [] as Array<(typeof normalized)[number]>;
    for (const item of normalized) {
      if (!item.certificate_generated_pdf_url) {
        enriched.push(item);
        continue;
      }

      enriched.push({
        ...item,
        certificate_download_url: await resolveExamCertificateDownloadUrl(item.certificate_generated_pdf_url),
      });
    }

    return enriched;
  },
};
