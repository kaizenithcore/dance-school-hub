import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { listTeacherSchedule, type PortalTeacherScheduleSlot } from "@/lib/api/portalFoundation";

const dayName: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miercoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sabado",
  7: "Domingo",
};

export default function TeacherScheduleScreen() {
  const [schedule, setSchedule] = useState<PortalTeacherScheduleSlot[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await listTeacherSchedule();
        setSchedule(data.schedule);
      } catch {
        setSchedule([]);
      }
    };

    void load();
  }, []);

  return (
    <div className="space-y-4 px-4 pb-24 pt-6">
      <div className="flex items-center gap-2">
        <Link to="/portal/app/profile" className="rounded-full border border-border p-2 text-muted-foreground">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Horario del profesor</h1>
          <p className="text-xs text-muted-foreground">Vista semanal de clases asignadas</p>
        </div>
      </div>

      <div className="space-y-2">
        {schedule.map((slot) => (
          <div key={slot.id} className="rounded-xl border border-border bg-card px-3 py-2">
            <p className="text-sm font-semibold text-foreground">{slot.class_name}</p>
            <p className="text-xs text-muted-foreground">
              {dayName[slot.weekday] || `Dia ${slot.weekday}`} · {slot.start_time.slice(0, 5)}-{slot.end_time.slice(0, 5)}
            </p>
          </div>
        ))}
      </div>

      {schedule.length === 0 ? <p className="text-sm text-muted-foreground">No hay horarios asignados.</p> : null}
    </div>
  );
}
