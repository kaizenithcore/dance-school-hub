import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSchoolSettings, updateSchoolSettings, type SchoolSettingsPayload } from "@/lib/api/settings";
import { toast } from "sonner";
import { Settings2, Loader2 } from "lucide-react";

type PlanType = "starter" | "pro" | "enterprise";

function toPlan(value: string): PlanType {
  if (value === "pro" || value === "enterprise") return value;
  return "starter";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function PlanDevOverlay() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SchoolSettingsPayload | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSchoolSettings();
      setSettings(data);
    } catch {
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const billing = useMemo(() => {
    const source = settings?.billing;
    const addons = asRecord(source?.addons);
    const limits = asRecord(source?.limits);

    return {
      planType: toPlan(source?.planType || "starter"),
      extraStudentBlocks: Number(source?.extraStudentBlocks ?? 0) || 0,
      addons: {
        customDomain: Boolean(addons.customDomain),
        prioritySupport: Boolean(addons.prioritySupport),
        waitlistAutomation: Boolean(addons.waitlistAutomation),
      },
      maxActiveStudents: Number(limits.maxActiveStudents ?? 0) || 0,
    };
  }, [settings]);

  const saveBilling = useCallback(
    async (nextBilling: Record<string, unknown>) => {
      if (!settings) return;

      setSaving(true);
      try {
        const updated = await updateSchoolSettings({
          ...settings,
          billing: {
            ...settings.billing,
            ...nextBilling,
          },
        });

        if (!updated) {
          toast.error("No se pudo actualizar billing de desarrollo");
          return;
        }

        setSettings(updated);
        toast.success("Billing de desarrollo actualizado");
      } finally {
        setSaving(false);
      }
    },
    [settings]
  );

  const setPlan = useCallback(
    async (planType: PlanType) => {
      await saveBilling({
        planType,
        addons: {
          ...billing.addons,
          waitlistAutomation: planType === "starter" ? billing.addons.waitlistAutomation : false,
        },
      });
    },
    [billing.addons, saveBilling]
  );

  const adjustBlocks = useCallback(
    async (delta: number) => {
      const nextBlocks = Math.max(0, billing.extraStudentBlocks + delta);
      await saveBilling({ extraStudentBlocks: nextBlocks });
    },
    [billing.extraStudentBlocks, saveBilling]
  );

  const toggleAddon = useCallback(
    async (key: "customDomain" | "prioritySupport" | "waitlistAutomation") => {
      if (key === "waitlistAutomation" && billing.planType !== "starter") {
        toast.info("El add-on de waitlist solo aplica en Starter");
        return;
      }

      await saveBilling({
        addons: {
          ...billing.addons,
          [key]: !billing.addons[key],
        },
      });
    },
    [billing.addons, billing.planType, saveBilling]
  );

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[70]">
      <div className="flex justify-end">
        <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>
          <Settings2 className="h-4 w-4 mr-1" /> Dev plan
        </Button>
      </div>

      {open ? (
        <div className="mt-2 w-[320px] rounded-xl border border-border bg-card p-3 shadow-lg">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overlay de pruebas</p>

          {loading ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
            </div>
          ) : !settings ? (
            <div className="mt-3">
              <p className="text-sm text-destructive">No se pudo cargar settings.</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => void load()}>
                Reintentar
              </Button>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={billing.planType === "starter" ? "default" : "outline"} disabled={saving} onClick={() => void setPlan("starter")}>Starter</Button>
                <Button size="sm" variant={billing.planType === "pro" ? "default" : "outline"} disabled={saving} onClick={() => void setPlan("pro")}>Pro</Button>
                <Button size="sm" variant={billing.planType === "enterprise" ? "default" : "outline"} disabled={saving} onClick={() => void setPlan("enterprise")}>Enterprise</Button>
              </div>

              <div className="rounded-md border border-border p-2 text-xs text-muted-foreground space-y-1">
                <p>Plan actual: <span className="font-medium text-foreground">{billing.planType}</span></p>
                <p>Capacidad total: <span className="font-medium text-foreground">{billing.maxActiveStudents}</span> alumnos activos</p>
                <p>Bloques extra: <span className="font-medium text-foreground">{billing.extraStudentBlocks}</span></p>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={saving} onClick={() => void adjustBlocks(-1)}>- bloque</Button>
                <Button size="sm" variant="outline" disabled={saving} onClick={() => void adjustBlocks(1)}>+ bloque</Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge className="cursor-pointer" variant={billing.addons.customDomain ? "default" : "secondary"} onClick={() => void toggleAddon("customDomain")}>Dominio</Badge>
                <Badge className="cursor-pointer" variant={billing.addons.prioritySupport ? "default" : "secondary"} onClick={() => void toggleAddon("prioritySupport")}>Soporte</Badge>
                <Badge className="cursor-pointer" variant={billing.addons.waitlistAutomation ? "default" : "secondary"} onClick={() => void toggleAddon("waitlistAutomation")}>Waitlist Starter</Badge>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="ghost" disabled={saving} onClick={() => void load()}>Refrescar</Button>
                {saving ? <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Guardando...</span> : null}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
