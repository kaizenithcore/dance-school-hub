import { useState, useEffect } from "react";
import { StudentRecord } from "@/lib/data/mockStudents";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface StudentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: StudentRecord | null;
  onSave: (data: Omit<StudentRecord, "id">) => Promise<boolean>;
}

const EMPTY: Omit<StudentRecord, "id"> = {
  name: "", email: "", phone: "", birthdate: "",
  enrolledClasses: [], status: "active", joinDate: new Date().toISOString().slice(0, 10),
  paymentType: "monthly", notes: "",
};

export function StudentFormModal({ open, onOpenChange, student, onSave }: StudentFormModalProps) {
  const isEdit = !!student;
  const [form, setForm] = useState<Omit<StudentRecord, "id">>(EMPTY);
  const [hasGuardian, setHasGuardian] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (student) {
      const { id, ...rest } = student;
      setForm(rest);
      setHasGuardian(!!student.guardian);
    } else {
      setForm(EMPTY);
      setHasGuardian(false);
    }
    setErrors({});
  }, [student, open]);

  const set = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  const setGuardian = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      guardian: { ...(prev.guardian || { name: "", phone: "", email: "" }), [key]: value },
    }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Obligatorio";
    if (!form.email.trim()) e.email = "Obligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Email inválido";
    if (!form.phone.trim()) e.phone = "Obligatorio";
    if (!form.birthdate) e.birthdate = "Obligatorio";
    if (hasGuardian) {
      if (!form.guardian?.name?.trim()) e.guardian_name = "Obligatorio";
      if (!form.guardian?.phone?.trim()) e.guardian_phone = "Obligatorio";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const data = { ...form };
    if (!hasGuardian) delete data.guardian;
    setIsLoading(true);
    try {
      const ok = await onSave(data);
      if (ok) {
        onOpenChange(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Alumno" : "Nuevo Alumno"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-sm">Nombre completo *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Nombre completo" disabled={isLoading} className={errors.name ? "border-destructive" : ""} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@ejemplo.com" disabled={isLoading} className={errors.email ? "border-destructive" : ""} />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Teléfono *</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(011) 1234-5678" disabled={isLoading} className={errors.phone ? "border-destructive" : ""} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Fecha de nacimiento *</Label>
              <Input type="date" value={form.birthdate} onChange={(e) => set("birthdate", e.target.value)} disabled={isLoading} className={errors.birthdate ? "border-destructive" : ""} />
              {errors.birthdate && <p className="text-xs text-destructive">{errors.birthdate}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Tipo de pago</Label>
              <Select value={form.paymentType} onValueChange={(v) => set("paymentType", v)} disabled={isLoading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="per_class">Por clase</SelectItem>
                  <SelectItem value="none">Sin pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Estado</Label>
              <Select value={form.status} onValueChange={(v: any) => set("status", v)} disabled={isLoading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Fecha de ingreso</Label>
              <Input type="date" value={form.joinDate} onChange={(e) => set("joinDate", e.target.value)} disabled={isLoading} />
            </div>
          </div>

          {/* Guardian toggle */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="has-guardian"
              checked={hasGuardian}
              onChange={(e) => setHasGuardian(e.target.checked)}
              disabled={isLoading}
              className="rounded border-border"
            />
            <Label htmlFor="has-guardian" className="text-sm font-normal cursor-pointer">Tiene tutor / responsable</Label>
          </div>

          {hasGuardian && (
            <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Datos del Tutor</p>
              <div className="space-y-1.5">
                <Label className="text-sm">Nombre *</Label>
                <Input value={form.guardian?.name || ""} onChange={(e) => setGuardian("name", e.target.value)} disabled={isLoading} className={errors.guardian_name ? "border-destructive" : ""} />
                {errors.guardian_name && <p className="text-xs text-destructive">{errors.guardian_name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Teléfono *</Label>
                  <Input value={form.guardian?.phone || ""} onChange={(e) => setGuardian("phone", e.target.value)} disabled={isLoading} className={errors.guardian_phone ? "border-destructive" : ""} />
                  {errors.guardian_phone && <p className="text-xs text-destructive">{errors.guardian_phone}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Email</Label>
                  <Input type="email" value={form.guardian?.email || ""} onChange={(e) => setGuardian("email", e.target.value)} disabled={isLoading} />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm">Notas</Label>
            <Textarea value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} placeholder="Observaciones sobre el alumno..." rows={2} disabled={isLoading} className="resize-none" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isEdit ? "Guardar Cambios" : "Crear Alumno"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
