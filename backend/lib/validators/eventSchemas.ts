import { z } from "zod";

export const createEventSchema = z.object({
  name: z.string().trim().min(1).max(255),
  start_date: z.string().date("Invalid date format"),
  end_date: z.string().date("Invalid date format").optional().nullable(),
  location: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2000).optional().nullable(),
  ticket_price_cents: z.number().int().nonnegative().optional().nullable(),
  capacity: z.number().int().positive().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(["draft", "published"]).default("draft"),
});

export const updateEventSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  start_date: z.string().date("Invalid date format").optional(),
  end_date: z.string().date("Invalid date format").optional().nullable(),
  location: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  ticket_price_cents: z.number().int().nonnegative().optional().nullable(),
  capacity: z.number().int().positive().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(["draft", "published"]).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
