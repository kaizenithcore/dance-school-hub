import { ReactNode } from "react";

interface StepWrapperProps {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}

export function StepWrapper({ eyebrow, title, description, children }: StepWrapperProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h2>
        {description && <p className="max-w-2xl text-base text-muted-foreground">{description}</p>}
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

interface FieldProps {
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}

export function Field({ label, hint, required, error, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
