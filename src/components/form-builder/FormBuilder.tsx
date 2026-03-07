import { useState } from "react";
import { EnrollmentFormConfig, createDefaultSection, getDefaultEnrollmentConfig } from "@/lib/types/formBuilder";
import { SectionCard } from "./SectionCard";
import { JointEnrollmentSettings } from "./JointEnrollmentSettings";
import { FormPreview } from "./FormPreview";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Eye, Pencil, CalendarDays, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { FormBuilderSection } from "@/lib/types/formBuilder";

type Mode = "edit" | "preview";

export function FormBuilder() {
  const [config, setConfig] = useState<EnrollmentFormConfig>(getDefaultEnrollmentConfig);
  const [mode, setMode] = useState<Mode>("edit");

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

  const handleSave = () => {
    // TODO: persist to backend
    toast.success("Formulario guardado correctamente");
    console.log("Form config saved:", config);
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
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Restaurar
          </Button>
          <Button size="sm" onClick={handleSave}>
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
