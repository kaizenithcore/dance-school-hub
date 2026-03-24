import { z } from "zod";

const timeRegex = /^([0-1]\d|2[0-3]):[0-5]\d$/;

export const createSessionSchema = z.object({
  date: z.string().date("Invalid date format"),
  start_time: z.string().regex(timeRegex, "Invalid time format (HH:mm)"),
  end_time: z.string().regex(timeRegex, "Invalid time format (HH:mm)").optional().nullable(),
  name: z.string().trim().max(255).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const updateSessionSchema = z.object({
  date: z.string().date("Invalid date format").optional(),
  start_time: z.string().regex(timeRegex, "Invalid time format (HH:mm)").optional(),
  end_time: z.string().regex(timeRegex, "Invalid time format (HH:mm)").optional().nullable(),
  name: z.string().trim().max(255).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const reorderSessionsSchema = z.object({
  positions: z.array(
    z.object({
      id: z.string().uuid("Invalid session ID"),
      position: z.number().int().nonnegative(),
    })
  ).min(1),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type ReorderSessionsInput = z.infer<typeof reorderSessionsSchema>;
