import { FormBuilderField, FIELD_TYPE_LABELS, FieldType } from "@/lib/types/formBuilder";
import { GripVertical, Trash2, ChevronDown, ChevronUp, Asterisk, Type, Mail, Phone, AlignLeft, ListChecks, CheckSquare, FileUp, CalendarDays, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { FieldOptionsEditor } from "./FieldOptionsEditor";
import { FieldConditionsEditor } from "./FieldConditionsEditor";
import type { FormBuilderSection } from "@/lib/types/formBuilder";

const FIELD_ICONS: Record<FieldType, React.ElementType> = {
  text: Type,
  email: Mail,
  tel: Phone,
  textarea: AlignLeft,
  select: ListChecks,
  checkbox: CheckSquare,
  file: FileUp,
  date: CalendarDays,
  number: Hash,
};

interface FieldCardProps {
  field: FormBuilderField;
  index: number;
  totalFields: number;
  allSections: FormBuilderSection[];
  onUpdate: (field: FormBuilderField) => void;
  onDelete: () => void;
  onMove: (direction: "up" | "down") => void;
  dragHandleProps?: Record<string, any>;
}

export function FieldCard({ field, index, totalFields, allSections, onUpdate, onDelete, onMove, dragHandleProps }: FieldCardProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = FIELD_ICONS[field.type];

  return (
    <div className={cn(
      "group rounded-lg border border-border bg-card transition-all",
      expanded ? "shadow-soft ring-1 ring-primary/20" : "hover:border-primary/30"
    )}>
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          className="cursor-grab text-muted-foreground hover:text-foreground touch-none"
          {...dragHandleProps}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent">
          <Icon className="h-3.5 w-3.5 text-accent-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          {expanded ? (
            <Input
              value={field.label}
              onChange={(e) => onUpdate({ ...field, label: e.target.value })}
              className="h-7 text-sm font-medium border-none shadow-none px-1 focus-visible:ring-1"
            />
          ) : (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-sm font-medium text-foreground truncate text-left w-full"
            >
              {field.label}
              {field.required && <Asterisk className="inline h-3 w-3 text-destructive ml-0.5 -mt-0.5" />}
            </button>
          )}
        </div>

        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
          {FIELD_TYPE_LABELS[field.type]}
        </span>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove("up")} disabled={index === 0}>
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove("down")} disabled={index === totalFields - 1}>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tipo de campo</Label>
              <Select value={field.type} onValueChange={(val) => {
                const updated = { ...field, type: val as FieldType };
                if (val === "select" && !updated.options?.length) {
                  updated.options = [{ value: "option_1", label: "Opción 1" }];
                }
                if (val === "file" && !updated.accept) {
                  updated.accept = ".pdf,.jpg,.jpeg,.png";
                }
                onUpdate(updated);
              }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Placeholder</Label>
              <Input
                value={field.placeholder || ""}
                onChange={(e) => onUpdate({ ...field, placeholder: e.target.value })}
                placeholder="Texto de ayuda..."
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id={`req-${field.id}`}
                checked={field.required}
                onCheckedChange={(checked) => onUpdate({ ...field, required: checked })}
              />
              <Label htmlFor={`req-${field.id}`} className="text-xs text-muted-foreground cursor-pointer">
                Obligatorio
              </Label>
            </div>

            {(field.type === "text" || field.type === "textarea" || field.type === "email" || field.type === "tel") && (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Máx. caracteres</Label>
                <Input
                  type="number"
                  value={field.maxLength || ""}
                  onChange={(e) => onUpdate({ ...field, maxLength: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="h-7 w-20 text-xs"
                  min={1}
                />
              </div>
            )}
          </div>

          {field.type === "select" && (
            <FieldOptionsEditor
              options={field.options || []}
              onChange={(options) => onUpdate({ ...field, options })}
            />
          )}

          {field.type === "file" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Formatos aceptados</Label>
              <Input
                value={field.accept || ""}
                onChange={(e) => onUpdate({ ...field, accept: e.target.value })}
                placeholder=".pdf,.jpg,.png"
                className="h-8 text-xs"
              />
            </div>
          )}

          <FieldConditionsEditor
            conditions={field.conditions || []}
            allSections={allSections}
            currentFieldId={field.id}
            onChange={(conditions) => onUpdate({ ...field, conditions })}
          />
        </div>
      )}
    </div>
  );
}
