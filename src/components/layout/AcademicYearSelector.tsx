import { useMemo, useState } from "react";
import { Loader2, Plus, Settings2, Pencil, Trash2, ArrowLeft } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAcademicYearContext } from "@/contexts/AcademicYearContext";
import type { AcademicYear } from "@/lib/api/academicYears";
import { toast } from "sonner";

type ManageView = "list" | "form";

export function AcademicYearSelector() {
  const {
    academicYears,
    currentYear: currentAcademicYear,
    loading,
    switchYear,
    createYear,
    updateYear,
    deleteYear,
  } = useAcademicYearContext();

  const [manageOpen, setManageOpen] = useState(false);
  const [view, setView] = useState<ManageView>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AcademicYear | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formYearCode, setFormYearCode] = useState("");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const selectedAcademicYear =
    currentAcademicYear
    || academicYears.find((year) => year.isActive)
    || academicYears[0]
    || null;

  const resetForm = () => {
    setFormYearCode("");
    setFormDisplayName("");
    setFormStartDate("");
    setFormEndDate("");
    setEditingId(null);
  };

  const openCreateForm = () => {
    const sourceYear = selectedAcademicYear || academicYears[0] || null;
    if (!sourceYear) {
      resetForm();
      setEditingId(null);
      setView("form");
      return;
    }

    const start = new Date(sourceYear.startDate);
    const end = new Date(sourceYear.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      resetForm();
      setView("form");
      return;
    }

    const nextStart = new Date(start);
    nextStart.setFullYear(start.getFullYear() + 1);
    const nextEnd = new Date(end);
    nextEnd.setFullYear(end.getFullYear() + 1);

    setFormStartDate(nextStart.toISOString().slice(0, 10));
    setFormEndDate(nextEnd.toISOString().slice(0, 10));
    const startYear = nextStart.getFullYear();
    const endYear = nextEnd.getFullYear();
    setFormYearCode(`${startYear}-${endYear}`);
    setFormDisplayName(`Curso ${startYear}/${endYear}`);
    setEditingId(null);
    setView("form");
  };

  const openEditForm = (year: AcademicYear) => {
    setEditingId(year.id);
    setFormYearCode(year.yearCode);
    setFormDisplayName(year.displayName);
    setFormStartDate(year.startDate.slice(0, 10));
    setFormEndDate(year.endDate.slice(0, 10));
    setView("form");
  };

  const handleChangeYear = async (yearId: string) => {
    await switchYear(yearId);
  };

  const handleSaveForm = async () => {
    if (!formYearCode || !formDisplayName || !formStartDate || !formEndDate) return;

    setSaving(true);
    try {
      if (editingId) {
        await updateYear(editingId, {
          yearCode: formYearCode,
          displayName: formDisplayName,
          startDate: formStartDate,
          endDate: formEndDate,
        });
        toast.success("Curso académico actualizado");
      } else {
        await createYear({
          yearCode: formYearCode,
          displayName: formDisplayName,
          startDate: formStartDate,
          endDate: formEndDate,
        });
        toast.success("Curso académico creado");
      }
      resetForm();
      setView("list");
      if (academicYears.length === 0) setManageOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el curso académico");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteYear(deleteTarget.id);
      toast.success("Curso académico eliminado");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar el curso académico");
    } finally {
      setDeleting(false);
    }
  };

  const getYearStatus = (year: { isActive: boolean; archivedAt: string | null; endDate: string }) => {
    if (year.isActive) return "Actual";
    if (year.archivedAt) return "Archivado";
    if (year.endDate < today) return "Pasado";
    return "Próximo";
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-secondary/50">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Cargando...</span>
      </div>
    );
  }

  const manageDialog = (
    <Dialog
      open={manageOpen}
      onOpenChange={(open) => {
        setManageOpen(open);
        if (open) {
          setView(academicYears.length === 0 ? "form" : "list");
          if (academicYears.length === 0) openCreateForm();
        } else {
          resetForm();
          setView("list");
        }
      }}
    >
      <DialogContent>
        {view === "list" ? (
          <>
            <DialogHeader>
              <DialogTitle>Cursos académicos</DialogTitle>
              <DialogDescription>
                Cambia, crea, edita o elimina los cursos académicos de tu escuela.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {academicYears.map((year) => (
                <div
                  key={year.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{year.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {year.yearCode} · {getYearStatus(year)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label={`Editar ${year.displayName}`} onClick={() => openEditForm(year)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      aria-label={`Eliminar ${year.displayName}`}
                      disabled={year.isActive}
                      title={year.isActive ? "No puedes eliminar el curso activo" : "Eliminar"}
                      onClick={() => setDeleteTarget(year)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={openCreateForm}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Nuevo curso
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {academicYears.length > 0 && (
                  <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 -ml-1.5" aria-label="Volver al listado" onClick={() => { resetForm(); setView("list"); }}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                {editingId ? "Editar curso académico" : "Crear nuevo curso académico"}
              </DialogTitle>
              <DialogDescription>
                Puedes crear cursos futuros o pasados. Después podrás seleccionarlos desde el header.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="year-code">Código</Label>
                <Input id="year-code" value={formYearCode} onChange={(event) => setFormYearCode(event.target.value)} placeholder="2026-2027" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="year-name">Nombre</Label>
                <Input id="year-name" value={formDisplayName} onChange={(event) => setFormDisplayName(event.target.value)} placeholder="Curso 2026/2027" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="year-start">Fecha inicio</Label>
                  <Input id="year-start" type="date" value={formStartDate} onChange={(event) => setFormStartDate(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="year-end">Fecha fin</Label>
                  <Input id="year-end" type="date" value={formEndDate} onChange={(event) => setFormEndDate(event.target.value)} />
                </div>
              </div>
            </div>

            <DialogFooter>
              {academicYears.length > 0 && (
                <Button type="button" variant="ghost" onClick={() => { resetForm(); setView("list"); }} disabled={saving}>Cancelar</Button>
              )}
              <Button type="button" onClick={() => void handleSaveForm()} disabled={saving || !formYearCode || !formDisplayName || !formStartDate || !formEndDate}>
                {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear curso"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );

  const deleteConfirm = (
    <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar curso académico</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Seguro que quieres eliminar "{deleteTarget?.displayName}"? Esta acción no se puede deshacer.
            Si el curso tiene clases o inscripciones asociadas, no podrá eliminarse.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => void handleConfirmDelete()} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {deleting ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (!selectedAcademicYear) {
    return (
      <>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          onClick={() => setManageOpen(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Crear curso
        </Button>
        {manageDialog}
      </>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedAcademicYear.id} onValueChange={handleChangeYear} disabled={loading}>
        <SelectTrigger className="w-fit border-0 bg-secondary/50 hover:bg-secondary/70">
          <SelectValue placeholder="Selecciona año académico" />
        </SelectTrigger>
        <SelectContent>
          {academicYears.map((year) => (
            <SelectItem key={year.id} value={year.id}>
              <div className="flex w-full min-w-[220px] items-center justify-between gap-2">
                <span>{year.displayName} ({year.yearCode})</span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{getYearStatus(year)}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button type="button" size="sm" variant="outline" className="h-8 px-2.5" aria-label="Gestionar cursos académicos" onClick={() => setManageOpen(true)}>
        <Settings2 className="h-3.5 w-3.5 mr-1" />
        Gestionar
      </Button>

      {manageDialog}
      {deleteConfirm}
    </div>
  );
}
