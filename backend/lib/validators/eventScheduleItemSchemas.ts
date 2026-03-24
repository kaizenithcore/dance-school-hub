import { z } from "zod";

const timeRegex = /^([0-1]\d|2[0-3]):[0-5]\d$/;

const baseScheduleItemSchema = {
  duration_minutes: z.number().int().positive("Duration must be positive"),
  group_name: z.string().trim().min(1).max(255).optional().nullable(),
  class_id: z.string().uuid("Invalid class ID").optional().nullable(),
  start_time: z.string().regex(timeRegex, "Invalid time format (HH:mm)").optional().nullable(),
  choreography: z.string().trim().max(1000).optional().nullable(),
  teacher_id: z.string().uuid("Invalid teacher ID").optional().nullable(),
  participants_count: z.number().int().nonnegative().optional().nullable(),
  room_id: z.string().uuid("Invalid room ID").optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
};

export const createScheduleItemSchema = z.object(baseScheduleItemSchema).superRefine((value, ctx) => {
  if (!value.class_id && !value.group_name?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["group_name"],
      message: "Group name is required when class_id is not provided",
    });
  }
});

export const updateScheduleItemSchema = z.object({
  duration_minutes: baseScheduleItemSchema.duration_minutes.optional(),
  group_name: baseScheduleItemSchema.group_name,
  class_id: baseScheduleItemSchema.class_id,
  start_time: baseScheduleItemSchema.start_time,
  choreography: baseScheduleItemSchema.choreography,
  teacher_id: baseScheduleItemSchema.teacher_id,
  participants_count: baseScheduleItemSchema.participants_count,
  room_id: baseScheduleItemSchema.room_id,
  notes: baseScheduleItemSchema.notes,
});

export const reorderScheduleItemsSchema = z.object({
  positions: z.array(
    z.object({
      id: z.string().uuid("Invalid schedule item ID"),
      position: z.number().int().nonnegative(),
    })
  ).min(1),
});

export type CreateScheduleItemInput = z.infer<typeof createScheduleItemSchema>;
export type UpdateScheduleItemInput = z.infer<typeof updateScheduleItemSchema>;
export type ReorderScheduleItemsInput = z.infer<typeof reorderScheduleItemsSchema>;
