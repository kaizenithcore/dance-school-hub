import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  FileUp,
  Loader2,
  SkipForward,
  Upload,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { detectImportMapping, runStudentImport } from "@/lib/api/imports";
import type { ImportJobResult, ImportMapping } from "@/lib/api/imports";
import { getStudentFields, type SchoolStudentField } from "@/lib/api/studentFields";
import { toast } from "sonner";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

type WizardStep = "upload" | "mapping" | "preview" | "results";

interface ParsedFile {
  headers: string[];
  rows: Array<Record<string, string>>;
  fileName: string;
  totalRows: number;
}

const FIELD_LABELS: Record<CoreImportField, string> = {
  name: "Nombre completo",
  firstName: "Nombre",
  lastName: "Apellido(s)",
  email: "Email",
  phone: "Teléfono",
  locality: "Localidad",
  identityDocumentNumber: "DNI",
  birthdate: "Fecha de nacimiento",
  notes: "Notas",
};

type CoreImportField = "name" | "firstName" | "lastName" | "email" | "phone" | "locality" | "identityDocumentNumber" | "birthdate" | "notes";

const CORE_FIELDS: CoreImportField[] = ["name", "firstName", "lastName", "email", "phone", "locality", "identityDocumentNumber", "birthdate", "notes"];

const CORE_TARGET_OPTIONS: Array<{ key: CoreImportField; label: string }> = [
  { key: "name", label: "Core - Nombre completo" },
  { key: "firstName", label: "Core - Nombre" },
  { key: "lastName", label: "Core - Apellido(s)" },
  { key: "email", label: "Core - Email" },
  { key: "phone", label: "Core - Telefono" },
  { key: "locality", label: "Core - Localidad" },
  { key: "identityDocumentNumber", label: "Core - DNI" },
  { key: "birthdate", label: "Core - Fecha de nacimiento" },
  { key: "notes", label: "Core - Notas" },
];

const STEP_LABELS: Record<WizardStep, string> = {
  upload: "Subir archivo",
  mapping: "Mapear columnas",
  preview: "Vista previa",
  results: "Resultado",
};

const STEPS: WizardStep[] = ["upload", "mapping", "preview", "results"];

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function parseFile(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("El archivo no contiene hojas");

        const worksheet = workbook.Sheets[sheetName];
        const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          defval: "",
          raw: false,
        });

        if (jsonRows.length === 0) {
          throw new Error("El archivo está vacío o no tiene filas de datos");
        }

        // Normalize all values to string
        const rows = jsonRows.map((row) =>
          Object.fromEntries(
            Object.entries(row).map(([k, v]) => [String(k), String(v ?? "")])
          )
        );

        const headers = Object.keys(rows[0] ?? {});

        resolve({
          headers,
          rows,
          fileName: file.name,
          totalRows: rows.length,
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Error al parsear el archivo"));
      }
    };

    reader.onerror = () => reject(new Error("Error al leer el archivo"));
    reader.readAsArrayBuffer(file);
  });
}

