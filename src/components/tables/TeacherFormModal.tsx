import { useCallback, useState, useEffect, useRef } from "react";
import { TeacherRecord } from "@/lib/data/mockTeachers";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Book } from "lucide-react";

interface TeacherFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: TeacherRecord | null;
  onSave: (data: Omit<TeacherRecord, "id">) => Promise<boolean>;
  onManageClasses?: (teacher: TeacherRecord) => void;
}

export function TeacherFormModal({ open, onOpenChange, teacher, onSave, onManageClasses }: TeacherFormModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const submittingRef = useRef(false);
  const [errors, setErrors] = useState<{ name?: string; salary?: string }>({});
  const [formData, setFormData] = useState<Omit<TeacherRecord, "id">>({
    name: "",
    email: "",
    phone: "",
    bio: "",
    specialties: [],
    assignedClasses: [],
    status: "active",
    hireDate: new Date().toISOString().split("T")[0],
    salary: 2000,
  });

  useEffect(() => {
    if (teacher) {
      setFormData({
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        bio: teacher.bio,
        specialties: teacher.specialties,
        assignedClasses: teacher.assignedClasses,
        status: teacher.status,
        hireDate: teacher.hireDate,
        salary: teacher.salary,
        notes: teacher.notes,
      });
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        bio: "",
        specialties: [],
        assignedClasses: [],
        status: "active",
        hireDate: new Date().toISOString().split("T")[0],
        salary: 2000,
      });
    }
  }, [teacher, open]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const newErrors: { name?: string; salary?: string } = {};
      if (!formData.name.trim()) newErrors.name = "El nombre es obligatorio";
      if (!formData.salary || formData.salary < 0) newErrors.salary = "Introduce un salario válido";
      if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
      setErrors({});
      if (submittingRef.current) return;
      submittingRef.current = true;
      setIsLoading(true);
      try {
        const ok = await onSave(formData);
        if (ok) {
          onOpenChange(false);
        }
      } finally {
        submittingRef.current = false;
        setIsLoading(false);
      }
    },
    [formData, onSave, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{teacher ? "Editar Profesor" : "Nuevo Profesor"}</DialogTitle>
          <DialogDescription>
            {teacher
              ? "Actualiza la información del profesor"
              : "Crea un nuevo profesor en la escuela"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-xs font-semibold">
                Nombre *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => { setFormData({ ...formData, name: e.target.value }); if (errors.name) setErrors((p) => ({ ...p, name: undefined })); }}
                placeholder="Nombre completo"
                disabled={isLoading}
                className={`mt-1${errors.name ? " border-destructive" : ""}`}
              />
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="email" className="text-xs font-semibold">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="correo@ejemplo.com"
                disabled={isLoading}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-xs font-semibold">
                Teléfono
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+34 612 34 56 78"
                disabled={isLoading}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="salary" className="text-xs font-semibold">
                Salario Mensual (€) *
              </Label>
              <Input
                id="salary"
                type="number"
                value={formData.salary}
                onChange={(e) => { setFormData({ ...formData, salary: parseInt(e.target.value) || 0 }); if (errors.salary) setErrors((p) => ({ ...p, salary: undefined })); }}
                placeholder="2000"
                disabled={isLoading}
                className={`mt-1${errors.salary ? " border-destructive" : ""}`}
              />
              {errors.salary && <p className="mt-1 text-xs text-destructive">{errors.salary}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="hireDate" className="text-xs font-semibold">
              Fecha de Contratación
            </Label>
            <Input
              id="hireDate"
              type="date"
              value={formData.hireDate}
              onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
              disabled={isLoading}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="status" className="text-xs font-semibold">
              Estado
            </Label>
            <Select
              value={formData.status}
              onValueChange={(v) => setFormData({ ...formData, status: v as "active" | "inactive" })}
              disabled={isLoading}
            >
              <SelectTrigger id="status" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="bio" className="text-xs font-semibold">
              Biografía
            </Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Información sobre el profesor, experiencia, especialidades..."
              disabled={isLoading}
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="notes" className="text-xs font-semibold">
              Notas Adicionales
            </Label>
            <Textarea
              id="notes"
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas o información adicional..."
              disabled={isLoading}
              className="mt-1"
              rows={2}
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
            {teacher && onManageClasses && (
              <Button
                type="button"
                variant="outline"
                className="sm:mr-auto"
                onClick={() => { onOpenChange(false); onManageClasses(teacher); }}
                disabled={isLoading}
              >
                <Book className="h-3.5 w-3.5 mr-1.5" />
                Gestionar clases
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {teacher ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
