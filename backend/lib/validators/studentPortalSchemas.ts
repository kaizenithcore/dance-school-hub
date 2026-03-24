import { z } from "zod";

export const listPaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const listStudentEventsSchema = listPaginationSchema.extend({
  upcomingOnly: z.coerce.boolean().optional().default(true),
});

export const eventIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const paymentIdParamSchema = z.object({
  paymentId: z.string().uuid(),
});

export const enrollmentCheckoutSchema = z.object({
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const exportActivityQuerySchema = z.object({
  format: z.enum(["json", "csv"]).optional().default("json"),
});

export type ListPaginationInput = z.infer<typeof listPaginationSchema>;
export type ListStudentEventsInput = z.infer<typeof listStudentEventsSchema>;
export type EnrollmentCheckoutInput = z.infer<typeof enrollmentCheckoutSchema>;
export type ExportActivityQueryInput = z.infer<typeof exportActivityQuerySchema>;
