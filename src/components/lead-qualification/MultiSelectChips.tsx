import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MultiSelectOption<T extends string> {
  value: T;
  label: string;
}

interface MultiSelectChipsProps<T extends string> {
  options: MultiSelectOption<T>[];
  value: T[];
  onChange: (next: T[]) => void;
  columns?: 1 | 2 | 3;
}

export function MultiSelectChips<T extends string>({
  options,
  value,
  onChange,
  columns = 2,
}: MultiSelectChipsProps<T>) {
  const toggle = (v: T) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };

  const gridCols = columns === 1 ? "grid-cols-1" : columns === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2";

  return (
    <div className={cn("grid gap-2", gridCols)}>
      {options.map((opt) => {
        const active = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-all",
              active
                ? "border-primary bg-accent text-accent-foreground shadow-[var(--shadow-soft)]"
                : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent/50",
            )}
          >
            <span>{opt.label}</span>
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background",
              )}
            >
              {active && <Check className="h-3.5 w-3.5" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
