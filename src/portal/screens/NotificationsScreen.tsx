import { useEffect, useState } from "react";
import { Bell, CheckCircle2 } from "lucide-react";
import { listPortalNotifications, markPortalNotificationAsRead, type PortalNotificationItem } from "@/lib/api/portalFoundation";

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<PortalNotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await listPortalNotifications({ limit: 50 });
        if (cancelled) return;
        setNotifications(data);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las notificaciones");
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

  const markAsRead = (id: string) => {
    const previous = notifications;

    setNotifications((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, isRead: true, readAt: item.readAt || new Date().toISOString() }
          : item
      )
    );

    markPortalNotificationAsRead(id).catch(() => {
      setNotifications(previous);
    });
  };

  return (
    <div className="px-4 pb-24 pt-6 space-y-4">
      <h1 className="text-xl font-bold text-foreground">Notificaciones</h1>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Cargando notificaciones...</div>
      ) : null}

      {!isLoading && notifications.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          No tienes notificaciones por ahora.
        </div>
      ) : null}

      <div className="space-y-2">
        {notifications.map((item) => (
          <div key={item.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-primary/10 p-1.5 text-primary">
                <Bell className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.message}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString("es-ES")}
                </p>
              </div>
              {!item.isRead ? (
                <button
                  type="button"
                  onClick={() => markAsRead(item.id)}
                  className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-foreground"
                >
                  Marcar leida
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md bg-success/10 px-2 py-1 text-[11px] font-medium text-success">
                  <CheckCircle2 className="h-3 w-3" /> Leida
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
