import { z } from "zod";

export const createTenantSchema = z.object({
  tenantName: z.string().trim().min(2).max(120),
  tenantSlug: z.string().trim().min(2).max(120),
  ownerEmail: z.email(),
  ownerDisplayName: z.string().trim().min(2).max(120).optional(),
  ownerPassword: z.string().min(8).max(128),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;