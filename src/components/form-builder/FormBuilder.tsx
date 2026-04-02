import { useContext, useEffect, useMemo, useState } from "react";
import { UNSAFE_NavigationContext as NavigationContext } from "react-router-dom";
import { EnrollmentFormConfig, createDefaultSection, getDefaultEnrollmentConfig } from "@/lib/types/formBuilder";
import { SectionCard } from "./SectionCard";
import { JointEnrollmentSettings } from "./JointEnrollmentSettings";
import { FormPreview } from "./FormPreview";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Eye, Pencil, CalendarDays, RotateCcw, Tags, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { FormBuilderField, FormBuilderSection, FieldType } from "@/lib/types/formBuilder";
import { Textarea } from "@/components/ui/textarea";
import { getEnrollmentFormConfig, saveEnrollmentFormConfig } from "@/lib/api/enrollmentFormConfig";
import { Badge } from "@/components/ui/badge";
import { getStudentFields, type SchoolStudentField } from "@/lib/api/studentFields";

type Mode = "edit" | "preview";
const FORM_BUILDER_UNSAVED_KEY = "nexa:form-builder:unsaved";
const FORM_BUILDER_SAVE_REQUEST_EVENT = "nexa:form-builder:request-save";
const FORM_BUILDER_SAVE_RESULT_EVENT = "nexa:form-builder:save-result";

