import { z } from "zod";

export const examStatusSchema = z.enum([
  "draft",
  "registration_open",
  "closed",
  "grading",
  "finished",
]);

export const gradingCategorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  weight: z.number().int().min(1).max(100),
});

export const createExamSchema = z.object({
  name: z.string().trim().min(2).max(200),
  discipline: z.string().trim().min(1).max(120),
  level: z.string().trim().min(1).max(120),
  category: z.string().trim().max(120).optional().nullable(),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  registrationOpenDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  registrationCloseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  maxCandidates: z.number().int().min(1).optional().nullable(),
  status: examStatusSchema.default("draft"),
  gradingCategories: z
    .array(gradingCategorySchema)
    .min(1, "At least one grading category is required"),
  certificateTemplate: z.string().trim().max(500).optional().nullable(),
});

export const updateExamSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  discipline: z.string().trim().min(1).max(120).optional(),
  level: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().max(120).optional().nullable(),
  examDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
    .optional(),
  registrationOpenDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
    .optional(),
  registrationCloseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
    .optional(),
  maxCandidates: z.number().int().min(1).optional().nullable(),
  status: examStatusSchema.optional(),
  gradingCategories: z.array(gradingCategorySchema).min(1).optional(),
  certificateTemplate: z.string().trim().max(500).optional().nullable(),
});

export const candidateStatusSchema = z.enum([
  "registered",
  "graded",
  "certified",
  "absent",
]);

export const registerCandidateSchema = z.object({
  studentId: z.string().uuid("Must be a valid UUID"),
});

export const gradeCandidateSchema = z.object({
  grades: z.record(z.string(), z.number().min(0).max(10)),
  finalGrade: z.number().min(0).max(10),
});

export const updateCandidateStatusSchema = z.object({
  status: candidateStatusSchema,
});

export type CreateExamInput = z.infer<typeof createExamSchema>;
export type UpdateExamInput = z.infer<typeof updateExamSchema>;
export type RegisterCandidateInput = z.infer<typeof registerCandidateSchema>;
export type GradeCandidateInput = z.infer<typeof gradeCandidateSchema>;
export type UpdateCandidateStatusInput = z.infer<typeof updateCandidateStatusSchema>;
