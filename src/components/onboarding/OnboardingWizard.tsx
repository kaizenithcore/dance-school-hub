/**
 * OnboardingWizard — full-screen guided setup for new schools.
 * 7 steps, split layout, real API actions, skippable.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, GraduationCap, Users, CreditCard, Smartphone,
  Check, X, ArrowRight, ChevronLeft, ChevronRight,
  Upload, Loader2, Sparkles, ExternalLink, Copy, CalendarRange,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getSchoolSettings, updateSchoolSettings } from "@/lib/api/settings";
import type { SchoolSettingsPayload } from "@/lib/api/settings";
import { updateTenantBranding, getTenantBranding } from "@/lib/api/branding";
import { createClass } from "@/lib/api/classes";
import { createStudent } from "@/lib/api/students";
import { useAcademicYearContext } from "@/contexts/AcademicYearContext";
import { useAuth } from "@/contexts/AuthContext";

// ── Storage ────────────────────────────────────────────────────────────────────
const KEY = "nexa:onboarding:v2";

interface WizardState {
  step: number;
  completed: number[];
  skipped: number[];
  finished: boolean;
}

function read(): WizardState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as WizardState;
  } catch { /* ignore */ }
  return { step: 1, completed: [], skipped: [], finished: false };
}
function save(s: WizardState) { localStorage.setItem(KEY, JSON.stringify(s)); }
export function resetOnboarding() { localStorage.removeItem(KEY); }

// ── Step definitions ───────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, title: "Tu escuela",        icon: Building2,      skippable: false, hint: "La información básica de tu academia." },
  { id: 2, title: "Año académico",     icon: CalendarRange,  skippable: true,  hint: "Organiza los datos por curso escolar." },
  { id: 3, title: "Primera clase",     icon: GraduationCap,  skippable: true,  hint: "Añade al menos una clase para empezar." },
  { id: 4, title: "Primer alumno",     icon: Users,          skippable: true,  hint: "Registra o importa alumnos." },
  { id: 5, title: "Cobros",            icon: CreditCard,     skippable: true,  hint: "Configura cómo cobras a tus alumnos." },
  { id: 6, title: "Portal del alumno", icon: Smartphone,     skippable: true,  hint: "El canal digital para tus alumnos." },
  { id: 7, title: "¡Listo!",           icon: PartyPopper,    skippable: false, hint: "" },
] as const;

const TOTAL = STEPS.length;

// ── Helpers ────────────────────────────────────────────────────────────────────
function StepSidebar({ current, completed, skipped }: { current: number; completed: number[]; skipped: number[] }) {
  return (
    <div className="hidden lg:flex flex-col gap-1 w-52 shrink-0 py-2">
      {STEPS.map((s) => {
        const done = completed.includes(s.id);
        const skip = skipped.includes(s.id);
        const active = current === s.id;
        const Icon = s.icon;
        return (
          <div key={s.id}
            className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              active ? "bg-primary/10 text-primary font-medium" :
              done   ? "text-success" :
              skip   ? "text-muted-foreground/50 line-through" :
              "text-muted-foreground"
            )}>
            <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold",
              done   ? "border-success bg-success text-white" :
              skip   ? "border-muted-foreground/30 text-muted-foreground/40" :
              active ? "border-primary bg-primary text-white" :
              "border-border text-muted-foreground"
            )}>
              {done ? <Check className="h-3.5 w-3.5" /> : s.id}
            </div>
            <span className="truncate">{s.title}</span>
          </div>
        );
      })}
    </div>
  );
}

function ProgressBar({ current, completed }: { current: number; completed: number[] }) {
  const pct = Math.round(((completed.length) / (TOTAL - 1)) * 100);
  return (
    <div className="h-1 bg-muted rounded-full overflow-hidden">
      <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} />
    </div>
  );
}

