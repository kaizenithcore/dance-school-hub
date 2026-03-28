import { useCallback, useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Clock, CreditCard, Bell, Palette, Globe, Save, RotateCcw,
  Mail, Phone, MapPin, Instagram, Facebook, Music2, ShieldCheck, KeyRound, User, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { getSchoolSettings, updateSchoolSettings } from "@/lib/api/settings";
import { redirectToBillingCheckout } from "@/lib/api/stripe";
import type { BillingCycle } from "@/lib/api/stripe";
import { getCurrentAuthContext } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { validateStrongPassword } from "@/lib/security";
import type { AuthContextResponse } from "@/lib/api/auth";
import { useSearchParams } from "react-router-dom";
import { planCatalog, planOrder, subscriptionAddonCatalog, type PlanType } from "@/lib/commercialCatalog";

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
  recurringSelectionMode: "linked" | "single_day";
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
  billingCycle: BillingCycle;
  extraStudentBlocks: number;
  addons: {
    customDomain: boolean;
    prioritySupport: boolean;
    waitlistAutomation: boolean;
    renewalAutomation: boolean;
  };
  limits: {
    includedActiveStudents: number;
    maxActiveStudents: number;
  };
  pricing: {
    monthlyPriceEur: number;
    extraStudentsBlockSize: number;
    extraStudentsBlockPriceEur: number;
    addons: {
      customDomain: number;
      prioritySupport: number;
      waitlistAutomation: number;
      renewalAutomation: number;
    };
  };
  features: {
    smartEnrollmentLink: boolean;
    attendanceSheetsPdf: boolean;
    quickIncidents: boolean;
    receptionMode: boolean;
    examSuite: boolean;
    waitlistAutomation: boolean;
    renewalAutomation: boolean;
    courseClone: boolean;
    massCommunicationEmail: boolean;
    autoScheduler: boolean;
    customRoles: boolean;
    maxCustomRoles: number;
  };
}

