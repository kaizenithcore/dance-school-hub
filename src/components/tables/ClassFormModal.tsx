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

interface ClassFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classData?: ClassRecord | null;
  onSave: (data: Omit<ClassRecord, "id" | "enrolled">) => Promise<boolean>;
}

const EMPTY: Omit<ClassRecord, "id" | "enrolled"> = {
  name: "",
  teacher: "",
  discipline: "",
  category: "",
  price: 0,
  capacity: 15,
  weeklyFrequency: 1,
  room: "Sala A",
  status: "draft",
};

export function ClassFormModal({ open, onOpenChange, classData, onSave }: ClassFormModalProps) {
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
      setForm({
        ...rest,
        teacher: classData.teacherId || classData.teacher,
        discipline: classData.disciplineId || classData.discipline,
        category: classData.categoryId || classData.category,
        room: classData.roomId || classData.room,
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
  }, [classData, open]);

  const set = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Obligatorio";
    if (!form.teacher) e.teacher = "Obligatorio";
    if (!form.discipline) e.discipline = "Obligatorio";
    if (!form.category) e.category = "Obligatorio";
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
      // Map IDs to names for display, and include IDs for API
      const dataToSave = {
        ...form,
        discipline: selectedDisciplineName === "Seleccionar" ? form.discipline : selectedDisciplineName,
        category: selectedCategoryName === "Seleccionar" ? form.category : selectedCategoryName,
        teacher: selectedTeacherName === "Seleccionar" ? form.teacher : selectedTeacherName,
        room: selectedRoomName === "Seleccionar" ? form.room : selectedRoomName,
        discipline_id: form.discipline,
        category_id: form.category,
        teacher_id: form.teacher,
        weeklyFrequency: form.weeklyFrequency || 1,
      };
      const ok = await onSave(dataToSave as any);
      if (ok) {
        onOpenChange(false);
      }
    }
  };

  const selectedTeacherName = teachers.find((t) => t.id === form.teacher)?.name || "Seleccionar";
  const selectedRoomName = rooms.find((r) => r.id === form.room)?.name || form.room || "Seleccionar";
  const selectedDisciplineName = disciplines.find((d) => d.id === form.discipline)?.name || "Seleccionar";
  const selectedCategoryName = categories.find((c) => c.id === form.category)?.name || "Seleccionar";

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
              <Label className="text-sm">Profesor *</Label>
              <Select value={form.teacher} onValueChange={(v) => set("teacher", v)}>
                <SelectTrigger className={errors.teacher ? "border-destructive" : ""}><SelectValue placeholder={selectedTeacherName} /></SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.teacher && <p className="text-xs text-destructive">{errors.teacher}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Sala</Label>
              <Select value={form.room} onValueChange={(v) => set("room", v)}>
                <SelectTrigger><SelectValue placeholder={selectedRoomName} /></SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Disciplina *</Label>
              <div className="flex gap-2">
                <Select value={form.discipline} onValueChange={(v) => set("discipline", v)}>
                  <SelectTrigger className={`flex-1 ${errors.discipline ? "border-destructive" : ""}`}><SelectValue placeholder={selectedDisciplineName} /></SelectTrigger>
                  <SelectContent>
                    {disciplines.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Popover>
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
              <Label className="text-sm">Categoría *</Label>
              <div className="flex gap-2">
                <Select value={form.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger className={`flex-1 ${errors.category ? "border-destructive" : ""}`}><SelectValue placeholder={selectedCategoryName} /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Popover>
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
              <Label className="text-sm">Precio ($) *</Label>
              <Input type="number" value={form.price} onChange={(e) => set("price", Number(e.target.value))} className={errors.price ? "border-destructive" : ""} />
              {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Capacidad *</Label>
              <Input type="number" value={form.capacity} onChange={(e) => set("capacity", Number(e.target.value))} className={errors.capacity ? "border-destructive" : ""} />
              {errors.capacity && <p className="text-xs text-destructive">{errors.capacity}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Clases/semana *</Label>
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
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
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
