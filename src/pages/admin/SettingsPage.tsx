import { useCallback, useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2, Clock, CreditCard, Bell, Palette, Globe, Save, RotateCcw,
  Mail, Phone, MapPin, Instagram, Facebook, Music2, ShieldCheck, KeyRound, User,
} from "lucide-react";
import { toast } from "sonner";
import { getSchoolSettings, updateSchoolSettings } from "@/lib/api/settings";
import { getCurrentAuthContext } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { validateStrongPassword } from "@/lib/security";
import type { AuthContextResponse } from "@/lib/api/auth";

interface SchoolInfo {
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  tagline: string;
  description: string;
  website: string;
  instagram: string;
  facebook: string;
  tiktok: string;
}

interface ScheduleConfig {
  startHour: string;
  endHour: string;
  slotDuration: string;
  workDays: string[];
  allowTrialClass: boolean;
  maxClassesPerStudent: string;
}

interface PaymentConfig {
  currency: string;
  dueDayOfMonth: string;
  gracePeriodDays: string;
  enableTransfer: boolean;
  enableCash: boolean;
  transferAlias: string;
  transferCBU: string;
  autoReminders: boolean;
}

interface NotificationConfig {
  emailNewEnrollment: boolean;
  emailPaymentReceived: boolean;
  emailPaymentOverdue: boolean;
  emailClassCancelled: boolean;
  reminderDaysBefore: string;
}

interface SecurityConfig {
  requireStrongPassword: boolean;
  allowTwoFactor: boolean;
  sessionTimeoutMinutes: string;
  loginAlerts: boolean;
}

