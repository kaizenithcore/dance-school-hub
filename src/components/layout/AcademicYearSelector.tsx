import { useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAcademicYear } from "@/hooks/useAcademicYear";

export function AcademicYearSelector() {
  const navigate = useNavigate();
  const { academicYears, currentAcademicYear, loading, setCurrentAcademicYear, createNewAcademicYear } = useAcademicYear();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newYearCode, setNewYearCode] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");

  const today = useMemo(() => {
    return new Date().toISOString().slice(0, 10);
  }, []);

  const selectedAcademicYear =
    currentAcademicYear
    || academicYears.find((year) => year.isActive)
    || academicYears[0]
    || null;

  const initializeCreateForm = () => {
    const sourceYear = selectedAcademicYear || academicYears[0] || null;
    if (!sourceYear) {
      setNewYearCode("");
      setNewDisplayName("");
      setNewStartDate("");
      setNewEndDate("");
      return;
    }

    const start = new Date(sourceYear.startDate);
    const end = new Date(sourceYear.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setNewYearCode("");
      setNewDisplayName("");
      setNewStartDate("");
      setNewEndDate("");
      return;
    }

    const nextStart = new Date(start);
    nextStart.setFullYear(start.getFullYear() + 1);
    const nextEnd = new Date(end);
    nextEnd.setFullYear(end.getFullYear() + 1);

    setNewStartDate(nextStart.toISOString().slice(0, 10));
    setNewEndDate(nextEnd.toISOString().slice(0, 10));

    const startYear = nextStart.getFullYear();
    const endYear = nextEnd.getFullYear();
    setNewYearCode(`${startYear}-${endYear}`);
    setNewDisplayName(`Curso ${startYear}/${endYear}`);
  };

  const handleChangeYear = async (yearId: string) => {
    await setCurrentAcademicYear(yearId);
  };

  const handleCreateYear = async () => {
    if (!newYearCode || !newDisplayName || !newStartDate || !newEndDate) {
      return;
    }

    setSaving(true);
    try {
      await createNewAcademicYear({
        yearCode: newYearCode,
        displayName: newDisplayName,
        startDate: newStartDate,
        endDate: newEndDate,
      });
      setCreateDialogOpen(false);
    } finally {
      setSaving(false);
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

  if (!selectedAcademicYear) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8"
        onClick={() => navigate("/admin/settings")}
      >
        Configurar curso
      </Button>
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

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (open) {
            initializeCreateForm();
          }
        }}
      >
        <DialogTrigger asChild>
          <Button type="button" size="sm" variant="outline" className="h-8 px-2.5">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nuevo curso
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear nuevo curso académico</DialogTitle>
            <DialogDescription>
              Puedes crear cursos futuros o pasados. Después podrás seleccionarlos desde el header.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="year-code">Código</Label>
              <Input id="year-code" value={newYearCode} onChange={(event) => setNewYearCode(event.target.value)} placeholder="2026-2027" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year-name">Nombre</Label>
              <Input id="year-name" value={newDisplayName} onChange={(event) => setNewDisplayName(event.target.value)} placeholder="Curso 2026/2027" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="year-start">Fecha inicio</Label>
                <Input id="year-start" type="date" value={newStartDate} onChange={(event) => setNewStartDate(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="year-end">Fecha fin</Label>
                <Input id="year-end" type="date" value={newEndDate} onChange={(event) => setNewEndDate(event.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setCreateDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button type="button" onClick={() => void handleCreateYear()} disabled={saving || !newYearCode || !newDisplayName || !newStartDate || !newEndDate}>
              {saving ? "Guardando..." : "Crear curso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
