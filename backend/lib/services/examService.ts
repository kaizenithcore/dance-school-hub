import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import type {
  CreateExamInput,
  GradeCandidateInput,
  RegisterCandidateInput,
  UpdateCandidateStatusInput,
  UpdateExamInput,
} from "@/lib/validators/examSchemas";

export interface GradingCategory {
  id: string;
  name: string;
  weight: number;
}

export interface Exam {
  id: string;
  tenant_id: string;
  name: string;
  discipline: string;
  level: string;
  category: string | null;
  exam_date: string;
  registration_open_date: string;
  registration_close_date: string;
  max_candidates: number | null;
  status: "draft" | "registration_open" | "closed" | "grading" | "finished";
  grading_categories: GradingCategory[];
  certificate_template: string | null;
  candidate_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExamCandidate {
  id: string;
  exam_id: string;
  tenant_id: string;
  student_id: string;
  student_name: string;
  student_email: string | null;
  registration_date: string;
  status: "registered" | "graded" | "certified" | "absent";
  grades: Record<string, number>;
  final_grade: number | null;
  certificate_generated: boolean;
  created_at: string;
  updated_at: string;
}

interface ExamRow {
  id: string;
  tenant_id: string;
  name: string;
  discipline: string;
  level: string;
  category: string | null;
  exam_date: string;
  registration_open_date: string;
  registration_close_date: string;
  max_candidates: number | null;
  status: "draft" | "registration_open" | "closed" | "grading" | "finished";
  grading_categories: GradingCategory[];
  certificate_template: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  exam_candidates?: Array<{ count: number }>;
}

interface CandidateRow {
  id: string;
  exam_id: string;
  tenant_id: string;
  student_id: string;
  registration_date: string;
  status: "registered" | "graded" | "certified" | "absent";
  grades: Record<string, number> | null;
  final_grade: number | null;
  certificate_generated: boolean;
  created_at: string;
  updated_at: string;
  students:
    | { id: string; name: string; email: string | null }
    | Array<{ id: string; name: string; email: string | null }>
    | null;
}

function one<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapExam(row: ExamRow): Exam {
  const candidateCountRaw = row.exam_candidates;
  const candidateCount = Array.isArray(candidateCountRaw)
    ? (candidateCountRaw[0]?.count ?? 0)
    : 0;

  return {
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    discipline: row.discipline,
    level: row.level,
    category: row.category,
    exam_date: row.exam_date,
    registration_open_date: row.registration_open_date,
    registration_close_date: row.registration_close_date,
    max_candidates: row.max_candidates,
    status: row.status,
    grading_categories: row.grading_categories ?? [],
    certificate_template: row.certificate_template,
    candidate_count: Number(candidateCount),
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapCandidate(row: CandidateRow): ExamCandidate {
  const student = one(row.students);
  return {
    id: row.id,
    exam_id: row.exam_id,
    tenant_id: row.tenant_id,
    student_id: row.student_id,
    student_name: student?.name ?? "Alumno",
    student_email: student?.email ?? null,
    registration_date: row.registration_date,
    status: row.status,
    grades: row.grades ?? {},
    final_grade: row.final_grade,
    certificate_generated: row.certificate_generated ?? false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const EXAM_SELECT =
  "id, tenant_id, name, discipline, level, category, exam_date, registration_open_date, registration_close_date, max_candidates, status, grading_categories, certificate_template, created_by, created_at, updated_at, exam_candidates(count)";

const CANDIDATE_SELECT =
  "id, exam_id, tenant_id, student_id, registration_date, status, grades, final_grade, certificate_generated, created_at, updated_at, students(id, name, email)";

export const examService = {
  async listExams(tenantId: string): Promise<Exam[]> {
    const { data, error } = await supabaseAdmin
      .from("exams")
      .select(EXAM_SELECT)
      .eq("tenant_id", tenantId)
      .order("exam_date", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch exams: ${error.message}`);
    }

    return ((data ?? []) as ExamRow[]).map(mapExam);
  },

  async getExam(tenantId: string, examId: string): Promise<Exam | null> {
    const { data, error } = await supabaseAdmin
      .from("exams")
      .select(EXAM_SELECT)
      .eq("tenant_id", tenantId)
      .eq("id", examId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch exam: ${error.message}`);
    }

    return data ? mapExam(data as ExamRow) : null;
  },

  async createExam(tenantId: string, userId: string, input: CreateExamInput): Promise<Exam> {
    const { data, error } = await supabaseAdmin
      .from("exams")
      .insert({
        tenant_id: tenantId,
        name: input.name,
        discipline: input.discipline,
        level: input.level,
        category: input.category ?? null,
        exam_date: input.examDate,
        registration_open_date: input.registrationOpenDate,
        registration_close_date: input.registrationCloseDate,
        max_candidates: input.maxCandidates ?? null,
        status: input.status ?? "draft",
        grading_categories: input.gradingCategories,
        certificate_template: input.certificateTemplate ?? null,
        created_by: userId,
      })
      .select(EXAM_SELECT)
      .single();

    if (error) {
      throw new Error(`Failed to create exam: ${error.message}`);
    }

    return mapExam(data as ExamRow);
  },

  async updateExam(tenantId: string, examId: string, input: UpdateExamInput): Promise<Exam> {
    const payload: Record<string, unknown> = {};
    if (input.name !== undefined) payload.name = input.name;
    if (input.discipline !== undefined) payload.discipline = input.discipline;
    if (input.level !== undefined) payload.level = input.level;
    if (input.category !== undefined) payload.category = input.category;
    if (input.examDate !== undefined) payload.exam_date = input.examDate;
    if (input.registrationOpenDate !== undefined)
      payload.registration_open_date = input.registrationOpenDate;
    if (input.registrationCloseDate !== undefined)
      payload.registration_close_date = input.registrationCloseDate;
    if (input.maxCandidates !== undefined) payload.max_candidates = input.maxCandidates;
    if (input.status !== undefined) payload.status = input.status;
    if (input.gradingCategories !== undefined)
      payload.grading_categories = input.gradingCategories;
    if (input.certificateTemplate !== undefined)
      payload.certificate_template = input.certificateTemplate;

    const { data, error } = await supabaseAdmin
      .from("exams")
      .update(payload)
      .eq("tenant_id", tenantId)
      .eq("id", examId)
      .select(EXAM_SELECT)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update exam: ${error.message}`);
    }

    if (!data) {
      throw new Error("Exam not found");
    }

    return mapExam(data as ExamRow);
  },

  async deleteExam(tenantId: string, examId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("exams")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", examId);

    if (error) {
      throw new Error(`Failed to delete exam: ${error.message}`);
    }
  },

  // ── Candidates ─────────────────────────────────────────────────────────────

  async listCandidates(tenantId: string, examId: string): Promise<ExamCandidate[]> {
    const { data, error } = await supabaseAdmin
      .from("exam_candidates")
      .select(CANDIDATE_SELECT)
      .eq("tenant_id", tenantId)
      .eq("exam_id", examId)
      .order("registration_date", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch candidates: ${error.message}`);
    }

    return ((data ?? []) as CandidateRow[]).map(mapCandidate);
  },

  async registerCandidate(
    tenantId: string,
    examId: string,
    input: RegisterCandidateInput
  ): Promise<ExamCandidate> {
    // Verify exam belongs to tenant
    const { data: exam, error: examError } = await supabaseAdmin
      .from("exams")
      .select("id, max_candidates")
      .eq("tenant_id", tenantId)
      .eq("id", examId)
      .maybeSingle();

    if (examError) throw new Error(`Failed to validate exam: ${examError.message}`);
    if (!exam) throw new Error("Exam not found");

    // Verify student belongs to tenant
    const { data: student, error: studentError } = await supabaseAdmin
      .from("students")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("id", input.studentId)
      .maybeSingle();

    if (studentError) throw new Error(`Failed to validate student: ${studentError.message}`);
    if (!student) throw new Error("Student not found");

    // Check capacity if limit set
    if (exam.max_candidates) {
      const { count } = await supabaseAdmin
        .from("exam_candidates")
        .select("id", { count: "exact", head: true })
        .eq("exam_id", examId)
        .eq("tenant_id", tenantId);

      if ((count ?? 0) >= exam.max_candidates) {
        throw new Error("Exam is at full capacity");
      }
    }

    const { data, error } = await supabaseAdmin
      .from("exam_candidates")
      .insert({
        exam_id: examId,
        tenant_id: tenantId,
        student_id: input.studentId,
        registration_date: new Date().toISOString().slice(0, 10),
        status: "registered",
        grades: {},
      })
      .select(CANDIDATE_SELECT)
      .single();

    if (error) {
      throw new Error(`Failed to register candidate: ${error.message}`);
    }

    return mapCandidate(data as CandidateRow);
  },

  async gradeCandidate(
    tenantId: string,
    examId: string,
    candidateId: string,
    input: GradeCandidateInput
  ): Promise<ExamCandidate> {
    const { data, error } = await supabaseAdmin
      .from("exam_candidates")
      .update({
        grades: input.grades,
        final_grade: input.finalGrade,
        status: "graded",
      })
      .eq("tenant_id", tenantId)
      .eq("exam_id", examId)
      .eq("id", candidateId)
      .select(CANDIDATE_SELECT)
      .maybeSingle();

    if (error) throw new Error(`Failed to grade candidate: ${error.message}`);
    if (!data) throw new Error("Candidate not found");

    return mapCandidate(data as CandidateRow);
  },

  async updateCandidateStatus(
    tenantId: string,
    examId: string,
    candidateId: string,
    input: UpdateCandidateStatusInput
  ): Promise<ExamCandidate> {
    const update: Record<string, unknown> = { status: input.status };
    if (input.status === "certified") {
      update.certificate_generated = true;
    }

    const { data, error } = await supabaseAdmin
      .from("exam_candidates")
      .update(update)
      .eq("tenant_id", tenantId)
      .eq("exam_id", examId)
      .eq("id", candidateId)
      .select(CANDIDATE_SELECT)
      .maybeSingle();

    if (error) throw new Error(`Failed to update candidate status: ${error.message}`);
    if (!data) throw new Error("Candidate not found");

    return mapCandidate(data as CandidateRow);
  },

  async generateAllCertificates(tenantId: string, examId: string): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from("exam_candidates")
      .update({ status: "certified", certificate_generated: true })
      .eq("tenant_id", tenantId)
      .eq("exam_id", examId)
      .eq("status", "graded")
      .select("id");

    if (error) throw new Error(`Failed to generate certificates: ${error.message}`);

    return (data ?? []).length;
  },
};