interface BillingConfig {
  planType: string;
  features: {
    smartEnrollmentLink: boolean;
    attendanceSheetsPdf: boolean;
    quickIncidents: boolean;
    receptionMode: boolean;
    waitlistAutomation: boolean;
    renewalAutomation: boolean;
    courseClone: boolean;
    massCommunicationEmail: boolean;
    autoScheduler: boolean;
    customRoles: boolean;
    maxCustomRoles: number;
  };
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const HOURS = Array.from({ length: 17 }, (_, i) => {
  const h = i + 6;
  return `${String(h).padStart(2, "0")}:00`;
});

function parseBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeBillingFeatures(
  base: BillingConfig["features"],
  input?: Record<string, unknown>
): BillingConfig["features"] {
  const source = input || {};
  return {
    smartEnrollmentLink: parseBoolean(source.smartEnrollmentLink, base.smartEnrollmentLink),
    attendanceSheetsPdf: parseBoolean(source.attendanceSheetsPdf, base.attendanceSheetsPdf),
    quickIncidents: parseBoolean(source.quickIncidents, base.quickIncidents),
    receptionMode: parseBoolean(source.receptionMode, base.receptionMode),
    waitlistAutomation: parseBoolean(source.waitlistAutomation, base.waitlistAutomation),
    renewalAutomation: parseBoolean(source.renewalAutomation, base.renewalAutomation),
    courseClone: parseBoolean(source.courseClone, base.courseClone),
    massCommunicationEmail: parseBoolean(source.massCommunicationEmail, base.massCommunicationEmail),
    autoScheduler: parseBoolean(source.autoScheduler, base.autoScheduler),
    customRoles: parseBoolean(source.customRoles, base.customRoles),
    maxCustomRoles: Number(source.maxCustomRoles ?? base.maxCustomRoles) || 0,
  };
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [school, setSchool] = useState<SchoolInfo>({
    name: "DanceHub Studio",
    slug: "dancehub",
    email: "info@dancehub.com",
    phone: "(011) 5555-0000",
    address: "Av. Corrientes 1234, Piso 3",
    city: "Buenos Aires",
    tagline: "Escuela de danza para todas las edades",
    description: "Escuela de danza con más de 15 años de trayectoria ofreciendo clases de ballet, contemporáneo, jazz, tango, salsa y más.",
    website: "https://dancehub.com",
    instagram: "@dancehub.studio",
    facebook: "dancehubstudio",
    tiktok: "@dancehub",
  });

  const [schedule, setSchedule] = useState<ScheduleConfig>({
    startHour: "08:00",
    endHour: "21:00",
    slotDuration: "90",
    workDays: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
    allowTrialClass: true,
    maxClassesPerStudent: "5",
  });

  const [payment, setPayment] = useState<PaymentConfig>({
    currency: "ARS",
    dueDayOfMonth: "10",
    gracePeriodDays: "5",
    enableTransfer: true,
    enableCash: true,
    transferAlias: "dancehub.studio",
    transferCBU: "0000003100012345678901",
    autoReminders: true,
  });

  const [notifications, setNotifications] = useState<NotificationConfig>({
    emailNewEnrollment: true,
    emailPaymentReceived: true,
    emailPaymentOverdue: true,
    emailClassCancelled: true,
    reminderDaysBefore: "3",
  });

  const [security, setSecurity] = useState<SecurityConfig>({
    requireStrongPassword: true,
    allowTwoFactor: false,
    sessionTimeoutMinutes: "120",
    loginAlerts: true,
  });

  const [billing, setBilling] = useState<BillingConfig>({
    planType: "starter",
    features: {
      smartEnrollmentLink: true,
      attendanceSheetsPdf: true,
      quickIncidents: true,
      receptionMode: true,
      waitlistAutomation: false,
      renewalAutomation: false,
      courseClone: false,
      massCommunicationEmail: false,
      autoScheduler: false,
      customRoles: false,
      maxCustomRoles: 0,
    },
  });
  const [authContext, setAuthContext] = useState<AuthContextResponse | null>(null);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const activeMembership = authContext?.memberships.find(
    (membership) => membership.tenantId === authContext?.tenant.id
  ) || authContext?.memberships[0] || null;

  const roleLabel = authContext?.tenant.role === "owner"
    ? "Propietario"
    : authContext?.tenant.role === "admin"
      ? "Administrador"
      : authContext?.tenant.role === "staff"
        ? "Staff"
        : "Sin rol";

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSchoolSettings();
      if (!data) {
        toast.error("No se pudo cargar la configuración");
        return;
      }

      setSchool((prev) => ({
        ...prev,
        ...data.school,
      }));

      setSchedule((prev) => ({
        ...prev,
        ...data.schedule,
      }));

      setPayment((prev) => ({
        ...prev,
        ...data.payment,
      }));

      setNotifications((prev) => ({
        ...prev,
        ...data.notifications,
      }));

      setSecurity((prev) => ({
        ...prev,
        ...(data.security || {}),
      }));

      setBilling((prev) => ({
        ...prev,
        ...(data.billing || {}),
        features: normalizeBillingFeatures(prev.features, data.billing?.features as Record<string, unknown> | undefined),
      }));
    } catch (error) {
      console.error("Failed to load settings", error);
      toast.error("Error al cargar la configuración");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    void (async () => {
      try {
        const context = await getCurrentAuthContext();
        setAuthContext(context);
      } catch {
        setAuthContext(null);
      }
    })();
  }, []);

  const handleUpdatePassword = useCallback(async () => {
    if (updatingPassword) {
      return;
    }

    if (!currentPassword.trim()) {
      toast.error("Introduce tu contraseña actual");
      return;
    }

    if (!newPassword || !confirmPassword) {
      toast.error("Completa los campos de nueva contraseña");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("La confirmación no coincide");
      return;
    }

    if (security.requireStrongPassword) {
      const policy = validateStrongPassword(newPassword);
      if (!policy.valid) {
        toast.error(`Contraseña insegura: ${policy.errors[0]}`);
        return;
      }
    } else if (newPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setUpdatingPassword(true);
    try {
      const signInResult = await supabase.auth.signInWithPassword({
        email: authContext?.user.email || "",
        password: currentPassword,
      });

      if (signInResult.error) {
        toast.error("La contraseña actual es incorrecta");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        toast.error(updateError.message || "No se pudo actualizar la contraseña");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Contraseña actualizada correctamente");
    } catch {
      toast.error("No se pudo actualizar la contraseña");
    } finally {
      setUpdatingPassword(false);
    }
  }, [authContext?.user.email, confirmPassword, currentPassword, newPassword, security.requireStrongPassword, updatingPassword]);

  const handleSave = async (section: string) => {
    setSaving(true);
    try {
      const updated = await updateSchoolSettings({
        school,
        schedule,
        payment,
        notifications,
        security,
        billing,
      });

      if (!updated) {
        toast.error("No se pudo guardar la configuración");
        return;
      }

      setSchool((prev) => ({ ...prev, ...updated.school }));
      setSchedule((prev) => ({ ...prev, ...updated.schedule }));
      setPayment((prev) => ({ ...prev, ...updated.payment }));
      setNotifications((prev) => ({ ...prev, ...updated.notifications }));
      setSecurity((prev) => ({ ...prev, ...(updated.security || {}) }));
      setBilling((prev) => ({
        ...prev,
        ...(updated.billing || {}),
        features: normalizeBillingFeatures(prev.features, updated.billing?.features as Record<string, unknown> | undefined),
      }));
      const pastParticiple = section === "Notificaciones" ? "guardadas" : "guardada";
      toast.success(`${section} ${pastParticiple} correctamente`);
    } catch (error) {
      console.error("Failed to save settings", error);
      toast.error("Error al guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    void loadSettings();
    toast.info("Configuración recargada");
  };

  if (loading) {
    return (
      <PageContainer title="Configuración" description="Configura tu escuela de danza">
        <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
          <p className="text-sm text-muted-foreground">Cargando configuración...</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Configuración" description="Configura tu escuela de danza">
      <Tabs defaultValue="account" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="account" className="text-xs gap-1.5">
            <User className="h-3.5 w-3.5" /> Cuenta
          </TabsTrigger>
          <TabsTrigger value="school" className="text-xs gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Escuela
          </TabsTrigger>
          <TabsTrigger value="schedule" className="text-xs gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Horarios
          </TabsTrigger>
          <TabsTrigger value="payments" className="text-xs gap-1.5">
            <CreditCard className="h-3.5 w-3.5" /> Pagos
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs gap-1.5">
            <Bell className="h-3.5 w-3.5" /> Notificaciones
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Seguridad
          </TabsTrigger>
          <TabsTrigger value="billing" className="text-xs gap-1.5">
            <CreditCard className="h-3.5 w-3.5" /> Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Cuenta</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Información de acceso y cambio de contraseña</p>
            </div>
            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldGroup label="Email" icon={Mail}>
                <Input value={authContext?.user.email || "Sin correo"} readOnly className="h-9 text-sm" />
              </FieldGroup>
              <FieldGroup label="Rol" icon={ShieldCheck}>
                <Input value={roleLabel} readOnly className="h-9 text-sm" />
              </FieldGroup>
              <FieldGroup label="Escuela activa" icon={Building2}>
                <Input value={activeMembership?.tenantName || "Sin escuela"} readOnly className="h-9 text-sm" />
              </FieldGroup>
              <FieldGroup label="Slug" icon={Globe}>
                <Input value={activeMembership?.tenantSlug || school.slug} readOnly className="h-9 text-sm" />
              </FieldGroup>
            </div>

            <Separator />

            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cambiar contraseña</h4>
              <div className="grid gap-4 sm:grid-cols-3 mt-3">
                <FieldGroup label="Contraseña actual" icon={KeyRound}>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    placeholder="••••••••"
                    className="h-9 text-sm"
                  />
                </FieldGroup>
                <FieldGroup label="Nueva contraseña" icon={KeyRound}>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder={security.requireStrongPassword ? "8+ caracteres, mayúscula, número y símbolo" : "Mínimo 8 caracteres"}
                    className="h-9 text-sm"
                  />
                </FieldGroup>
                <FieldGroup label="Confirmar contraseña" icon={KeyRound}>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repite la contraseña"
                    className="h-9 text-sm"
                  />
                </FieldGroup>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              Política actual: {security.requireStrongPassword ? "contraseña fuerte requerida" : "mínimo 8 caracteres"}. Tiempo de sesión: {security.sessionTimeoutMinutes} minutos.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={() => void handleUpdatePassword()} disabled={updatingPassword}>
                <KeyRound className="h-3.5 w-3.5 mr-1" /> {updatingPassword ? "Actualizando..." : "Actualizar contraseña"}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ─── School Info ─── */}
        <TabsContent value="school">
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Información de la Escuela</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Datos principales que se mostrarán en tu página pública</p>
            </div>
            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldGroup label="Nombre de la escuela" icon={Building2}>
                <Input value={school.name} onChange={(e) => setSchool({ ...school, name: e.target.value })} className="h-9 text-sm" />
              </FieldGroup>
              <FieldGroup label="Slug (URL pública)" icon={Globe}>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">/s/</span>
                  <Input value={school.slug} onChange={(e) => setSchool({ ...school, slug: e.target.value })} className="h-9 text-sm" />
                </div>
              </FieldGroup>
              <FieldGroup label="Email de contacto" icon={Mail}>
                <Input type="email" value={school.email} onChange={(e) => setSchool({ ...school, email: e.target.value })} className="h-9 text-sm" />
              </FieldGroup>
              <FieldGroup label="Teléfono" icon={Phone}>
                <Input value={school.phone} onChange={(e) => setSchool({ ...school, phone: e.target.value })} className="h-9 text-sm" />
              </FieldGroup>
              <FieldGroup label="Dirección" icon={MapPin}>
                <Input value={school.address} onChange={(e) => setSchool({ ...school, address: e.target.value })} className="h-9 text-sm" />
              </FieldGroup>
              <FieldGroup label="Ciudad">
                <Input value={school.city} onChange={(e) => setSchool({ ...school, city: e.target.value })} className="h-9 text-sm" />
              </FieldGroup>
            </div>

            <FieldGroup label="Descripción">
              <Textarea value={school.description} onChange={(e) => setSchool({ ...school, description: e.target.value })} className="text-sm min-h-[80px]" />
            </FieldGroup>

            <FieldGroup label="Tagline público">
              <Input value={school.tagline} onChange={(e) => setSchool({ ...school, tagline: e.target.value })} className="h-9 text-sm" />
            </FieldGroup>

            <Separator />
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Redes Sociales</h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FieldGroup label="Sitio web" icon={Globe}>
                  <Input value={school.website} onChange={(e) => setSchool({ ...school, website: e.target.value })} className="h-9 text-sm" />
                </FieldGroup>
                <FieldGroup label="Instagram" icon={Instagram}>
                  <Input value={school.instagram} onChange={(e) => setSchool({ ...school, instagram: e.target.value })} className="h-9 text-sm" />
                </FieldGroup>
                <FieldGroup label="Facebook" icon={Facebook}>
                  <Input value={school.facebook} onChange={(e) => setSchool({ ...school, facebook: e.target.value })} className="h-9 text-sm" />
                </FieldGroup>
                <FieldGroup label="TikTok" icon={Music2}>
                  <Input value={school.tiktok} onChange={(e) => setSchool({ ...school, tiktok: e.target.value })} className="h-9 text-sm" />
                </FieldGroup>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleReset} disabled={saving}><RotateCcw className="h-3.5 w-3.5 mr-1" /> Restablecer</Button>
              <Button size="sm" onClick={() => void handleSave("Información de la escuela")} disabled={saving}><Save className="h-3.5 w-3.5 mr-1" /> Guardar</Button>
            </div>
          </div>
        </TabsContent>

        {/* ─── Schedule Config ─── */}
        <TabsContent value="schedule">
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Configuración de Horarios</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Define el rango horario y los días de funcionamiento</p>
            </div>
            <Separator />

            <div className="grid gap-4 sm:grid-cols-3">
              <FieldGroup label="Hora de inicio">
                <Select value={schedule.startHour} onValueChange={(v) => setSchedule({ ...schedule, startHour: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup label="Hora de fin">
                <Select value={schedule.endHour} onValueChange={(v) => setSchedule({ ...schedule, endHour: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup label="Duración del bloque (min)">
                <Select value={schedule.slotDuration} onValueChange={(v) => setSchedule({ ...schedule, slotDuration: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["30", "45", "60", "90", "120"].map((d) => <SelectItem key={d} value={d}>{d} min</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldGroup>
            </div>

            <FieldGroup label="Días de funcionamiento">
              <div className="flex flex-wrap gap-2 mt-1">
                {DAYS.map((day) => {
                  const active = schedule.workDays.includes(day);
                  return (
                    <button
                      key={day}
                      onClick={() =>
                        setSchedule({
                          ...schedule,
                          workDays: active
                            ? schedule.workDays.filter((d) => d !== day)
                            : [...schedule.workDays, day],
                        })
                      }
                      className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                        active
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </FieldGroup>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <SwitchRow
                label="Permitir clase de prueba"
                description="Los alumnos pueden tomar una clase gratis antes de inscribirse"
                checked={schedule.allowTrialClass}
                onChange={(v) => setSchedule({ ...schedule, allowTrialClass: v })}
              />
              <FieldGroup label="Máx. clases por alumno">
                <Input
                  type="number" min="1" max="10"
                  value={schedule.maxClassesPerStudent}
                  onChange={(e) => setSchedule({ ...schedule, maxClassesPerStudent: e.target.value })}
                  className="h-9 text-sm w-24"
                />
              </FieldGroup>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleReset} disabled={saving}><RotateCcw className="h-3.5 w-3.5 mr-1" /> Restablecer</Button>
              <Button size="sm" onClick={() => void handleSave("Configuración de horarios")} disabled={saving}><Save className="h-3.5 w-3.5 mr-1" /> Guardar</Button>
            </div>
          </div>
        </TabsContent>

        {/* ─── Payment Config ─── */}
        <TabsContent value="payments">
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Configuración de Pagos</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Métodos de pago aceptados y políticas de cobro</p>
            </div>
            <Separator />

            <div className="grid gap-4 sm:grid-cols-3">
              <FieldGroup label="Moneda">
                <Select value={payment.currency} onValueChange={(v) => setPayment({ ...payment, currency: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">ARS ($)</SelectItem>
                    <SelectItem value="USD">USD (US$)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup label="Día de vencimiento">
                <Input
                  type="number" min="1" max="28"
                  value={payment.dueDayOfMonth}
                  onChange={(e) => setPayment({ ...payment, dueDayOfMonth: e.target.value })}
                  className="h-9 text-sm w-24"
                />
              </FieldGroup>
              <FieldGroup label="Días de gracia">
                <Input
                  type="number" min="0" max="15"
                  value={payment.gracePeriodDays}
                  onChange={(e) => setPayment({ ...payment, gracePeriodDays: e.target.value })}
                  className="h-9 text-sm w-24"
                />
              </FieldGroup>
            </div>

            <Separator />
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Métodos Habilitados</h4>

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
                    <Input value={payment.transferAlias} onChange={(e) => setPayment({ ...payment, transferAlias: e.target.value })} className="h-9 text-sm" />
                  </FieldGroup>
                  <FieldGroup label="CBU / CVU">
                    <Input value={payment.transferCBU} onChange={(e) => setPayment({ ...payment, transferCBU: e.target.value })} className="h-9 text-sm" />
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
              <Button variant="outline" size="sm" onClick={handleReset} disabled={saving}><RotateCcw className="h-3.5 w-3.5 mr-1" /> Restablecer</Button>
              <Button size="sm" onClick={() => void handleSave("Configuración de pagos")} disabled={saving}><Save className="h-3.5 w-3.5 mr-1" /> Guardar</Button>
            </div>
          </div>
        </TabsContent>

        {/* ─── Notifications ─── */}
        <TabsContent value="notifications">
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Notificaciones</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Configura qué notificaciones recibís por email</p>
            </div>
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
              <Button variant="outline" size="sm" onClick={handleReset} disabled={saving}><RotateCcw className="h-3.5 w-3.5 mr-1" /> Restablecer</Button>
              <Button size="sm" onClick={() => void handleSave("Notificaciones")} disabled={saving}><Save className="h-3.5 w-3.5 mr-1" /> Guardar</Button>
            </div>
          </div>
        </TabsContent>

        {/* ─── Security ─── */}
        <TabsContent value="security">
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Seguridad</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Políticas básicas de seguridad para la cuenta de la escuela</p>
            </div>
            <Separator />

            <div className="space-y-4">
              <SwitchRow
                label="Exigir contraseñas fuertes"
                description="Recomienda uso de mayúsculas, números y símbolos al cambiar contraseña"
                checked={security.requireStrongPassword}
                onChange={(v) => setSecurity({ ...security, requireStrongPassword: v })}
              />
              <SwitchRow
                label="Permitir autenticación de doble factor"
                description="Habilita la opción 2FA cuando esté disponible para todos los usuarios"
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
                type="number"
                min="15"
                max="1440"
                value={security.sessionTimeoutMinutes}
                onChange={(e) => setSecurity({ ...security, sessionTimeoutMinutes: e.target.value })}
                className="h-9 text-sm w-28"
              />
            </FieldGroup>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleReset} disabled={saving}><RotateCcw className="h-3.5 w-3.5 mr-1" /> Restablecer</Button>
              <Button size="sm" onClick={() => void handleSave("Seguridad")} disabled={saving}><Save className="h-3.5 w-3.5 mr-1" /> Guardar</Button>
            </div>
          </div>
        </TabsContent>

        {/* ─── Billing ─── */}
        <TabsContent value="billing">
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Billing</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Por ahora solo se almacena el tipo de plan de la escuela</p>
            </div>
            <Separator />

            <FieldGroup label="Tipo de plan" icon={CreditCard}>
              <Select
                value={billing.planType}
                onValueChange={(v) => setBilling({ ...billing, planType: v })}
              >
                <SelectTrigger className="h-9 text-sm max-w-xs">
                  <SelectValue placeholder="Selecciona un plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </FieldGroup>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entitlements Actuales</h4>
              <SwitchRow
                label="Matrícula inteligente"
                description="Permite enlaces con filtros y preselección"
                checked={billing.features.smartEnrollmentLink}
                onChange={(v) => setBilling({ ...billing, features: { ...billing.features, smartEnrollmentLink: v } })}
              />
              <SwitchRow
                label="Hojas de asistencia PDF"
                description="Habilita generación de hojas imprimibles"
                checked={billing.features.attendanceSheetsPdf}
                onChange={(v) => setBilling({ ...billing, features: { ...billing.features, attendanceSheetsPdf: v } })}
              />
              <SwitchRow
                label="Incidencias rápidas"
                description="Permite registrar ausencias, lesiones y cambios temporales"
                checked={billing.features.quickIncidents}
                onChange={(v) => setBilling({ ...billing, features: { ...billing.features, quickIncidents: v } })}
              />
              <SwitchRow
                label="Modo recepción"
                description="Activa la vista simplificada para personal administrativo"
                checked={billing.features.receptionMode}
                onChange={(v) => setBilling({ ...billing, features: { ...billing.features, receptionMode: v } })}
              />
              <SwitchRow
                label="Lista de espera automática"
                description="Habilita waitlist automatizada con ofertas"
                checked={billing.features.waitlistAutomation}
                onChange={(v) => setBilling({ ...billing, features: { ...billing.features, waitlistAutomation: v } })}
              />
              <SwitchRow
                label="Renovaciones automáticas"
                description="Gestiona reservas y renovaciones por campaña"
                checked={billing.features.renewalAutomation}
                onChange={(v) => setBilling({ ...billing, features: { ...billing.features, renewalAutomation: v } })}
              />
              <SwitchRow
                label="Duplicado de curso"
                description="Habilita copia de curso anterior"
                checked={billing.features.courseClone}
                onChange={(v) => setBilling({ ...billing, features: { ...billing.features, courseClone: v } })}
              />
              <SwitchRow
                label="Comunicación masiva por email"
                description="Permite campañas masivas por clase, disciplina o toda la escuela"
                checked={billing.features.massCommunicationEmail}
                onChange={(v) => setBilling({ ...billing, features: { ...billing.features, massCommunicationEmail: v } })}
              />
              <SwitchRow
                label="Asistente de horario automático"
                description="Prepara la generación de propuestas A/B/C"
                checked={billing.features.autoScheduler}
                onChange={(v) => setBilling({ ...billing, features: { ...billing.features, autoScheduler: v } })}
              />
              <SwitchRow
                label="Roles personalizados"
                description="Permite crear roles con permisos granulares"
                checked={billing.features.customRoles}
                onChange={(v) => setBilling({ ...billing, features: { ...billing.features, customRoles: v } })}
              />
              <FieldGroup label="Máximo de roles personalizados" icon={ShieldCheck}>
                <Input
                  type="number"
                  min="0"
                  max="3"
                  value={billing.features.maxCustomRoles}
                  onChange={(e) => setBilling({ ...billing, features: { ...billing.features, maxCustomRoles: Number(e.target.value) || 0 } })}
                  className="h-9 text-sm w-24"
                />
              </FieldGroup>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              Estos entitlements se guardan en la configuración de billing para habilitar rollout progresivo por plan y add-ons.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleReset} disabled={saving}><RotateCcw className="h-3.5 w-3.5 mr-1" /> Restablecer</Button>
              <Button size="sm" onClick={() => void handleSave("Billing")} disabled={saving}><Save className="h-3.5 w-3.5 mr-1" /> Guardar</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

/* ── Helpers ── */

function FieldGroup({ label, icon: Icon, children }: { label: string; icon?: any; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3 text-muted-foreground" />}
        {label}
      </Label>
      {children}
    </div>
  );
}

function SwitchRow({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
