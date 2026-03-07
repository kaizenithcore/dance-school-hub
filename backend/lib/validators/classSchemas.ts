import { z } from "zod";

export const createClassSchema = z.object({
  name: z.string().trim().min(1).max(120),
  discipline_id: z.string().uuid().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  teacher_id: z.string().uuid().optional().nullable(),
  room_id: z.string().uuid().optional().nullable(),
  capacity: z.number().int().positive(),
  price_cents: z.number().int().nonnegative(),
  description: z.string().trim().max(1000).optional().nullable(),
  status: z.enum(["active", "inactive", "draft"]).default("active"),
});

export const updateClassSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  discipline_id: z.string().uuid().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  teacher_id: z.string().uuid().optional().nullable(),
  room_id: z.string().uuid().optional().nullable(),
  capacity: z.number().int().positive().optional(),
  price_cents: z.number().int().nonnegative().optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  status: z.enum(["active", "inactive", "draft"]).optional(),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
