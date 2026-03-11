export type ExamStatus = "draft" | "registration_open" | "closed" | "grading" | "finished";

export interface GradingCategory {
  id: string;
  name: string;
  weight: number;
}

export interface ExamCandidate {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  registrationDate: string;
  status: "registered" | "graded" | "certified" | "absent";
  grades: Record<string, number>;
  finalGrade?: number;
  certificateGenerated?: boolean;
}

export interface ExamRecord {
  id: string;
  name: string;
  discipline: string;
  level: string;
  category?: string;
  examDate: string;
  registrationOpenDate: string;
  registrationCloseDate: string;
  maxCandidates?: number;
  status: ExamStatus;
  gradingCategories: GradingCategory[];
  certificateTemplate?: string;
  candidateCount: number;
}

export const EXAM_STATUSES: Record<ExamStatus, { label: string; className: string }> = {
  draft: { label: "Borrador", className: "bg-muted text-muted-foreground border-border" },
  registration_open: { label: "Registro abierto", className: "bg-success/15 text-success border-success/20" },
  closed: { label: "Cerrado", className: "bg-warning/15 text-warning border-warning/20" },
  grading: { label: "Evaluando", className: "bg-info/15 text-info border-info/20" },
  finished: { label: "Finalizado", className: "bg-primary/15 text-primary border-primary/20" },
};

export const MOCK_EXAMS: ExamRecord[] = [
  {
    id: "ex1",
    name: "Examen Ballet Nivel 1",
    discipline: "Ballet",
    level: "Nivel 1",
    category: "Clásico",
    examDate: "2026-06-15",
    registrationOpenDate: "2026-04-01",
    registrationCloseDate: "2026-06-01",
    maxCandidates: 30,
    status: "registration_open",
    gradingCategories: [
      { id: "gc1", name: "Técnica", weight: 40 },
      { id: "gc2", name: "Musicalidad", weight: 30 },
      { id: "gc3", name: "Presentación", weight: 30 },
    ],
    candidateCount: 12,
  },
  {
    id: "ex2",
    name: "Examen Hip Hop Avanzado",
    discipline: "Hip Hop",
    level: "Avanzado",
    examDate: "2026-07-10",
    registrationOpenDate: "2026-05-01",
    registrationCloseDate: "2026-07-01",
    status: "draft",
    gradingCategories: [
      { id: "gc4", name: "Freestyle", weight: 35 },
      { id: "gc5", name: "Coreografía", weight: 35 },
      { id: "gc6", name: "Expresión", weight: 30 },
    ],
    candidateCount: 0,
  },
  {
    id: "ex3",
    name: "Examen Danza Contemporánea",
    discipline: "Contemporánea",
    level: "Intermedio",
    examDate: "2026-05-20",
    registrationOpenDate: "2026-03-01",
    registrationCloseDate: "2026-05-10",
    maxCandidates: 20,
    status: "grading",
    gradingCategories: [
      { id: "gc7", name: "Técnica", weight: 30 },
      { id: "gc8", name: "Improvisación", weight: 25 },
      { id: "gc9", name: "Musicalidad", weight: 25 },
      { id: "gc10", name: "Presencia escénica", weight: 20 },
    ],
    candidateCount: 18,
  },
  {
    id: "ex4",
    name: "Examen Salsa Nivel 2",
    discipline: "Salsa",
    level: "Nivel 2",
    examDate: "2026-04-28",
    registrationOpenDate: "2026-02-15",
    registrationCloseDate: "2026-04-15",
    status: "finished",
    gradingCategories: [
      { id: "gc11", name: "Técnica", weight: 40 },
      { id: "gc12", name: "Ritmo", weight: 30 },
      { id: "gc13", name: "Pareja", weight: 30 },
    ],
    candidateCount: 8,
  },
];

export const MOCK_CANDIDATES: ExamCandidate[] = [
  {
    id: "ec1", examId: "ex1", studentId: "s1", studentName: "María Santos", studentEmail: "maria@ejemplo.com",
    registrationDate: "2026-04-05", status: "registered", grades: {},
  },
  {
    id: "ec2", examId: "ex1", studentId: "s2", studentName: "João Silva", studentEmail: "joao@ejemplo.com",
    registrationDate: "2026-04-08", status: "registered", grades: {},
  },
  {
    id: "ec3", examId: "ex3", studentId: "s4", studentName: "Carlos Méndez", studentEmail: "carlos@ejemplo.com",
    registrationDate: "2026-03-10", status: "graded", grades: { gc7: 8.5, gc8: 7.0, gc9: 9.0, gc10: 8.0 }, finalGrade: 8.15,
  },
  {
    id: "ec4", examId: "ex3", studentId: "s7", studentName: "Valentina Torres", studentEmail: "vale@ejemplo.com",
    registrationDate: "2026-03-12", status: "graded", grades: { gc7: 9.0, gc8: 8.5, gc9: 9.5, gc10: 9.0 }, finalGrade: 9.0,
  },
  {
    id: "ec5", examId: "ex4", studentId: "s10", studentName: "Nicolás Acosta", studentEmail: "nico@ejemplo.com",
    registrationDate: "2026-02-20", status: "certified", grades: { gc11: 7.5, gc12: 8.0, gc13: 7.0 }, finalGrade: 7.5, certificateGenerated: true,
  },
  {
    id: "ec6", examId: "ex4", studentId: "s6", studentName: "Diego Ramírez", studentEmail: "diego@ejemplo.com",
    registrationDate: "2026-02-22", status: "certified", grades: { gc11: 9.0, gc12: 8.5, gc13: 9.0 }, finalGrade: 8.85, certificateGenerated: true,
  },
];