export function FormBuilder() {
  const [config, setConfig] = useState<EnrollmentFormConfig>(getDefaultEnrollmentConfig);
  const [mode, setMode] = useState<Mode>("edit");
  const [saving, setSaving] = useState(false);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(() => JSON.stringify(getDefaultEnrollmentConfig()));
  const [schoolStudentFields, setSchoolStudentFields] = useState<SchoolStudentField[]>([]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(config) !== lastSavedSnapshot,
    [config, lastSavedSnapshot]
  );
  const navigationContext = useContext(NavigationContext);

  useEffect(() => {
    const loadConfig = async () => {
      const response = await getEnrollmentFormConfig();

      if (!response.success || !response.data?.config) {
        toast.error(response.error?.message || "No se pudo cargar el formulario guardado");
        return;
      }

      setConfig(response.data.config);
      setLastSavedSnapshot(JSON.stringify(response.data.config));
    };

    void loadConfig();
  }, []);

  useEffect(() => {
    const loadSchoolFields = async () => {
      try {
        const fields = await getStudentFields();
        setSchoolStudentFields(fields);
      } catch {
        setSchoolStudentFields([]);
      }
    };

    void loadSchoolFields();
  }, []);

  useEffect(() => {
    if (hasUnsavedChanges) {
      window.localStorage.setItem(FORM_BUILDER_UNSAVED_KEY, "1");
    } else {
      window.localStorage.removeItem(FORM_BUILDER_UNSAVED_KEY);
    }
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.localStorage.removeItem(FORM_BUILDER_UNSAVED_KEY);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const navigator = navigationContext.navigator as {
      block?: (blocker: (tx: { retry: () => void }) => void) => () => void;
    };

    if (typeof navigator.block !== "function") {
      return;
    }

    const unblock = navigator.block((tx) => {
      const confirmLeave = window.confirm(
        "Tienes cambios sin guardar en el Form Builder. Si sales ahora, se perderan. ¿Quieres continuar?"
      );

      if (!confirmLeave) {
        return;
      }

      window.localStorage.removeItem(FORM_BUILDER_UNSAVED_KEY);
      unblock();
      tx.retry();
    });

    return unblock;
  }, [hasUnsavedChanges, navigationContext]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handleAnchorNavigation = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }

      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute("href") || "";
      if (!href || href.startsWith("#") || anchor.target === "_blank") {
        return;
      }

      const isInternal = href.startsWith("/");
      if (!isInternal) {
        return;
      }

      const confirmLeave = window.confirm(
        "Tienes cambios sin guardar en el Form Builder. Si sales ahora, se perderan. ¿Quieres continuar?"
      );

      if (!confirmLeave) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      window.localStorage.removeItem(FORM_BUILDER_UNSAVED_KEY);
    };

    document.addEventListener("click", handleAnchorNavigation, true);
    return () => {
      document.removeEventListener("click", handleAnchorNavigation, true);
    };
  }, [hasUnsavedChanges]);

  const updateSection = (index: number, section: FormBuilderSection) => {
    const sections = [...config.sections];
    sections[index] = section;
    setConfig({ ...config, sections });
  };

  const deleteSection = (index: number) => {
    setConfig({ ...config, sections: config.sections.filter((_, i) => i !== index) });
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    const sections = [...config.sections];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= sections.length) return;
    [sections[index], sections[target]] = [sections[target], sections[index]];
    setConfig({ ...config, sections });
  };

  const addSection = () => {
    setConfig({ ...config, sections: [...config.sections, createDefaultSection()] });
  };

  const handleSave = async (): Promise<boolean> => {
    setSaving(true);

    const response = await saveEnrollmentFormConfig(config);
    setSaving(false);

    if (!response.success) {
      toast.error(response.error?.message || "No se pudo guardar el formulario");
      return false;
    }

    setLastSavedSnapshot(JSON.stringify(config));
    toast.success("Formulario guardado correctamente");
    return true;
  };

  useEffect(() => {
    const onRequestSave = () => {
      void (async () => {
        const success = await handleSave();
        window.dispatchEvent(new CustomEvent(FORM_BUILDER_SAVE_RESULT_EVENT, { detail: { success } }));
      })();
    };

    window.addEventListener(FORM_BUILDER_SAVE_REQUEST_EVENT, onRequestSave);
    return () => {
      window.removeEventListener(FORM_BUILDER_SAVE_REQUEST_EVENT, onRequestSave);
    };
  }, [handleSave]);

  const handleReset = () => {
    setConfig(getDefaultEnrollmentConfig());
    toast.info("Formulario restaurado a valores por defecto");
  };

  const sectionIndexForStudentData = useMemo(() => {
    const byId = config.sections.findIndex((section) => section.id.toLowerCase().includes("student"));
    if (byId >= 0) return byId;

    const byTitle = config.sections.findIndex((section) => section.title.toLowerCase().includes("alumno"));
    if (byTitle >= 0) return byTitle;

    return 0;
  }, [config.sections]);

  const existingFieldIds = useMemo(() => {
    return new Set(config.sections.flatMap((section) => section.fields.map((field) => field.id)));
  }, [config.sections]);

  const toFormFieldType = (type: SchoolStudentField["type"]): FieldType => {
    if (type === "number") return "number";
    if (type === "date") return "date";
    return "text";
  };

  const makeSchoolFieldFormId = (field: SchoolStudentField) => field.key;

  const makeSchoolFieldFormField = (field: SchoolStudentField): FormBuilderField => ({
    id: makeSchoolFieldFormId(field),
    type: toFormFieldType(field.type),
    label: field.label,
    placeholder: `Ingresa ${field.label.toLowerCase()}`,
    required: field.required,
  });

  const requiredSchoolFieldsNotIncluded = useMemo(() => {
    return schoolStudentFields.filter((field) => field.required && !existingFieldIds.has(makeSchoolFieldFormId(field)));
  }, [schoolStudentFields, existingFieldIds]);

  const addSchoolFieldToForm = (field: SchoolStudentField) => {
    const fieldId = makeSchoolFieldFormId(field);
    if (existingFieldIds.has(fieldId)) {
      toast.info(`El campo ${field.label} ya esta incluido en el formulario`);
      return;
    }

    if (config.sections.length === 0) {
      toast.error("No hay secciones disponibles para agregar el campo");
      return;
    }

    setConfig((prev) => {
      const sections = [...prev.sections];
      const target = sections[sectionIndexForStudentData] ?? sections[0];
      const targetIndex = sections.indexOf(target);
      const nextFields = [...target.fields, makeSchoolFieldFormField(field)];
      sections[targetIndex] = { ...target, fields: nextFields };
      return { ...prev, sections };
    });

    toast.success(`Campo ${field.label} agregado al formulario`);
  };

  const addAllRequiredSchoolFieldsToForm = () => {
    if (requiredSchoolFieldsNotIncluded.length === 0) {
      toast.info("No hay campos requeridos pendientes de agregar");
      return;
    }

    if (config.sections.length === 0) {
      toast.error("No hay secciones disponibles para agregar campos");
      return;
    }

    setConfig((prev) => {
      const sections = [...prev.sections];
      const target = sections[sectionIndexForStudentData] ?? sections[0];
      const targetIndex = sections.indexOf(target);
      const knownIds = new Set(target.fields.map((field) => field.id));
      const fieldsToAdd = requiredSchoolFieldsNotIncluded
        .filter((field) => !knownIds.has(makeSchoolFieldFormId(field)))
        .map((field) => makeSchoolFieldFormField(field));

      if (fieldsToAdd.length === 0) {
        return prev;
      }

      sections[targetIndex] = {
        ...target,
        fields: [...target.fields, ...fieldsToAdd],
      };

      return { ...prev, sections };
    });

    toast.success(`Se agregaron ${requiredSchoolFieldsNotIncluded.length} campo(s) requeridos al formulario`);
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
          <button
            onClick={() => setMode("edit")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors",
              mode === "edit" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Pencil className="h-3.5 w-3.5" />
            Editor
          </button>
          <button
            onClick={() => setMode("preview")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors",
              mode === "preview" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Eye className="h-3.5 w-3.5" />
            Vista Previa
          </button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {hasUnsavedChanges ? (
            <span className="text-xs font-medium text-warning">Cambios sin guardar</span>
          ) : null}
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Restaurar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            Guardar Formulario
          </Button>
        </div>
      </div>

      {mode === "edit" ? (
        <div className="space-y-6">
          {/* Schedule toggle */}
          <div className="rounded-xl border border-border bg-card shadow-soft p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                <CalendarDays className="h-4.5 w-4.5 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">Selección de Clases por Horario</h3>
                <p className="text-xs text-muted-foreground">
                  Incluir el horario semanal para que los alumnos seleccionen sus clases
                </p>
              </div>
              <Switch
                checked={config.includeSchedule}
                onCheckedChange={(checked) => setConfig({ ...config, includeSchedule: checked })}
              />
            </div>
          </div>

          {/* Pricing toggle */}
          <div className="rounded-xl border border-border bg-card shadow-soft p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                <Tags className="h-4.5 w-4.5 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">Mostrar Tarifas y Bonos</h3>
                <p className="text-xs text-muted-foreground">
                  Mostrar resumen dinámico de precio, ahorro y cercanía a bonos en la matrícula pública
                </p>
              </div>
              <Switch
                checked={config.includePricing ?? true}
                onCheckedChange={(checked) => setConfig({ ...config, includePricing: checked })}
              />
            </div>
          </div>

          {/* Schedule display settings */}
          {(() => {
            const scheduleSettings = config.scheduleSettings ?? {
              preferredView: "calendar" as const,
              recurringSelectionMode: "linked" as const,
              recurringClassOverrides: [] as string[],
              calendarFields: {
                showDiscipline: true,
                showCategory: false,
                showRoom: true,
                showCapacity: true,
                showPrice: true,
                showSelectedStudents: true,
              },
            };
            const updateSchedule = (next: typeof scheduleSettings) =>
              setConfig({ ...config, scheduleSettings: next });
            return (
              <div className="rounded-xl border border-border bg-card shadow-soft p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                    <LayoutGrid className="h-4.5 w-4.5 text-accent-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-foreground">Configuración del Horario</h3>
                    <p className="text-xs text-muted-foreground">
                      Vista por defecto, selección de clases recurrentes y campos visibles en tarjetas del calendario
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 pl-12">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Vista preferida</Label>
                    <div className="flex rounded-md border overflow-hidden">
                      <button
                        type="button"
                        className={`flex-1 text-xs px-3 py-2 ${scheduleSettings.preferredView === "calendar" ? "bg-primary text-primary-foreground" : "bg-background"}`}
                        onClick={() => updateSchedule({ ...scheduleSettings, preferredView: "calendar" })}
                      >
                        Calendario
                      </button>
                      <button
                        type="button"
                        className={`flex-1 text-xs px-3 py-2 ${scheduleSettings.preferredView === "list" ? "bg-primary text-primary-foreground" : "bg-background"}`}
                        onClick={() => updateSchedule({ ...scheduleSettings, preferredView: "list" })}
                      >
                        Lista
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Clases recurrentes</Label>
                    <div className="flex rounded-md border overflow-hidden">
                      <button
                        type="button"
                        className={`flex-1 text-xs px-3 py-2 ${scheduleSettings.recurringSelectionMode === "linked" ? "bg-primary text-primary-foreground" : "bg-background"}`}
                        onClick={() => updateSchedule({ ...scheduleSettings, recurringSelectionMode: "linked" })}
                      >
                        Días enlazados
                      </button>
                      <button
                        type="button"
                        className={`flex-1 text-xs px-3 py-2 ${scheduleSettings.recurringSelectionMode === "single_day" ? "bg-primary text-primary-foreground" : "bg-background"}`}
                        onClick={() => updateSchedule({ ...scheduleSettings, recurringSelectionMode: "single_day" })}
                      >
                        Día individual
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pl-12">
                  <Label className="text-xs text-muted-foreground">
                    IDs de clase para anular el modo por defecto (separados por coma)
                  </Label>
                  <Textarea
                    rows={2}
                    className="text-xs"
                    placeholder="uuid-1, uuid-2"
                    value={scheduleSettings.recurringClassOverrides.join(", ")}
                    onChange={(e) => {
                      const ids = e.target.value
                        .split(",")
                        .map((v) => v.trim())
                        .filter(Boolean);
                      updateSchedule({ ...scheduleSettings, recurringClassOverrides: ids });
                    }}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Si el modo es "Días enlazados", estas clases permitirán selección por día individual. Si el modo es
                    "Día individual", estas clases quedarán enlazadas.
                  </p>
                </div>

                <div className="space-y-2 pl-12">
                  <Label className="text-xs text-muted-foreground">Campos visibles en tarjetas del calendario</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {([
                      ["showDiscipline", "Disciplina"],
                      ["showCategory", "Categoría"],
                      ["showRoom", "Aula"],
                      ["showCapacity", "Capacidad"],
                      ["showPrice", "Precio"],
                      ["showSelectedStudents", "Alumnos seleccionados"],
                    ] as const).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <span className="text-xs">{label}</span>
                        <Switch
                          checked={Boolean(scheduleSettings.calendarFields[key])}
                          onCheckedChange={(checked) =>
                            updateSchedule({
                              ...scheduleSettings,
                              calendarFields: {
                                ...scheduleSettings.calendarFields,
                                [key]: Boolean(checked),
                              },
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Joint enrollment */}
          <JointEnrollmentSettings
            config={config.jointEnrollment}
            onChange={(jointEnrollment) => setConfig({ ...config, jointEnrollment })}
          />

          <div className="rounded-xl border border-border bg-card shadow-soft p-5 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Campos personalizados de alumnos (escuela)</h3>
                <p className="text-xs text-muted-foreground">
                  Estos campos vienen de la configuracion de tu escuela. Puedes agregarlos al formulario
                  publico para pedirlos durante la inscripcion.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={addAllRequiredSchoolFieldsToForm}
                disabled={requiredSchoolFieldsNotIncluded.length === 0}
              >
                Agregar todos los requeridos
              </Button>
            </div>

            {schoolStudentFields.length === 0 ? (
              <p className="text-xs text-muted-foreground">No hay campos personalizados configurados para esta escuela.</p>
            ) : (
              <div className="space-y-2">
                {schoolStudentFields.map((field) => {
                  const included = existingFieldIds.has(makeSchoolFieldFormId(field));
                  return (
                    <div key={field.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {field.label}
                          <span className="ml-1 text-xs text-muted-foreground">({field.key})</span>
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px]">{field.type}</Badge>
                          {field.required ? <Badge variant="outline" className="text-[10px]">Requerido</Badge> : null}
                          {field.visibleInTable ? <Badge variant="outline" className="text-[10px]">Visible en tabla</Badge> : null}
                          {included ? <Badge className="text-[10px]">Incluido en formulario</Badge> : null}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={included ? "outline" : "default"}
                        disabled={included}
                        onClick={() => addSchoolFieldToForm(field)}
                      >
                        {included ? "Ya agregado" : "Agregar al formulario"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sections */}
          <div className="space-y-4">
            {config.sections.map((section, i) => (
              <SectionCard
                key={section.id}
                section={section}
                index={i}
                totalSections={config.sections.length}
                allSections={config.sections}
                onUpdate={(s) => updateSection(i, s)}
                onDelete={() => deleteSection(i)}
                onMove={(dir) => moveSection(i, dir)}
              />
            ))}
          </div>

          <Button variant="outline" className="w-full border-dashed" onClick={addSection}>
            <Plus className="h-4 w-4 mr-2" />
            Añadir Sección
          </Button>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          <div className="mb-4 rounded-lg bg-accent/50 border border-accent px-4 py-2.5">
            <p className="text-xs text-accent-foreground">
              <Eye className="inline h-3 w-3 mr-1 -mt-0.5" />
              Vista previa del formulario tal como lo verán los alumnos. Las condiciones lógicas se evalúan en tiempo real.
            </p>
          </div>
          <FormPreview config={config} />
        </div>
      )}
    </div>
  );
}
