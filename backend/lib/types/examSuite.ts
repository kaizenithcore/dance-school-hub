export type ExamStatus = "draft" | "registration_open" | "closed" | "grading" | "finished";

export type ExamCandidateStatus = "registered" | "graded" | "certificate_generated";

export type CertificateTemplateType = "html" | "pdf_base";

export interface Exam {
  id: string;
  tenant_id: string;
  name: string;
  discipline: string | null;
  level: string | null;
  description: string | null;
  exam_date: string | null;
  registration_open_date: string | null;
  registration_close_date: string | null;
  max_candidates: number | null;
  certificate_template_id: string | null;
  status: ExamStatus;
  created_at: string;
  updated_at: string;
}

export interface ExamGradingCategory {
  id: string;
  exam_id: string;
  name: string;
  weight: number;
  order_index: number;
  created_at: string;
}

export interface ExamCandidate {
  id: string;
  exam_id: string;
  student_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  registration_data: Record<string, unknown> | null;
  status: ExamCandidateStatus;
  created_at: string;
}

export interface ExamGrade {
  id: string;
  candidate_id: string;
  category_id: string;
  score: number;
  created_at: string;
}

export interface FinalGrade {
  id: string;
  candidate_id: string;
  final_grade: number | null;
  comments: string | null;
  graded_by: string | null;
  graded_at: string | null;
}

export interface CertificateTemplate {
  id: string;
  tenant_id: string;
  name: string;
  template_html: string | null;
  template_type: CertificateTemplateType;
  created_at: string;
}

export interface GeneratedCertificate {
  id: string;
  candidate_id: string;
  template_id: string | null;
  file_url: string | null;
  generated_at: string;
}

export interface CandidateCertificationHistoryItem {
  candidate_id: string;
  exam_id: string;
  exam_name: string;
  discipline: string | null;
  level: string | null;
  exam_date: string | null;
  final_grade: number | null;
  comments: string | null;
  certificate_file_url: string | null;
  generated_at: string | null;
}
