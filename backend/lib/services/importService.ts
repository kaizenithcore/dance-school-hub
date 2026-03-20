import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { studentQuotaService } from "@/lib/services/studentQuotaService";
import type { ImportMapping, ImportStudentsInput } from "@/lib/validators/importSchemas";

interface ImportRowError {
  field: string;
  message: string;
}

interface ImportRowResult {
  row: number;
  status: "created" | "skipped" | "error";
  studentId?: string;
  errors?: ImportRowError[];
}

interface ImportJobResult {
  jobId: string;
  totalRows: number;
  createdRows: number;
  skippedRows: number;
  errorRows: number;
  rows: ImportRowResult[];
}

/**
 * Given a raw row record and mapping config, resolve each field value.
 * When `firstName` and `lastName` are mapped but `name` is not, combines them.
 */
function resolveField(
  row: Record<string, string>,
  mapping: ImportMapping,
  field: keyof ImportMapping
): string {
  const col = mapping[field];
  if (!col) return "";
  return (row[col] ?? "").trim();
}

function resolveName(row: Record<string, string>, mapping: ImportMapping): string {
  const direct = resolveField(row, mapping, "name");
  if (direct) return direct;

  const first = resolveField(row, mapping, "firstName");
  const last = resolveField(row, mapping, "lastName");
  return [first, last].filter(Boolean).join(" ");
}

function isEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isRowBlank(row: Record<string, string>, mapping: ImportMapping): boolean {
  const relevant: Array<keyof ImportMapping> = ["name", "firstName", "lastName", "email", "phone"];
  return relevant.every((f) => !resolveField(row, mapping, f));
}

export const importService = {
  /**
   * Detects likely column-to-field mapping based on header names.
   * Returns a partial mapping with detected column names.
   */
  detectMapping(headers: string[]): ImportMapping {
    const matchers: Array<[keyof ImportMapping, RegExp]> = [
      ["name", /nombre[_ ]?completo|nombre[_ ]?alumno|^nombre$|^name$|^alumno$/i],
      ["firstName", /^(nombre|first[_ ]?name|given[_ ]?name)$/i],
      ["lastName", /apellido[s]?|last[_ ]?name|surname/i],
      ["email", /e-?mail|correo/i],
      ["phone", /tel[eé]fono|phone|tel\b|m[oó]vil|celular/i],
      ["birthdate", /nacimiento|fecha[_ ]?nac|birth|dob|cumple/i],
      ["notes", /notas?|comment|observaci[oó]n/i],
    ];

    const result: ImportMapping = {};

    for (const [field, regex] of matchers) {
      // If a more specific 'name' pattern matched and we'd also match firstName, skip firstName
      const match = headers.find((h) => regex.test(h.trim()));
      if (match && !result[field]) {
        result[field] = match;
      }
    }

    // If full name column found, clear first/last to avoid duplication
    if (result.name) {
      result.firstName = null;
      result.lastName = null;
    }

    return result;
  },

  async runImport(
    tenantId: string,
    userId: string,
    input: ImportStudentsInput
  ): Promise<ImportJobResult> {
    const { rows, mapping } = input;
    const rowResults: ImportRowResult[] = [];
    let createdRows = 0;
    let skippedRows = 0;
    let errorRows = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      // Skip completely blank rows
      if (isRowBlank(row, mapping)) {
        skippedRows++;
        rowResults.push({ row: rowNum, status: "skipped" });
        continue;
      }

      const name = resolveName(row, mapping);
      const email = resolveField(row, mapping, "email");
      const phone = resolveField(row, mapping, "phone");
      const birthdate = resolveField(row, mapping, "birthdate") || undefined;
      const notes = resolveField(row, mapping, "notes") || undefined;

      // Validate required fields
      const errors: ImportRowError[] = [];

      if (!name) {
        errors.push({ field: "name", message: "Nombre requerido" });
      }

      if (email && !isEmailValid(email)) {
        errors.push({ field: "email", message: `Email inválido: ${email}` });
      }

      if (errors.length > 0) {
        errorRows++;
        rowResults.push({ row: rowNum, status: "error", errors });
        continue;
      }

      try {
        // Check quota before creating (throws StudentLimitError if exceeded)
        await studentQuotaService.assertCanAddStudents(tenantId, 1);

        const { data: insertedStudent, error: insertError } = await supabaseAdmin
          .from("students")
          .insert({
            tenant_id: tenantId,
            name,
            email: email || null,
            phone: phone || null,
            date_of_birth: birthdate || null,
            notes: notes || null,
            status: "active",
            payment_type: "monthly",
            payer_type: "student",
            preferred_payment_method: "cash",
          })
          .select("id")
          .single();

        if (insertError || !insertedStudent) {
          throw new Error(insertError?.message ?? "Error al crear alumno");
        }

        createdRows++;
        rowResults.push({ row: rowNum, status: "created", studentId: insertedStudent.id });
      } catch (err) {
        errorRows++;
        const message = err instanceof Error ? err.message : "Error desconocido";
        rowResults.push({
          row: rowNum,
          status: "error",
          errors: [{ field: "general", message }],
        });
      }
    }

    // Persist import job record for audit
    let jobId: string = crypto.randomUUID();
    try {
      const { data: jobData } = await supabaseAdmin
        .from("import_jobs")
        .insert({
          tenant_id: tenantId,
          type: "students",
          status: "completed",
          total_rows: rows.length,
          created_rows: createdRows,
          skipped_rows: skippedRows,
          error_rows: errorRows,
          mapping_json: mapping,
          result_json: { rows: rowResults.slice(0, 500) },
          created_by: userId,
          completed_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (jobData?.id) jobId = jobData.id;
    } catch {
      // import_jobs table may not exist yet; non-blocking
    }

    return {
      jobId,
      totalRows: rows.length,
      createdRows,
      skippedRows,
      errorRows,
      rows: rowResults,
    };
  },
};
