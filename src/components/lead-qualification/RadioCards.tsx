import { cn } from "@/lib/utils";

export interface RadioOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface RadioCardsProps<T extends string> {
  options: RadioOption<T>[];
  value: T | "";
  onChange: (next: T) => void;
  columns?: 1 | 2 | 3;
}

export function RadioCards<T extends string>({ options, value, onChange, columns = 3 }: RadioCardsProps<T>) {
  const gridCols =
    columns === 1 ? "grid-cols-1" : columns === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3";
  return (
    <div className={cn("grid gap-2", gridCols)}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-xl border px-4 py-3.5 text-left transition-all",
              active
                ? "border-primary bg-accent text-accent-foreground shadow-[var(--shadow-soft)]"
                : "border-border bg-card hover:border-primary/40 hover:bg-accent/50",
            )}
          >
            <span className="text-sm font-medium">{opt.label}</span>
            {opt.hint && <span className="text-xs text-muted-foreground">{opt.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