// ── Step 1 — Escuela ───────────────────────────────────────────────────────────
function Step1({ onNext }: { onNext: (skip?: boolean) => void }) {
  const [name, setName] = useState(""); const [city, setCity] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#7C3AED");
  const [snapshot, setSnapshot] = useState<SchoolSettingsPayload | null>(null);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const [data, branding] = await Promise.all([getSchoolSettings(), getTenantBranding()]);
      if (data) { setName(data.school?.name ?? ""); setCity(data.school?.city ?? ""); setSnapshot(data); }
      if (branding?.logo_url) setLogoPreview(branding.logo_url);
      if (branding?.primary_color) setPrimaryColor(branding.primary_color);
      setLoading(false);
    })();
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Solo imágenes"); return; }
    setLogoFile(file);
    const reader = new FileReader(); reader.onload = (e) => setLogoPreview(e.target?.result as string); reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("El nombre de la escuela es obligatorio"); return; }
    setSaving(true);
    try {
      await Promise.all([
        logoFile ? updateTenantBranding({ primary_color: primaryColor }, logoFile) : updateTenantBranding({ primary_color: primaryColor }),
        snapshot ? updateSchoolSettings({ ...snapshot, school: { ...snapshot.school, name: name.trim(), city: city.trim() } }) : Promise.resolve(),
      ]);
      toast.success("Escuela guardada");
      onNext();
    } catch { toast.error("No se pudo guardar"); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-foreground mb-1">Información de tu escuela</p>
        <p className="text-xs text-muted-foreground">Esta información aparecerá en el portal del alumno, los recibos y todos los documentos que generes.</p>
      </div>

      {/* Logo drop zone */}
      <div>
        <Label className="text-xs font-semibold mb-1.5 block">Logo</Label>
        <div
          onClick={() => document.getElementById("wiz-logo")?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          className="flex items-center gap-4 cursor-pointer"
        >
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 transition-colors overflow-hidden">
            {logoPreview ? <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Sube tu logo</p>
            <p className="text-xs text-muted-foreground">PNG o SVG · Recomendado 200×200px</p>
            {logoPreview && <button type="button" onClick={(e) => { e.stopPropagation(); setLogoFile(null); setLogoPreview(null); }} className="text-[11px] text-muted-foreground hover:text-destructive mt-0.5">Quitar</button>}
          </div>
        </div>
        <input id="wiz-logo" type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Nombre de la escuela *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Studio Danza Madrid" className="h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Ciudad</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Madrid" className="h-9" />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-semibold">Color principal</Label>
        <div className="flex items-center gap-3">
          <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)}
            className="h-9 w-14 cursor-pointer rounded-md border border-border bg-transparent p-1" />
          <p className="text-xs text-muted-foreground">Usado en el portal del alumno, recibos y documentos.</p>
        </div>
      </div>

      <Button className="w-full" onClick={() => void handleSave()} disabled={saving || !name.trim()}>
        {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando…</> : <>Guardar y continuar <ArrowRight className="h-4 w-4 ml-2" /></>}
      </Button>
    </div>
  );
}

// ── Step 2 — Año académico ─────────────────────────────────────────────────────
function Step2({ onNext }: { onNext: (skip?: boolean) => void }) {
  const { academicYears, currentYear, createYear, switchYear } = useAcademicYearContext();
  const [yearCode, setYearCode] = useState(""); const [displayName, setDisplayName] = useState("");
  const [startDate, setStartDate] = useState(""); const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const y = new Date().getFullYear(); const m = new Date().getMonth() + 1;
    const s = m >= 9 ? y : y - 1; const e = s + 1;
    setYearCode(`${s}-${e}`);
    setDisplayName(`Curso ${s}/${String(e).slice(2)}`);
    setStartDate(`${s}-09-01`);
    setEndDate(`${e}-06-30`);
  }, []);

  const handleCreate = async () => {
    if (!yearCode.trim() || !displayName.trim() || !startDate || !endDate) { toast.error("Completa todos los campos"); return; }
    setSaving(true);
    try {
      await createYear({ yearCode: yearCode.trim(), displayName: displayName.trim(), startDate, endDate });
      toast.success(`Curso ${displayName} creado`);
      onNext();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-foreground mb-1">Crea tu primer año académico</p>
        <p className="text-xs text-muted-foreground">Los años académicos te permiten separar clases, inscripciones y datos de un curso a otro. Al terminar el curso, clonas los datos al siguiente con un clic.</p>
      </div>

      {academicYears.length > 0 ? (
        <div className="rounded-lg border border-success/30 bg-success/5 p-4 space-y-2">
          <p className="text-sm font-medium text-success flex items-center gap-2"><Check className="h-4 w-4" /> Ya tienes {academicYears.length} año(s) académico(s)</p>
          <p className="text-xs text-muted-foreground">Curso activo: {currentYear?.displayName ?? "No seleccionado"}</p>
          <Button size="sm" variant="outline" onClick={() => onNext()}>Continuar <ArrowRight className="h-3.5 w-3.5 ml-1.5" /></Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Código</Label>
              <Input value={yearCode} onChange={(e) => setYearCode(e.target.value)} placeholder="2024-2025" className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nombre</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Curso 24/25" className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Fecha inicio</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Fecha fin</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
            </div>
          </div>
          <Button className="w-full" onClick={() => void handleCreate()} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creando…</> : <>Crear año académico <ArrowRight className="h-4 w-4 ml-2" /></>}
          </Button>
        </>
      )}
    </div>
  );
}

