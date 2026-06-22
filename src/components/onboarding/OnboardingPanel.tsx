/**
 * OnboardingPanel — guided 5-step setup panel.
 *
 * Fixed 320px right panel on desktop; bottom banner on mobile.
 * Each step contains inline forms that perform real API actions.
 * The user can navigate the app freely while the panel guides them.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2, GraduationCap, Users, CreditCard, Smartphone,
  ChevronRight, ChevronLeft, Check, X, ArrowRight, ExternalLink,
  Upload, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { getSchoolSettings, updateSchoolSettings } from "@/lib/api/settings";
import type { SchoolSettingsPayload } from "@/lib/api/settings";
import { updateTenantBranding, getTenantBranding } from "@/lib/api/branding";
import { createClass } from "@/lib/api/classes";
import { createStudent } from "@/lib/api/students";

// ── Storage keys ───────────────────────────────────────────────────────────────

const ONBOARDING_STATE_KEY = "nexa:onboarding:state:v1";
const ONBOARDING_COLLAPSED_KEY = "nexa:onboarding:collapsed:v1";

// ── Types ──────────────────────────────────────────────────────────────────────

type StepId = 1 | 2 | 3 | 4 | 5;

interface OnboardingState {
  activeStep: StepId;
  completed: StepId[];
  dismissed: boolean;
}

// ── Step metadata ──────────────────────────────────────────────────────────────

const STEPS: Array<{ id: StepId; shortTitle: string; icon: React.ElementType }> = [
  { id: 1, shortTitle: "Tu escuela", icon: Building2 },
  { id: 2, shortTitle: "Primera clase", icon: GraduationCap },
  { id: 3, shortTitle: "Alumnos", icon: Users },
  { id: 4, shortTitle: "Cobros", icon: CreditCard },
  { id: 5, shortTitle: "Portal", icon: Smartphone },
];

const WEEKDAYS = [
  { label: "Lunes", value: 1 },
  { label: "Martes", value: 2 },
  { label: "Miércoles", value: 3 },
  { label: "Jueves", value: 4 },
  { label: "Viernes", value: 5 },
  { label: "Sábado", value: 6 },
  { label: "Domingo", value: 0 },
];

// ── State persistence ──────────────────────────────────────────────────────────

function readState(): OnboardingState {
  try {
    const raw = window.localStorage.getItem(ONBOARDING_STATE_KEY);
    if (!raw) return { activeStep: 1, completed: [], dismissed: false };
    return JSON.parse(raw) as OnboardingState;
  } catch {
    return { activeStep: 1, completed: [], dismissed: false };
  }
}

function saveState(s: OnboardingState) {
  window.localStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(s));
}

function readCollapsed(): boolean {
  return window.localStorage.getItem(ONBOARDING_COLLAPSED_KEY) === "1";
}

function saveCollapsed(v: boolean) {
  window.localStorage.setItem(ONBOARDING_COLLAPSED_KEY, v ? "1" : "0");
}

// ── Step 1 — Tu escuela ────────────────────────────────────────────────────────

function Step1({
  onDone,
}: {
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<SchoolSettingsPayload | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      const data = await getSchoolSettings();
      if (data) {
        setName(data.school?.name ?? "");
        setCity(data.school?.city ?? "");
        setSnapshot(data);
      }
      const branding = await getTenantBranding();
      if (branding?.logo_url) setLogoPreview(branding.logo_url);
      setLoading(false);
    })();
  }, []);

  const handleFileDrop = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Solo se aceptan imágenes"); return; }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileDrop(file);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("El nombre de la escuela es obligatorio"); return; }
    setSaving(true);
    try {
      if (logoFile) {
        await updateTenantBranding({}, logoFile);
      }
      if (snapshot) {
        await updateSchoolSettings({
          ...snapshot,
          school: { ...snapshot.school, name: name.trim(), city: city.trim() },
        });
      }
      toast.success("Información de la escuela guardada");
      onDone();
    } catch {
      toast.error("No se pudo guardar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Logo drop zone */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Logo de la escuela</Label>
        <div
          ref={dropRef}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => document.getElementById("onboarding-logo-input")?.click()}
          className="relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        >
          {logoPreview ? (
            <img src={logoPreview} alt="Logo" className="h-16 w-16 rounded-lg object-cover shadow-sm" />
          ) : (
            <>
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="text-xs text-muted-foreground text-center">Arrastra tu logo aquí o haz clic para subir</p>
            </>
          )}
          <input
            id="onboarding-logo-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileDrop(f); }}
          />
        </div>
        {logoPreview && (
          <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(null); }}
            className="mt-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors">
            Quitar logo
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Nombre de la escuela <span className="text-destructive">*</span></Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ballet Studio Madrid" className="h-8 text-sm" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Ciudad</Label>
        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Madrid" className="h-8 text-sm" />
      </div>

      <Button size="sm" className="w-full" onClick={() => void handleSave()} disabled={saving || !name.trim()}>
        {saving ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Guardando...</> : <>Guardar y continuar <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></>}
      </Button>
    </div>
  );
}

