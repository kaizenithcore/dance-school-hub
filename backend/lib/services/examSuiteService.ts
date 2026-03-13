import { chromium } from "playwright";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { emailService } from "@/lib/services/emailService";
import { outboxService } from "@/lib/services/outboxService";
import { examSuiteFeatureService } from "@/lib/services/examSuiteFeatureService";
import type {
  CandidateCertificationHistoryItem,
  CertificateTemplate,
  Exam,
  ExamCandidate,
  ExamGradingCategory,
  FinalGrade,
  GeneratedCertificate,
} from "@/lib/types/examSuite";
import type {
  CreateCertificateTemplateInput,
  CreateExamInput,
  RegisterCandidateInput,
  SaveGradesInput,
  UpdateCertificateTemplateInput,
  UpdateExamInput,
} from "@/lib/validators/examSuiteSchemas";

interface ExamWithRelations extends Exam {
  grading_categories: ExamGradingCategory[];
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function injectTemplateVariables(template: string, variables: Record<string, unknown>): string {
  return template.replace(/{{\s*([a-zA-Z0-9_.]+)\s*}}/g, (_match, path: string) => {
    const value = path.split(".").reduce<unknown>((acc, key) => {
      if (!acc || typeof acc !== "object") return undefined;
      return (acc as Record<string, unknown>)[key];
    }, variables);

    if (value === undefined || value === null) return "";
    return String(value);
  });
}

function toOwnerOrAdminRole(value: string): boolean {
  return value === "owner" || value === "admin";
}

function formatFinalGrade(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "-";
  return value.toFixed(2);
}

async function ensureExamInTenant(tenantId: string, examId: string): Promise<Exam> {
  const { data, error } = await supabaseAdmin
    .from("exams")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", examId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch exam: ${error.message}`);
  }

  if (!data) {
    throw new Error("Exam not found");
  }

  return data as Exam;
}

async function ensureCandidateInTenant(tenantId: string, candidateId: string) {
  const { data, error } = await supabaseAdmin
    .from("exam_candidates")
    .select("*, exams!inner(id, tenant_id, name, discipline, level, exam_date, certificate_template_id)")
    .eq("id", candidateId)
    .eq("exams.tenant_id", tenantId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch candidate: ${error.message}`);
  }

  if (!data) {
    throw new Error("Candidate not found");
  }

  return data as ExamCandidate & {
    exams: {
      id: string;
      tenant_id: string;
      name: string;
      discipline: string | null;
      level: string | null;
      exam_date: string | null;
      certificate_template_id: string | null;
    };
  };
}

async function resolveTemplateForCandidate(
  tenantId: string,
  candidate: Awaited<ReturnType<typeof ensureCandidateInTenant>>,
  templateId?: string
): Promise<CertificateTemplate> {
  const selectedTemplateId = templateId || candidate.exams.certificate_template_id;

  if (selectedTemplateId) {
    const { data, error } = await supabaseAdmin
      .from("certificate_templates")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", selectedTemplateId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load certificate template: ${error.message}`);
    }

    if (data) {
      return data as CertificateTemplate;
    }
  }

  const { data: fallbackTemplate, error: fallbackError } = await supabaseAdmin
    .from("certificate_templates")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fallbackError) {
    throw new Error(`Failed to load fallback template: ${fallbackError.message}`);
  }

  if (!fallbackTemplate) {
    throw new Error("No certificate template available");
  }

  return fallbackTemplate as CertificateTemplate;
}

