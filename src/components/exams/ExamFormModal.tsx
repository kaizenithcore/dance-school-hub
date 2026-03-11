import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExamRecord, GradingCategory, ExamStatus } from "@/lib/data/mockExams";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ExamFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam?: ExamRecord | null;
  onSave: (data: Omit<ExamRecord, "id" | "candidateCount">) => void;
}

const EMPTY_CATEGORY: () => GradingCategory = () => ({
  id: crypto.randomUUID(),
  name: "",
  weight: 0,
});

export function ExamFormModal({ open, onOpenChange, exam, onSave }: ExamFormModalProps) {
  const [name, setName] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [level, setLevel] = useState("");
  const [category, setCategory] = useState("");
  const [examDate, setExamDate] = useState("");
  const [regOpenDate, setRegOpenDate] = useState("");
  const [regCloseDate, setRegCloseDate] = useState("");
  const [maxCandidates, setMaxCandidates] = useState("");
  const [status, setStatus] = useState<ExamStatus>("draft");
  const [gradingCategories, setGradingCategories] = useState<GradingCategory[]>([EMPTY_CATEGORY()]);

  useEffect(() => {
    if (exam) {
      setName(exam.name);
      setDiscipline(exam.discipline);
      setLevel(exam.level);
      setCategory(exam.category || "");
      setExamDate(exam.examDate);
      setRegOpenDate(exam.registrationOpenDate);
      setRegCloseDate(exam.registrationCloseDate);
      setMaxCandidates(exam.maxCandidates?.toString() || "");
      setStatus(exam.status);
      setGradingCategories(exam.gradingCategories.length ? exam.gradingCategories : [EMPTY_CATEGORY()]);
    } else {
      setName("");
      setDiscipline("");
      setLevel("");
      setCategory("");
      setExamDate("");
      setRegOpenDate("");
      setRegCloseDate("");
      setMaxCandidates("");
      setStatus("draft");
      setGradingCategories([EMPTY_CATEGORY()]);
    }
  }, [exam, open]);

  const totalWeight = gradingCategories.reduce((s, c) => s + c.weight, 0);

  const handleSubmit = () => {
    if (!name || !discipline || !level || !examDate || !regOpenDate || !regCloseDate) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }
    if (totalWeight !== 100) {
      toast.error("Los pesos de las categorías deben sumar 100%");
      return;
    }
    const validCategories = gradingCategories.filter((c) => c.name.trim());
    if (validCategories.length === 0) {
      toast.error("Añade al menos una categoría de evaluación");
      return;
    }

    onSave({
      name,
      discipline,
      level,
      category: category || undefined,
      examDate,
      registrationOpenDate: regOpenDate,
      registrationCloseDate: regCloseDate,
      maxCandidates: maxCandidates ? parseInt(maxCandidates) : undefined,
      status,
      gradingCategories: validCategories,
    });
    onOpenChange(false);
  };

  const updateCategory = (index: number, field: keyof GradingCategory, value: string | number) => {
    setGradingCategories((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{exam ? "Editar examen" : "Crear examen"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Nombre del examen *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Examen Ballet Nivel 1" />
            </div>
            <div>
              <Label>Disciplina *</Label>
              <Input value={discipline} onChange={(e) => setDiscipline(e.target.value)} placeholder="Ballet" />
            </div>
            <div>
              <Label>Nivel *</Label>
              <Input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="Nivel 1" />
            </div>
            <div>
              <Label>Categoría</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Clásico" />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ExamStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="registration_open">Registro abierto</SelectItem>
                  <SelectItem value="closed">Cerrado</SelectItem>
                  <SelectItem value="grading">Evaluando</SelectItem>
                  <SelectItem value="finished">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Fecha del examen *</Label>
              <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            </div>
            <div>
              <Label>Apertura registro *</Label>
              <Input type="date" value={regOpenDate} onChange={(e) => setRegOpenDate(e.target.value)} />
            </div>
            <div>
              <Label>Cierre registro *</Label>
              <Input type="date" value={regCloseDate} onChange={(e) => setRegCloseDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Máx. candidatos (opcional)</Label>
            <Input
              type="number"
              value={maxCandidates}
              onChange={(e) => setMaxCandidates(e.target.value)}
              placeholder="Sin límite"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Categorías de evaluación</Label>
              <span className={`text-xs font-medium ${totalWeight === 100 ? "text-success" : "text-destructive"}`}>
                Total: {totalWeight}%
              </span>
            </div>

            {gradingCategories.map((cat, i) => (
              <div key={cat.id} className="flex items-center gap-2">
                <Input
                  value={cat.name}
                  onChange={(e) => updateCategory(i, "name", e.target.value)}
                  placeholder="Nombre categoría"
                  className="flex-1"
                />
                <div className="flex items-center gap-1 w-24">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={cat.weight}
                    onChange={(e) => updateCategory(i, "weight", parseInt(e.target.value) || 0)}
                    className="w-16"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setGradingCategories((prev) => prev.filter((_, j) => j !== i))}
                  disabled={gradingCategories.length <= 1}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setGradingCategories((prev) => [...prev, EMPTY_CATEGORY()])}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Añadir categoría
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>{exam ? "Guardar" : "Crear examen"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