// ── Step 2 — Primera clase ─────────────────────────────────────────────────────

function Step2({ onDone }: { onDone: () => void }) {
  const [className, setClassName] = useState("");
  const [weekday, setWeekday] = useState("1");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [teacher, setTeacher] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!className.trim()) { toast.error("El nombre de la clase es obligatorio"); return; }
    setSaving(true);
    try {
      const result = await createClass({
        name: className.trim(),
        capacity: 20,
        price: 0,
        status: "active",
      });
      if (!result) throw new Error("No se pudo crear la clase");
      toast.success(`Clase "${className}" creada`);
      onDone();
    } catch {
      toast.error("No se pudo crear la clase. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Nombre de la clase <span className="text-destructive">*</span></Label>
        <Input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="Ballet Adultos" className="h-8 text-sm" autoFocus />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Hora inicio</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Hora fin</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-8 text-sm" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Día de la semana</Label>
        <Select value={weekday} onValueChange={setWeekday}>
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {WEEKDAYS.map((d) => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Profesor (opcional)</Label>
        <Input value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="Nombre del profesor" className="h-8 text-sm" />
      </div>

      <p className="text-[10px] text-muted-foreground">El horario detallado se configura desde la sección Clases.</p>

      <Button size="sm" className="w-full" onClick={() => void handleSave()} disabled={saving || !className.trim()}>
        {saving ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Creando...</> : <>Crear clase <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></>}
      </Button>
    </div>
  );
}

// ── Step 3 — Alumnos ───────────────────────────────────────────────────────────

function Step3({ onDone }: { onDone: () => void; navigate: ReturnType<typeof useNavigate> }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"choose" | "manual">("choose");
  const [studentName, setStudentName] = useState("");
  const [contact, setContact] = useState("");
  const [saving, setSaving] = useState(false);

  const handleManualSave = async () => {
    if (!studentName.trim()) { toast.error("El nombre del alumno es obligatorio"); return; }
    setSaving(true);
    try {
      const id = await createStudent({
        name: studentName.trim(),
        email: contact.includes("@") ? contact.trim() : "",
        phone: !contact.includes("@") ? contact.trim() : "",
        status: "active",
        paymentType: "monthly",
      });
      if (!id) throw new Error("No se pudo crear el alumno");
      toast.success(`Alumno "${studentName}" creado`);
      onDone();
    } catch {
      toast.error("No se pudo crear el alumno. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (mode === "choose") {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">Añade al menos un alumno para configurar los cobros correctamente.</p>

        <button
          type="button"
          onClick={() => setMode("manual")}
          className="w-full flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left hover:border-primary/50 hover:bg-accent/40 transition-colors"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Añadir uno manualmente</p>
            <p className="text-[10px] text-muted-foreground">Formulario rápido con nombre y contacto</p>
          </div>
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
        </button>

        <button
          type="button"
          onClick={() => { navigate("/admin/students/import"); onDone(); }}
          className="w-full flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left hover:border-primary/50 hover:bg-accent/40 transition-colors"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Upload className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Importar desde Excel / CSV</p>
            <p className="text-[10px] text-muted-foreground">Sube tu lista de alumnos en bloque</p>
          </div>
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button type="button" onClick={() => setMode("choose")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3 w-3" /> Volver
      </button>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Nombre del alumno <span className="text-destructive">*</span></Label>
        <Input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Ana García" className="h-8 text-sm" autoFocus />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Email o teléfono</Label>
        <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="ana@email.com o +34 600..." className="h-8 text-sm" />
        <p className="text-[10px] text-muted-foreground">Se detecta automáticamente si es email o teléfono.</p>
      </div>

      <Button size="sm" className="w-full" onClick={() => void handleManualSave()} disabled={saving || !studentName.trim()}>
        {saving ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Creando...</> : <>Añadir alumno <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></>}
      </Button>
    </div>
  );
}

// ── Step 4 — Cobros ────────────────────────────────────────────────────────────

function Step4({ onDone }: { onDone: () => void }) {
  const [currency, setCurrency] = useState("EUR");
  const [dueDay, setDueDay] = useState("10");
  const [enableTransfer, setEnableTransfer] = useState(false);
  const [enableCash, setEnableCash] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snapshot, setSnapshot] = useState<SchoolSettingsPayload | null>(null);

  useEffect(() => {
    void (async () => {
      const data = await getSchoolSettings();
      if (data) {
        const p = data.payment as Record<string, unknown>;
        if (p.currency) setCurrency(p.currency as string);
        if (p.dueDayOfMonth) setDueDay(String(p.dueDayOfMonth));
        if (p.enableTransfer !== undefined) setEnableTransfer(Boolean(p.enableTransfer));
        if (p.enableCash !== undefined) setEnableCash(Boolean(p.enableCash));
        setSnapshot(data);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (snapshot) {
        await updateSchoolSettings({
          ...snapshot,
          payment: {
            ...(snapshot.payment || {}),
            currency,
            dueDayOfMonth: dueDay,
            enableTransfer,
            enableCash,
          },
        });
      }
      toast.success("Configuración de cobros guardada");
      onDone();
    } catch {
      toast.error("No se pudo guardar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Moneda</Label>
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="EUR">EUR (€) — Euro</SelectItem>
            <SelectItem value="ARS">ARS ($) — Peso argentino</SelectItem>
            <SelectItem value="USD">USD ($) — Dólar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Día de vencimiento mensual</Label>
        <Input type="number" min="1" max="28" value={dueDay} onChange={(e) => setDueDay(e.target.value)} className="h-8 text-sm w-24" />
        <p className="text-[10px] text-muted-foreground">Los pagos vencen el día {dueDay} de cada mes.</p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Métodos de pago que aceptas</Label>
        <div className="flex gap-2">
          {[
            { label: "Transferencia", value: enableTransfer, setter: setEnableTransfer },
            { label: "Efectivo", value: enableCash, setter: setEnableCash },
          ].map(({ label, value, setter }) => (
            <button
              key={label}
              type="button"
              onClick={() => setter(!value)}
              className={cn(
                "flex-1 rounded-lg border py-2 text-xs font-medium transition-colors",
                value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              {value && <Check className="inline h-3 w-3 mr-1" />}
              {label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">Stripe / tarjeta se configura desde Plan y facturación.</p>
      </div>

      <Button size="sm" className="w-full" onClick={() => void handleSave()} disabled={saving}>
        {saving ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Guardando...</> : <>Guardar y continuar <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></>}
      </Button>
    </div>
  );
}

// ── Step 5 — Portal ────────────────────────────────────────────────────────────

function Step5({ onDone, schoolSlug }: { onDone: () => void; schoolSlug?: string }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10">
            <Smartphone className="h-4 w-4 text-success" />
          </div>
          <p className="text-sm font-semibold text-foreground">Tu escuela está lista</p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Tus alumnos pueden ver su horario, estado de pagos y avisos desde el portal.
          Sin necesidad de llamarte ni enviarte mensajes.
        </p>
      </div>

      {schoolSlug && (
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => window.open(`/s/${schoolSlug}`, "_blank")}
        >
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
          Ver mi portal
        </Button>
      )}

      <Button size="sm" className="w-full" onClick={onDone}>
        <Check className="mr-1.5 h-3.5 w-3.5" />
        Listo, ir al panel
      </Button>

      <p className="text-center text-[10px] text-muted-foreground">
        Puedes personalizar el portal en cualquier momento desde{" "}
        <span className="font-medium text-foreground">Portal del alumno</span>.
      </p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface OnboardingPanelProps {
  onDismiss: () => void;
  schoolSlug?: string;
}

export function OnboardingPanel({ onDismiss, schoolSlug }: OnboardingPanelProps) {
  const navigate = useNavigate();
  const [state, setStateRaw] = useState<OnboardingState>(readState);
  const [collapsed, setCollapsedRaw] = useState(readCollapsed);
  const [dismissConfirm, setDismissConfirm] = useState(false);

  const setState = useCallback((next: OnboardingState) => {
    setStateRaw(next);
    saveState(next);
  }, []);

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedRaw(v);
    saveCollapsed(v);
  }, []);

  const isCompleted = (id: StepId) => state.completed.includes(id);

  const markDone = useCallback((id: StepId) => {
    const merged: StepId[] = Array.from(new Set([...state.completed, id]));
    const allIds: StepId[] = [1, 2, 3, 4, 5];
    const nextIncomplete = allIds.find((sid) => !merged.includes(sid));

    if (!nextIncomplete) {
      const next = { ...state, completed: merged, dismissed: true };
      setState(next);
      onDismiss();
      toast.success("¡Configuración completada! Nexa está listo para empezar.");
      return;
    }

    setState({ ...state, completed: merged, activeStep: nextIncomplete });
  }, [state, setState, onDismiss]);

  const handleDismiss = useCallback(() => {
    if (dismissConfirm) {
      setState({ ...state, dismissed: true });
      onDismiss();
    } else {
      setDismissConfirm(true);
    }
  }, [dismissConfirm, state, setState, onDismiss]);

  // Step titles for header
  const STEP_TITLES: Record<StepId, { title: string; subtitle: string }> = {
    1: { title: "Tu escuela", subtitle: "Nombre, logo y ciudad" },
    2: { title: "Tu primera clase", subtitle: "Crea una clase real" },
    3: { title: "Tus primeros alumnos", subtitle: "Añade al menos uno" },
    4: { title: "Cómo cobrar", subtitle: "Moneda y vencimiento" },
    5: { title: "El portal de tus alumnos", subtitle: "Mira cómo lo verán" },
  };

  const current = STEP_TITLES[state.activeStep];

  // ── Shared content renderer ──────────────────────────────────────────────────

  function renderStepContent() {
    switch (state.activeStep) {
      case 1: return <Step1 onDone={() => markDone(1)} />;
      case 2: return <Step2 onDone={() => markDone(2)} />;
      case 3: return <Step3 onDone={() => markDone(3)} navigate={navigate} />;
      case 4: return <Step4 onDone={() => markDone(4)} />;
      case 5: return <Step5 onDone={() => markDone(5)} schoolSlug={schoolSlug} />;
      default: return null;
    }
  }

  function renderStepList() {
    return (
      <div className="space-y-0.5 pt-1">
        <div className="border-t border-border/50 my-2" />
        {STEPS.map((step) => {
          const done = isCompleted(step.id);
          const active = step.id === state.activeStep;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => setState({ ...state, activeStep: step.id })}
              className={cn(
                "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <div className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold",
                done ? "border-success bg-success/10 text-success" : active ? "border-primary bg-primary/10 text-primary" : "border-border"
              )}>
                {done ? <Check className="h-2.5 w-2.5" /> : step.id}
              </div>
              <span className="text-xs">{step.shortTitle}</span>
              {done && <Check className="ml-auto h-3 w-3 text-success shrink-0" />}
              {active && !done && <ChevronRight className="ml-auto h-3 w-3 text-primary shrink-0" />}
            </button>
          );
        })}
      </div>
    );
  }

  // ── Mobile banner ──────────────────────────────────────────────────────────

  const activeMeta = STEPS.find((s) => s.id === state.activeStep)!;

  const mobileBanner = (
    <div className="fixed bottom-0 left-0 right-0 z-[60] md:hidden border-t border-border bg-card shadow-lg">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <activeMeta.icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-xs font-medium text-foreground">Paso {state.activeStep} de 5 · {current.title}</p>
            <div className="mt-0.5 flex gap-1">
              {STEPS.map((s) => (
                <span key={s.id} className={cn("h-1 w-4 rounded-full",
                  isCompleted(s.id) ? "bg-success" : s.id === state.activeStep ? "bg-primary" : "bg-muted"
                )} />
              ))}
            </div>
          </div>
        </div>
        <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", !collapsed && "rotate-90")} />
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 pt-2 border-t border-border space-y-3">
          {renderStepContent()}
        </div>
      )}
    </div>
  );

  // ── Desktop panel ──────────────────────────────────────────────────────────

  const desktopPanel = (
    <div className={cn(
      "hidden md:flex fixed top-0 right-0 h-screen z-[60] flex-col border-l border-border bg-card shadow-xl transition-all duration-300",
      collapsed ? "w-10" : "w-80"
    )}>
      {/* Collapse toggle */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -left-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-sm hover:bg-accent transition-colors z-10"
        title={collapsed ? "Expandir guía" : "Colapsar guía"}
      >
        {collapsed ? <ChevronLeft className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
      </button>

      {collapsed ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-4">
          <span className="text-[10px] font-medium text-muted-foreground [writing-mode:vertical-rl] rotate-180">Configuración</span>
          <div className="flex flex-col gap-1 mt-2">
            {STEPS.map((s) => (
              <span key={s.id} className={cn("h-1.5 w-1.5 rounded-full mx-auto",
                isCompleted(s.id) ? "bg-success" : s.id === state.activeStep ? "bg-primary" : "bg-muted"
              )} />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border px-4 py-3 shrink-0">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Configura tu escuela · {state.completed.length}/5
              </p>
              <div className="mt-1.5 flex gap-1">
                {STEPS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setState({ ...state, activeStep: s.id })}
                    className={cn("h-2 rounded-full transition-all",
                      isCompleted(s.id) ? "bg-success w-5" : s.id === state.activeStep ? "bg-primary w-5" : "bg-muted w-2 hover:bg-muted-foreground/40"
                    )}
                    title={STEPS.find((ss) => ss.id === s.id)?.shortTitle}
                  />
                ))}
              </div>
            </div>
            {dismissConfirm ? (
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-[10px] text-muted-foreground">¿Omitir?</span>
                <button type="button" onClick={handleDismiss} className="text-[10px] font-semibold text-destructive hover:underline">Sí</button>
                <button type="button" onClick={() => setDismissConfirm(false)} className="text-[10px] text-muted-foreground hover:underline">No</button>
              </div>
            ) : (
              <button type="button" onClick={handleDismiss} className="ml-2 shrink-0 text-muted-foreground hover:text-foreground" title="Omitir configuración">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Step heading */}
            <div>
              <p className="text-base font-semibold text-foreground">{current.title}</p>
              <p className="text-xs text-muted-foreground">{current.subtitle}</p>
            </div>

            {/* Step form */}
            {renderStepContent()}

            {/* Step list */}
            {renderStepList()}
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {mobileBanner}
      {desktopPanel}
    </>
  );
}
