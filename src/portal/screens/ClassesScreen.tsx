/**
 * ClassesScreen V1 — student's enrolled classes with weekly view.
 *
 * Data: real API calls to /api/student/classes
 * No mock data, no persona switcher (V1 assumes enrolled student).
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, BookOpen } from "lucide-react";
import { PortalClassCard } from "../components/PortalClassCard";
import type { StudentPortalClass } from "@/lib/api/studentPortal";
import { getStudentPortalClasses } from "@/lib/api/studentPortal";

// Ordered days for the weekly mini-calendar
const DAYS_OF_WEEK = [
  "Lunes", "Martes", "Miércoles", "Jueves",
  "Viernes", "Sábado", "Domingo",
];

// Local simplified type used as state — matches PortalClassCard's expected shape
interface ClassEntry {
  id: string;
  name: string;
  teacher: string;
  day: string;
  time: string;
  room: string;
  style: string;
  level: string;
}

function toClassEntry(item: StudentPortalClass): ClassEntry {
  return {
    id: item.classId,
    name: item.name,
    teacher: item.teacher,
    day: item.day,
    time: item.time,
    room: item.room,
    style: item.style,
    level: item.level,
  };
}

export default function ClassesScreen() {
  const [selected, setSelected] = useState<ClassEntry | null>(null);
  const [classes, setClasses] = useState<ClassEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeDays = DAYS_OF_WEEK.filter((d) => classes.some((c) => c.day === d));

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void getStudentPortalClasses()
      .then((result) => {
        if (cancelled) return;
        setClasses(result.classes.map(toClassEntry));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "No se pudo cargar tus clases");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  // Detail view for a selected class
  if (selected) {
    return (
      <div className="px-4 pb-24 pt-6">
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="mb-4 flex items-center gap-1 text-sm text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <h1 className="text-xl font-bold text-foreground">{selected.name}</h1>
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <ClassDetail label="Profesor" value={selected.teacher} />
            <ClassDetail label="Día" value={selected.day} />
            <ClassDetail label="Horario" value={selected.time} />
            <ClassDetail label="Sala" value={selected.room} />
            <ClassDetail label="Estilo" value={selected.style} />
            <ClassDetail label="Nivel" value={selected.level} />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-6">
      <h1 className="mb-4 text-xl font-bold text-foreground">Mis Clases</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && classes.length === 0 && !error && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-8 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Aún no tienes clases activas asignadas.</p>
        </div>
      )}

      {!isLoading && classes.length > 0 && (
        <>
          {/* Weekly mini-calendar */}
          <div className="mb-5 flex gap-1 overflow-x-auto pb-1">
            {DAYS_OF_WEEK.map((d) => {
              const has = classes.some((c) => c.day === d);
              if (!has) return null; // Only show days with classes
              return (
                <div
                  key={d}
                  className="flex shrink-0 flex-col items-center rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary"
                >
                  {d.slice(0, 3)}
                  <span className="mt-0.5 h-1 w-1 rounded-full bg-primary" />
                </div>
              );
            })}
          </div>

          {/* Classes grouped by day */}
          {activeDays.map((day) => (
            <motion.div
              key={day}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5"
            >
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{day}</h2>
              <div className="space-y-2">
                {classes
                  .filter((c) => c.day === day)
                  .map((c) => (
                    <PortalClassCard key={c.id} cls={c} onClick={() => setSelected(c)} />
                  ))}
              </div>
            </motion.div>
          ))}
        </>
      )}
    </div>
  );
}

function ClassDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}
