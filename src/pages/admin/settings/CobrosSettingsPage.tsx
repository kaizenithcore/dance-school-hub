import { useCallback, useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getSchoolSettings, updateSchoolSettings } from "@/lib/api/settings";
import { FieldGroup, SectionHeader, SwitchRow } from "./_shared";

interface PaymentConfig {
  currency: string; dueDayOfMonth: string; gracePeriodDays: string;
  enableTransfer: boolean; enableCash: boolean; transferAlias: string;
  transferCBU: string; autoReminders: boolean;
}

const DEFAULT: PaymentConfig = {
  currency: "EUR", dueDayOfMonth: "10", gracePeriodDays: "5",
  enableTransfer: true, enableCash: true, transferAlias: "", transferCBU: "", autoReminders: true,
};

export default function CobrosSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payment, setPayment] = useState<PaymentConfig>(DEFAULT);
  const [snapshot, setSnapshot] = useState<Record<string, unknown>>({});

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSchoolSettings();
      if (!data) { toast.error("No se pudo cargar la configuración"); return; }
      setPayment((prev) => ({ ...prev, ...data.payment }));
      setSnapshot(data as unknown as Record<string, unknown>);
    } catch { toast.error("Error al cargar la configuración"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadSettings(); }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateSchoolSettings({ ...snapshot, payment } as Parameters<typeof updateSchoolSettings>[0]);
      if (!updated) { toast.error("No se pudo guardar"); return; }
      setPayment((prev) => ({ ...prev, ...updated.payment }));
      setSnapshot(updated as unknown as Record<string, unknown>);
      toast.success("Configuración de cobros guardada");
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <PageContainer title="Cobros" description="Métodos de pago y políticas de cobro">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Cobros" description="Métodos de pago y políticas de cobro">
      <div className="rounded-lg border border-border bg-card p-6 shadow-soft space-y-6 max-w-3xl">
        <SectionHeader title="Configuración de pagos" description="Métodos aceptados y políticas de cobro" />
        <Separator />

        <div className="grid gap-4 sm:grid-cols-3">
          <FieldGroup label="Moneda">
            <Select value={payment.currency} onValueChange={(v) => setPayment({ ...payment, currency: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="ARS">ARS ($)</SelectItem>
                <SelectItem value="USD">USD (US$)</SelectItem>
              </SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup label="Día de vencimiento">
            <Input type="number" min="1" max="28" value={payment.dueDayOfMonth}
              onChange={(e) => setPayment({ ...payment, dueDayOfMonth: e.target.value })}
              className="h-9 text-sm w-24" />
          </FieldGroup>
          <FieldGroup label="Días de gracia">
            <Input type="number" min="0" max="15" value={payment.gracePeriodDays}
              onChange={(e) => setPayment({ ...payment, gracePeriodDays: e.target.value })}
              className="h-9 text-sm w-24" />
          </FieldGroup>
        </div>

        <Separator />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Métodos habilitados</p>

        <div className="space-y-4">
          <SwitchRow
            label="Transferencia bancaria"
            description="Permitir pagos por transferencia"
            checked={payment.enableTransfer}
            onChange={(v) => setPayment({ ...payment, enableTransfer: v })}
          />
          {payment.enableTransfer && (
            <div className="grid gap-4 sm:grid-cols-2 pl-6 border-l-2 border-primary/20">
              <FieldGroup label="Alias">
                <Input value={payment.transferAlias}
                  onChange={(e) => setPayment({ ...payment, transferAlias: e.target.value })}
                  className="h-9 text-sm" />
              </FieldGroup>
              <FieldGroup label="CBU / CVU">
                <Input value={payment.transferCBU}
                  onChange={(e) => setPayment({ ...payment, transferCBU: e.target.value })}
                  className="h-9 text-sm" />
              </FieldGroup>
            </div>
          )}
          <SwitchRow
            label="Efectivo"
            description="Permitir pagos en efectivo presencial"
            checked={payment.enableCash}
            onChange={(v) => setPayment({ ...payment, enableCash: v })}
          />
        </div>

        <Separator />
        <SwitchRow
          label="Recordatorios automáticos"
          description="Enviar email de recordatorio antes del vencimiento"
          checked={payment.autoReminders}
          onChange={(v) => setPayment({ ...payment, autoReminders: v })}
        />

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
