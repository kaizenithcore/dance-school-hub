import { useCallback, useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getSchoolSettings, updateSchoolSettings } from "@/lib/api/settings";
import { FieldGroup, SectionHeader, SwitchRow } from "./_shared";

interface NotificationConfig {
  emailNewEnrollment: boolean; emailPaymentReceived: boolean;
  emailPaymentOverdue: boolean; emailClassCancelled: boolean;
  reminderDaysBefore: string;
}

const DEFAULT: NotificationConfig = {
  emailNewEnrollment: true, emailPaymentReceived: true,
  emailPaymentOverdue: true, emailClassCancelled: true, reminderDaysBefore: "3",
};

export default function AvisosPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState<NotificationConfig>(DEFAULT);
  const [snapshot, setSnapshot] = useState<Record<string, unknown>>({});

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSchoolSettings();
      if (!data) { toast.error("No se pudo cargar la configuración"); return; }
      setNotifications((prev) => ({ ...prev, ...data.notifications }));
      setSnapshot(data as unknown as Record<string, unknown>);
    } catch { toast.error("Error al cargar la configuración"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadSettings(); }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateSchoolSettings({ ...snapshot, notifications } as Parameters<typeof updateSchoolSettings>[0]);
      if (!updated) { toast.error("No se pudo guardar"); return; }
      setNotifications((prev) => ({ ...prev, ...updated.notifications }));
      setSnapshot(updated as unknown as Record<string, unknown>);
      toast.success("Avisos guardados correctamente");
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <PageContainer title="Avisos" description="Notificaciones automáticas por email">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Avisos" description="Notificaciones automáticas por email">
      <div className="rounded-lg border border-border bg-card p-6 shadow-soft space-y-6 max-w-3xl">
        <SectionHeader title="Notificaciones" description="Configura qué alertas recibes por email" />
        <Separator />

        <div className="space-y-4">
          <SwitchRow
            label="Nueva inscripción"
            description="Recibir email cuando un alumno se inscribe"
            checked={notifications.emailNewEnrollment}
            onChange={(v) => setNotifications({ ...notifications, emailNewEnrollment: v })}
          />
          <SwitchRow
            label="Pago recibido"
            description="Recibir email cuando se registra un pago"
            checked={notifications.emailPaymentReceived}
            onChange={(v) => setNotifications({ ...notifications, emailPaymentReceived: v })}
          />
          <SwitchRow
            label="Pago vencido"
            description="Recibir alerta cuando un pago supera la fecha de vencimiento"
            checked={notifications.emailPaymentOverdue}
            onChange={(v) => setNotifications({ ...notifications, emailPaymentOverdue: v })}
          />
          <SwitchRow
            label="Clase cancelada"
            description="Notificar cuando una clase es cancelada"
            checked={notifications.emailClassCancelled}
            onChange={(v) => setNotifications({ ...notifications, emailClassCancelled: v })}
          />
        </div>

        <Separator />

        <FieldGroup label="Enviar recordatorio X días antes del vencimiento">
          <Input
            type="number" min="1" max="10"
            value={notifications.reminderDaysBefore}
            onChange={(e) => setNotifications({ ...notifications, reminderDaysBefore: e.target.value })}
            className="h-9 text-sm w-24"
          />
        </FieldGroup>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={loadSettings} disabled={saving}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restablecer
          </Button>
          <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1" /> Guardar
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
