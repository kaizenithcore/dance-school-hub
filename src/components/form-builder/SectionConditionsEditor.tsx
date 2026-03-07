import { FieldCondition, FormBuilderSection, OPERATOR_LABELS } from "@/lib/types/formBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GitBranch } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface SectionConditionsEditorProps {
  conditions: FieldCondition[];
  allSections: FormBuilderSection[];
  currentSectionId: string;
  onChange: (conditions: FieldCondition[]) => void;
}

export function SectionConditionsEditor({ conditions, allSections, currentSectionId, onChange }: SectionConditionsEditorProps) {
  const [open, setOpen] = useState(conditions.length > 0);
  const otherFields = allSections
    .filter((s) => s.id !== currentSectionId)
    .flatMap((s) => s.fields);

  const addCondition = () => {
    onChange([
      ...conditions,
      { id: `cond_${Date.now()}`, sourceFieldId: otherFields[0]?.id || "", operator: "equals", value: "" },
    ]);
    setOpen(true);
  };

  const updateCondition = (i: number, updates: Partial<FieldCondition>) => {
    onChange(conditions.map((c, idx) => (idx === i ? { ...c, ...updates } : c)));
  };

  const removeCondition = (i: number) => {
    onChange(conditions.filter((_, idx) => idx !== i));
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 text-xs font-medium transition-colors",
            conditions.length > 0 ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <GitBranch className="h-3.5 w-3.5" />
          Condiciones de sección
          {conditions.length > 0 && (
            <span className="rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-bold">
              {conditions.length}
            </span>
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2 pl-5 border-l-2 border-primary/20">
        {conditions.map((cond, i) => (
          <div key={cond.id} className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-medium uppercase">Si</span>
            <Select value={cond.sourceFieldId} onValueChange={(v) => updateCondition(i, { sourceFieldId: v })}>
              <SelectTrigger className="h-7 text-xs w-[140px]"><SelectValue placeholder="Campo..." /></SelectTrigger>
              <SelectContent>
                {otherFields.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={cond.operator} onValueChange={(v) => updateCondition(i, { operator: v as FieldCondition["operator"] })}>
              <SelectTrigger className="h-7 text-xs w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(OPERATOR_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!["is_empty", "is_not_empty"].includes(cond.operator) && (
              <Input value={cond.value} onChange={(e) => updateCondition(i, { value: e.target.value })} className="h-7 text-xs w-[100px]" placeholder="Valor" />
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeCondition(i)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addCondition}>
          <Plus className="h-3 w-3 mr-1" /> Añadir condición
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
