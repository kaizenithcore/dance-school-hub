import { z } from "zod";

const examStatusSchema = z.enum(["draft", "registration_open", "closed", "grading", "finished"]);
const templateTypeSchema = z.enum(["html", "pdf_base"]);

export const gradingCategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  weight: z.number().min(0).max(100),
  order_index: z.number().int().min(0).default(0),
});

export const createExamSchema = z.object({
  name: z.string().trim().min(1).max(160),
  discipline: z.string().trim().max(120).nullable().optional(),
  level: z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  exam_date: z.string().date().nullable().optional(),
  registration_open_date: z.string().datetime().nullable().optional(),
  registration_close_date: z.string().datetime().nullable().optional(),
  max_candidates: z.number().int().positive().nullable().optional(),
  certificate_template_id: z.string().uuid().nullable().optional(),
  status: examStatusSchema.default("draft"),
  grading_categories: z.array(gradingCategorySchema).default([]),
});

export const updateExamSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  discipline: z.string().trim().max(120).nullable().optional(),
  level: z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  exam_date: z.string().date().nullable().optional(),
  registration_open_date: z.string().datetime().nullable().optional(),
  registration_close_date: z.string().datetime().nullable().optional(),
  max_candidates: z.number().int().positive().nullable().optional(),
  certificate_template_id: z.string().uuid().nullable().optional(),
  status: examStatusSchema.optional(),
  grading_categories: z.array(gradingCategorySchema).optional(),
});

export const registerCandidateSchema = z.object({
  student_id: z.string().uuid().nullable().optional(),
  full_name: z.string().trim().min(1).max(180),
  email: z.string().trim().email().max(180).optional(),
  phone: z.string().trim().max(40).optional(),
  registration_data: z.record(z.string(), z.unknown()).default({}),
});

export const saveGradesSchema = z.object({
  scores: z.array(
    z.object({
      category_id: z.string().uuid(),
      score: z.number().min(0).max(100),
    })
  ).min(1),
  comments: z.string().trim().max(3000).optional(),
});

export const createCertificateTemplateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  template_html: z.string().min(1),
  template_type: templateTypeSchema,
});

export const updateCertificateTemplateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  template_html: z.string().min(1).optional(),
  template_type: templateTypeSchema.optional(),
});

export type CreateExamInput = z.infer<typeof createExamSchema>;
export type UpdateExamInput = z.infer<typeof updateExamSchema>;
export type RegisterCandidateInput = z.infer<typeof registerCandidateSchema>;
export type SaveGradesInput = z.infer<typeof saveGradesSchema>;
export type CreateCertificateTemplateInput = z.infer<typeof createCertificateTemplateSchema>;
export type UpdateCertificateTemplateInput = z.infer<typeof updateCertificateTemplateSchema>;
