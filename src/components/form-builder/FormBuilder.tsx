import { useEffect, useMemo, useState } from "react";
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
import type { FormBuilderSection } from "@/lib/types/formBuilder";
import { Textarea } from "@/components/ui/textarea";
import { getEnrollmentFormConfig, saveEnrollmentFormConfig } from "@/lib/api/enrollmentFormConfig";

type Mode = "edit" | "preview";
const FORM_BUILDER_UNSAVED_KEY = "nexa:form-builder:unsaved";

export function FormBuilder() {
  const [config, setConfig] = useState<EnrollmentFormConfig>(getDefaultEnrollmentConfig);
  const [mode, setMode] = useState<Mode>("edit");
  const [saving, setSaving] = useState(false);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(() => JSON.stringify(getDefaultEnrollmentConfig()));

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(config) !== lastSavedSnapshot,
    [config, lastSavedSnapshot]
  );

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

  const handleSave = async () => {
    setSaving(true);

    const response = await saveEnrollmentFormConfig(config);
    setSaving(false);

    if (!response.success) {
      toast.error(response.error?.message || "No se pudo guardar el formulario");
      return;
    }

    setLastSavedSnapshot(JSON.stringify(config));
    toast.success("Formulario guardado correctamente");
  };

  const handleReset = () => {
    setConfig(getDefaultEnrollmentConfig());
    toast.info("Formulario restaurado a valores por defecto");
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
