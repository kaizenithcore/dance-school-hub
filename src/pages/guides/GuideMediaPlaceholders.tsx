interface GuideMediaPlaceholdersProps {
  imageLabel: string;
  videoLabel: string;
}

export function GuideMediaPlaceholders({ imageLabel, videoLabel }: GuideMediaPlaceholdersProps) {
  return (
    <section className="mt-8 grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-dashed border-border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Placeholder imagen</p>
        <h3 className="mt-1 text-base font-semibold text-foreground">{imageLabel}</h3>
        <div className="mt-3 flex h-36 items-center justify-center rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground">
          Espacio para captura de pantalla
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Placeholder video</p>
        <h3 className="mt-1 text-base font-semibold text-foreground">{videoLabel}</h3>
        <div className="mt-3 flex h-36 items-center justify-center rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground">
          Espacio para video tutorial
        </div>
      </div>
    </section>
  );
}