interface PlanInfo {
  label: string;
  monthlyPriceEur: number;
  annualEffectiveMonthlyPriceEur: number;
  annualTotalEur: number;
  includedActiveStudents: number;
  extraStudentsBlockSize: number;
  extraStudentsBlockPriceEur: number;
  highlights: string[];
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const HOURS = Array.from({ length: 17 }, (_, i) => {
  const h = i + 6;
  return `${String(h).padStart(2, "0")}:00`;
});

const PLAN_CATALOG: Record<PlanType, PlanInfo> = {
  starter: {
    label: planCatalog.starter.name,
    monthlyPriceEur: planCatalog.starter.billing.monthlyPriceEur,
    annualEffectiveMonthlyPriceEur: planCatalog.starter.billing.annualEffectiveMonthlyPriceEur,
    annualTotalEur: planCatalog.starter.billing.annualTotalEur,
    includedActiveStudents: planCatalog.starter.limits.includedActiveStudents,
    extraStudentsBlockSize: planCatalog.starter.extraStudentBlocks.size,
    extraStudentsBlockPriceEur: planCatalog.starter.extraStudentBlocks.monthlyPriceEur,
    highlights: planCatalog.starter.display.adminHighlights,
  },
  pro: {
    label: planCatalog.pro.name,
    monthlyPriceEur: planCatalog.pro.billing.monthlyPriceEur,
    annualEffectiveMonthlyPriceEur: planCatalog.pro.billing.annualEffectiveMonthlyPriceEur,
    annualTotalEur: planCatalog.pro.billing.annualTotalEur,
    includedActiveStudents: planCatalog.pro.limits.includedActiveStudents,
    extraStudentsBlockSize: planCatalog.pro.extraStudentBlocks.size,
    extraStudentsBlockPriceEur: planCatalog.pro.extraStudentBlocks.monthlyPriceEur,
    highlights: planCatalog.pro.display.adminHighlights,
  },
  enterprise: {
    label: planCatalog.enterprise.name,
    monthlyPriceEur: planCatalog.enterprise.billing.monthlyPriceEur,
    annualEffectiveMonthlyPriceEur: planCatalog.enterprise.billing.annualEffectiveMonthlyPriceEur,
    annualTotalEur: planCatalog.enterprise.billing.annualTotalEur,
    includedActiveStudents: planCatalog.enterprise.limits.includedActiveStudents,
    extraStudentsBlockSize: planCatalog.enterprise.extraStudentBlocks.size,
    extraStudentsBlockPriceEur: planCatalog.enterprise.extraStudentBlocks.monthlyPriceEur,
    highlights: planCatalog.enterprise.display.adminHighlights,
  },
};

const DEFAULT_BILLING: BillingConfig = {
  planType: "starter",
  billingCycle: "annual",
  extraStudentBlocks: 0,
  addons: {
    customDomain: false,
    prioritySupport: false,
    waitlistAutomation: false,
    renewalAutomation: false,
  },
  limits: {
    includedActiveStudents: PLAN_CATALOG.starter.includedActiveStudents,
    maxActiveStudents: PLAN_CATALOG.starter.includedActiveStudents,
  },
  pricing: {
    monthlyPriceEur: PLAN_CATALOG.starter.monthlyPriceEur,
    extraStudentsBlockSize: PLAN_CATALOG.starter.extraStudentsBlockSize,
    extraStudentsBlockPriceEur: PLAN_CATALOG.starter.extraStudentsBlockPriceEur,
    addons: {
      customDomain: subscriptionAddonCatalog.customDomain.monthlyPriceEur,
      prioritySupport: subscriptionAddonCatalog.prioritySupport.monthlyPriceEur,
      waitlistAutomation: subscriptionAddonCatalog.waitlistAutomation.monthlyPriceEur,
      renewalAutomation: subscriptionAddonCatalog.renewalAutomation.monthlyPriceEur,
    },
  },
  features: {
    smartEnrollmentLink: true,
    attendanceSheetsPdf: true,
    quickIncidents: true,
    receptionMode: true,
    examSuite: false,
    waitlistAutomation: false,
    renewalAutomation: false,
    courseClone: false,
    massCommunicationEmail: false,
    autoScheduler: false,
    customRoles: false,
    maxCustomRoles: 0,
  },
};

function resolvePlanType(value: string): PlanType {
  if (value === "pro" || value === "enterprise") {
    return value;
  }
  return "starter";
}

function calculateMonthlyAmount(config: BillingConfig): number {
  const planType = resolvePlanType(config.planType);
  const plan = PLAN_CATALOG[planType];
  const effectiveBlocks = planType === "starter" ? 0 : config.extraStudentBlocks;
  const addonsTotal =
    (config.addons.customDomain ? config.pricing.addons.customDomain : 0)
    + (config.addons.prioritySupport ? config.pricing.addons.prioritySupport : 0);
  const blocksTotal = effectiveBlocks * plan.extraStudentsBlockPriceEur;

  return plan.monthlyPriceEur + addonsTotal + blocksTotal;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
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
    examSuite: parseBoolean(source.examSuite, base.examSuite),
    waitlistAutomation: parseBoolean(source.waitlistAutomation, base.waitlistAutomation),
    renewalAutomation: parseBoolean(source.renewalAutomation, base.renewalAutomation),
    courseClone: parseBoolean(source.courseClone, base.courseClone),
    massCommunicationEmail: parseBoolean(source.massCommunicationEmail, base.massCommunicationEmail),
    autoScheduler: parseBoolean(source.autoScheduler, base.autoScheduler),
    customRoles: parseBoolean(source.customRoles, base.customRoles),
    maxCustomRoles: Number(source.maxCustomRoles ?? base.maxCustomRoles) || 0,
  };
}