// ── Step 3 — Primera clase ─────────────────────────────────────────────────────
function Step3({ onNext }: { onNext: (skip?: boolean) => void }) {
  const [className, setClassName] = useState(""); const [discipline, setDiscipline] = useState("Ballet");
  const [capacity, setCapacity] = useState("20"); const [saving, setSaving] = useState(false);

  const DISCIPLINES = ["Ballet", "Contemporáneo", "Jazz", "Flamenco", "Hip Hop", "Salsa", "Bachata", "Clásica", "Urbano", "Otros"];

  const handleSave = async () => {
    if (!className.trim()) { toast.error("El nombre de la clase es obligatorio"); return; }
    setSaving(true);
    try {
      await createClass({ name: className.trim(), capacity: Number(capacity) || 20, price: 0, status: "active" });
      toast.success(`Clase "${className}" creada`);
      onNext();
    } catch { toast.error("No se pudo crear la clase"); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-foreground mb-1">Añade tu primera clase</p>
        <p className="text-xs text-muted-foreground">Crea al menos una clase para empezar a gestionar inscripciones y horarios. Puedes añadir más desde la sección Clases.</p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Nombre de la clase *</Label>
          <Input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="Ballet Adultos · Nivel Iniciación" className="h-9" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Disciplina</Label>
            <Select value={discipline} onValueChange={setDiscipline}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{DISCIPLINES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Plazas</Label>
            <Input type="number" min="1" max="200" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="h-9" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">El horario detallado (día y hora) se configura desde <strong>Clases → Horario semanal</strong>.</p>
      </div>

      <Button className="w-full" onClick={() => void handleSave()} disabled={saving || !className.trim()}>
        {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creando…</> : <>Crear clase <ArrowRight className="h-4 w-4 ml-2" /></>}
      </Button>
    </div>
  );
}

// ── Step 4 — Primer alumno ─────────────────────────────────────────────────────
function Step4({ onNext }: { onNext: (skip?: boolean) => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(""); const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"form" | "import">("form");

  const handleSave = async () => {
    if (!name.trim()) { toast.error("El nombre es obligatorio"); return; }
    setSaving(true);
    try {
      await createStudent({ name: name.trim(), email: email.trim(), phone: phone.trim(), status: "active", paymentType: "monthly" });
      toast.success(`Alumno "${name}" añadido`);
      onNext();
    } catch { toast.error("No se pudo crear el alumno"); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-foreground mb-1">Añade tu primer alumno</p>
        <p className="text-xs text-muted-foreground">Introduce manualmente o importa tu lista existente desde Excel. Puedes continuar y añadir alumnos más tarde desde la sección Alumnos.</p>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-lg border border-border overflow-hidden">
        {[{ id: "form", label: "Manual" }, { id: "import", label: "Importar Excel" }].map((m) => (
          <button key={m.id} type="button" onClick={() => setMode(m.id as "form" | "import")}
            className={cn("flex-1 py-2 text-sm font-medium transition-colors", mode === m.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/30")}>
            {m.label}
          </button>
        ))}
      </div>

      {mode === "form" ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Nombre completo *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ana García López" className="h-9" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ana@email.com" className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Teléfono</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+34 612 34 56 78" className="h-9" />
            </div>
          </div>
          <Button className="w-full" onClick={() => void handleSave()} disabled={saving || !name.trim()}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando…</> : <>Añadir alumno <ArrowRight className="h-4 w-4 ml-2" /></>}
          </Button>
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border border-dashed border-border bg-muted/20 p-5 text-center">
          <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Importa tu lista de alumnos</p>
          <p className="text-xs text-muted-foreground">Soporta Excel (.xlsx) y CSV. El sistema mapea automáticamente las columnas.</p>
          <Button size="sm" onClick={() => { navigate("/admin/students/import"); onNext(); }}>
            Ir a importar alumnos <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Step 5 — Cobros ────────────────────────────────────────────────────────────
function Step5({ onNext }: { onNext: (skip?: boolean) => void }) {
  const [currency, setCurrency] = useState("EUR");
  const [dueDay, setDueDay] = useState("10");
  const [methods, setMethods] = useState({ transfer: false, cash: true, card: false });
  const [snapshot, setSnapshot] = useState<SchoolSettingsPayload | null>(null);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const data = await getSchoolSettings();
      if (data) {
        const p = data.payment as Record<string, unknown>;
        if (p?.currency) setCurrency(p.currency as string);
        if (p?.dueDayOfMonth) setDueDay(String(p.dueDayOfMonth));
        if (p?.enableTransfer !== undefined) setMethods((m) => ({ ...m, transfer: Boolean(p.enableTransfer) }));
        if (p?.enableCash !== undefined) setMethods((m) => ({ ...m, cash: Boolean(p.enableCash) }));
        setSnapshot(data);
      }
      setLoading(false);
    })();
  }, []);

  const toggle = (k: keyof typeof methods) => setMethods((m) => ({ ...m, [k]: !m[k] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (snapshot) {
        await updateSchoolSettings({
          ...snapshot,
          payment: { ...(snapshot.payment || {}), currency, dueDayOfMonth: dueDay, enableTransfer: methods.transfer, enableCash: methods.cash },
        });
      }
      toast.success("Configuración de cobros guardada");
      onNext();
    } catch { toast.error("No se pudo guardar"); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const METHOD_OPTS = [
    { key: "cash", label: "Efectivo", desc: "Cobro presencial en la academia" },
    { key: "transfer", label: "Transferencia", desc: "El alumno transfiere a tu cuenta" },
    { key: "card", label: "Tarjeta / Stripe", desc: "Configura en Ajustes → Plan" },
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-foreground mb-1">Configura cómo cobras</p>
        <p className="text-xs text-muted-foreground">Esto afecta a los recibos, facturas y la información que ve el alumno en su portal.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Moneda</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">€ Euro (EUR)</SelectItem>
              <SelectItem value="USD">$ Dólar (USD)</SelectItem>
              <SelectItem value="GBP">£ Libra (GBP)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Vencimiento mensual (día)</Label>
          <Input type="number" min="1" max="28" value={dueDay} onChange={(e) => setDueDay(e.target.value)} className="h-9" />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">Métodos de pago aceptados</Label>
        <div className="space-y-2">
          {METHOD_OPTS.map(({ key, label, desc }) => (
            <button key={key} type="button" onClick={() => key !== "card" && toggle(key as "cash" | "transfer")}
              disabled={key === "card"}
              className={cn("w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                key === "card" ? "opacity-50 cursor-not-allowed border-border" :
                methods[key as "cash" | "transfer"] ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
              )}>
              <div className={cn("h-4 w-4 shrink-0 rounded border-2 transition-colors flex items-center justify-center",
                key !== "card" && methods[key as "cash" | "transfer"] ? "border-primary bg-primary" : "border-border"
              )}>
                {key !== "card" && methods[key as "cash" | "transfer"] && <Check className="h-2.5 w-2.5 text-white" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-[11px] text-muted-foreground">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Button className="w-full" onClick={() => void handleSave()} disabled={saving}>
        {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando…</> : <>Guardar y continuar <ArrowRight className="h-4 w-4 ml-2" /></>}
      </Button>
    </div>
  );
}

// ── Step 6 — Portal ────────────────────────────────────────────────────────────
function Step6({ onNext, schoolSlug }: { onNext: (skip?: boolean) => void; schoolSlug?: string }) {
  const portalUrl = schoolSlug ? `${window.location.origin}/s/${schoolSlug}` : null;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!portalUrl) return;
    try { await navigator.clipboard.writeText(portalUrl); } catch { const ta = document.createElement("textarea"); ta.value = portalUrl; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-foreground mb-1">Portal del alumno</p>
        <p className="text-xs text-muted-foreground">Tu escuela tiene una página pública donde los alumnos pueden ver el horario, inscribirse online y acceder a su portal personal.</p>
      </div>

      {portalUrl ? (
        <>
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">URL de tu escuela</p>
                <p className="text-sm font-mono text-foreground truncate">{portalUrl}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => void handleCopy()} className="shrink-0">
                {copied ? <><Check className="h-3.5 w-3.5 mr-1" />Copiado</> : <><Copy className="h-3.5 w-3.5 mr-1" />Copiar</>}
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild className="flex-1">
              <a href={portalUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Ver portal
              </a>
            </Button>
            <Button size="sm" onClick={() => onNext()} className="flex-1">
              Continuar <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-border bg-muted/20 p-5 text-center space-y-2">
          <p className="text-sm text-muted-foreground">El slug de tu escuela no está disponible aún. Continúa y podrás acceder al portal desde el menú.</p>
          <Button size="sm" onClick={() => onNext()}>Continuar <ArrowRight className="h-4 w-4 ml-1.5" /></Button>
        </div>
      )}
    </div>
  );
}

// ── Step 7 — ¡Listo! ───────────────────────────────────────────────────────────
function Step7({ completed, skipped, onFinish }: { completed: number[]; skipped: number[]; onFinish: () => void }) {
  const navigate = useNavigate();
  const done = completed.length; const total = STEPS.length - 1;
  const pct = Math.round((done / total) * 100);

  const NEXT_STEPS = [
    { label: "Configurar horarios de clases", url: "/admin/schedule", icon: CalendarRange },
    { label: "Inscribir alumnos en clases", url: "/admin/enrollments", icon: Users },
    { label: "Personalizar branding", url: "/admin/settings/branding", icon: Sparkles },
    { label: "Publicar horario público", url: "/admin/website", icon: ExternalLink },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
          <PartyPopper className="h-8 w-8" />
        </div>
        <p className="text-xl font-bold text-foreground">¡Tu escuela está lista!</p>
        <p className="text-sm text-muted-foreground">Has completado {done} de {total} pasos de configuración ({pct}%).</p>
        {skipped.length > 0 && (
          <p className="text-xs text-muted-foreground">Puedes completar los pasos omitidos más tarde desde el botón <strong>?</strong> de ayuda.</p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Próximos pasos sugeridos</p>
        {NEXT_STEPS.map((s) => (
          <button key={s.url} type="button" onClick={() => { onFinish(); navigate(s.url); }}
            className="w-full flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left hover:bg-accent/40 transition-colors">
            <s.icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground">{s.label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
          </button>
        ))}
      </div>

      <Button className="w-full" size="lg" onClick={onFinish}>
        Ir al panel principal <Sparkles className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}

// ── Main Wizard ────────────────────────────────────────────────────────────────
interface OnboardingWizardProps {
  open: boolean;
  onClose: () => void;
  schoolSlug?: string;
}

export function OnboardingWizard({ open, onClose, schoolSlug }: OnboardingWizardProps) {
  const [state, setState] = useState<WizardState>(() => read());

  const updateState = useCallback((updates: Partial<WizardState>) => {
    setState((prev) => {
      const next = { ...prev, ...updates };
      save(next);
      return next;
    });
  }, []);

  const handleNext = useCallback((skip?: boolean) => {
    setState((prev) => {
      const current = prev.step;
      const completed = skip ? prev.completed : [...new Set([...prev.completed, current])];
      const skipped  = skip ? [...new Set([...prev.skipped, current])] : prev.skipped.filter((s) => s !== current);
      const next = { ...prev, step: Math.min(current + 1, TOTAL), completed, skipped };
      save(next);
      return next;
    });
  }, []);

  const handlePrev = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, step: Math.max(prev.step - 1, 1) };
      save(next);
      return next;
    });
  }, []);

  const handleFinish = useCallback(() => {
    updateState({ finished: true });
    onClose();
  }, [updateState, onClose]);

  const currentStep = STEPS.find((s) => s.id === state.step) ?? STEPS[0];

  if (!open) return null;

  const stepContent: Record<number, React.ReactNode> = {
    1: <Step1 onNext={handleNext} />,
    2: <Step2 onNext={handleNext} />,
    3: <Step3 onNext={handleNext} />,
    4: <Step4 onNext={handleNext} />,
    5: <Step5 onNext={handleNext} />,
    6: <Step6 onNext={handleNext} schoolSlug={schoolSlug} />,
    7: <Step7 completed={state.completed} skipped={state.skipped} onFinish={handleFinish} />,
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 backdrop-blur-sm px-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Configuración inicial</span>
                <span className="text-xs text-muted-foreground">Paso {state.step} de {TOTAL}</span>
              </div>
              {state.step !== 7 && (
                <button type="button" onClick={onClose}
                  className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  title="Cerrar y continuar después">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <ProgressBar current={state.step} completed={state.completed} />
          </div>

          {/* Body */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Sidebar stepper */}
            <div className="hidden lg:block bg-muted/20 border-r border-border px-3 py-4 w-52 shrink-0 overflow-y-auto">
              <StepSidebar current={state.step} completed={state.completed} skipped={state.skipped} />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={state.step}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                >
                  {stepContent[state.step]}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Footer navigation */}
          {state.step !== 7 && (
            <div className="px-6 py-3 border-t border-border flex items-center justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={handlePrev} disabled={state.step === 1}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <div className="flex gap-2">
                {currentStep.skippable && (
                  <Button variant="ghost" size="sm" onClick={() => handleNext(true)} className="text-muted-foreground">
                    Omitir este paso
                  </Button>
                )}
                {state.step < TOTAL - 1 && (
                  <Button variant="outline" size="sm" onClick={() => handleNext(true)}>
                    Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
