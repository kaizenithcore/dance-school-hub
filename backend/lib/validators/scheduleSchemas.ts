import { z } from "zod";

// Base schedule input
const baseScheduleInput = {
  classId: z.string().uuid("ID de clase inválido"),
  roomId: z.string().uuid("ID de sala inválida"),
  weekday: z.number().min(1).max(7), // 1=Mon, 7=Sun
  startTime: z.string().time("Formato de hora inválido (HH:mm)"),
  endTime: z.string().time("Formato de hora inválido (HH:mm)"),
  effectiveFrom: z.string().date("Formato de fecha inválido"),
  effectiveTo: z.string().date("Formato de fecha inválido").optional(),
  isActive: z.boolean().default(true),
};

// Create schedule
export const createScheduleSchema = z
  .object(baseScheduleInput)
  .refine((data) => data.startTime < data.endTime, {
    message: "La hora de fin debe ser posterior a la hora de inicio",
    path: ["endTime"],
  })
  .refine(
    (data) => !data.effectiveTo || data.effectiveFrom <= data.effectiveTo,
    {
      message: "Fecha efectiva final debe ser posterior a la inicial",
      path: ["effectiveTo"],
    }
  );

// Update schedule (todos los campos opcionales)
export const updateScheduleSchema = z
  .object({
    classId: z.string().uuid().optional(),
    roomId: z.string().uuid().optional(),
    weekday: z.number().min(1).max(7).optional(),
    startTime: z.string().time().optional(),
    endTime: z.string().time().optional(),
    effectiveFrom: z.string().date().optional(),
    effectiveTo: z.string().date().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => !data.startTime || !data.endTime || data.startTime < data.endTime, {
    message: "La hora de fin debe ser posterior a la hora de inicio",
    path: ["endTime"],
  })
  .refine(
    (data) =>
      !data.effectiveFrom || !data.effectiveTo || data.effectiveFrom <= data.effectiveTo,
    {
      message: "Fecha efectiva final debe ser posterior a la inicial",
      path: ["effectiveTo"],
    }
  );

// Batch save schedule (múltiples operaciones: create, update, delete)
export const batchScheduleOperationSchema = z.object({
  creates: z.array(createScheduleSchema).default([]),
  updates: z
    .array(
      z.object({
        id: z.string().uuid("ID de horario inválido"),
      }).merge(updateScheduleSchema)
    )
    .default([]),
  deletes: z.array(z.string().uuid("ID de horario inválido")).default([]),
});

// Query parameters for listing schedules
export const listSchedulesQuerySchema = z.object({
  classId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
  weekday: z.coerce.number().min(1).max(7).optional(),
  fromDate: z.string().date().optional(),
  toDate: z.string().date().optional(),
});

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
export type BatchScheduleOperation = z.infer<typeof batchScheduleOperationSchema>;
export type ListSchedulesQuery = z.infer<typeof listSchedulesQuerySchema>;
