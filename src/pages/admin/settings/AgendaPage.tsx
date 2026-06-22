import { useCallback, useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getSchoolSettings, updateSchoolSettings } from "@/lib/api/settings";
import { FieldGroup, SectionHeader, SwitchRow } from "./_shared";

interface ScheduleConfig {
  startHour: string; endHour: string; slotDuration: string;
  workDays: string[]; recurringSelectionMode: "linked" | "single_day";
  allowTrialClass: boolean; maxClassesPerStudent: string;
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const HOURS = Array.from({ length: 17 }, (_, i) => `${String(i + 6).padStart(2, "0")}:00`);

const DEFAULT: ScheduleConfig = {
  startHour: "08:00", endHour: "21:00", slotDuration: "90",
  workDays: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
  recurringSelectionMode: "linked", allowTrialClass: true, maxClassesPerStudent: "5",
};

export default function AgendaPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleConfig>(DEFAULT);
  const [snapshot, setSnapshot] = useState<Record<string, unknown>>({});

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSchoolSettings();
      if (!data) { toast.error("No se pudo cargar la configuración"); return; }
      setSchedule((prev) => ({ ...prev, ...data.schedule }));
      setSnapshot(data as unknown as Record<string, unknown>);
    } catch { toast.error("Error al cargar la configuración"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadSettings(); }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateSchoolSettings({ ...snapshot, schedule } as Parameters<typeof updateSchoolSettings>[0]);
      if (!updated) { toast.error("No se pudo guardar"); return; }
      setSchedule((prev) => ({ ...prev, ...updated.schedule }));
      setSnapshot(updated as unknown as Record<string, unknown>);
      toast.success("Configuración de agenda guardada");
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <PageContainer title="Agenda" description="Horarios y configuración de clases">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Agenda" description="Horarios y configuración de clases">
      <div className="rounded-lg border border-border bg-card p-6 shadow-soft space-y-6 max-w-3xl">
        <SectionHeader title="Configuración de horarios" description="Define el rango horario y los días de funcionamiento" />
        <Separator />

        <div className="grid gap-4 sm:grid-cols-3">
          <FieldGroup label="Hora de inicio">
            <Select value={schedule.startHour} onValueChange={(v) => setSchedule({ ...schedule, startHour: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup label="Hora de fin">
            <Select value={schedule.endHour} onValueChange={(v) => setSchedule({ ...schedule, endHour: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup label="Duración del bloque (min)">
            <Select value={schedule.slotDuration} onValueChange={(v) => setSchedule({ ...schedule, slotDuration: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["30", "45", "60", "90", "120"].map((d) => <SelectItem key={d} value={d}>{d} min</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldGroup>
        </div>

        <FieldGroup label="Selección de clases recurrentes">
          <Select
            value={schedule.recurringSelectionMode}
            onValueChange={(v) => setSchedule({ ...schedule, recurringSelectionMode: v as "linked" | "single_day" })}
          >
            <SelectTrigger className="h-9 text-sm sm:max-w-[400px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="linked">Vinculada (si selecciona una, se seleccionan todas)</SelectItem>
              <SelectItem value="single_day">Individual por día</SelectItem>
            </SelectContent>
          </Select>
        </FieldGroup>

        <FieldGroup label="Días de funcionamiento">
          <div className="flex flex-wrap gap-2 mt-1">
            {DAYS.map((day) => {
              const active = schedule.workDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSchedule({
                    ...schedule,
                    workDays: active ? schedule.workDays.filter((d) => d !== day) : [...schedule.workDays, day],
                  })}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                    active ? "bg-primary/10 text-primary border-primary/20" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </FieldGroup>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <SwitchRow
            label="Permitir clase de prueba"
            description="Los alumnos pueden tomar una clase gratis antes de inscribirse"
            checked={schedule.allowTrialClass}
            onChange={(v) => setSchedule({ ...schedule, allowTrialClass: v })}
          />
          <FieldGroup label="Máx. clases por alumno">
            <Input
              type="number" min="1" max="10"
              value={schedule.maxClassesPerStudent}
              onChange={(e) => setSchedule({ ...schedule, maxClassesPerStudent: e.target.value })}
              className="h-9 text-sm w-24"
            />
          </FieldGroup>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={loadSettings} disabled={saving}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restablecer
          </Button>
          <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1" /> Guardar
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
