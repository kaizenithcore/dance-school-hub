import { FieldCondition, FormBuilderSection, OPERATOR_LABELS } from "@/lib/types/formBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GitBranch } from "lucide-react";

interface FieldConditionsEditorProps {
  conditions: FieldCondition[];
  allSections: FormBuilderSection[];
  currentFieldId: string;
  onChange: (conditions: FieldCondition[]) => void;
}

export function FieldConditionsEditor({ conditions, allSections, currentFieldId, onChange }: FieldConditionsEditorProps) {
  const allFields = allSections.flatMap((s) => s.fields).filter((f) => f.id !== currentFieldId);

  const addCondition = () => {
    const cond: FieldCondition = {
      id: `cond_${Date.now()}`,
      sourceFieldId: allFields[0]?.id || "",
      operator: "equals",
      value: "",
    };
    onChange([...conditions, cond]);
  };

  const updateCondition = (index: number, updates: Partial<FieldCondition>) => {
    onChange(conditions.map((c, i) => (i === index ? { ...c, ...updates } : c)));
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
        <Label className="text-xs text-muted-foreground">Condiciones de visibilidad</Label>
      </div>

      {conditions.length > 0 && (
        <div className="space-y-2 pl-5 border-l-2 border-accent">
          {conditions.map((cond, i) => (
            <div key={cond.id} className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-medium">SI</span>
              <Select
                value={cond.sourceFieldId}
                onValueChange={(v) => updateCondition(i, { sourceFieldId: v })}
              >
                <SelectTrigger className="h-7 text-xs w-[140px]">
                  <SelectValue placeholder="Campo..." />
                </SelectTrigger>
                <SelectContent>
                  {allFields.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={cond.operator}
                onValueChange={(v) => updateCondition(i, { operator: v as FieldCondition["operator"] })}
              >
                <SelectTrigger className="h-7 text-xs w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OPERATOR_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {!["is_empty", "is_not_empty"].includes(cond.operator) && (
                <div className="flex flex-col gap-0.5">
                  <Input
                    type="text"
                    value={cond.value}
                    onChange={(e) => updateCondition(i, { value: e.target.value })}
                    className="h-7 text-xs w-[130px]"
                    placeholder={cond.operator === "date_before" || cond.operator === "date_after" ? "AAAA-MM-DD o today_minus_18y" : "Valor"}
                  />
                  {(cond.operator === "date_before" || cond.operator === "date_after") && (
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      Ej: today, today_minus_18y
                    </span>
                  )}
                </div>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => removeCondition(i)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addCondition}>
        <Plus className="h-3 w-3 mr-1" />
        Añadir condición
      </Button>
    </div>
  );
}
