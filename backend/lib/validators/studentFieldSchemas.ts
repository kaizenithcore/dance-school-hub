import { z } from "zod";

const keyRegex = /^[a-z][a-z0-9_]*$/;

export const studentFieldTypeSchema = z.enum(["text", "number", "date", "select"]);

export const studentFieldInputSchema = z.object({
  key: z.string().trim().min(1).max(100).regex(keyRegex, "Debe estar en snake_case"),
  label: z.string().trim().min(1).max(150),
  type: studentFieldTypeSchema,
  required: z.boolean().optional().default(false),
  visible: z.boolean().optional().default(true),
  visibleInTable: z.boolean().optional().default(false),
  visible_in_table: z.boolean().optional(),
});

export const studentFieldUpdateSchema = studentFieldInputSchema.partial();

export type StudentFieldInput = z.infer<typeof studentFieldInputSchema>;
export type StudentFieldUpdateInput = z.infer<typeof studentFieldUpdateSchema>;
