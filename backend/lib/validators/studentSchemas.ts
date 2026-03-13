import { z } from "zod";

const guardianSchema = z.object({
  name: z.string().trim().min(1).max(150),
  phone: z.string().trim().min(1).max(50),
  email: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .refine((value) => value == null || z.string().email().safeParse(value).success, {
      message: "Email de tutor inválido",
    }),
});

const studentBaseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email(),
  phone: z.string().trim().min(1).max(32),
  birthdate: z.string().optional().nullable(),
  status: z.enum(["active", "inactive"]).optional().default("active"),
  paymentType: z.enum(["monthly", "per_class", "none"]).optional().default("monthly"),
  payerType: z.enum(["student", "guardian", "other"]).optional().default("student"),
  payerName: z.string().trim().max(150).optional().nullable(),
  payerEmail: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .refine((value) => value == null || z.string().email().safeParse(value).success, {
      message: "Email de pagador inválido",
    }),
  payerPhone: z.string().trim().max(50).optional().nullable(),
  preferredPaymentMethod: z.enum(["transfer", "cash", "card", "mercadopago"]).optional().default("cash"),
  accountNumber: z.string().trim().max(120).optional().nullable(),
  joinDate: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  guardian: guardianSchema.optional(),
  classIds: z.array(z.string().uuid()).optional(),
  jointEnrollmentGroupId: z.string().uuid().optional().nullable(),
});

export const createStudentSchema = studentBaseSchema.refine((data) => {
  if (!data.birthdate) return true;
  const birth = new Date(data.birthdate);
  if (Number.isNaN(birth.getTime())) return true;

  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear() - (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
      ? 1
      : 0
  );

  if (age >= 18) return true;
  return Boolean(data.guardian?.name?.trim() && data.guardian?.phone?.trim());
}, {
  message: "Para alumnos menores de edad, el tutor legal es obligatorio",
  path: ["guardian"],
}).refine((data) => {
  if (data.payerType !== "other") return true;
  return Boolean(data.payerName?.trim() && data.payerEmail?.trim() && data.payerPhone?.trim());
}, {
  message: "Si paga otra persona, los datos del pagador son obligatorios",
  path: ["payerName"],
}).refine((data) => {
  if (data.preferredPaymentMethod !== "transfer") return true;
  return Boolean(data.accountNumber?.trim());
}, {
  message: "El número de cuenta es obligatorio para transferencia",
  path: ["accountNumber"],
});

export const updateStudentSchema = studentBaseSchema.partial();

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
