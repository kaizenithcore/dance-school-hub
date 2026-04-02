import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  createStudentField,
  deleteStudentField,
  type SaveStudentFieldRequest,
  type SchoolStudentField,
  updateStudentField,
} from "@/lib/api/studentFields";
import { toast } from "sonner";

interface StudentCustomFieldsManagerProps {
  fields: SchoolStudentField[];
  onReload: () => Promise<void>;
}

const EMPTY_FORM: SaveStudentFieldRequest = {
  key: "",
  label: "",
  type: "text",
  required: false,
  visible: true,
  visibleInTable: false,
};

function toSnakeCase(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

export function StudentCustomFieldsManager({ fields, onReload }: StudentCustomFieldsManagerProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolStudentField | null>(null);
  const [form, setForm] = useState<SaveStudentFieldRequest>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const sortedFields = useMemo(() => {
    return [...fields].sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [fields]);

  const handleCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const handleEdit = (field: SchoolStudentField) => {
    setEditing(field);
    setForm({
      key: field.key,
      label: field.label,
      type: field.type,
      required: field.required,
      visible: field.visible,
      visibleInTable: field.visibleInTable,
    });
    setOpen(true);
  };

  const handleDelete = async (field: SchoolStudentField) => {
    const confirmed = window.confirm(`Eliminar el campo "${field.label}"?`);
    if (!confirmed) {
      return;
    }

    try {
      const ok = await deleteStudentField(field.id);
      if (!ok) {
        toast.error("No se pudo eliminar el campo");
        return;
      }
      toast.success("Campo eliminado");
      await onReload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al eliminar campo";
      toast.error(message);
    }
  };

  const handleSave = async () => {
    if (!form.label.trim()) {
      toast.error("El label es obligatorio");
      return;
    }

    const key = toSnakeCase(form.key || form.label);
    if (!/^[a-z][a-z0-9_]*$/.test(key)) {
      toast.error("La clave debe estar en snake_case y comenzar por letra");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateStudentField(editing.id, { ...form, key });
        toast.success("Campo actualizado");
      } else {
        await createStudentField({ ...form, key });
        toast.success("Campo creado");
      }
      setOpen(false);
      await onReload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al guardar campo";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Campos personalizados de alumno</h3>
          <p className="text-xs text-muted-foreground">
            Define campos flexibles como DNI, ciudad o nacionalidad sin tocar el esquema core.
          </p>
        </div>
        <Button size="sm" onClick={handleCreate}>
          <Plus className="mr-1 h-4 w-4" /> Nuevo campo
        </Button>
      </div>

      {sortedFields.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aun no hay campos personalizados configurados.</p>
      ) : (
        <div className="space-y-2">
          {sortedFields.map((field) => (
            <div key={field.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">
                  {field.label} <span className="text-xs text-muted-foreground">({field.key})</span>
                </p>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">{field.type}</Badge>
                  {field.required ? <Badge variant="outline" className="text-[10px]">Requerido</Badge> : null}
                  {field.visibleInTable ? <Badge variant="outline" className="text-[10px]">Visible en tabla</Badge> : null}
                  {!field.visible ? <Badge variant="outline" className="text-[10px]">Oculto</Badge> : null}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => handleEdit(field)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => void handleDelete(field)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar campo" : "Nuevo campo"}</DialogTitle>
            <DialogDescription>
              {editing ? "Ajusta la configuracion del campo personalizado." : "Define un campo nuevo para la ficha de alumnos."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-1">
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input
                value={form.label}
                onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
                placeholder="Ej: DNI"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Clave (snake_case)</Label>
              <Input
                value={form.key}
                onChange={(event) => setForm((prev) => ({ ...prev, key: event.target.value }))}
                placeholder="Ej: dni"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(value: SaveStudentFieldRequest["type"]) =>
                  setForm((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="number">Numero</SelectItem>
                  <SelectItem value="date">Fecha</SelectItem>
                  <SelectItem value="select">Select</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={Boolean(form.required)}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, required: Boolean(checked) }))}
                id="field-required"
              />
              <Label htmlFor="field-required">Requerido</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={Boolean(form.visible)}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, visible: Boolean(checked) }))}
                id="field-visible"
              />
              <Label htmlFor="field-visible">Visible en ficha</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={Boolean(form.visibleInTable)}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, visibleInTable: Boolean(checked) }))}
                id="field-visible-table"
              />
              <Label htmlFor="field-visible-table">Visible en tabla</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear campo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
