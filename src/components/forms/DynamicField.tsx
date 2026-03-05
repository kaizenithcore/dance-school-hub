import { FormFieldConfig } from "@/lib/types/formSchema";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileUploader } from "@/components/forms/FileUploader";
import { cn } from "@/lib/utils";

interface DynamicFieldProps {
  field: FormFieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

export function DynamicField({ field, value, onChange, error }: DynamicFieldProps) {
  const id = field.id;

  if (field.type === "checkbox") {
    return (
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={!!value}
          onCheckedChange={(checked) => onChange(checked)}
          className="mt-0.5"
        />
        <div className="space-y-1">
          <Label htmlFor={id} className="text-sm font-normal text-foreground cursor-pointer leading-snug">
            {field.label}
            {field.required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>
    );
  }

  if (field.type === "file") {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">
          {field.label}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        <FileUploader
          accept={field.accept}
          value={value}
          onChange={onChange}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {field.label}
        {field.required && <span className="text-destructive ml-0.5">*</span>}
      </Label>

      {field.type === "textarea" ? (
        <Textarea
          id={id}
          placeholder={field.placeholder}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          maxLength={field.maxLength}
          className={cn("resize-none", error && "border-destructive")}
          rows={3}
        />
      ) : field.type === "select" ? (
        <Select value={value || ""} onValueChange={onChange}>
          <SelectTrigger id={id} className={cn(error && "border-destructive")}>
            <SelectValue placeholder="Seleccionar..." />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={id}
          type={field.type}
          placeholder={field.placeholder}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          maxLength={field.maxLength}
          className={cn(error && "border-destructive")}
        />
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
