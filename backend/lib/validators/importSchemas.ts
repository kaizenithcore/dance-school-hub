import { z } from "zod";

// The column mapping the user configured in the wizard frontend
export const importMappingSchema = z.object({
  name: z.string().min(1).nullable().optional(),
  firstName: z.string().min(1).nullable().optional(),
  lastName: z.string().min(1).nullable().optional(),
  email: z.string().min(1).nullable().optional(),
  phone: z.string().min(1).nullable().optional(),
  locality: z.string().min(1).nullable().optional(),
  identityDocumentNumber: z.string().min(1).nullable().optional(),
  birthdate: z.string().min(1).nullable().optional(),
  notes: z.string().min(1).nullable().optional(),
  custom: z.record(z.string(), z.string().min(1).nullable().optional()).optional(),
  columnTargets: z.record(z.string(), z.string().min(1).nullable().optional()).optional(),
}).passthrough();

// Each raw row from the parsed spreadsheet
const rawRowSchema = z.record(z.string(), z.string());

export const importStudentsSchema = z.object({
  rows: z.array(rawRowSchema).min(1).max(2000),
  mapping: importMappingSchema,
});

export type ImportMapping = z.infer<typeof importMappingSchema>;
export type ImportStudentsInput = z.infer<typeof importStudentsSchema>;
