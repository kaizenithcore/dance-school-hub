import { useCallback, useState, useEffect } from "react";
import { TeacherRecord } from "@/lib/data/mockTeachers";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface TeacherFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: TeacherRecord | null;
  onSave: (data: Omit<TeacherRecord, "id">) => Promise<boolean>;
}

export function TeacherFormModal({ open, onOpenChange, teacher, onSave }: TeacherFormModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Omit<TeacherRecord, "id">>({
    name: "",
    email: "",
    phone: "",
    bio: "",
    specialties: [],
    assignedClasses: [],
    status: "active",
    hireDate: new Date().toISOString().split("T")[0],
    salay: 2000,
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
        salay: teacher.salay,
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
        salay: 2000,
      });
    }
  }, [teacher, open]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      try {
        const ok = await onSave(formData);
        if (ok) {
          onOpenChange(false);
        }
      } finally {
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
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre completo"
                required
                disabled={isLoading}
                className="mt-1"
              />
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
                placeholder="(011) 5555-1234"
                disabled={isLoading}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="salay" className="text-xs font-semibold">
                Salario Mensual (€) *
              </Label>
              <Input
                id="salay"
                type="number"
                value={formData.salay}
                onChange={(e) => setFormData({ ...formData, salay: parseInt(e.target.value) || 0 })}
                placeholder="2000"
                required
                disabled={isLoading}
                className="mt-1"
              />
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

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {teacher ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
