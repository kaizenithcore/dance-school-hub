import { z } from "zod";

export const generateScheduleProposalsSchema = z.object({
  includeExisting: z.boolean().optional().default(true),
  // Sprint 7: When true, unlocked schedules are cleared; locked anchors are kept
  replaceUnlocked: z.boolean().optional().default(false),
});

export const applyScheduleProposalSchema = z.object({
  proposalId: z.string().min(1),
  creates: z.array(
    z.object({
      classId: z.string().uuid(),
      roomId: z.string().uuid(),
      weekday: z.number().int().min(1).max(7),
      startTime: z.string().time(),
      endTime: z.string().time(),
      effectiveFrom: z.string().date(),
      effectiveTo: z.string().date().optional(),
      isActive: z.boolean().optional().default(true),
    })
  ),
  // Sprint 7: IDs of non-locked schedules to delete before applying
  schedulesToDelete: z.array(z.string().uuid()).optional().default([]),
});

export type GenerateScheduleProposalsInput = z.infer<typeof generateScheduleProposalsSchema>;
export type ApplyScheduleProposalInput = z.infer<typeof applyScheduleProposalSchema>;
