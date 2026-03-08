import { z } from "zod";

const guardianSchema = z.object({
  name: z.string().trim().min(1).max(150),
  phone: z.string().trim().min(1).max(50),
  email: z.string().email().optional().nullable(),
});

export const createStudentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email(),
  phone: z.string().trim().min(1).max(32),
  birthdate: z.string().optional().nullable(),
  status: z.enum(["active", "inactive"]).optional().default("active"),
  paymentType: z.enum(["monthly", "per_class", "none"]).optional().default("monthly"),
  joinDate: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  guardian: guardianSchema.optional(),
  classIds: z.array(z.string().uuid()).optional(),
  jointEnrollmentGroupId: z.string().uuid().optional().nullable(),
});

export const updateStudentSchema = createStudentSchema.partial();

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
