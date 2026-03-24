import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Users } from "lucide-react";
import { listTeacherClasses, listTeacherClassStudents, type PortalTeacherClass, type PortalTeacherRosterStudent } from "@/lib/api/portalFoundation";

export default function TeacherClassesScreen() {
  const [classes, setClasses] = useState<PortalTeacherClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [students, setStudents] = useState<PortalTeacherRosterStudent[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await listTeacherClasses();
        setClasses(data.classes);
        if (data.classes.length > 0) {
          setSelectedClassId(data.classes[0].id);
        }
      } catch {
        setClasses([]);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      return;
    }

    const loadRoster = async () => {
      try {
        const data = await listTeacherClassStudents(selectedClassId);
        setStudents(data.students);
      } catch {
        setStudents([]);
      }
    };

    void loadRoster();
  }, [selectedClassId]);

  return (
    <div className="space-y-4 px-4 pb-24 pt-6">
      <div className="flex items-center gap-2">
        <Link to="/portal/app/profile" className="rounded-full border border-border p-2 text-muted-foreground">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Mis clases</h1>
          <p className="text-xs text-muted-foreground">Participantes y grupos asignados</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {classes.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setSelectedClassId(item.id)}
            className={`rounded-full border px-3 py-1.5 text-xs ${selectedClassId === item.id ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {students.map((student) => (
          <div key={student.enrollmentId} className="rounded-xl border border-border bg-card px-3 py-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">{student.name}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{student.email || "Sin email"}</p>
            <p className="text-xs text-muted-foreground">{student.phone || "Sin telefono"}</p>
          </div>
        ))}
      </div>

      {selectedClassId && students.length === 0 ? <p className="text-sm text-muted-foreground">No hay alumnos confirmados en esta clase.</p> : null}
      {!selectedClassId && classes.length === 0 ? <p className="text-sm text-muted-foreground">No hay clases asignadas al profesor.</p> : null}
    </div>
  );
}
