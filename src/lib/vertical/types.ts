export interface Vocabulary {
  student: string;
  students: string;
  classItem: string;
  classItems: string;
  teacher: string;
  teachers: string;
  enrollment: string;
  enrollments: string;
  discipline: string;
  disciplines: string;
  /** Short imperative form: "Añadir alumno" / "Dar de alta socio" */
  addStudent: string;
  /** Context label: "escuela" | "centro" | "academia" */
  center: string;
}

export type VerticalId = "dance" | "sports" | "languages" | "tutoring";

export interface VerticalConfig {
  id: VerticalId;
  productName: string;
  productTagline: string;
  logoPath: string;
  /** HSL value without hsl() wrapper, e.g. "263 83% 57%" */
  primaryColor: string;
  /** HSL value for --accent background, e.g. "263 50% 97%" */
  accentColor: string;
  vocabulary: Vocabulary;
  /** Feature keys specific to this vertical, on top of plan-level flags */
  verticalFeatures: string[];
}
