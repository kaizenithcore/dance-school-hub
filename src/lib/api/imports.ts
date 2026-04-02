import { apiRequest } from "./client";

export interface ImportMapping {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  locality?: string | null;
  identityDocumentNumber?: string | null;
  birthdate?: string | null;
  notes?: string | null;
  custom?: Record<string, string | null | undefined>;
  columnTargets?: Record<string, string | null | undefined>;
}

export interface ImportRowResult {
  row: number;
  status: "created" | "skipped" | "error";
  studentId?: string;
  errors?: Array<{ field: string; message: string }>;
}

export interface ImportJobResult {
  jobId: string;
  totalRows: number;
  createdRows: number;
  skippedRows: number;
  errorRows: number;
  rows: ImportRowResult[];
}

export async function detectImportMapping(headers: string[]): Promise<ImportMapping | null> {
  const params = new URLSearchParams({ headers: JSON.stringify(headers) });
  const response = await apiRequest<{ mapping: ImportMapping }>(
    `/api/admin/students/import?${params.toString()}`
  );
  return response.success ? (response.data?.mapping ?? null) : null;
}

export async function runStudentImport(
  rows: Array<Record<string, string>>,
  mapping: ImportMapping
): Promise<ImportJobResult | null> {
  const response = await apiRequest<ImportJobResult>("/api/admin/students/import", {
    method: "POST",
    body: JSON.stringify({ rows, mapping }),
  });

  if (!response.success) {
    throw new Error(response.error?.message || "Error durante la importación");
  }

  return response.data ?? null;
}
