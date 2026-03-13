import { useState, useEffect } from "react";
import { ClassRecord } from "@/lib/data/mockClassRecords";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { getTeachers } from "@/lib/api/teachers";
import { getRooms } from "@/lib/api/rooms";
import { getDisciplines, createDiscipline } from "@/lib/api/disciplines";
import { getCategories, createCategory } from "@/lib/api/categories";
import { useNavigate } from "react-router-dom";

const NONE_OPTION = "__none__";
const ADD_TEACHER_OPTION = "__add_teacher__";
const ADD_ROOM_OPTION = "__add_room__";
const ADD_DISCIPLINE_OPTION = "__add_discipline__";
const ADD_CATEGORY_OPTION = "__add_category__";

interface ClassFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classData?: ClassRecord | null;
  onSave: (data: Omit<ClassRecord, "id" | "enrolled"> & { teacher_ids?: string[]; teacher_id?: string; room_id?: string; discipline_id?: string; category_id?: string }) => Promise<boolean>;
}

const EMPTY: Omit<ClassRecord, "id" | "enrolled"> = {
  name: "",
  teacher: "",
  discipline: "",
  category: "",
  price: 0,
  capacity: 15,
  weeklyFrequency: 1,
  room: "Aula A",
  status: "draft",
};

export function ClassFormModal({ open, onOpenChange, classData, onSave }: ClassFormModalProps) {
  const navigate = useNavigate();
  const isEdit = !!classData;
  const [form, setForm] = useState<Omit<ClassRecord, "id" | "enrolled">>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [teachers, setTeachers] = useState<Array<{ id: string; name: string }>>([]);
  const [rooms, setRooms] = useState<Array<{ id: string; name: string }>>([]);
  const [disciplines, setDisciplines] = useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [newDiscipline, setNewDiscipline] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [teacherIds, setTeacherIds] = useState<string[]>([]);
  const [disciplinePopoverOpen, setDisciplinePopoverOpen] = useState(false);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    try {
      const [teachersData, roomsData, disciplinesData, categoriesData] = await Promise.all([
        getTeachers(),
        getRooms(),
        getDisciplines(),
        getCategories(),
      ]);
      setTeachers(teachersData.map((t) => ({ id: t.id, name: t.name })));
      setRooms(roomsData.map((r) => ({ id: r.id, name: r.name })));
      setDisciplines(disciplinesData.map((d) => ({ id: d.id, name: d.name })));
      setCategories(categoriesData.map((c) => ({ id: c.id, name: c.name })));
    } catch (error) {
      console.error("Error loading form data:", error);
      toast.error("Error al cargar datos");
    }
  };

  useEffect(() => {
    if (classData) {
      const { id, enrolled, ...rest } = classData;
      const nextTeacherIds = Array.isArray(classData.teacherIds) && classData.teacherIds.length > 0
        ? classData.teacherIds
        : classData.teacherId
          ? [classData.teacherId]
          : [];

      setForm({
        ...rest,
        teacher: nextTeacherIds[0] || classData.teacherId || classData.teacher,
        discipline: classData.disciplineId || "",
        category: classData.categoryId || "",
        room: classData.roomId || classData.room,
      });
      setTeacherIds(nextTeacherIds);
    } else {
      setForm(EMPTY);
      setTeacherIds([]);
    }
    setErrors({});
  }, [classData, open]);

  const set = <K extends keyof Omit<ClassRecord, "id" | "enrolled">>(
    key: K,
    value: Omit<ClassRecord, "id" | "enrolled">[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Obligatorio";
    if (form.price <= 0) e.price = "Debe ser mayor a 0";
    if (form.capacity <= 0) e.capacity = "Debe ser mayor a 0";
    if ((form.weeklyFrequency || 0) <= 0) e.weeklyFrequency = "Debe ser mayor a 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddDiscipline = async () => {
    if (!newDiscipline.trim()) return;
    try {
      setLoading(true);
      const result = await createDiscipline({ name: newDiscipline.trim() });
      if (result) {
        setDisciplines((prev) => [...prev, { id: result.id, name: result.name }]);
        set("discipline", result.id);
        setNewDiscipline("");
        setDisciplinePopoverOpen(false);
        toast.success("Disciplina creada");
      }
    } catch (error) {
      toast.error("Error al crear disciplina");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      setLoading(true);
      const result = await createCategory({ name: newCategory.trim() });
      if (result) {
        setCategories((prev) => [...prev, { id: result.id, name: result.name }]);
        set("category", result.id);
        setNewCategory("");
        setCategoryPopoverOpen(false);
        toast.success("Categoría creada");
      }
    } catch (error) {
      toast.error("Error al crear categoría");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (validate()) {
      const normalizedTeacherIds = Array.from(new Set(teacherIds.filter((teacherId) => teacherId && teacherId.trim().length > 0)));
      const normalizedDisciplineId = form.discipline?.trim() ? form.discipline : undefined;
      const normalizedCategoryId = form.category?.trim() ? form.category : undefined;
      const normalizedRoomId = form.room?.trim() ? form.room : undefined;
      // Map IDs to names for display, and include IDs for API
      const dataToSave = {
        ...form,
        discipline: selectedDisciplineName === "Seleccionar" ? "General" : selectedDisciplineName,
        category: selectedCategoryName === "Seleccionar" ? "General" : selectedCategoryName,
        teacher: normalizedTeacherIds
          .map((teacherId) => teachers.find((teacher) => teacher.id === teacherId)?.name)
          .filter((name): name is string => Boolean(name && name.trim().length > 0))
          .join(", "),
        room: selectedRoomName === "Seleccionar" ? "Sin aula" : selectedRoomName,
        room_id: normalizedRoomId,
        discipline_id: normalizedDisciplineId,
        category_id: normalizedCategoryId,
        teacher_id: normalizedTeacherIds[0],
        teacher_ids: normalizedTeacherIds,
        teacherIds: normalizedTeacherIds,
        weeklyFrequency: form.weeklyFrequency || 1,
      };
      const ok = await onSave(dataToSave);
      if (ok) {
        onOpenChange(false);
      }
    }
  };

  const selectedRoomName = rooms.find((r) => r.id === form.room)?.name || form.room || "Seleccionar";
  const selectedDisciplineName = disciplines.find((d) => d.id === form.discipline)?.name || "Seleccionar";
  const selectedCategoryName = categories.find((c) => c.id === form.category)?.name || "Seleccionar";

  const handleTeacherChange = (index: number, teacherId: string) => {
    if (teacherId === ADD_TEACHER_OPTION) {
      onOpenChange(false);
      navigate("/admin/teachers");
      toast.info("Crea primero un profesor para poder asignarlo a la clase");
      return;
    }

    setTeacherIds((prev) => {
      const next = [...prev];
      next[index] = teacherId;
      return next;
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next.teacher;
      return next;
    });
  };

  const addTeacherSelector = () => {
    setTeacherIds((prev) => [...prev, ""]);
  };

  const removeTeacherSelector = (index: number) => {
    setTeacherIds((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleRoomChange = (value: string) => {
    if (value === ADD_ROOM_OPTION) {
      onOpenChange(false);
      navigate("/admin/rooms");
      toast.info("Crea primero un aula para poder asignarla a la clase");
      return;
    }

    set("room", value === NONE_OPTION ? "" : value);
  };

  const handleDisciplineChange = (value: string) => {
    if (value === ADD_DISCIPLINE_OPTION) {
      setDisciplinePopoverOpen(true);
      return;
    }

    set("discipline", value === NONE_OPTION ? "" : value);
  };

  const handleCategoryChange = (value: string) => {
    if (value === ADD_CATEGORY_OPTION) {
      setCategoryPopoverOpen(true);
      return;
    }

    set("category", value === NONE_OPTION ? "" : value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Clase" : "Nueva Clase"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-sm">Nombre de la clase *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ej: Ballet Principiantes" className={errors.name ? "border-destructive" : ""} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Profesores (opcional)</Label>
              <div className="space-y-2">
                {(teacherIds.length > 0 ? teacherIds : [""]).map((teacherId, index) => (
                  <div key={`teacher-selector-${index}`} className="flex items-center gap-2">
                    <Select
                      value={teacherId || NONE_OPTION}
                      onValueChange={(v) => handleTeacherChange(index, v === NONE_OPTION ? "" : v)}
                    >
                      <SelectTrigger className={`flex-1 ${errors.teacher ? "border-destructive" : ""}`}>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_OPTION}>Seleccionar</SelectItem>
                        {teachers.length === 0 ? <SelectItem value={ADD_TEACHER_OPTION}>Añadir profesor</SelectItem> : null}
                        {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {(teacherIds.length > 1 || teacherId) ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => removeTeacherSelector(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addTeacherSelector}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Añadir profesor
                </Button>
              </div>
              {errors.teacher && <p className="text-xs text-destructive">{errors.teacher}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Aula</Label>
              <Select
              
                value={form.room || NONE_OPTION}
                onValueChange={handleRoomChange}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_OPTION}>Seleccionar</SelectItem>
                  {rooms.length === 0 ? <SelectItem value={ADD_ROOM_OPTION}>Añadir aula</SelectItem> : null}
                  {rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Disciplina (opcional)</Label>
              <div className="flex gap-2">
                <Select
                  value={form.discipline || undefined}
                  onValueChange={handleDisciplineChange}
                >
                  <SelectTrigger className={`flex-1 ${errors.discipline ? "border-destructive" : ""}`}><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_OPTION}>Seleccionar</SelectItem>
                    {disciplines.length === 0 ? <SelectItem value={ADD_DISCIPLINE_OPTION}>Añadir disciplina</SelectItem> : null}
                    {disciplines.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Popover open={disciplinePopoverOpen} onOpenChange={setDisciplinePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9"><Plus className="h-3.5 w-3.5" /></Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48">
                    <div className="space-y-2">
                      <Label className="text-xs">Nueva disciplina</Label>
                      <Input value={newDiscipline} onChange={(e) => setNewDiscipline(e.target.value)} placeholder="Nombre" className="text-xs" />
                      <Button size="sm" onClick={handleAddDiscipline} disabled={loading} className="w-full">Crear</Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              {errors.discipline && <p className="text-xs text-destructive">{errors.discipline}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Categoría (opcional)</Label>
              <div className="flex gap-2">
                <Select
                  value={form.category || undefined}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger className={`flex-1 ${errors.category ? "border-destructive" : ""}`}><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_OPTION}>Seleccionar</SelectItem>
                    {categories.length === 0 ? <SelectItem value={ADD_CATEGORY_OPTION}>Añadir categoría</SelectItem> : null}
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9"><Plus className="h-3.5 w-3.5" /></Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48">
                    <div className="space-y-2">
                      <Label className="text-xs">Nueva categoría</Label>
                      <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Nombre" className="text-xs" />
                      <Button size="sm" onClick={handleAddCategory} disabled={loading} className="w-full">Crear</Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Precio (€) *</Label>
              <Input type="number" value={form.price} onChange={(e) => set("price", Number(e.target.value))} className={errors.price ? "border-destructive" : ""} />
              {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Capacidad *</Label>
              <Input type="number" value={form.capacity} onChange={(e) => set("capacity", Number(e.target.value))} className={errors.capacity ? "border-destructive" : ""} />
              {errors.capacity && <p className="text-xs text-destructive">{errors.capacity}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Frecuencia *</Label>
              <Input
                type="number"
                min={1}
                value={form.weeklyFrequency || 1}
                onChange={(e) => set("weeklyFrequency", Math.max(1, Number(e.target.value || 1)))}
                className={errors.weeklyFrequency ? "border-destructive" : ""}
              />
              {errors.weeklyFrequency && <p className="text-xs text-destructive">{errors.weeklyFrequency}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Estado</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as "active" | "inactive" | "draft")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="inactive">Inactiva</SelectItem>
                  <SelectItem value="draft">Borrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>{isEdit ? "Guardar Cambios" : "Crear Clase"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
