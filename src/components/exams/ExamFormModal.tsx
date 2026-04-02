import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  initialValues?: Partial<Omit<ExamRecord, "id" | "candidateCount">>;
  onSave: (data: Omit<ExamRecord, "id" | "candidateCount">) => void;
}

const EMPTY_CATEGORY: () => GradingCategory = () => ({
  id: crypto.randomUUID(),
  name: "",
  weight: 0,
});

export function ExamFormModal({ open, onOpenChange, exam, initialValues, onSave }: ExamFormModalProps) {
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const fieldLabelMap: Record<string, string> = {
    name: "Nombre",
    discipline: "Disciplina",
    level: "Nivel",
    examDate: "Fecha del examen",
    regOpenDate: "Apertura registro",
    regCloseDate: "Cierre registro",
    maxCandidates: "Max. candidatos",
    gradingCategories: "Categorias de evaluacion",
    totalWeight: "Pesos de categorias",
  };

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
    } else if (initialValues) {
      setName(initialValues.name || "");
      setDiscipline(initialValues.discipline || "");
      setLevel(initialValues.level || "");
      setCategory(initialValues.category || "");
      setExamDate(initialValues.examDate || "");
      setRegOpenDate(initialValues.registrationOpenDate || "");
      setRegCloseDate(initialValues.registrationCloseDate || "");
      setMaxCandidates(
        typeof initialValues.maxCandidates === "number" ? initialValues.maxCandidates.toString() : ""
      );
      setStatus(initialValues.status || "draft");
      setGradingCategories(
        initialValues.gradingCategories && initialValues.gradingCategories.length > 0
          ? initialValues.gradingCategories
          : [
              { id: crypto.randomUUID(), name: "Técnica", weight: 40 },
              { id: crypto.randomUUID(), name: "Musicalidad", weight: 30 },
              { id: crypto.randomUUID(), name: "Expresión", weight: 30 },
            ]
      );
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

    setFieldErrors({});
  }, [exam, initialValues, open]);

  const totalWeight = gradingCategories.reduce((s, c) => s + c.weight, 0);
  const errorSummary = Array.from(
    new Set(
      Object.keys(fieldErrors)
        .map((key) => fieldLabelMap[key])
        .filter(Boolean)
    )
  );

  const handleSubmit = () => {
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) nextErrors.name = "El nombre del examen es obligatorio";
    if (!discipline.trim()) nextErrors.discipline = "La disciplina es obligatoria";
    if (!level.trim()) nextErrors.level = "El nivel es obligatorio";
    if (!examDate) nextErrors.examDate = "La fecha del examen es obligatoria";
    if (!regOpenDate) nextErrors.regOpenDate = "La apertura de registro es obligatoria";
    if (!regCloseDate) nextErrors.regCloseDate = "El cierre de registro es obligatorio";

    if (regOpenDate && regCloseDate && regOpenDate > regCloseDate) {
      nextErrors.regCloseDate = "El cierre debe ser posterior o igual a la apertura";
    }

    if (regCloseDate && examDate && regCloseDate > examDate) {
      nextErrors.regCloseDate = "El cierre de registro no puede ser posterior a la fecha del examen";
    }

    if (maxCandidates.trim()) {
      const parsed = Number(maxCandidates);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        nextErrors.maxCandidates = "El máximo de candidatos debe ser un número entero mayor a 0";
      }
    }

    const validCategories = gradingCategories.filter((c) => c.name.trim());
    if (validCategories.length === 0) {
      nextErrors.gradingCategories = "Añade al menos una categoría de evaluación";
    }

    const normalizedNames = new Set<string>();
    gradingCategories.forEach((cat) => {
      const normalizedName = cat.name.trim().toLowerCase();

      if (!cat.name.trim()) {
        nextErrors[`category-name-${cat.id}`] = "El nombre es obligatorio";
      }

      if (!Number.isFinite(cat.weight) || cat.weight <= 0 || cat.weight > 100) {
        nextErrors[`category-weight-${cat.id}`] = "El peso debe estar entre 1 y 100";
      }

      if (normalizedName) {
        if (normalizedNames.has(normalizedName)) {
          nextErrors[`category-name-${cat.id}`] = "El nombre de categoría está duplicado";
        }
        normalizedNames.add(normalizedName);
      }
    });

    if (totalWeight !== 100) {
      nextErrors.totalWeight = "Los pesos deben sumar exactamente 100%";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      const summary = Object.keys(nextErrors)
        .map((key) => fieldLabelMap[key])
        .filter(Boolean)
        .filter((value, index, arr) => arr.indexOf(value) === index)
        .join(", ");

      const firstErrorField = ["name", "discipline", "level", "examDate", "regOpenDate", "regCloseDate", "maxCandidates"]
        .find((field) => nextErrors[field]);

      if (firstErrorField) {
        window.requestAnimationFrame(() => {
          document.getElementById(`exam-${firstErrorField}`)?.focus();
        });
      }

      toast.error(`Revisa los campos: ${summary}`);
      return;
    }

    setFieldErrors({});

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
          <DialogDescription>
            Completa los datos del examen, define fechas y configura categorías de evaluación.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {errorSummary.length > 0 ? (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              Revisa estos bloques antes de guardar: {errorSummary.join(", ")}.
            </div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="exam-name">Nombre del examen *</Label>
              <Input
                id="exam-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) {
                    setFieldErrors((prev) => {
                      const { name: _name, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                placeholder="Examen Ballet Nivel 1"
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? "exam-name-error" : undefined}
              />
              {fieldErrors.name ? <p id="exam-name-error" className="mt-1 text-xs text-destructive">{fieldErrors.name}</p> : null}
            </div>
            <div>
              <Label htmlFor="exam-discipline">Disciplina *</Label>
              <Input
                id="exam-discipline"
                value={discipline}
                onChange={(e) => {
                  setDiscipline(e.target.value);
                  if (fieldErrors.discipline) {
                    setFieldErrors((prev) => {
                      const { discipline: _discipline, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                placeholder="Ballet"
                aria-invalid={Boolean(fieldErrors.discipline)}
                aria-describedby={fieldErrors.discipline ? "exam-discipline-error" : undefined}
              />
              {fieldErrors.discipline ? <p id="exam-discipline-error" className="mt-1 text-xs text-destructive">{fieldErrors.discipline}</p> : null}
            </div>
            <div>
              <Label htmlFor="exam-level">Nivel *</Label>
              <Input
                id="exam-level"
                value={level}
                onChange={(e) => {
                  setLevel(e.target.value);
                  if (fieldErrors.level) {
                    setFieldErrors((prev) => {
                      const { level: _level, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                placeholder="Nivel 1"
                aria-invalid={Boolean(fieldErrors.level)}
                aria-describedby={fieldErrors.level ? "exam-level-error" : undefined}
              />
              {fieldErrors.level ? <p id="exam-level-error" className="mt-1 text-xs text-destructive">{fieldErrors.level}</p> : null}
            </div>
            <div>
              <Label htmlFor="exam-category">Categoría</Label>
              <Input id="exam-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Clásico" />
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
              <Label htmlFor="exam-examDate">Fecha del examen *</Label>
              <Input
                id="exam-examDate"
                type="date"
                value={examDate}
                onChange={(e) => {
                  setExamDate(e.target.value);
                  if (fieldErrors.examDate) {
                    setFieldErrors((prev) => {
                      const { examDate: _examDate, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                aria-invalid={Boolean(fieldErrors.examDate)}
                aria-describedby={fieldErrors.examDate ? "exam-examDate-error" : undefined}
              />
              {fieldErrors.examDate ? <p id="exam-examDate-error" className="mt-1 text-xs text-destructive">{fieldErrors.examDate}</p> : null}
            </div>
            <div>
              <Label htmlFor="exam-regOpenDate">Apertura registro *</Label>
              <Input
                id="exam-regOpenDate"
                type="date"
                value={regOpenDate}
                onChange={(e) => {
                  setRegOpenDate(e.target.value);
                  if (fieldErrors.regOpenDate) {
                    setFieldErrors((prev) => {
                      const { regOpenDate: _regOpenDate, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                aria-invalid={Boolean(fieldErrors.regOpenDate)}
                aria-describedby={fieldErrors.regOpenDate ? "exam-regOpenDate-error" : undefined}
              />
              {fieldErrors.regOpenDate ? <p id="exam-regOpenDate-error" className="mt-1 text-xs text-destructive">{fieldErrors.regOpenDate}</p> : null}
            </div>
            <div>
              <Label htmlFor="exam-regCloseDate">Cierre registro *</Label>
              <Input
                id="exam-regCloseDate"
                type="date"
                value={regCloseDate}
                onChange={(e) => {
                  setRegCloseDate(e.target.value);
                  if (fieldErrors.regCloseDate) {
                    setFieldErrors((prev) => {
                      const { regCloseDate: _regCloseDate, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                aria-invalid={Boolean(fieldErrors.regCloseDate)}
                aria-describedby={fieldErrors.regCloseDate ? "exam-regCloseDate-error" : undefined}
              />
              {fieldErrors.regCloseDate ? <p id="exam-regCloseDate-error" className="mt-1 text-xs text-destructive">{fieldErrors.regCloseDate}</p> : null}
            </div>
          </div>

          <div>
            <Label htmlFor="exam-maxCandidates">Máx. candidatos (opcional)</Label>
            <Input
              id="exam-maxCandidates"
              type="number"
              value={maxCandidates}
              onChange={(e) => setMaxCandidates(e.target.value)}
              placeholder="Sin límite"
              aria-invalid={Boolean(fieldErrors.maxCandidates)}
              aria-describedby={fieldErrors.maxCandidates ? "exam-maxCandidates-error" : undefined}
            />
            {fieldErrors.maxCandidates ? <p id="exam-maxCandidates-error" className="mt-1 text-xs text-destructive">{fieldErrors.maxCandidates}</p> : null}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Categorías de evaluación</Label>
              <span className={`text-xs font-medium ${totalWeight === 100 ? "text-success" : "text-destructive"}`}>
                Total: {totalWeight}%
              </span>
            </div>
            {fieldErrors.totalWeight ? <p className="text-xs text-destructive">{fieldErrors.totalWeight}</p> : null}
            {fieldErrors.gradingCategories ? <p className="text-xs text-destructive">{fieldErrors.gradingCategories}</p> : null}

            {gradingCategories.map((cat, i) => (
              <div key={cat.id} className="flex items-center gap-2">
                <Input
                  value={cat.name}
                  onChange={(e) => {
                    updateCategory(i, "name", e.target.value);
                    if (fieldErrors[`category-name-${cat.id}`]) {
                      setFieldErrors((prev) => {
                        const { [`category-name-${cat.id}`]: _nameError, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  placeholder="Nombre categoría"
                  className="flex-1"
                  aria-invalid={Boolean(fieldErrors[`category-name-${cat.id}`])}
                  aria-describedby={fieldErrors[`category-name-${cat.id}`] ? `category-name-${cat.id}-error` : undefined}
                />
                <div className="flex items-center gap-1 w-24">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={cat.weight}
                    onChange={(e) => {
                      updateCategory(i, "weight", parseInt(e.target.value) || 0);
                      if (fieldErrors[`category-weight-${cat.id}`]) {
                        setFieldErrors((prev) => {
                          const { [`category-weight-${cat.id}`]: _weightError, ...rest } = prev;
                          return rest;
                        });
                      }
                    }}
                    className="w-16"
                    aria-invalid={Boolean(fieldErrors[`category-weight-${cat.id}`])}
                    aria-describedby={fieldErrors[`category-weight-${cat.id}`] ? `category-weight-${cat.id}-error` : undefined}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setGradingCategories((prev) => prev.filter((_, j) => j !== i))}
                  disabled={gradingCategories.length <= 1}
                  aria-label={`Eliminar categoria ${cat.name || i + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {gradingCategories.map((cat) => (
              <div key={`errors-${cat.id}`} className="-mt-2 grid grid-cols-[1fr_96px_32px] gap-2">
                <div>
                  {fieldErrors[`category-name-${cat.id}`] ? (
                    <p id={`category-name-${cat.id}-error`} className="text-xs text-destructive">{fieldErrors[`category-name-${cat.id}`]}</p>
                  ) : null}
                </div>
                <div>
                  {fieldErrors[`category-weight-${cat.id}`] ? (
                    <p id={`category-weight-${cat.id}-error`} className="text-xs text-destructive">{fieldErrors[`category-weight-${cat.id}`]}</p>
                  ) : null}
                </div>
                <div />
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
