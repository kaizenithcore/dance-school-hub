import { z } from "zod";

export const createRoomSchema = z.object({
  name: z.string().trim().min(2).max(120),
  capacity: z.number().int().min(1).max(500),
  description: z.string().trim().max(500).optional().nullable(),
  is_active: z.boolean().default(true),
});

export const updateRoomSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  capacity: z.number().int().min(1).max(500).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  is_active: z.boolean().optional(),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
