import { useEffect, useMemo, useState } from "react";
import { Download, Moon, Sun, MonitorSmartphone, Shield } from "lucide-react";
import {
  exportPortalOwnData,
  getPortalPrivacySettings,
  updatePortalPrivacySettings,
  type PortalPrivacySettings,
} from "@/lib/api/portalFoundation";
import { getStoredTheme, setTheme, type AppTheme } from "@/lib/theme";
import { trackPortalEvent } from "@/lib/portalTelemetry";

const defaultPrivacy: PortalPrivacySettings = {
  showProfileInSearch: true,
  showCity: true,
  showStats: true,
  showAchievements: true,
  showCertifications: true,
  allowFollowerNotifications: true,
  allowUsageAnalytics: true,
};

export default function PortalPreferencesScreen() {
  const [privacy, setPrivacy] = useState<PortalPrivacySettings>(defaultPrivacy);
  const [theme, setThemeState] = useState<AppTheme>("system");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setThemeState(getStoredTheme());
      try {
        const data = await getPortalPrivacySettings();
        if (!cancelled) {
          setPrivacy(data);
        }
      } catch {
        if (!cancelled) {
          setPrivacy(defaultPrivacy);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const options = useMemo(
    () => [
      { key: "showProfileInSearch", label: "Mostrar mi perfil en busqueda" },
      { key: "showCity", label: "Mostrar mi ciudad" },
      { key: "showStats", label: "Mostrar estadisticas de progreso" },
      { key: "showAchievements", label: "Mostrar logros" },
      { key: "showCertifications", label: "Mostrar certificaciones" },
      { key: "allowFollowerNotifications", label: "Notificar nuevos seguidores" },
      { key: "allowUsageAnalytics", label: "Permitir analitica de uso" },
    ] as Array<{ key: keyof PortalPrivacySettings; label: string }>,
    []
  );

  const togglePrivacy = (key: keyof PortalPrivacySettings) => {
    const next = { ...privacy, [key]: !privacy[key] };
    setPrivacy(next);
    setSaving(true);

    void updatePortalPrivacySettings({ [key]: next[key] })
      .then(() => {
        setMessage("Preferencias actualizadas");
        setSaving(false);
        trackPortalEvent({
          eventName: "privacy_setting_updated",
          category: "adoption",
          metadata: { key, enabled: next[key] },
        });
      })
      .catch(() => {
        setPrivacy(privacy);
        setSaving(false);
        setMessage("No se pudo actualizar esta preferencia");
      });
  };

  const changeTheme = (nextTheme: AppTheme) => {
    setThemeState(nextTheme);
    setTheme(nextTheme);
    setMessage(`Tema aplicado: ${nextTheme}`);
  };

  const exportData = async () => {
    setSaving(true);
    try {
      const data = await exportPortalOwnData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `portal-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMessage("Exportacion completada");
      trackPortalEvent({
        eventName: "gdpr_export_requested",
        category: "adoption",
      });
    } catch {
      setMessage("No se pudo exportar tus datos");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 px-4 pb-24 pt-6">
      <h1 className="text-xl font-bold text-foreground">Preferencias</h1>

      <section className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Privacidad granular</h2>
        </div>

        {loading ? <p className="text-xs text-muted-foreground">Cargando preferencias...</p> : null}

        {!loading
          ? options.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => togglePrivacy(item.key)}
                className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm touch-manipulation active:scale-[0.99]"
              >
                <span>{item.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${privacy[item.key] ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                  {privacy[item.key] ? "Activo" : "Inactivo"}
                </span>
              </button>
            ))
          : null}
      </section>

      <section className="rounded-xl border border-border bg-card p-4 space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Tema</h2>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => changeTheme("light")}
            className={`rounded-lg border px-2 py-2 text-xs ${theme === "light" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
          >
            <Sun className="mx-auto mb-1 h-4 w-4" />
            Claro
          </button>
          <button
            type="button"
            onClick={() => changeTheme("dark")}
            className={`rounded-lg border px-2 py-2 text-xs ${theme === "dark" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
          >
            <Moon className="mx-auto mb-1 h-4 w-4" />
            Oscuro
          </button>
          <button
            type="button"
            onClick={() => changeTheme("system")}
            className={`rounded-lg border px-2 py-2 text-xs ${theme === "system" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
          >
            <MonitorSmartphone className="mx-auto mb-1 h-4 w-4" />
            Sistema
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Datos personales</h2>
        <button
          type="button"
          onClick={() => void exportData()}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Download className="h-4 w-4" /> Exportar mis datos (GDPR)
        </button>
      </section>

      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
