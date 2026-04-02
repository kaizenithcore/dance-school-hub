import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { studentQuotaService } from "@/lib/services/studentQuotaService";
import { studentFieldService } from "@/lib/services/studentFieldService";
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

type CoreImportField = "name" | "firstName" | "lastName" | "email" | "phone" | "locality" | "identityDocumentNumber" | "birthdate" | "notes";

const CORE_IMPORT_FIELDS: CoreImportField[] = ["name", "firstName", "lastName", "email", "phone", "locality", "identityDocumentNumber", "birthdate", "notes"];

function toSnakeCase(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
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
  if (typeof col !== "string" || col.trim().length === 0) return "";
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
      ["locality", /localidad|ciudad|city|town|municipio/i],
      ["identityDocumentNumber", /^(dni|documento|doc|nif|nie|pasaporte|passport)$/i],
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
    const mappingRecord = mapping as Record<string, unknown>;
    const customMappingRaw = (mappingRecord.custom && typeof mappingRecord.custom === "object" && !Array.isArray(mappingRecord.custom))
      ? (mappingRecord.custom as Record<string, string | null | undefined>)
      : {};
    const columnTargets = (mappingRecord.columnTargets && typeof mappingRecord.columnTargets === "object" && !Array.isArray(mappingRecord.columnTargets))
      ? (mappingRecord.columnTargets as Record<string, string | null | undefined>)
      : {};

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

      let name = resolveName(row, mapping);
      let email = resolveField(row, mapping, "email");
      let phone = resolveField(row, mapping, "phone");
      let locality = resolveField(row, mapping, "locality") || undefined;
      let identityDocumentNumber = resolveField(row, mapping, "identityDocumentNumber") || undefined;
      let birthdate = resolveField(row, mapping, "birthdate") || undefined;
      let notes = resolveField(row, mapping, "notes") || undefined;

      const extraDataPayload: Record<string, unknown> = {};
      const usedColumns = new Set<string>();

      for (const field of CORE_IMPORT_FIELDS) {
        const col = mapping[field];
        if (typeof col === "string" && col.trim().length > 0) {
          usedColumns.add(col);
        }
      }

      for (const [customKey, col] of Object.entries(customMappingRaw)) {
        if (!col) continue;
        usedColumns.add(col);
        const value = (row[col] ?? "").trim();
        if (value.length > 0) {
          extraDataPayload[toSnakeCase(customKey)] = value;
        }
      }

      for (const [columnName, target] of Object.entries(columnTargets)) {
        if (!target) continue;
        usedColumns.add(columnName);
        const value = (row[columnName] ?? "").trim();
        if (value.length === 0) continue;

        if (target === "name") {
          name = value;
          continue;
        }

        if (target === "firstName") {
          const lastNameFromMapping = resolveField(row, mapping, "lastName");
          name = [value, lastNameFromMapping].filter(Boolean).join(" ").trim() || name;
          continue;
        }

        if (target === "lastName") {
          const firstNameFromMapping = resolveField(row, mapping, "firstName");
          name = [firstNameFromMapping, value].filter(Boolean).join(" ").trim() || name;
          continue;
        }

        if (target === "email") {
          email = value;
          continue;
        }

        if (target === "phone") {
          phone = value;
          continue;
        }

        if (target === "locality") {
          locality = value;
          continue;
        }

        if (target === "identityDocumentNumber") {
          identityDocumentNumber = value;
          continue;
        }

        if (target === "birthdate") {
          birthdate = value;
          continue;
        }

        if (target === "notes") {
          notes = value;
          continue;
        }

        if (target.startsWith("extra:")) {
          extraDataPayload[toSnakeCase(target.slice(6))] = value;
        } else {
          extraDataPayload[toSnakeCase(target)] = value;
        }
      }

      for (const [columnName, valueRaw] of Object.entries(row)) {
        if (usedColumns.has(columnName)) {
          continue;
        }

        const value = String(valueRaw ?? "").trim();
        if (value.length === 0) {
          continue;
        }

        const normalizedColumn = toSnakeCase(columnName);
        if (CORE_IMPORT_FIELDS.includes(normalizedColumn as CoreImportField)) {
          continue;
        }

        extraDataPayload[normalizedColumn] = value;
      }

      const normalizedExtraData = await studentFieldService.normalizeAndValidateExtraData(tenantId, extraDataPayload);

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
            locality: locality || null,
            identity_document_type: identityDocumentNumber ? "dni" : null,
            identity_document_number: identityDocumentNumber || null,
            date_of_birth: birthdate || null,
            notes: notes || null,
            extra_data: normalizedExtraData,
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
