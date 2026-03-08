import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const listIncidentsQuerySchema = z.object({
  fromDate: z.string().regex(dateRegex).optional(),
  toDate: z.string().regex(dateRegex).optional(),
  status: z.enum(["open", "resolved"]).optional(),
  studentId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const createIncidentSchema = z
  .object({
    studentId: z.string().uuid(),
    classId: z.string().uuid().optional().nullable(),
    type: z.enum(["absence", "injury", "group_change", "other"]),
    startDate: z.string().regex(dateRegex),
    endDate: z.string().regex(dateRegex).optional().nullable(),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((value) => !value.endDate || value.endDate >= value.startDate, {
    message: "endDate must be equal or later than startDate",
    path: ["endDate"],
  });

export const updateIncidentSchema = z
  .object({
    status: z.enum(["open", "resolved"]).optional(),
    endDate: z.string().regex(dateRegex).optional().nullable(),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const attendanceSheetQuerySchema = z.object({
  classId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export type ListIncidentsQuery = z.infer<typeof listIncidentsQuerySchema>;
export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;
export type AttendanceSheetQuery = z.infer<typeof attendanceSheetQuerySchema>;