function normalizeBillingConfig(base: BillingConfig, input?: Record<string, unknown>): BillingConfig {
  const source = input || {};
  const addons = asRecord(source.addons);
  const limits = asRecord(source.limits);
  const pricing = asRecord(source.pricing);
  const pricingAddons = asRecord(pricing.addons);
  const customDomainAddon = asRecord(pricingAddons.customDomain);
  const prioritySupportAddon = asRecord(pricingAddons.prioritySupport);
  const waitlistAddon = asRecord(pricingAddons.waitlistAutomation);

  return {
    planType: typeof source.planType === "string" ? source.planType : base.planType,
    billingCycle: source.billingCycle === "monthly" ? "monthly" : "annual",
    extraStudentBlocks: Number(source.extraStudentBlocks ?? base.extraStudentBlocks) || 0,
    addons: {
      customDomain: parseBoolean(addons.customDomain, base.addons.customDomain),
      prioritySupport: parseBoolean(addons.prioritySupport, base.addons.prioritySupport),
      waitlistAutomation: false,
      renewalAutomation: false,
    },
    limits: {
      includedActiveStudents: Number(limits.includedActiveStudents ?? base.limits.includedActiveStudents) || base.limits.includedActiveStudents,
      maxActiveStudents: Number(limits.maxActiveStudents ?? base.limits.maxActiveStudents) || base.limits.maxActiveStudents,
    },
    pricing: {
      monthlyPriceEur: Number(pricing.monthlyPriceEur ?? base.pricing.monthlyPriceEur) || base.pricing.monthlyPriceEur,
      extraStudentsBlockSize: Number(pricing.extraStudentsBlockSize ?? base.pricing.extraStudentsBlockSize) || base.pricing.extraStudentsBlockSize,
      extraStudentsBlockPriceEur: Number(pricing.extraStudentsBlockPriceEur ?? base.pricing.extraStudentsBlockPriceEur) || base.pricing.extraStudentsBlockPriceEur,
      addons: {
        customDomain: Number(customDomainAddon.monthlyPriceEur ?? base.pricing.addons.customDomain) || base.pricing.addons.customDomain,
        prioritySupport: Number(prioritySupportAddon.monthlyPriceEur ?? base.pricing.addons.prioritySupport) || base.pricing.addons.prioritySupport,
        waitlistAutomation: Number(waitlistAddon.monthlyPriceEur ?? base.pricing.addons.waitlistAutomation) || base.pricing.addons.waitlistAutomation,
        renewalAutomation: Number(asRecord(pricingAddons.renewalAutomation).monthlyPriceEur ?? base.pricing.addons.renewalAutomation) || base.pricing.addons.renewalAutomation,
      },
    },
    features: normalizeBillingFeatures(base.features, source.features as Record<string, unknown> | undefined),
  };
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stripeCheckoutLoading, setStripeCheckoutLoading] = useState(false);
  const [thankYouOpen, setThankYouOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [school, setSchool] = useState<SchoolInfo>({
    name: "Nexa Studio",
    slug: "nexa",
    email: "info@nexa.com",
    phone: "(011) 5555-0000",
    address: "Av. Corrientes 1234, Piso 3",
    city: "Buenos Aires",
    tagline: "Escuela de danza para todas las edades",
    description: "Escuela de danza con más de 15 años de trayectoria ofreciendo clases de ballet, contemporáneo, jazz, tango, salsa y más.",
    website: "https://nexa.com",
    instagram: "@nexa.studio",
    facebook: "nexastudio",
    tiktok: "@nexa",
  });

  const [schedule, setSchedule] = useState<ScheduleConfig>({
    startHour: "08:00",
    endHour: "21:00",
    slotDuration: "90",
    workDays: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
    recurringSelectionMode: "linked",
    allowTrialClass: true,
    maxClassesPerStudent: "5",
  });

  const [payment, setPayment] = useState<PaymentConfig>({
    currency: "EUR",
    dueDayOfMonth: "10",
    gracePeriodDays: "5",
    enableTransfer: true,
    enableCash: true,
    transferAlias: "nexa.studio",
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
    sessionTimeoutMinutes: "480",
    loginAlerts: true,
  });

  const [billing, setBilling] = useState<BillingConfig>(DEFAULT_BILLING);
  const [savedBillingSnapshot, setSavedBillingSnapshot] = useState<BillingConfig>(DEFAULT_BILLING);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<PlanType>("starter");
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

      const nextBilling = normalizeBillingConfig(DEFAULT_BILLING, data.billing as Record<string, unknown> | undefined);
      setBilling(nextBilling);
      setSavedBillingSnapshot(nextBilling);
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

  useEffect(() => {
    const status = searchParams.get("stripe");
    if (status === "success") {
      setThankYouOpen(true);
      toast.success("Pago confirmado. Gracias por tu compra.");
      void loadSettings();
      return;
    }

    if (status === "cancel") {
      toast.info("Checkout cancelado. Puedes reintentarlo cuando quieras.");
    }
  }, [loadSettings, searchParams]);

  const clearStripeQueryParam = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("stripe");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleStripeCheckout = useCallback(async () => {
    if (stripeCheckoutLoading) {
      return;
    }

    setStripeCheckoutLoading(true);
    try {
      const successUrl = `${window.location.origin}/admin/settings?tab=billing&stripe=success`;
      const cancelUrl = `${window.location.origin}/admin/settings?tab=billing&stripe=cancel`;

      await redirectToBillingCheckout({
        planType: resolvePlanType(billing.planType),
        billingCycle: billing.billingCycle,
        extraStudentBlocks: resolvePlanType(billing.planType) === "starter" ? 0 : billing.extraStudentBlocks,
        addons: {
          customDomain: billing.addons.customDomain,
          prioritySupport: billing.addons.prioritySupport,
          waitlistAutomation: billing.addons.waitlistAutomation,
          renewalAutomation: billing.addons.renewalAutomation,
        },
        successUrl,
        cancelUrl,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo iniciar el checkout";
      toast.error(message);
      setStripeCheckoutLoading(false);
    }
  }, [billing, stripeCheckoutLoading]);

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
    if (section === "Billing") {
      const billingChanged = JSON.stringify(billing) !== JSON.stringify(savedBillingSnapshot);
      if (billingChanged) {
        toast.info("Redirigiendo a Stripe para completar el cambio de billing...");
        await handleStripeCheckout();
        return;
      }
    }

    setSaving(true);
    try {
      const updated = await updateSchoolSettings({
        school,
        schedule: schedule as unknown as Record<string, unknown>,
        payment: payment as unknown as Record<string, unknown>,
        notifications: notifications as unknown as Record<string, unknown>,
        security: security as unknown as Record<string, unknown>,
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
      const nextBilling = normalizeBillingConfig(DEFAULT_BILLING, updated.billing as Record<string, unknown> | undefined);
      setBilling(nextBilling);
      setSavedBillingSnapshot(nextBilling);
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

  const selectedPlan = PLAN_CATALOG[resolvePlanType(billing.planType)];
  const effectiveBlocks = billing.planType === "starter" ? 0 : billing.extraStudentBlocks;
  const recalculatedIncludedStudents = selectedPlan.includedActiveStudents;
  const recalculatedMaxStudents = recalculatedIncludedStudents + effectiveBlocks * selectedPlan.extraStudentsBlockSize;
  const currentMonthlyAmount = calculateMonthlyAmount(savedBillingSnapshot);
  const nextMonthlyAmount = calculateMonthlyAmount(billing);
  const amountDiff = nextMonthlyAmount - currentMonthlyAmount;
  const nextCycleAmountLabel = billing.billingCycle === "annual"
    ? `${nextMonthlyAmount * 12} EUR/año`
    : `${nextMonthlyAmount} EUR/mes`;

  return (
    <PageContainer title="Configuración" description="Configura tu escuela de danza">
      <Tabs defaultValue={searchParams.get("tab") === "billing" ? "billing" : "account"} className="space-y-4">
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

            <FieldGroup label="Ciclo de facturación" icon={CreditCard}>
              <Select
                value={billing.billingCycle}
                onValueChange={(value) => setBilling({
                  ...billing,
                  billingCycle: value === "monthly" ? "monthly" : "annual",
                })}
              >
                <SelectTrigger className="h-9 text-sm w-48">
                  <SelectValue placeholder="Selecciona ciclo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Anual (recomendado)</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </FieldGroup>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldGroup label="Email" icon={Mail}>
                <Input
                  type="email"
                  value={school.email}
                  onChange={(event) => setSchool({ ...school, email: event.target.value })}
                  className="h-9 text-sm"
                />
              </FieldGroup>
              <FieldGroup label="Rol" icon={ShieldCheck}>
                <Input value={roleLabel} readOnly className="h-9 text-sm" />
              </FieldGroup>
              <FieldGroup label="Escuela activa" icon={Building2}>
                <Input
                  value={school.name}
                  onChange={(event) => setSchool({ ...school, name: event.target.value })}
                  className="h-9 text-sm"
                />
              </FieldGroup>
              <FieldGroup label="Slug" icon={Globe}>
                <Input
                  value={school.slug}
                  onChange={(event) => setSchool({ ...school, slug: event.target.value })}
                  className="h-9 text-sm"
                />
              </FieldGroup>
              <FieldGroup label="Teléfono" icon={Phone}>
                <Input
                  value={school.phone}
                  onChange={(event) => setSchool({ ...school, phone: event.target.value })}
                  className="h-9 text-sm"
                />
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
              <Button
                variant="outline"
                onClick={() => void handleSave("Cuenta")}
                disabled={saving}
              >
                <Save className="h-3.5 w-3.5 mr-1" /> Guardar datos de cuenta
              </Button>
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

            <FieldGroup label="Selección de clases recurrentes">
              <Select
                value={schedule.recurringSelectionMode}
                onValueChange={(v) => setSchedule({ ...schedule, recurringSelectionMode: v as "linked" | "single_day" })}
              >
                <SelectTrigger className="h-9 text-sm sm:max-w-[360px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="linked">Vinculada (si selecciona una, se seleccionan todas)</SelectItem>
                  <SelectItem value="single_day">Individual por día (permitir seleccionar solo algunos días)</SelectItem>
                </SelectContent>
              </Select>
            </FieldGroup>

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
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="ARS">ARS ($)</SelectItem>
                    <SelectItem value="USD">USD (US$)</SelectItem>
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
              <h3 className="text-sm font-semibold text-foreground">Planes y limites</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Solo se limita por alumnos activos. No se limita profesores, clases, aulas ni administradores.</p>
            </div>
            <Separator />

            <FieldGroup label="Tipo de plan" icon={CreditCard}>
              <div className="grid gap-2 sm:grid-cols-3 max-w-2xl">
                {planOrder.map((planKey) => {
                  const isActive = resolvePlanType(billing.planType) === planKey;
                  return (
                    <button
                      key={planKey}
                      type="button"
                      onClick={() => {
                        setBilling({
                          ...billing,
                          planType: planKey,
                          extraStudentBlocks: planKey === "starter" ? 0 : billing.extraStudentBlocks,
                          addons: {
                            ...billing.addons,
                            waitlistAutomation: false,
                            renewalAutomation: false,
                          },
                        });
                        setSelectedPlanForModal(planKey);
                        setPlanModalOpen(true);
                      }}
                      className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                        isActive
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <p className="text-sm font-semibold">{PLAN_CATALOG[planKey].label}</p>
                      <p className="text-xs">{PLAN_CATALOG[planKey].monthlyPriceEur} EUR/mes</p>
                      <p className="text-[10px] text-muted-foreground">{PLAN_CATALOG[planKey].annualEffectiveMonthlyPriceEur} EUR/mes (anual)</p>
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">Al seleccionar un plan se abre una comparativa con precio y ventajas.</p>
            </FieldGroup>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Capacidad de alumnos</h4>
              <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
                <p>Incluidos por plan: <span className="font-medium text-foreground">{recalculatedIncludedStudents}</span> alumnos activos</p>
                <p>Bloques extra activos: <span className="font-medium text-foreground">{effectiveBlocks}</span></p>
                <p>Capacidad total actual: <span className="font-medium text-foreground">{recalculatedMaxStudents}</span> alumnos activos</p>
              </div>

              <FieldGroup label="Bloques extra de alumnos" icon={CreditCard}>
                <Input
                  type="number"
                  min="0"
                  value={billing.extraStudentBlocks}
                  onChange={(e) => setBilling({ ...billing, extraStudentBlocks: Math.max(0, Number(e.target.value) || 0) })}
                  disabled={billing.planType === "starter"}
                  className="h-9 text-sm w-32"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {billing.planType === "starter"
                    ? "Starter no admite bloques extra de alumnos."
                    : `Cada bloque anade ${selectedPlan.extraStudentsBlockSize} alumnos por ${selectedPlan.extraStudentsBlockPriceEur} EUR/mes.`}
                </p>
              </FieldGroup>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add-ons</h4>
              <SwitchRow
                label="Dominio personalizado"
                description={`matricula.tuescuela.com (${billing.pricing.addons.customDomain} EUR/mes)`}
                checked={billing.addons.customDomain}
                onChange={(v) => setBilling({ ...billing, addons: { ...billing.addons, customDomain: v } })}
              />
              <SwitchRow
                label="Soporte prioritario"
                description={`Respuesta en menos de 24h y onboarding (${billing.pricing.addons.prioritySupport} EUR/mes)`}
                checked={billing.addons.prioritySupport}
                onChange={(v) => setBilling({ ...billing, addons: { ...billing.addons, prioritySupport: v } })}
              />
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              Precio base del plan actual: {selectedPlan.monthlyPriceEur} EUR/mes. El acceso funcional se calcula automaticamente por plan + add-ons.
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resumen de importe</h4>
                <Badge variant="outline">
                  {amountDiff === 0 ? "Sin cambios" : amountDiff > 0 ? `+${amountDiff} EUR/mes` : `${amountDiff} EUR/mes`}
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="text-[11px] text-muted-foreground">Cuantia actual</p>
                  <p className="text-lg font-semibold text-foreground">{currentMonthlyAmount} EUR/mes</p>
                </div>
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                  <p className="text-[11px] text-muted-foreground">Nueva cuantia con cambios</p>
                  <p className="text-lg font-semibold text-foreground">{nextMonthlyAmount} EUR/mes</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{nextCycleAmountLabel}</p>
                </div>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Base {selectedPlan.label}: <span className="font-medium text-foreground">{selectedPlan.monthlyPriceEur} EUR</span></p>
                <p>Bloques ({effectiveBlocks} x {selectedPlan.extraStudentsBlockPriceEur} EUR): <span className="font-medium text-foreground">{effectiveBlocks * selectedPlan.extraStudentsBlockPriceEur} EUR</span></p>
                <p>Add-ons activos: <span className="font-medium text-foreground">{
                  (billing.addons.customDomain ? billing.pricing.addons.customDomain : 0)
                  + (billing.addons.prioritySupport ? billing.pricing.addons.prioritySupport : 0)
                } EUR</span></p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleReset} disabled={saving}><RotateCcw className="h-3.5 w-3.5 mr-1" /> Restablecer</Button>
              <Button size="sm" variant="secondary" onClick={() => void handleStripeCheckout()} disabled={stripeCheckoutLoading}>
                <CreditCard className="h-3.5 w-3.5 mr-1" /> {stripeCheckoutLoading ? "Redirigiendo..." : "Continuar pago en Stripe"}
              </Button>
              <Button size="sm" onClick={() => void handleSave("Billing")} disabled={saving}><Save className="h-3.5 w-3.5 mr-1" /> Guardar</Button>
            </div>
          </div>

          <Dialog open={planModalOpen} onOpenChange={setPlanModalOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Comparativa de planes</DialogTitle>
                <DialogDescription>Revisa precio y ventajas antes de confirmar el cambio.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-3">
                {planOrder.map((planKey) => {
                  const plan = PLAN_CATALOG[planKey];
                  const isSelected = selectedPlanForModal === planKey;
                  return (
                    <div
                      key={planKey}
                      className={`rounded-lg border p-4 ${isSelected ? "border-primary bg-primary/5" : "border-border bg-background"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{plan.label}</p>
                        {isSelected ? <Badge>Seleccionado</Badge> : null}
                      </div>
                      <p className="mt-2 text-xl font-bold text-foreground">{plan.monthlyPriceEur} EUR/mes</p>
                      <p className="mt-1 text-xs text-muted-foreground">{plan.annualEffectiveMonthlyPriceEur} EUR/mes (anual)</p>
                      <p className="text-[10px] text-muted-foreground">Total anual: {plan.annualTotalEur} EUR</p>
                      <p className="mt-1 text-xs text-muted-foreground">Incluye {plan.includedActiveStudents} alumnos activos</p>
                      <p className="text-xs text-muted-foreground">Bloque extra: {plan.extraStudentsBlockSize} alumnos por {plan.extraStudentsBlockPriceEur} EUR/mes</p>
                      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                        {plan.highlights.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>

      <Dialog
        open={thankYouOpen}
        onOpenChange={(nextOpen) => {
          setThankYouOpen(nextOpen);
          if (!nextOpen) {
            clearStripeQueryParam();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <DialogTitle className="text-center">Gracias por tu compra</DialogTitle>
            <DialogDescription className="text-center">
              Tu suscripcion se ha procesado correctamente en Stripe. En breve veras reflejado el nuevo plan y capacidades.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <Button
              onClick={() => {
                setThankYouOpen(false);
                clearStripeQueryParam();
              }}
            >
              Perfecto, continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
