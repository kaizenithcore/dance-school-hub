import { z } from "zod";

export const createEnrollmentSchema = z.object({
  tenantSlug: z.string().min(1),
  student: z.object({
    name: z.string().min(1).max(120),
    email: z.email(),
    phone: z.string().min(5).max(32),
    birthdate: z.string().min(4),
  }),
  classIds: z.array(z.string().uuid()).min(1),
  paymentMethod: z.enum(["transfer", "cash", "card", "mercadopago"]),
  notes: z.string().max(2000).optional(),
});

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
