import { useCallback, useState } from "react";
import { Upload, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  accept?: string;
  value?: File | null;
  onChange: (file: File | null) => void;
}

export function FileUploader({ accept, value, onChange }: FileUploaderProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) onChange(file);
    },
    [onChange]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      onChange(file);
    },
    [onChange]
  );

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{value.name}</p>
          <p className="text-xs text-muted-foreground">
            {(value.size / 1024).toFixed(1)} KB
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 cursor-pointer transition-colors",
        dragOver
          ? "border-primary bg-accent/50"
          : "border-border hover:border-primary/40 hover:bg-accent/30"
      )}
    >
      <Upload className="h-5 w-5 text-muted-foreground" />
      <div className="text-center">
        <span className="text-sm text-primary font-medium">Elegir archivo</span>
        <span className="text-sm text-muted-foreground"> o arrastra aquí</span>
      </div>
      {accept && (
        <p className="text-xs text-muted-foreground">
          Formatos: {accept.replace(/\./g, "").replace(/,/g, ", ").toUpperCase()}
        </p>
      )}
      <input
        type="file"
        accept={accept}
        onChange={handleChange}
        className="sr-only"
      />
    </label>
  );
}
