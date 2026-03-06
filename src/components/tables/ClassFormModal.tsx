import { useState, useEffect } from "react";
import { ClassRecord, TEACHERS, DISCIPLINES, CATEGORIES, ROOMS } from "@/lib/data/mockClassRecords";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ClassFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classData?: ClassRecord | null;
  onSave: (data: Omit<ClassRecord, "id" | "enrolled">) => void;
}

const EMPTY: Omit<ClassRecord, "id" | "enrolled"> = {
  name: "",
  teacher: "",
  discipline: "",
  category: "",
  price: 0,
  capacity: 15,
  room: "Sala A",
  status: "draft",
};

export function ClassFormModal({ open, onOpenChange, classData, onSave }: ClassFormModalProps) {
  const isEdit = !!classData;
  const [form, setForm] = useState<Omit<ClassRecord, "id" | "enrolled">>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (classData) {
      const { id, enrolled, ...rest } = classData;
      setForm(rest);
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
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(form);
      onOpenChange(false);
    }
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
              <Label className="text-sm">Profesor *</Label>
              <Select value={form.teacher} onValueChange={(v) => set("teacher", v)}>
                <SelectTrigger className={errors.teacher ? "border-destructive" : ""}><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {TEACHERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Sala</Label>
              <Select value={form.room} onValueChange={(v) => set("room", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROOMS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Disciplina *</Label>
              <Select value={form.discipline} onValueChange={(v) => set("discipline", v)}>
                <SelectTrigger className={errors.discipline ? "border-destructive" : ""}><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {DISCIPLINES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Categoría *</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger className={errors.category ? "border-destructive" : ""}><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Precio ($) *</Label>
              <Input type="number" value={form.price} onChange={(e) => set("price", Number(e.target.value))} className={errors.price ? "border-destructive" : ""} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Capacidad *</Label>
              <Input type="number" value={form.capacity} onChange={(e) => set("capacity", Number(e.target.value))} className={errors.capacity ? "border-destructive" : ""} />
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
