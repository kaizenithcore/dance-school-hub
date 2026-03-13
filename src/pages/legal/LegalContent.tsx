import type { ReactNode } from "react";

interface LegalPageProps {
  title: string;
  updatedAt: string;
  children: ReactNode;
}

interface LegalSectionProps {
  title: string;
  children: ReactNode;
}

export function LegalPage({ title, updatedAt, children }: LegalPageProps) {
  return (
    <article className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
      <header className="mb-8 border-b border-border pb-5">
        <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent-foreground">
          Documento legal
        </span>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última actualización: {updatedAt}</p>
      </header>
      <div className="space-y-7 text-[15px] leading-7 text-foreground/90">{children}</div>
    </article>
  );
}

export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground sm:text-xl">{title}</h2>
      <div className="space-y-3 text-foreground/85">{children}</div>
    </section>
  );
}
