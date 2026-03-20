import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { WeeklySchedule } from "@/components/schedule/WeeklySchedule";
import { getPublicSchedule } from "@/lib/api/schedules";
import { getPublicFormData } from "@/lib/api/publicEnrollment";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ClassForDisplay {
  id: string;
  classId: string;
  name: string;
  branchName?: string;
  teacher: string;
  time: string;
  room: string;
  price: number;
  spotsLeft: number;
  totalSpots: number;
  day: string;
  recurrence: string;
}

export default function FullSchedulePage() {
  const { schoolSlug } = useParams();
  const [classes, setClasses] = useState<ClassForDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [notFound, setNotFound] = useState(false);

  // Load schedule from public API
  useEffect(() => {
    const loadSchedule = async () => {
      try {
        setLoading(true);
        const school = await getPublicFormData(schoolSlug || "");
        if (!school) {
          setNotFound(true);
          setClasses([]);
          return;
        }

        setNotFound(false);
        const data = await getPublicSchedule(schoolSlug || "");

        const mappedClasses: ClassForDisplay[] = data.map((schedule) => {
          const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
          return {
            id: schedule.id,
            classId: schedule.class_id,
            name: schedule.className || "Clase",
            branchName: schedule.branchName || undefined,
            teacher: "Prof. (datos en desarrollo)",
            time: `${schedule.start_time}–${schedule.end_time}`,
            room: schedule.roomName || "Aula",
            price: schedule.capacity ? Math.floor(Math.random() * 100) + 50 : 80,
            spotsLeft: Math.max(0, (schedule.capacity || 0) - (schedule.studentCount || 0)),
            totalSpots: schedule.capacity || 0,
            day: dayNames[schedule.weekday] || "Lunes",
            recurrence: "weekly",
          };
        });
        setClasses(mappedClasses);
      } catch (error) {
        console.error("Error loading schedule:", error);
        toast.error("Error cargando horario");
        setClasses([]);
      } finally {
        setLoading(false);
      }
    };

    if (schoolSlug) {
      loadSchedule();
    }
  }, [schoolSlug]);

  const toggleClass = (id: string) => {
    setSelectedClasses((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const selectedTotal = classes
    .filter((c) => selectedClasses.includes(c.id))
    .reduce((sum, c) => sum + c.price, 0);
  const selectedClassIdsForEnroll = Array.from(
    new Set(
      classes
        .filter((c) => selectedClasses.includes(c.id))
        .map((c) => c.classId)
    )
  );
  const enrollQuery = selectedClasses.length > 0
    ? `?class_ids=${encodeURIComponent(selectedClassIdsForEnroll.join(","))}`
    : "";
  const enrollPath = `/s/${schoolSlug}/enroll${enrollQuery}`;

  if (notFound) {
    return (
      <div className="container py-12">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Escuela no encontrada</CardTitle>
            <CardDescription>
              La escuela que buscas no existe o no esta disponible.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 sm:py-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Horario de Clases</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consultá el horario completo. Las clases semanales se repiten cada semana. Las puntuales tienen fecha fija.
          </p>
        </div>
        {selectedClasses.length > 0 && (
          <div className="flex items-center gap-3 animate-fade-in">
            <span className="text-sm text-muted-foreground">
              {selectedClasses.length} clase{selectedClasses.length > 1 ? "s" : ""} · <span className="font-semibold text-foreground">€{selectedTotal}</span>
            </span>
            <Button asChild>
              <Link to={enrollPath}>
                Inscribirse
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>

      <WeeklySchedule
        classes={classes as any}
        selectedClassIds={selectedClasses}
        onToggleClass={toggleClass}
      />
    </div>
  );
}
