import { FormBuilderSection, FormBuilderField, createDefaultField, FieldType, FIELD_TYPE_LABELS } from "@/lib/types/formBuilder";
import { FieldCard } from "./FieldCard";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { SectionConditionsEditor } from "./SectionConditionsEditor";

interface SectionCardProps {
  section: FormBuilderSection;
  index: number;
  totalSections: number;
  allSections: FormBuilderSection[];
  onUpdate: (section: FormBuilderSection) => void;
  onDelete: () => void;
  onMove: (direction: "up" | "down") => void;
}

export function SectionCard({ section, index, totalSections, allSections, onUpdate, onDelete, onMove }: SectionCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  const updateField = (fieldIndex: number, field: FormBuilderField) => {
    const fields = [...section.fields];
    fields[fieldIndex] = field;
    onUpdate({ ...section, fields });
  };

  const deleteField = (fieldIndex: number) => {
    onUpdate({ ...section, fields: section.fields.filter((_, i) => i !== fieldIndex) });
  };

  const moveField = (fieldIndex: number, direction: "up" | "down") => {
    const fields = [...section.fields];
    const target = direction === "up" ? fieldIndex - 1 : fieldIndex + 1;
    if (target < 0 || target >= fields.length) return;
    [fields[fieldIndex], fields[target]] = [fields[target], fields[fieldIndex]];
    onUpdate({ ...section, fields });
  };

  const addField = (type: FieldType) => {
    onUpdate({ ...section, fields: [...section.fields, createDefaultField(type)] });
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
      {/* Section Header */}
      <div className="flex items-center gap-3 bg-muted/40 px-4 py-3 border-b border-border">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />

        <div className="flex-1 min-w-0 space-y-1">
          <Input
            value={section.title}
            onChange={(e) => onUpdate({ ...section, title: e.target.value })}
            className="h-7 text-sm font-semibold border-none shadow-none bg-transparent px-1 focus-visible:ring-1"
            placeholder="Título de sección"
          />
          <Input
            value={section.description || ""}
            onChange={(e) => onUpdate({ ...section, description: e.target.value })}
            className="h-6 text-xs text-muted-foreground border-none shadow-none bg-transparent px-1 focus-visible:ring-1"
            placeholder="Descripción opcional..."
          />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove("up")} disabled={index === 0}>
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove("down")} disabled={index === totalSections - 1}>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-3">
          {/* Section-level conditions */}
          <SectionConditionsEditor
            conditions={section.conditions || []}
            allSections={allSections}
            currentSectionId={section.id}
            onChange={(conditions) => onUpdate({ ...section, conditions })}
          />

          {/* Fields */}
          {section.fields.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-8 text-center">
              <p className="text-xs text-muted-foreground mb-2">No hay campos. Añadí uno para empezar.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {section.fields.map((field, fi) => (
                <FieldCard
                  key={field.id}
                  field={field}
                  index={fi}
                  totalFields={section.fields.length}
                  allSections={allSections}
                  onUpdate={(f) => updateField(fi, f)}
                  onDelete={() => deleteField(fi)}
                  onMove={(dir) => moveField(fi, dir)}
                />
              ))}
            </div>
          )}

          {/* Add field */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full border-dashed h-9 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Añadir campo
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48">
              {(Object.entries(FIELD_TYPE_LABELS) as [FieldType, string][]).map(([type, label]) => (
                <DropdownMenuItem key={type} onClick={() => addField(type)}>
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
