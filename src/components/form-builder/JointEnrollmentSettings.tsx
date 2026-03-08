import { JointEnrollmentConfig } from "@/lib/types/formBuilder";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Users } from "lucide-react";

interface JointEnrollmentSettingsProps {
  config: JointEnrollmentConfig;
  onChange: (config: JointEnrollmentConfig) => void;
}

export function JointEnrollmentSettings({ config, onChange }: JointEnrollmentSettingsProps) {
  const scheduleConfig = config.schedule ?? {
    preferredView: "calendar" as const,
    recurringSelectionMode: "linked" as const,
    recurringClassOverrides: [],
    calendarFields: {
      showDiscipline: true,
      showCategory: false,
      showRoom: true,
      showCapacity: true,
      showPrice: true,
      showSelectedStudents: true,
    },
  };

  const updateSchedule = (next: typeof scheduleConfig) => {
    onChange({ ...config, schedule: next });
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-soft p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
          <Users className="h-4.5 w-4.5 text-accent-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">Matrícula Conjunta</h3>
          <p className="text-xs text-muted-foreground">Permitir inscribir varios alumnos a la vez</p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(enabled) => onChange({ ...config, enabled })}
        />
      </div>

      {config.enabled && (
        <div className="space-y-4 pl-12 animate-fade-in">
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Máximo de alumnos</Label>
            <Input
              type="number"
              min={2}
              max={20}
              value={config.maxStudents}
              onChange={(e) => onChange({ ...config, maxStudents: Math.max(2, Math.min(20, parseInt(e.target.value) || 2)) })}
              className="h-8 w-20 text-xs"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Vista preferida</Label>
              <div className="flex rounded-md border overflow-hidden">
                <button
                  type="button"
                  className={`flex-1 text-xs px-3 py-2 ${scheduleConfig.preferredView === "calendar" ? "bg-primary text-primary-foreground" : "bg-background"}`}
                  onClick={() => updateSchedule({ ...scheduleConfig, preferredView: "calendar" })}
                >
                  Calendario
                </button>
                <button
                  type="button"
                  className={`flex-1 text-xs px-3 py-2 ${scheduleConfig.preferredView === "list" ? "bg-primary text-primary-foreground" : "bg-background"}`}
                  onClick={() => updateSchedule({ ...scheduleConfig, preferredView: "list" })}
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
                  className={`flex-1 text-xs px-3 py-2 ${scheduleConfig.recurringSelectionMode === "linked" ? "bg-primary text-primary-foreground" : "bg-background"}`}
                  onClick={() => updateSchedule({ ...scheduleConfig, recurringSelectionMode: "linked" })}
                >
                  Días enlazados
                </button>
                <button
                  type="button"
                  className={`flex-1 text-xs px-3 py-2 ${scheduleConfig.recurringSelectionMode === "single_day" ? "bg-primary text-primary-foreground" : "bg-background"}`}
                  onClick={() => updateSchedule({ ...scheduleConfig, recurringSelectionMode: "single_day" })}
                >
                  Día individual
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              IDs de clase para anular el modo por defecto (separados por coma)
            </Label>
            <Textarea
              rows={2}
              className="text-xs"
              placeholder="uuid-1, uuid-2"
              value={scheduleConfig.recurringClassOverrides.join(", ")}
              onChange={(e) => {
                const ids = e.target.value
                  .split(",")
                  .map((value) => value.trim())
                  .filter(Boolean);
                updateSchedule({ ...scheduleConfig, recurringClassOverrides: ids });
              }}
            />
            <p className="text-[11px] text-muted-foreground">
              Si el modo es "Días enlazados", estas clases permitirán selección por día. Si el modo es
              "Día individual", estas clases quedarán enlazadas.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Campos visibles en tarjetas del calendario</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ["showDiscipline", "Disciplina"],
                ["showCategory", "Categoría"],
                ["showRoom", "Sala"],
                ["showCapacity", "Capacidad"],
                ["showPrice", "Precio"],
                ["showSelectedStudents", "Alumnos seleccionados"],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-xs">{label}</span>
                  <Switch
                    checked={Boolean(scheduleConfig.calendarFields[key as keyof typeof scheduleConfig.calendarFields])}
                    onCheckedChange={(checked) =>
                      updateSchedule({
                        ...scheduleConfig,
                        calendarFields: {
                          ...scheduleConfig.calendarFields,
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
      )}
    </div>
  );
}
