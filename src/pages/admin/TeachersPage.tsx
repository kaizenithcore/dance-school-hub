import { useState, useCallback, useEffect } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { TeachersTable } from "@/components/tables/TeachersTable";
import { TeacherProfileDrawer } from "@/components/tables/TeacherProfileDrawer";
import { TeacherFormModal } from "@/components/tables/TeacherFormModal";
import { DeleteTeacherModal } from "@/components/tables/DeleteTeacherModal";
import { AssignClassesModal } from "@/components/tables/AssignClassesModal";
import { Class, TeacherRecord } from "@/lib/data/mockTeachers";
import { createTeacher, deleteTeacher, getTeachers, updateTeacher } from "@/lib/api/teachers";
import { getClasses, updateClass } from "@/lib/api/classes";
import { getRooms } from "@/lib/api/rooms";
import { getSchedules } from "@/lib/api/schedules";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

const WEEKDAY_LABEL: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};

function toHourMinute(value: string): string {
  const [hh = "00", mm = "00"] = value.split(":");
  return `${hh}:${mm}`;
}

function formatScheduleSummary(schedules: Array<{ weekday: number; start_time: string; end_time: string }>) {
  if (schedules.length === 0) {
    return { day: "-", time: "-" };
  }

  const sorted = [...schedules].sort((a, b) => {
    if (a.weekday !== b.weekday) {
      return a.weekday - b.weekday;
    }

    return a.start_time.localeCompare(b.start_time);
  });

  const daySummary = sorted
    .map((slot) => WEEKDAY_LABEL[slot.weekday] || `Día ${slot.weekday}`)
    .join(", ");

  const timeSummary = sorted
    .map((slot) => `${toHourMinute(slot.start_time)}-${toHourMinute(slot.end_time)}`)
    .join(", ");

  return {
    day: daySummary,
    time: timeSummary,
  };
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [classesCatalog, setClassesCatalog] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [classesOpen, setClassesOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherRecord | null>(null);
  const [deletingTeacher, setDeletingTeacher] = useState<TeacherRecord | null>(null);
  const [teacherWithClassesToEdit, setTeacherWithClassesToEdit] = useState<TeacherRecord | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTeachers = teachers.filter((teacher) => teacher.status === "active").length;
  const totalAssignedClasses = teachers.reduce((sum, teacher) => sum + (teacher.assignedClasses?.length || 0), 0);

  const mapTeachersWithAssignedClasses = useCallback(
    (
      teachersData: Awaited<ReturnType<typeof getTeachers>>,
      classesData: Awaited<ReturnType<typeof getClasses>>,
      roomNameById: Map<string, string>,
      schedulesByClassId: Map<string, Array<{ weekday: number; start_time: string; end_time: string }>>
    ): TeacherRecord[] => {
      return (teachersData || []).map((teacher) => {
        const assignedClasses: Class[] = classesData
          .filter((klass) => (klass.teacherIds || []).includes(teacher.id) || klass.teacherId === teacher.id)
          .map((klass) => {
            const scheduleSummary = formatScheduleSummary(schedulesByClassId.get(klass.id) || []);

            return {
              id: klass.id,
              name: klass.name,
              discipline: klass.discipline || "Sin disciplina",
              level: klass.category || "General",
              day: scheduleSummary.day,
              time: scheduleSummary.time,
              room: klass.roomId ? roomNameById.get(klass.roomId) || "Aula asignada" : "Sin aula",
              students: 0,
            };
          });

        return {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email || "",
          phone: teacher.phone || "",
          bio: teacher.bio || "",
          specialties: [],
          assignedClasses,
          status: teacher.status,
          hireDate: new Date(teacher.created_at || Date.now()).toISOString().split("T")[0],
          salay: Number((teacher as { salay?: number; aulary?: number }).salay ?? (teacher as { salay?: number; aulary?: number }).aulary ?? 0) || 0,
        };
      });
    },
    []
  );

  const mapClassCatalog = useCallback(
    (
      classesData: Awaited<ReturnType<typeof getClasses>>,
      roomNameById: Map<string, string>,
      schedulesByClassId: Map<string, Array<{ weekday: number; start_time: string; end_time: string }>>
    ): Class[] => {
      return classesData.map((klass) => {
        const scheduleSummary = formatScheduleSummary(schedulesByClassId.get(klass.id) || []);
        return {
          id: klass.id,
          name: klass.name,
          discipline: klass.discipline || "Sin disciplina",
          level: klass.category || "General",
          day: scheduleSummary.day,
          time: scheduleSummary.time,
          room: klass.roomId ? roomNameById.get(klass.roomId) || "Aula asignada" : "Sin aula",
          students: klass.enrolledCount || 0,
        };
      });
    },
    []
  );

  const loadTeachersPageData = useCallback(async () => {
    setLoading(true);
    try {
      const [teachersData, classesData, roomsData, schedulesData] = await Promise.all([
        getTeachers(),
        getClasses(),
        getRooms(),
        getSchedules(),
      ]);

      const roomNameById = new Map(roomsData.map((room) => [room.id, room.name]));
      const schedulesByClassId = new Map<string, Array<{ weekday: number; start_time: string; end_time: string }>>();
      (schedulesData || []).forEach((schedule) => {
        const slots = schedulesByClassId.get(schedule.class_id) || [];
        slots.push({
          weekday: schedule.weekday,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
        });
        schedulesByClassId.set(schedule.class_id, slots);
      });

      const mappedTeachers = mapTeachersWithAssignedClasses(teachersData, classesData, roomNameById, schedulesByClassId);
      setTeachers(mappedTeachers);
      setClassesCatalog(mapClassCatalog(classesData, roomNameById, schedulesByClassId));
    } catch (error) {
      console.error("Error loading teachers:", error);
      toast.error("Error al cargar profesores");
      setTeachers([]);
      setClassesCatalog([]);
    } finally {
      setLoading(false);
    }
  }, [mapClassCatalog, mapTeachersWithAssignedClasses]);

  // Load teachers from API
  useEffect(() => {
    void loadTeachersPageData();
  }, [loadTeachersPageData]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const targetId = searchParams.get("id");
    const action = searchParams.get("action");

    if (!targetId || !action) {
      return;
    }

    const targetTeacher = teachers.find((teacher) => teacher.id === targetId);
    if (!targetTeacher) {
      return;
    }

    if (action === "preview") {
      handleViewProfile(targetTeacher);
    } else if (action === "edit") {
      handleEdit(targetTeacher);
    } else if (action === "delete") {
      handleDelete(targetTeacher);
    }

    setSearchParams({}, { replace: true });
  }, [loading, teachers, searchParams, setSearchParams]);

  const handleViewProfile = (teacher: TeacherRecord) => {
    setSelectedTeacher(teacher);
    setDrawerOpen(true);
  };

  const handleCreate = () => {
    setEditingTeacher(null);
    setFormOpen(true);
  };

  const handleEdit = (teacher: TeacherRecord) => {
    setEditingTeacher(teacher);
    setFormOpen(true);
  };

  const handleEditClasses = (teacher: TeacherRecord) => {
    setTeacherWithClassesToEdit(teacher);
    setClassesOpen(true);
  };

  const handleDelete = (teacher: TeacherRecord) => {
    setDeletingTeacher(teacher);
    setDeleteOpen(true);
  };

  const handleSave = useCallback(async (data: Omit<TeacherRecord, "id">): Promise<boolean> => {
    try {
      if (editingTeacher) {
        const result = await updateTeacher(editingTeacher.id, {
          name: data.name,
          email: data.email?.trim() ? data.email.trim() : undefined,
          phone: data.phone?.trim() ? data.phone.trim() : undefined,
          bio: data.bio?.trim() ? data.bio.trim() : undefined,
          status: data.status,
          salay: data.salay,
        });
        if (result) {
          setTeachers((prev) =>
            prev.map((t) => (t.id === editingTeacher.id ? { ...t, ...data } : t))
          );
          toast.success("Profesor actualizado exitosamente");
          return true;
        }
        toast.error("No se pudo actualizar el profesor");
        return false;
      } else {
        const result = await createTeacher({
          name: data.name,
          email: data.email?.trim() ? data.email.trim() : undefined,
          phone: data.phone?.trim() ? data.phone.trim() : undefined,
          bio: data.bio?.trim() ? data.bio.trim() : undefined,
          status: data.status,
          salay: data.salay,
        });
        if (result) {
          const newTeacher: TeacherRecord = { 
            ...data, 
            id: result.id,
            specialties: [],
            assignedClasses: [],
            hireDate: data.hireDate || new Date().toISOString().split("T")[0],
            salay: data.salay || 0,
          };
          setTeachers((prev) => [newTeacher, ...prev]);
          toast.success("Profesor creado exitosamente");
          return true;
        }
        toast.error("No se pudo crear el profesor");
        return false;
      }
    } catch (error) {
      toast.error("Error al guardar el profesor");
      console.error(error);
      return false;
    }
  }, [editingTeacher]);

  const handleConfirmDelete = useCallback(async () => {
    if (deletingTeacher) {
      try {
        const success = await deleteTeacher(deletingTeacher.id);
        if (success) {
          setTeachers((prev) => prev.filter((t) => t.id !== deletingTeacher.id));
          toast.success("Profesor eliminado");
        }
      } catch (error) {
        toast.error("Error al eliminar el profesor");
        console.error(error);
      }
    }
  }, [deletingTeacher]);

  const handleSaveClasses = useCallback(async (selectedClassIds: string[]): Promise<boolean> => {
    if (!teacherWithClassesToEdit) {
      return false;
    }

    try {
      const teacherId = teacherWithClassesToEdit.id;
      const classesData = await getClasses();
      const classById = new Map(classesData.map((klass) => [klass.id, klass]));

      const currentlyAssignedClassIds = classesData
        .filter((klass) => (klass.teacherIds || []).includes(teacherId) || klass.teacherId === teacherId)
        .map((klass) => klass.id);

      const selectedSet = new Set(selectedClassIds);
      const currentSet = new Set(currentlyAssignedClassIds);
      const changedClassIds = new Set<string>([...selectedSet, ...currentSet]);

      for (const classId of changedClassIds) {
        const klass = classById.get(classId);
        if (!klass) {
          continue;
        }

        const nextTeacherIds = Array.from(
          new Set([...(klass.teacherIds || []), ...(klass.teacherId ? [klass.teacherId] : [])])
        );
        const shouldBeAssigned = selectedSet.has(classId);
        const alreadyAssigned = nextTeacherIds.includes(teacherId);

        if (shouldBeAssigned && !alreadyAssigned) {
          nextTeacherIds.push(teacherId);
        }

        if (!shouldBeAssigned && alreadyAssigned) {
          const filteredTeacherIds = nextTeacherIds.filter((id) => id !== teacherId);
          await updateClass(classId, { teacher_ids: filteredTeacherIds });
          continue;
        }

        if (shouldBeAssigned && !alreadyAssigned) {
          await updateClass(classId, { teacher_ids: nextTeacherIds });
        }
      }

      await loadTeachersPageData();
      toast.success("Clases asignadas exitosamente");
      return true;
    } catch (error) {
      console.error("Error saving assigned classes:", error);
      toast.error("No se pudieron guardar las clases asignadas");
      return false;
    }
  }, [loadTeachersPageData, teacherWithClassesToEdit]);

  return (
    <PageContainer
      title="Profesores"
      description="Equipo docente ordenado, disponible y bien asignado"
      actions={
        <Button size="sm" onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-1" /> Añadir profesor
        </Button>
      }
    >
      <section className="rounded-lg border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">El sistema que tu academia se merece</p>
        <p className="mt-1 text-xs text-muted-foreground">Coordina docentes y clases con una operativa simple y escalable.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-md border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Profesores activos</p>
            <p className="text-lg font-semibold text-foreground">{activeTeachers}</p>
          </div>
          <div className="rounded-md border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Clases asignadas</p>
            <p className="text-lg font-semibold text-foreground">{totalAssignedClasses}</p>
          </div>
          <div className="rounded-md border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Cobertura catálogo</p>
            <p className="text-lg font-semibold text-foreground">{classesCatalog.length}</p>
          </div>
        </div>
      </section>

      <TeachersTable
        teachers={teachers}
        isLoading={loading}
        onViewProfile={handleViewProfile}
        onEdit={handleEdit}
        onEditClasses={handleEditClasses}
        onDelete={handleDelete}
      />

      <TeacherProfileDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        teacher={selectedTeacher}
      />

      <TeacherFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        teacher={editingTeacher}
        onSave={handleSave}
      />

      <DeleteTeacherModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        teacher={deletingTeacher}
        onConfirm={handleConfirmDelete}
      />

      <AssignClassesModal
        open={classesOpen}
        onOpenChange={setClassesOpen}
        teacher={teacherWithClassesToEdit}
        classesCatalog={classesCatalog}
        onSave={handleSaveClasses}
      />
    </PageContainer>
  );
}
