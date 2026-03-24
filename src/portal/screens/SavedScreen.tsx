import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { listSavedPortalItems, type PortalSavedItem } from "@/lib/api/portalFoundation";

export default function SavedScreen() {
  const [items, setItems] = useState<PortalSavedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const saved = await listSavedPortalItems({ limit: 100, offset: 0 });
        if (cancelled) return;
        setItems(saved.items);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar tus guardados");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="px-4 pb-24 pt-6 space-y-4">
      <h1 className="text-xl font-bold text-foreground">Guardados</h1>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Cargando guardados...</div>
      ) : null}

      {!isLoading && items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Todavia no has guardado publicaciones o eventos.
        </div>
      ) : null}

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Bookmark className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {item.itemType === "post" ? "Publicacion guardada" : "Evento guardado"}
              </p>
              <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString("es-ES")}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
