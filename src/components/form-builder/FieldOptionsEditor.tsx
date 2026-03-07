import { FieldOption } from "@/lib/types/formBuilder";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Label } from "@/components/ui/label";

interface FieldOptionsEditorProps {
  options: FieldOption[];
  onChange: (options: FieldOption[]) => void;
}

export function FieldOptionsEditor({ options, onChange }: FieldOptionsEditorProps) {
  const addOption = () => {
    const idx = options.length + 1;
    onChange([...options, { value: `option_${idx}`, label: `Opción ${idx}` }]);
  };

  const updateOption = (index: number, updates: Partial<FieldOption>) => {
    const next = options.map((o, i) => (i === index ? { ...o, ...updates } : o));
    onChange(next);
  };

  const removeOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Opciones del selector</Label>
      <div className="space-y-1.5">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Input
              value={opt.label}
              onChange={(e) => updateOption(i, { label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
              className="h-7 text-xs flex-1"
              placeholder="Etiqueta"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
              onClick={() => removeOption(i)}
              disabled={options.length <= 1}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addOption}>
        <Plus className="h-3 w-3 mr-1" />
        Añadir opción
      </Button>
    </div>
  );
}