async function renderTemplateToPdfBuffer(
  template: CertificateTemplate,
  variables: Record<string, unknown>
): Promise<Buffer> {
  const rawTemplate = template.template_html || "";
  const interpolated = injectTemplateVariables(rawTemplate, variables);

  if (template.template_type === "pdf_base") {
    const normalized = interpolated.startsWith("data:application/pdf;base64,")
      ? interpolated.replace("data:application/pdf;base64,", "")
      : interpolated;

    return Buffer.from(normalized, "base64");
  }

  const html = interpolated.includes("<html")
    ? interpolated
    : `<!doctype html><html><head><meta charset=\"UTF-8\" /></head><body>${interpolated}</body></html>`;

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

async function resolveNotificationActorUserId(tenantId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("tenant_memberships")
    .select("user_id, role")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .limit(20);

  if (error) {
    return null;
  }

  const row = (data || []).find((item) => toOwnerOrAdminRole(item.role));
  return row?.user_id || null;
}

async function sendRegistrationConfirmationEmail(input: {
  tenantId: string;
  exam: Exam;
  candidate: ExamCandidate;
}) {
  const to = input.candidate.email;
  if (!to) return;

  const subject = `Confirmacion de registro - ${input.exam.name}`;
  const examDate = input.exam.exam_date || "por definir";
  const html = `
    <p>Hola ${input.candidate.full_name},</p>
    <p>Tu registro para el examen <strong>${input.exam.name}</strong> fue recibido correctamente.</p>
    <p>Fecha del examen: <strong>${examDate}</strong></p>
    <p>Nos pondremos en contacto con mas detalles proximamente.</p>
  `;

  const actorUserId = await resolveNotificationActorUserId(input.tenantId);

  if (actorUserId) {
    await outboxService.enqueueEmail({
      tenantId: input.tenantId,
      actorUserId,
      template: "exam_registration_confirmation",
      to,
      subject,
      html,
      metadata: {
        examId: input.exam.id,
        candidateId: input.candidate.id,
      },
    });

    await outboxService.tickTenantEmailQueue(input.tenantId, 5);
    return;
  }

  await emailService.send({
    to,
    subject,
    html,
  });
}

export const examSuiteService = {
  async listExams(tenantId: string): Promise<ExamWithRelations[]> {
    const { data, error } = await supabaseAdmin
      .from("exams")
      .select("*, exam_grading_categories(*)")
      .eq("tenant_id", tenantId)
      .order("exam_date", { ascending: true, nullsFirst: false });

    if (error) {
      throw new Error(`Failed to list exams: ${error.message}`);
    }

    return (data || []) as ExamWithRelations[];
  },

  async getExam(tenantId: string, examId: string): Promise<ExamWithRelations | null> {
    const { data, error } = await supabaseAdmin
      .from("exams")
      .select("*, exam_grading_categories(*)")
      .eq("tenant_id", tenantId)
      .eq("id", examId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch exam: ${error.message}`);
    }

    return (data as ExamWithRelations) || null;
  },

  async createExam(tenantId: string, input: CreateExamInput): Promise<ExamWithRelations> {
    const { grading_categories = [], ...examPayload } = input;

    const { data: examData, error: examError } = await supabaseAdmin
      .from("exams")
      .insert({
        tenant_id: tenantId,
        ...examPayload,
      })
      .select("*")
      .single();

    if (examError || !examData) {
      throw new Error(`Failed to create exam: ${examError?.message || "unknown error"}`);
    }

    if (grading_categories.length > 0) {
      const categories = grading_categories.map((category, index) => ({
        exam_id: examData.id,
        name: category.name,
        weight: category.weight,
        order_index: category.order_index ?? index,
      }));

      const { error: categoryError } = await supabaseAdmin
        .from("exam_grading_categories")
        .insert(categories);

      if (categoryError) {
        throw new Error(`Failed to create grading categories: ${categoryError.message}`);
      }
    }

    const created = await this.getExam(tenantId, examData.id);
    if (!created) {
      throw new Error("Failed to load created exam");
    }

    return created;
  },

  async updateExam(tenantId: string, examId: string, input: UpdateExamInput): Promise<ExamWithRelations> {
    const current = await ensureExamInTenant(tenantId, examId);
    const { grading_categories, ...examPayload } = input;

    if (Object.keys(examPayload).length > 0) {
      const { error } = await supabaseAdmin
        .from("exams")
        .update(examPayload)
        .eq("tenant_id", tenantId)
        .eq("id", current.id);

      if (error) {
        throw new Error(`Failed to update exam: ${error.message}`);
      }
    }

    if (grading_categories) {
      const { error: deleteError } = await supabaseAdmin
        .from("exam_grading_categories")
        .delete()
        .eq("exam_id", current.id);

      if (deleteError) {
        throw new Error(`Failed to replace grading categories: ${deleteError.message}`);
      }

      if (grading_categories.length > 0) {
        const categories = grading_categories.map((category, index) => ({
          exam_id: current.id,
          name: category.name,
          weight: category.weight,
          order_index: category.order_index ?? index,
        }));

        const { error: insertError } = await supabaseAdmin
          .from("exam_grading_categories")
          .insert(categories);

        if (insertError) {
          throw new Error(`Failed to insert grading categories: ${insertError.message}`);
        }
      }
    }

    const updated = await this.getExam(tenantId, current.id);
    if (!updated) {
      throw new Error("Failed to load updated exam");
    }

    return updated;
  },

  async deleteExam(tenantId: string, examId: string): Promise<void> {
    await ensureExamInTenant(tenantId, examId);

    const { error } = await supabaseAdmin
      .from("exams")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", examId);

    if (error) {
      throw new Error(`Failed to delete exam: ${error.message}`);
    }
  },

  async publishExamRegistration(tenantId: string, examId: string): Promise<Exam> {
    const exam = await ensureExamInTenant(tenantId, examId);

    if (!exam.registration_open_date || !exam.registration_close_date) {
      throw new Error("Exam registration window is not configured");
    }

    const { data, error } = await supabaseAdmin
      .from("exams")
      .update({ status: "registration_open" })
      .eq("tenant_id", tenantId)
      .eq("id", exam.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to publish exam registration: ${error?.message || "unknown error"}`);
    }

    return data as Exam;
  },

  async listCandidates(tenantId: string, examId?: string): Promise<Array<ExamCandidate & { final_grade: FinalGrade | null }>> {
    let query = supabaseAdmin
      .from("exam_candidates")
      .select("*, final_grades(*)")
      .eq("exams.tenant_id", tenantId);

    query = supabaseAdmin
      .from("exam_candidates")
      .select("*, final_grades(*), exams!inner(id, tenant_id)")
      .eq("exams.tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (examId) {
      query = query.eq("exam_id", examId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list candidates: ${error.message}`);
    }

    return ((data || []) as Array<ExamCandidate & { final_grades: FinalGrade[] | FinalGrade | null }>).map((item) => ({
      ...(item as ExamCandidate),
      final_grade: one(item.final_grades),
    }));
  },

  async registerCandidatePublic(examId: string, input: RegisterCandidateInput): Promise<ExamCandidate> {
    const { data: examRow, error: examError } = await supabaseAdmin
      .from("exams")
      .select("*")
      .eq("id", examId)
      .maybeSingle();

    if (examError) {
      throw new Error(`Failed to load exam: ${examError.message}`);
    }

    if (!examRow) {
      throw new Error("Exam not found");
    }

    const exam = examRow as Exam;

    const enabled = await examSuiteFeatureService.isEnabledForTenant(exam.tenant_id);
    if (!enabled) {
      throw new Error("ExamSuite module is not active for this tenant");
    }

    if (exam.status !== "registration_open") {
      throw new Error("Registration is not open for this exam");
    }

    const now = Date.now();
    const openAt = exam.registration_open_date ? new Date(exam.registration_open_date).getTime() : null;
    const closeAt = exam.registration_close_date ? new Date(exam.registration_close_date).getTime() : null;

    if (openAt && now < openAt) {
      throw new Error("Registration has not opened yet");
    }

    if (closeAt && now > closeAt) {
      throw new Error("Registration is closed");
    }

    const { count, error: countError } = await supabaseAdmin
      .from("exam_candidates")
      .select("id", { count: "exact", head: true })
      .eq("exam_id", exam.id);

    if (countError) {
      throw new Error(`Failed to validate candidate capacity: ${countError.message}`);
    }

    if (exam.max_candidates && (count || 0) >= exam.max_candidates) {
      throw new Error("Exam has reached max candidates");
    }

    let resolvedStudentId: string | null = input.student_id || null;

    if (!resolvedStudentId && input.email) {
      const { data: studentRow } = await supabaseAdmin
        .from("students")
        .select("id")
        .eq("tenant_id", exam.tenant_id)
        .ilike("email", input.email)
        .limit(1)
        .maybeSingle();

      resolvedStudentId = studentRow?.id || null;
    }

    const { data: candidateData, error: candidateError } = await supabaseAdmin
      .from("exam_candidates")
      .insert({
        exam_id: exam.id,
        student_id: resolvedStudentId,
        full_name: input.full_name,
        email: input.email || null,
        phone: input.phone || null,
        registration_data: input.registration_data,
        status: "registered",
      })
      .select("*")
      .single();

    if (candidateError || !candidateData) {
      throw new Error(`Failed to register candidate: ${candidateError?.message || "unknown error"}`);
    }

    await sendRegistrationConfirmationEmail({
      tenantId: exam.tenant_id,
      exam,
      candidate: candidateData as ExamCandidate,
    });

    return candidateData as ExamCandidate;
  },

  async saveCandidateGrades(tenantId: string, candidateId: string, actorUserId: string, input: SaveGradesInput) {
    const candidate = await ensureCandidateInTenant(tenantId, candidateId);

    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from("exam_grading_categories")
      .select("id, exam_id")
      .eq("exam_id", candidate.exam_id);

    if (categoriesError) {
      throw new Error(`Failed to load grading categories: ${categoriesError.message}`);
    }

    const validCategoryIds = new Set((categories || []).map((item) => item.id as string));

    if (validCategoryIds.size === 0) {
      throw new Error("Exam has no grading categories configured");
    }

    const incomingCategoryIds = new Set(input.scores.map((item) => item.category_id));

    for (const categoryId of incomingCategoryIds) {
      if (!validCategoryIds.has(categoryId)) {
        throw new Error("Invalid grading category for this exam");
      }
    }

    if (incomingCategoryIds.size !== validCategoryIds.size) {
      throw new Error("Scores must include all grading categories");
    }

    const { error: deleteError } = await supabaseAdmin
      .from("exam_grades")
      .delete()
      .eq("candidate_id", candidate.id);

    if (deleteError) {
      throw new Error(`Failed to replace grades: ${deleteError.message}`);
    }

    const payload = input.scores.map((score) => ({
      candidate_id: candidate.id,
      category_id: score.category_id,
      score: score.score,
    }));

    const { data: gradesData, error: gradesError } = await supabaseAdmin
      .from("exam_grades")
      .insert(payload)
      .select("*");

    if (gradesError) {
      throw new Error(`Failed to save grades: ${gradesError.message}`);
    }

    const { data: rpcGrade, error: rpcError } = await supabaseAdmin
      .rpc("calculate_final_grade", { p_candidate_id: candidate.id });

    if (rpcError) {
      throw new Error(`Failed to compute final grade: ${rpcError.message}`);
    }

    const finalGrade = typeof rpcGrade === "number" ? rpcGrade : null;

    const { error: finalGradeError } = await supabaseAdmin
      .from("final_grades")
      .upsert(
        {
          candidate_id: candidate.id,
          final_grade: finalGrade,
          comments: input.comments || null,
          graded_by: actorUserId,
          graded_at: new Date().toISOString(),
        },
        { onConflict: "candidate_id" }
      );

    if (finalGradeError) {
      throw new Error(`Failed to update final grade metadata: ${finalGradeError.message}`);
    }

    const { error: candidateStatusError } = await supabaseAdmin
      .from("exam_candidates")
      .update({ status: "graded" })
      .eq("id", candidate.id);

    if (candidateStatusError) {
      throw new Error(`Failed to update candidate status: ${candidateStatusError.message}`);
    }

    const { data: finalRow } = await supabaseAdmin
      .from("final_grades")
      .select("*")
      .eq("candidate_id", candidate.id)
      .maybeSingle();

    return {
      candidateId: candidate.id,
      grades: (gradesData || []) as unknown as ExamGradingCategory[],
      finalGrade: finalRow as FinalGrade | null,
    };
  },

  async generateCertificate(tenantId: string, candidateId: string, actorUserId: string, templateId?: string): Promise<GeneratedCertificate> {
    const candidate = await ensureCandidateInTenant(tenantId, candidateId);

    const { data: finalGradeRow, error: finalGradeError } = await supabaseAdmin
      .from("final_grades")
      .select("*")
      .eq("candidate_id", candidate.id)
      .maybeSingle();

    if (finalGradeError) {
      throw new Error(`Failed to load final grade: ${finalGradeError.message}`);
    }

    if (!finalGradeRow) {
      throw new Error("Candidate has no final grade yet");
    }

    const template = await resolveTemplateForCandidate(tenantId, candidate, templateId);

    const variables = {
      candidate: {
        id: candidate.id,
        full_name: candidate.full_name,
        email: candidate.email || "",
      },
      exam: {
        id: candidate.exams.id,
        name: candidate.exams.name,
        discipline: candidate.exams.discipline || "",
        level: candidate.exams.level || "",
        exam_date: candidate.exams.exam_date || "",
      },
      grading: {
        final_grade: formatFinalGrade(finalGradeRow.final_grade),
        comments: finalGradeRow.comments || "",
        graded_at: finalGradeRow.graded_at || "",
      },
      generated_at: new Date().toISOString(),
    };

    const pdfBuffer = await renderTemplateToPdfBuffer(template, variables);

    const filePath = `${tenantId}/${candidate.exams.id}/${candidate.id}-${Date.now()}.pdf`;
    const bucket = "generated-certificates";

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload certificate PDF: ${uploadError.message}`);
    }

    const fileUrl = `supabase://${bucket}/${filePath}`;

    const { data: certificateRow, error: certificateError } = await supabaseAdmin
      .from("generated_certificates")
      .insert({
        candidate_id: candidate.id,
        template_id: template.id,
        file_url: fileUrl,
      })
      .select("*")
      .single();

    if (certificateError || !certificateRow) {
      throw new Error(`Failed to create generated certificate record: ${certificateError?.message || "unknown error"}`);
    }

    const { error: candidateStatusError } = await supabaseAdmin
      .from("exam_candidates")
      .update({ status: "certificate_generated" })
      .eq("id", candidate.id);

    if (candidateStatusError) {
      throw new Error(`Failed to update candidate status: ${candidateStatusError.message}`);
    }

    await outboxService.enqueueEmail({
      tenantId,
      actorUserId,
      template: "exam_certificate_generated",
      to: candidate.email || "",
      subject: `Certificado disponible - ${candidate.exams.name}`,
      html: `<p>Hola ${candidate.full_name},</p><p>Tu certificado del examen <strong>${candidate.exams.name}</strong> esta disponible.</p>`,
      metadata: {
        candidateId: candidate.id,
        examId: candidate.exams.id,
        fileUrl,
      },
    }).catch(() => undefined);

    return certificateRow as GeneratedCertificate;
  },

  async listCertificateTemplates(tenantId: string): Promise<CertificateTemplate[]> {
    const { data, error } = await supabaseAdmin
      .from("certificate_templates")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list certificate templates: ${error.message}`);
    }

    return (data || []) as CertificateTemplate[];
  },

  async createCertificateTemplate(tenantId: string, input: CreateCertificateTemplateInput): Promise<CertificateTemplate> {
    const { data, error } = await supabaseAdmin
      .from("certificate_templates")
      .insert({
        tenant_id: tenantId,
        ...input,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create certificate template: ${error?.message || "unknown error"}`);
    }

    return data as CertificateTemplate;
  },

  async updateCertificateTemplate(tenantId: string, templateId: string, input: UpdateCertificateTemplateInput): Promise<CertificateTemplate> {
    const { data, error } = await supabaseAdmin
      .from("certificate_templates")
      .update(input)
      .eq("tenant_id", tenantId)
      .eq("id", templateId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to update certificate template: ${error?.message || "unknown error"}`);
    }

    return data as CertificateTemplate;
  },

  async deleteCertificateTemplate(tenantId: string, templateId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("certificate_templates")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", templateId);

    if (error) {
      throw new Error(`Failed to delete certificate template: ${error.message}`);
    }
  },

  async getStudentCertificationHistory(tenantId: string, studentId: string): Promise<CandidateCertificationHistoryItem[]> {
    const { data, error } = await supabaseAdmin
      .from("exam_candidates")
      .select(`
        id,
        exam_id,
        student_id,
        exams!inner(id, tenant_id, name, discipline, level, exam_date),
        final_grades(final_grade, comments),
        generated_certificates(file_url, generated_at)
      `)
      .eq("student_id", studentId)
      .eq("exams.tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to load certification history: ${error.message}`);
    }

    return ((data || []) as unknown as Array<{
      id: string;
      exam_id: string;
      exams:
        | { id: string; tenant_id: string; name: string; discipline: string | null; level: string | null; exam_date: string | null }
        | Array<{ id: string; tenant_id: string; name: string; discipline: string | null; level: string | null; exam_date: string | null }>;
      final_grades: Array<{ final_grade: number | null; comments: string | null }> | { final_grade: number | null; comments: string | null } | null;
      generated_certificates: Array<{ file_url: string | null; generated_at: string }> | { file_url: string | null; generated_at: string } | null;
    }>).map((item) => {
      const exam = one(item.exams);
      const finalGrade = one(item.final_grades);
      const certificate = one(item.generated_certificates);
      return {
        candidate_id: item.id,
        exam_id: item.exam_id,
        exam_name: exam?.name || "Examen",
        discipline: exam?.discipline ?? null,
        level: exam?.level ?? null,
        exam_date: exam?.exam_date ?? null,
        final_grade: finalGrade?.final_grade ?? null,
        comments: finalGrade?.comments ?? null,
        certificate_file_url: certificate?.file_url ?? null,
        generated_at: certificate?.generated_at ?? null,
      };
    });
  },
};
