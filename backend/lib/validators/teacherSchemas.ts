import { z } from "zod";

export const createTeacherSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().optional().nullable(),
  phone: z.string().trim().min(6).max(20).optional().nullable(),
  bio: z.string().trim().max(1000).optional().nullable(),
  status: z.enum(["active", "inactive"]).default("active"),
  aulary: z.number().min(0).optional().default(0),
});

export const updateTeacherSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().trim().min(6).max(20).optional().nullable(),
  bio: z.string().trim().max(1000).optional().nullable(),
  status: z.enum(["active", "inactive"]).optional(),
  aulary: z.number().min(0).optional(),
});

export const createDisciplineSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().default(true).optional(),
});

export const updateDisciplineSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().default(true).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;
export type CreateDisciplineInput = z.infer<typeof createDisciplineSchema>;
export type UpdateDisciplineInput = z.infer<typeof updateDisciplineSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