function toSnakeCase(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function parseCoreTarget(value: string): CoreImportField | null {
  if (!value.startsWith("core:")) return null;
  const field = value.slice(5) as CoreImportField;
  return CORE_FIELDS.includes(field) ? field : null;
}

function buildSelectionFromMapping(
  headers: string[],
  mapping: ImportMapping
): { selection: Record<string, string>; customDrafts: Record<string, string> } {
  const selection: Record<string, string> = Object.fromEntries(headers.map((h) => [h, "__ignore__"]));
  const customDrafts: Record<string, string> = {};

  for (const field of CORE_FIELDS) {
    const col = mapping[field];
    if (typeof col === "string" && col.trim().length > 0 && selection[col] === "__ignore__") {
      selection[col] = `core:${field}`;
    }
  }

  if (mapping.custom) {
    for (const [customKey, col] of Object.entries(mapping.custom)) {
      if (typeof col !== "string" || col.trim().length === 0) continue;
      if (!(col in selection)) continue;
      selection[col] = `extra:${toSnakeCase(customKey)}`;
    }
  }

  if (mapping.columnTargets) {
    for (const [columnName, target] of Object.entries(mapping.columnTargets)) {
      if (typeof target !== "string" || target.trim().length === 0) continue;
      if (!(columnName in selection)) continue;
      const normalized = target.trim();
      if (CORE_FIELDS.includes(normalized as CoreImportField)) {
        selection[columnName] = `core:${normalized}`;
      } else if (normalized.startsWith("extra:")) {
        selection[columnName] = `extra:${toSnakeCase(normalized.slice(6))}`;
      } else {
        selection[columnName] = `extra:${toSnakeCase(normalized)}`;
      }
    }
  }

  return { selection, customDrafts };
}

function buildMappingFromSelection(
  headers: string[],
  selection: Record<string, string>,
  customDrafts: Record<string, string>
): ImportMapping {
  const nextMapping: ImportMapping = {};
  const custom: Record<string, string> = {};
  const columnTargets: Record<string, string> = {};

  for (const header of headers) {
    const selectedTarget = selection[header] ?? "__ignore__";
    if (!selectedTarget || selectedTarget === "__ignore__") {
      continue;
    }

    const coreTarget = parseCoreTarget(selectedTarget);
    if (coreTarget) {
      nextMapping[coreTarget] = header;
      columnTargets[header] = coreTarget;
      continue;
    }

    let customKey = "";
    if (selectedTarget === "__extra_new__") {
      customKey = toSnakeCase(customDrafts[header] || header);
    } else if (selectedTarget.startsWith("extra:")) {
      customKey = toSnakeCase(selectedTarget.slice(6));
    }

    if (!customKey) {
      continue;
    }

    custom[customKey] = header;
    columnTargets[header] = `extra:${customKey}`;
  }

  if (Object.keys(custom).length > 0) {
    nextMapping.custom = custom;
  }

  if (Object.keys(columnTargets).length > 0) {
    nextMapping.columnTargets = columnTargets;
  }

  return nextMapping;
}

// ────────────────────────────────────────────────────────────────────────────
// Step indicator
// ────────────────────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: WizardStep }) {
  const currentIdx = STEPS.indexOf(current);
  return (
    <div className="flex items-center gap-1 mb-6">
      {STEPS.map((step, idx) => (
        <div key={step} className="flex items-center gap-1">
          <div
            className={cn(
              "flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold border-2 transition-colors",
              idx < currentIdx
                ? "border-primary bg-primary text-primary-foreground"
                : idx === currentIdx
                  ? "border-primary text-primary"
                  : "border-muted-foreground/30 text-muted-foreground"
            )}
          >
            {idx < currentIdx ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
          </div>
          <span
            className={cn(
              "text-xs hidden sm:inline",
              idx === currentIdx ? "text-foreground font-medium" : "text-muted-foreground"
            )}
          >
            {STEP_LABELS[step]}
          </span>
          {idx < STEPS.length - 1 && (
            <ChevronRight className="h-3 w-3 text-muted-foreground mx-1" />
          )}
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Step 1 – Upload
// ────────────────────────────────────────────────────────────────────────────

function UploadStep({ onParsed }: { onParsed: (file: ParsedFile) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      const validTypes = [
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
      ];
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!validTypes.includes(file.type) && !["csv", "xlsx", "xls"].includes(ext ?? "")) {
        setError("Sólo se aceptan archivos CSV o Excel (.xlsx, .xls)");
        return;
      }

      setError(null);
      setLoading(true);
      try {
        const parsed = await parseFile(file);
        onParsed(parsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al leer el archivo");
      } finally {
        setLoading(false);
      }
    },
    [onParsed]
  );

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/40"
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
      >
        {loading ? (
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        ) : (
          <FileUp className="h-8 w-8 text-muted-foreground" />
        )}
        <div className="text-center">
          <p className="text-sm font-medium">
            {loading ? "Procesando…" : "Arrastra tu archivo aquí o haz clic para seleccionar"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">CSV, XLSX o XLS — máx. 2 000 filas</p>
        </div>
        <Button size="sm" variant="outline" type="button" disabled={loading}>
          <Upload className="h-4 w-4 mr-1" />
          Seleccionar archivo
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      {error && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      <div className="text-xs text-muted-foreground space-y-1 pt-2">
        <p className="font-medium">Formato esperado:</p>
        <p>La primera fila debe contener los nombres de columna. Ejemplos de columnas reconocidas:</p>
        <p className="font-mono bg-muted/50 px-2 py-1 rounded">
          nombre, email, teléfono, fecha_nacimiento, notas
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Step 2 – Mapping
// ────────────────────────────────────────────────────────────────────────────

function MappingStep({
  parsedFile,
  mapping,
  customFields,
  onChange,
  onNext,
}: {
  parsedFile: ParsedFile;
  mapping: ImportMapping;
  customFields: SchoolStudentField[];
  onChange: (m: ImportMapping) => void;
  onNext: () => void;
}) {
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [customDrafts, setCustomDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const built = buildSelectionFromMapping(parsedFile.headers, mapping);
    setSelection(built.selection);
    setCustomDrafts(built.customDrafts);
  }, [parsedFile.headers, mapping]);

  const nextMapping = useMemo(
    () => buildMappingFromSelection(parsedFile.headers, selection, customDrafts),
    [parsedFile.headers, selection, customDrafts]
  );

  const assignedCount = Object.keys(nextMapping.columnTargets ?? {}).length;
  const isNameMapped =
    typeof nextMapping.name === "string" ||
    (typeof nextMapping.firstName === "string" && typeof nextMapping.lastName === "string");
  const canProceed = Boolean(isNameMapped);

  const updateSelection = (column: string, value: string) => {
    setSelection((prev) => {
      const updated: Record<string, string> = { ...prev, [column]: value };

      const selectedCore = parseCoreTarget(value);
      if (selectedCore) {
        for (const header of parsedFile.headers) {
          if (header === column) continue;
          if (updated[header] === `core:${selectedCore}`) {
            updated[header] = "__ignore__";
          }
        }
      }

      const emitted = buildMappingFromSelection(parsedFile.headers, updated, customDrafts);
      onChange(emitted);
      return updated;
    });

    if (value === "__extra_new__") {
      setCustomDrafts((prev) => {
        if ((prev[column] ?? "").trim().length > 0) return prev;
        const updated = { ...prev, [column]: toSnakeCase(column) };
        const emitted = buildMappingFromSelection(parsedFile.headers, selection, updated);
        onChange(emitted);
        return updated;
      });
    }
  };

  const updateCustomDraft = (column: string, rawValue: string) => {
    const normalized = toSnakeCase(rawValue);
    setCustomDrafts((prev) => {
      const updated = { ...prev, [column]: normalized };
      const emitted = buildMappingFromSelection(parsedFile.headers, selection, updated);
      onChange(emitted);
      return updated;
    });
  };

  const getSample = (header: string): string => {
    const firstWithValue = parsedFile.rows.find((row) => String(row[header] ?? "").trim().length > 0);
    return String(firstWithValue?.[header] ?? "").trim();
  };

  const getTargetBadgeLabel = (target: string): string => {
    const core = parseCoreTarget(target);
    if (core) {
      return FIELD_LABELS[core];
    }
    if (target.startsWith("extra:")) {
      return `Custom (${target.slice(6)})`;
    }
    if (target === "__extra_new__") {
      return "Custom nuevo";
    }
    return "Ignorar";
  };

  return (
    <div className="space-y-4">
      <div className="text-sm">
        <span className="font-medium">{parsedFile.fileName}</span>{" "}
        <span className="text-muted-foreground">— {parsedFile.totalRows} filas detectadas</span>
      </div>

      <p className="text-sm text-muted-foreground">
        Asigna cada columna a un destino explicito. Puedes mapear a campos core o a campos
        personalizados (existentes o nuevos).
      </p>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline">Columnas: {parsedFile.headers.length}</Badge>
        <Badge variant="outline">Asignadas: {assignedCount}</Badge>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Columna</th>
              <th className="px-3 py-2 text-left font-medium">Ejemplo</th>
              <th className="px-3 py-2 text-left font-medium">Destino</th>
            </tr>
          </thead>
          <tbody>
            {parsedFile.headers.map((header) => {
              const selected = selection[header] ?? "__ignore__";
              const sample = getSample(header);
              return (
                <tr key={header} className="border-t align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium">{header}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{getTargetBadgeLabel(selected)}</div>
                  </td>
                  <td className="px-3 py-2 max-w-[260px] truncate text-muted-foreground">
                    {sample || "-"}
                  </td>
                  <td className="px-3 py-2 space-y-2">
                    <Select
                      value={selected}
                      onValueChange={(value) => updateSelection(header, value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Elegir destino" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__ignore__">Ignorar columna</SelectItem>
                        {CORE_TARGET_OPTIONS.map((option) => (
                          <SelectItem key={option.key} value={`core:${option.key}`}>
                            {option.label}
                          </SelectItem>
                        ))}
                        {customFields.map((field) => (
                          <SelectItem key={field.id} value={`extra:${field.key}`}>
                            Custom - {field.label} ({field.key})
                          </SelectItem>
                        ))}
                        <SelectItem value="__extra_new__">Custom nuevo...</SelectItem>
                      </SelectContent>
                    </Select>

                    {selected === "__extra_new__" && (
                      <Input
                        value={customDrafts[header] ?? ""}
                        onChange={(event) => updateCustomDraft(header, event.target.value)}
                        placeholder="clave_custom (snake_case)"
                        className="h-8"
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!canProceed && (
        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Asigna al menos el campo "Nombre completo" (o "Nombre" + "Apellido") para continuar.
        </p>
      )}

      <Button size="sm" onClick={onNext} disabled={!canProceed}>
        Continuar con vista previa
      </Button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Step 3 – Preview
// ────────────────────────────────────────────────────────────────────────────

function resolvePreviewValue(
  row: Record<string, string>,
  mapping: ImportMapping,
  field: CoreImportField
): string {
  const col = mapping[field];
  return col ? (row[col] ?? "") : "";
}

function resolvePreviewName(row: Record<string, string>, mapping: ImportMapping): string {
  const full = resolvePreviewValue(row, mapping, "name");
  if (full) return full;
  const first = resolvePreviewValue(row, mapping, "firstName");
  const last = resolvePreviewValue(row, mapping, "lastName");
  return [first, last].filter(Boolean).join(" ");
}

function PreviewStep({
  parsedFile,
  mapping,
  onConfirm,
  onBack,
  loading,
}: {
  parsedFile: ParsedFile;
  mapping: ImportMapping;
  onConfirm: () => void;
  onBack: () => void;
  loading: boolean;
}) {
  const preview = parsedFile.rows.slice(0, 8);
  const mappedColumns: Array<{ header: string; label: string }> = [];

  if (mapping.columnTargets) {
    for (const header of parsedFile.headers) {
      const target = mapping.columnTargets[header];
      if (!target) continue;
      if (CORE_FIELDS.includes(target as CoreImportField)) {
        mappedColumns.push({ header, label: FIELD_LABELS[target as CoreImportField] });
      } else if (target.startsWith("extra:")) {
        mappedColumns.push({ header, label: `Custom (${target.slice(6)})` });
      } else {
        mappedColumns.push({ header, label: `Custom (${target})` });
      }
    }
  }

  if (mappedColumns.length === 0) {
    for (const field of CORE_FIELDS) {
      const header = mapping[field];
      if (typeof header === "string" && header.trim().length > 0) {
        mappedColumns.push({ header, label: FIELD_LABELS[field] });
      }
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Vista previa de las primeras {preview.length} filas. Revisa que los nombres y datos son
        correctos antes de importar.
      </p>

      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-xs">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-3 py-2 text-left font-medium">#</th>
              {mappedColumns.map((mapped) => (
                <th key={mapped.header} className="px-3 py-2 text-left font-medium">
                  {mapped.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => {
              const name = resolvePreviewName(row, mapping);
              const hasName = Boolean(name.trim());
              return (
                <tr key={i} className={cn("border-t", !hasName && "opacity-50")}>
                  <td className="px-3 py-1.5 text-muted-foreground">
                    {i + 1}
                    {!hasName && <AlertCircle className="inline h-3 w-3 text-amber-500 ml-1" />}
                  </td>
                  {mappedColumns.map((mapped) => {
                    const value = row[mapped.header] ?? "";
                    return (
                      <td key={mapped.header} className="px-3 py-1.5 truncate max-w-[180px]">
                        {value || <span className="text-muted-foreground italic">—</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {parsedFile.totalRows > 8 && (
        <p className="text-xs text-muted-foreground">
          …y {parsedFile.totalRows - 8} filas más.
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={onBack} disabled={loading}>
          Atrás
        </Button>
        <Button size="sm" onClick={onConfirm} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Importando…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-1" />
              Importar {parsedFile.totalRows} alumnos
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Step 4 – Results
// ────────────────────────────────────────────────────────────────────────────

function ResultsStep({
  result,
  onNewImport,
  onGoToStudents,
}: {
  result: ImportJobResult;
  onNewImport: () => void;
  onGoToStudents: () => void;
}) {
  const [showErrors, setShowErrors] = useState(false);
  const errorRows = result.rows.filter((r) => r.status === "error");

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        {result.errorRows === result.totalRows ? (
          <XCircle className="h-8 w-8 text-destructive shrink-0 mt-0.5" />
        ) : result.createdRows === result.totalRows - result.skippedRows ? (
          <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="h-8 w-8 text-amber-500 shrink-0 mt-0.5" />
        )}
        <div>
          <p className="font-semibold text-base">
            {result.createdRows > 0
              ? `${result.createdRows} alumno(s) importado(s) correctamente`
              : "No se pudieron importar alumnos"}
          </p>
          <p className="text-sm text-muted-foreground">
            Total procesado: {result.totalRows} filas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-3 text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {result.createdRows}
          </p>
          <p className="text-xs text-muted-foreground">Creados</p>
        </div>
        <div className="rounded-lg border bg-muted/40 p-3 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{result.skippedRows}</p>
          <p className="text-xs text-muted-foreground">
            <SkipForward className="inline h-3 w-3 mr-0.5" />
            Omitidos
          </p>
        </div>
        <div className="rounded-lg border bg-destructive/10 p-3 text-center">
          <p className="text-2xl font-bold text-destructive">{result.errorRows}</p>
          <p className="text-xs text-muted-foreground">Errores</p>
        </div>
      </div>

      {errorRows.length > 0 && (
        <div className="space-y-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => setShowErrors((v) => !v)}
          >
            {showErrors ? "Ocultar" : "Ver"} {errorRows.length} error(es)
          </Button>

          {showErrors && (
            <div className="rounded border divide-y text-xs max-h-48 overflow-y-auto">
              {errorRows.map((r) => (
                <div key={r.row} className="px-3 py-2 flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0 text-xs">
                    Fila {r.row}
                  </Badge>
                  <span className="text-destructive">
                    {r.errors?.map((e) => e.message).join("; ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={onGoToStudents}>
          Ver alumnos
        </Button>
        <Button size="sm" variant="outline" onClick={onNewImport}>
          Nueva importación
        </Button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main wizard
// ────────────────────────────────────────────────────────────────────────────

interface ImportWizardProps {
  onComplete?: () => void;
}

export function ImportWizard({ onComplete }: ImportWizardProps) {
  const [step, setStep] = useState<WizardStep>("upload");
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [result, setResult] = useState<ImportJobResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [customFields, setCustomFields] = useState<SchoolStudentField[]>([]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const fields = await getStudentFields();
        if (mounted) {
          setCustomFields(fields);
        }
      } catch {
        if (mounted) {
          setCustomFields([]);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleParsed = async (file: ParsedFile) => {
    setParsedFile(file);
    // Auto-detect mapping from backend
    try {
      const detected = await detectImportMapping(file.headers);
      setMapping(detected ?? {});
    } catch {
      setMapping({});
    }
    setStep("mapping");
  };

  const handleConfirmImport = async () => {
    if (!parsedFile) return;

    setImporting(true);
    try {
      const res = await runStudentImport(parsedFile.rows, mapping);
      if (!res) {
        toast.error("No se pudo completar la importación");
        return;
      }
      setResult(res);
      setStep("results");

      if (res.createdRows > 0) {
        toast.success(`${res.createdRows} alumno(s) importado(s)`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error durante la importación";
      toast.error(message);
    } finally {
      setImporting(false);
    }
  };

  const handleNewImport = () => {
    setParsedFile(null);
    setMapping({});
    setResult(null);
    setStep("upload");
  };

  return (
    <div className="space-y-2">
      <StepIndicator current={step} />

      {step === "upload" && <UploadStep onParsed={(f) => void handleParsed(f)} />}

      {step === "mapping" && parsedFile && (
        <MappingStep
          parsedFile={parsedFile}
          mapping={mapping}
          customFields={customFields}
          onChange={setMapping}
          onNext={() => setStep("preview")}
        />
      )}

      {step === "preview" && parsedFile && (
        <PreviewStep
          parsedFile={parsedFile}
          mapping={mapping}
          onBack={() => setStep("mapping")}
          onConfirm={() => void handleConfirmImport()}
          loading={importing}
        />
      )}

      {step === "results" && result && (
        <ResultsStep
          result={result}
          onNewImport={handleNewImport}
          onGoToStudents={() => onComplete?.()}
        />
      )}

      {step === "preview" && (
        <Progress
          value={
            step === "preview" ? 75 : step === "results" ? 100 : step === "mapping" ? 50 : 25
          }
          className="h-1 mt-4"
        />
      )}
    </div>
  );
}
