import { useCallback, useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { KeyRound, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getSchoolSettings, updateSchoolSettings } from "@/lib/api/settings";
import { supabase } from "@/lib/supabase";
import { getCurrentAuthContext } from "@/lib/auth";
import { validateStrongPassword } from "@/lib/security";
import { FieldGroup, SectionHeader, SwitchRow } from "./_shared";

interface SecurityConfig {
  requireStrongPassword: boolean; allowTwoFactor: boolean;
  sessionTimeoutMinutes: string; loginAlerts: boolean;
}

const DEFAULT: SecurityConfig = {
  requireStrongPassword: true, allowTwoFactor: false,
  sessionTimeoutMinutes: "480", loginAlerts: true,
};

export default function AccesoPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [security, setSecurity] = useState<SecurityConfig>(DEFAULT);
  const [snapshot, setSnapshot] = useState<Record<string, unknown>>({});
  const [userEmail, setUserEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [data, context] = await Promise.all([getSchoolSettings(), getCurrentAuthContext()]);
      if (!data) { toast.error("No se pudo cargar la configuración"); return; }
      setSecurity((prev) => ({ ...prev, ...(data.security || {}) }));
      setSnapshot(data as unknown as Record<string, unknown>);
      setUserEmail(context?.user?.email || "");
    } catch { toast.error("Error al cargar la configuración"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadSettings(); }, [loadSettings]);

  const handleSaveSecurity = async () => {
    setSaving(true);
    try {
      const updated = await updateSchoolSettings({ ...snapshot, security } as Parameters<typeof updateSchoolSettings>[0]);
      if (!updated) { toast.error("No se pudo guardar"); return; }
      setSecurity((prev) => ({ ...prev, ...(updated.security || {}) }));
      setSnapshot(updated as unknown as Record<string, unknown>);
      toast.success("Acceso guardado correctamente");
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  };

  const handleUpdatePassword = async () => {
    if (updatingPassword) return;
    if (!currentPassword.trim()) { toast.error("Introduce tu contraseña actual"); return; }
    if (!newPassword || !confirmPassword) { toast.error("Completa los campos de nueva contraseña"); return; }
    if (newPassword !== confirmPassword) { toast.error("La confirmación no coincide"); return; }

    if (security.requireStrongPassword) {
      const policy = validateStrongPassword(newPassword);
      if (!policy.valid) { toast.error(`Contraseña insegura: ${policy.errors[0]}`); return; }
    } else if (newPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres"); return;
    }

    setUpdatingPassword(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: userEmail, password: currentPassword });
      if (signInError) { toast.error("La contraseña actual es incorrecta"); return; }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) { toast.error(updateError.message || "No se pudo actualizar la contraseña"); return; }
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      toast.success("Contraseña actualizada correctamente");
    } catch { toast.error("No se pudo actualizar la contraseña"); }
    finally { setUpdatingPassword(false); }
  };

  if (loading) {
    return (
      <PageContainer title="Acceso" description="Seguridad y contraseña de la cuenta">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Acceso" description="Seguridad y contraseña de la cuenta">
      <div className="space-y-6 max-w-3xl">
        {/* Security policy */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-soft space-y-6">
          <SectionHeader title="Seguridad" description="Políticas de acceso para todos los usuarios de la escuela" />
          <Separator />

          <div className="space-y-4">
            <SwitchRow
              label="Exigir contraseñas fuertes"
              description="Requiere mayúsculas, números y símbolos al cambiar contraseña"
              checked={security.requireStrongPassword}
              onChange={(v) => setSecurity({ ...security, requireStrongPassword: v })}
            />
            <SwitchRow
              label="Permitir autenticación de doble factor"
              description="Habilita la opción 2FA para todos los usuarios"
              checked={security.allowTwoFactor}
              onChange={(v) => setSecurity({ ...security, allowTwoFactor: v })}
            />
            <SwitchRow
              label="Alertas de inicio de sesión"
              description="Enviar alertas por actividad de acceso relevante"
              checked={security.loginAlerts}
              onChange={(v) => setSecurity({ ...security, loginAlerts: v })}
            />
          </div>

          <FieldGroup label="Tiempo de sesión (minutos)" icon={KeyRound}>
            <Input
              type="number" min="15" max="1440"
              value={security.sessionTimeoutMinutes}
              onChange={(e) => setSecurity({ ...security, sessionTimeoutMinutes: e.target.value })}
              className="h-9 text-sm w-28"
            />
          </FieldGroup>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={loadSettings} disabled={saving}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restablecer
            </Button>
            <Button size="sm" onClick={() => void handleSaveSecurity()} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" /> Guardar
            </Button>
          </div>
        </div>

        {/* Password change */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-soft space-y-6">
          <SectionHeader title="Cambiar contraseña" description="Actualiza tu contraseña de acceso personal" />
          <Separator />

          <div className="grid gap-4 sm:grid-cols-3">
            <FieldGroup label="Contraseña actual" icon={KeyRound}>
              <Input type="password" value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••" className="h-9 text-sm" />
            </FieldGroup>
            <FieldGroup label="Nueva contraseña" icon={KeyRound}>
              <Input type="password" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={security.requireStrongPassword ? "8+ chars, mayúscula, número, símbolo" : "Mínimo 8 caracteres"}
                className="h-9 text-sm" />
            </FieldGroup>
            <FieldGroup label="Confirmar contraseña" icon={KeyRound}>
              <Input type="password" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña" className="h-9 text-sm" />
            </FieldGroup>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={() => void handleUpdatePassword()} disabled={updatingPassword}>
              <KeyRound className="h-3.5 w-3.5 mr-1" />
              {updatingPassword ? "Actualizando..." : "Actualizar contraseña"}
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
