/**
 * PortalPreferencesScreen V1 — simplified preferences.
 *
 * Removed for V1 (social/community features):
 *   - showProfileInSearch
 *   - showCity
 *   - showStats
 *   - showAchievements
 *   - showCertifications
 *   - allowFollowerNotifications
 *
 * Kept for V1:
 *   - Theme selector (light / dark / system)
 *   - allowUsageAnalytics (legal / GDPR)
 *   - Data export (GDPR right to portability)
 */
import { useEffect, useState } from "react";
import { Download, Moon, Sun, MonitorSmartphone } from "lucide-react";
import {
  exportPortalOwnData,
  getPortalPrivacySettings,
  updatePortalPrivacySettings,
} from "@/lib/api/portalFoundation";
import { getStoredTheme, setTheme, type AppTheme } from "@/lib/theme";

export default function PortalPreferencesScreen() {
  const [allowAnalytics, setAllowAnalytics] = useState(true);
  const [theme, setThemeState] = useState<AppTheme>("system");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setThemeState(getStoredTheme());
      try {
        const data = await getPortalPrivacySettings();
        if (!cancelled) setAllowAnalytics(data.allowUsageAnalytics ?? true);
      } catch {
        // use default
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const showMessage = (msg: string) => {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 2500);
  };

  const toggleAnalytics = () => {
    const next = !allowAnalytics;
    setAllowAnalytics(next);
    void updatePortalPrivacySettings({ allowUsageAnalytics: next })
      .then(() => showMessage("Preferencia actualizada"))
      .catch(() => { setAllowAnalytics(!next); showMessage("No se pudo actualizar"); });
  };

  const changeTheme = (next: AppTheme) => {
    setThemeState(next);
    setTheme(next);
    showMessage(`Tema: ${next === "light" ? "Claro" : next === "dark" ? "Oscuro" : "Sistema"}`);
  };

  const exportData = async () => {
    setSaving(true);
    try {
      const data = await exportPortalOwnData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mis-datos-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showMessage("Exportación completada");
    } catch {
      showMessage("No se pudo exportar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 px-4 pb-6 pt-6">
      <h1 className="text-xl font-bold text-foreground">Preferencias</h1>

      {message && (
        <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          {message}
        </div>
      )}

      {/* Theme */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Apariencia</h2>
        <div className="grid grid-cols-3 gap-2">
          {([
            { id: "light" as AppTheme, icon: Sun, label: "Claro" },
            { id: "dark" as AppTheme, icon: Moon, label: "Oscuro" },
            { id: "system" as AppTheme, icon: MonitorSmartphone, label: "Sistema" },
          ] as const).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => changeTheme(id)}
              className={`rounded-xl border py-3 text-xs font-medium transition flex flex-col items-center gap-1 ${
                theme === id
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Analytics toggle */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Privacidad</h2>
        {loading ? (
          <p className="text-xs text-muted-foreground">Cargando...</p>
        ) : (
          <button
            type="button"
            onClick={toggleAnalytics}
            className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2.5 text-left"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Analítica de uso</p>
              <p className="text-xs text-muted-foreground">Ayuda a mejorar el portal sin datos personales</p>
            </div>
            <span className={`ml-3 shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
              allowAnalytics
                ? "bg-success/15 text-success"
                : "bg-muted text-muted-foreground"
            }`}>
              {allowAnalytics ? "Activo" : "Inactivo"}
            </span>
          </button>
        )}
      </section>

      {/* GDPR export */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Mis datos</h2>
        <p className="text-xs text-muted-foreground">
          Descarga todos tus datos del portal en formato JSON. Derecho de portabilidad (GDPR).
        </p>
        <button
          type="button"
          disabled={saving}
          onClick={() => void exportData()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {saving ? "Exportando..." : "Exportar mis datos"}
        </button>
      </section>
    </div>
  );
}
