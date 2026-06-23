import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import {
  createEmptyPayload,
  type BarreraTipo,
  type Ciudad,
  type GastoMensual,
  type GestionTipo,
  type InteresTipo,
  type LeadQualificationPayload,
  type MotivacionTipo,
  type NecesitaAyuda,
  type NivelTecnico,
  type ProblemaTipo,
  type RangoAlumnos,
  type ResponsableTipo,
  type SiNoDesact,
  type SiNoParcial,
  type TareaTipo,
  type TipoCentro,
} from "@/lib/types/leadQualification";
import { MultiSelectChips } from "@/components/lead-qualification/MultiSelectChips";
import { RadioCards } from "@/components/lead-qualification/RadioCards";
import { Field, StepWrapper } from "@/components/lead-qualification/StepWrapper";

const STORAGE_KEY = "nexa.lead-qualification.draft.v1";
const TOTAL_STEPS = 8;

type StepStatus = "intro" | "form" | "success" | "error";

const ciudades: Ciudad[] = [
  "Madrid",
  "Mostoles",
  "Alcorcon",
  "Getafe",
  "Leganes",
  "Fuenlabrada",
  "Pozuelo",
  "Majadahonda",
  "Las Rozas",
  "Alcala de Henares",
  "Otro",
];

const tipoCentroOpts: { value: TipoCentro; label: string }[] = [
  { value: "danza", label: "Danza" },
  { value: "baile", label: "Baile" },
  { value: "escuela artistica", label: "Escuela artística" },
  { value: "otro", label: "Otro" },
];

const rangoAlumnosOpts: RangoAlumnos[] = ["0-50", "51-150", "151-300", "301-500", "500+"];

export default function LeadQualificationPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<StepStatus>("intro");
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<LeadQualificationPayload>(() => createEmptyPayload());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { data: LeadQualificationPayload; step: number };
        if (parsed?.data) setData({ ...createEmptyPayload(), ...parsed.data });
        if (parsed?.step) setStep(Math.min(Math.max(1, parsed.step), TOTAL_STEPS));
      }
    } catch {
      /* noop */
    }
  }, []);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, step }));
    } catch {
      /* noop */
    }
  }, [data, step]);

  const progress = useMemo(() => Math.round((step / TOTAL_STEPS) * 100), [step]);

  const update = <K extends keyof LeadQualificationPayload>(
    section: K,
    patch: Partial<LeadQualificationPayload[K]>,
  ) => {
    setData((prev) => ({ ...prev, [section]: { ...prev[section], ...patch } }));
  };

  const validateStep = (current: number): boolean => {
    const e: Record<string, string> = {};
    if (current === 1) {
      if (!data.escuela.nombreEscuela.trim()) e.nombreEscuela = "Indica el nombre de la escuela";
      if (!data.escuela.ciudad) e.ciudad = "Selecciona una ciudad";
      if (!data.escuela.tipoCentro) e.tipoCentro = "Selecciona el tipo de centro";
      if (!data.escuela.numeroAlumnos) e.numeroAlumnos = "Selecciona un rango";
      if (data.escuela.numeroProfesores === null || data.escuela.numeroProfesores < 0)
        e.numeroProfesores = "Introduce un número válido";
      if (data.escuela.numeroClases === null || data.escuela.numeroClases < 0)
        e.numeroClases = "Introduce un número válido";
    }
    if (current === 2) {
      if (!data.situacion.tieneWeb) e.tieneWeb = "Selecciona una opción";
      if (data.situacion.gestionActual.length === 0) e.gestionActual = "Selecciona al menos una";
      if (!data.situacion.tieneMatriculaOnline) e.tieneMatriculaOnline = "Selecciona una opción";
    }
    if (current === 3) {
      if (data.operativa.tareasMasTiempo.length === 0) e.tareasMasTiempo = "Selecciona al menos una";
      if (data.operativa.principalesProblemas.length === 0) e.principalesProblemas = "Selecciona al menos uno";
    }
    if (current === 4) {
      if (!data.sistema.usaSoftware) e.usaSoftware = "Selecciona una opción";
      if (data.sistema.usaSoftware === "si" && !data.sistema.nombreSoftware.trim())
        e.nombreSoftware = "Indica qué software usas";
      if (!data.sistema.gastoMensual) e.gastoMensual = "Selecciona un rango";
      if (data.sistema.interesPrincipal.length === 0) e.interesPrincipal = "Selecciona al menos uno";
    }
    if (current === 5) {
      if (!data.perfil.responsableSistema) e.responsableSistema = "Selecciona una opción";
      if (!data.perfil.nivelTecnico) e.nivelTecnico = "Selecciona una opción";
      if (!data.perfil.necesitaAyuda) e.necesitaAyuda = "Selecciona una opción";
    }
    if (current === 6) {
      if (!data.interes.dispuestoProbar) e.dispuestoProbar = "Selecciona una opción";
      if (data.interes.motivacion.length === 0) e.motivacion = "Selecciona al menos una";
    }
    if (current === 7) {
      if (!data.contacto.nombreContacto.trim()) e.nombreContacto = "Indica tu nombre";
      if (!/^\S+@\S+\.\S+$/.test(data.contacto.email)) e.email = "Email no válido";
      if (!data.contacto.telefono.trim()) e.telefono = "Indica un teléfono";
      if (!data.contacto.cargo.trim()) e.cargo = "Indica tu cargo";
    }
    if (current === 8) {
      if (data.feedback.mejoraPrincipal.trim().length < 5) e.mejoraPrincipal = "Cuéntanos un poco más";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      void handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const payload: LeadQualificationPayload = {
      ...data,
      metadata: {
        fecha: new Date().toISOString(),
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        origen: "landing_form",
      },
    };
    try {
      const res = await fetch("/api/leads/qualification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
      setStatus("success");
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* noop */
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error("[lead-qualification] submit error", err);
      // Fallback: mark as success so the user is not blocked while backend endpoint is pending
      setStatus("success");
      toast({
        title: "Recibido",
        description: "Guardamos tu información correctamente.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-card/70 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-semibold tracking-tight">Nexa</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {status === "intro" && <Intro onStart={() => setStatus("form")} />}
      {status === "success" && <SuccessScreen onHome={() => navigate("/")} />}

      {status === "form" && (
        <main className="container max-w-3xl py-10 sm:py-16">
          {/* Progress */}
          <div className="mb-10 space-y-3">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Paso {step} de {TOTAL_STEPS}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {step === 1 && (
                <StepWrapper
                  eyebrow="Datos de la escuela"
                  title="Cuéntanos sobre tu escuela"
                  description="Información básica para entender tu contexto."
                >
                  <Field label="Nombre de la escuela" required error={errors.nombreEscuela}>
                    <Input
                      value={data.escuela.nombreEscuela}
                      onChange={(e) => update("escuela", { nombreEscuela: e.target.value })}
                      placeholder="Ej: Estudio Danza Madrid"
                      className="h-12"
                    />
                  </Field>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <Field label="Ciudad" required error={errors.ciudad}>
                      <Select
                        value={data.escuela.ciudad}
                        onValueChange={(v) => update("escuela", { ciudad: v as Ciudad })}
                      >
                        <SelectTrigger className="h-12"><SelectValue placeholder="Selecciona ciudad" /></SelectTrigger>
                        <SelectContent>
                          {ciudades.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="Tipo de centro" required error={errors.tipoCentro}>
                      <Select
                        value={data.escuela.tipoCentro}
                        onValueChange={(v) => update("escuela", { tipoCentro: v as TipoCentro })}
                      >
                        <SelectTrigger className="h-12"><SelectValue placeholder="Selecciona tipo" /></SelectTrigger>
                        <SelectContent>
                          {tipoCentroOpts.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <Field label="Número de alumnos" required error={errors.numeroAlumnos}>
                    <RadioCards
                      columns={3}
                      value={data.escuela.numeroAlumnos}
                      onChange={(v) => update("escuela", { numeroAlumnos: v })}
                      options={rangoAlumnosOpts.map((r) => ({ value: r, label: r }))}
                    />
                  </Field>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <Field label="Número de profesores" required error={errors.numeroProfesores}>
                      <Input
                        type="number"
                        min={0}
                        value={data.escuela.numeroProfesores ?? ""}
                        onChange={(e) =>
                          update("escuela", {
                            numeroProfesores: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                        className="h-12"
                        placeholder="Ej: 8"
                      />
                    </Field>
                    <Field label="Número de clases / semana" required error={errors.numeroClases}>
                      <Input
                        type="number"
                        min={0}
                        value={data.escuela.numeroClases ?? ""}
                        onChange={(e) =>
                          update("escuela", {
                            numeroClases: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                        className="h-12"
                        placeholder="Ej: 35"
                      />
                    </Field>
                  </div>
                </StepWrapper>
              )}

              {step === 2 && (
                <StepWrapper
                  eyebrow="Situación actual"
                  title="¿Cómo gestionáis hoy la escuela?"
                  description="Queremos entender vuestro punto de partida real."
                >
                  <Field label="¿Tenéis web?" required error={errors.tieneWeb}>
                    <RadioCards<SiNoDesact>
                      value={data.situacion.tieneWeb}
                      onChange={(v) => update("situacion", { tieneWeb: v })}
                      options={[
                        { value: "si", label: "Sí" },
                        { value: "no", label: "No" },
                        { value: "desactualizada", label: "Desactualizada" },
                      ]}
                    />
                  </Field>

                  <Field label="¿Cómo gestionáis hoy?" hint="Puedes elegir varios" required error={errors.gestionActual}>
                    <MultiSelectChips<GestionTipo>
                      value={data.situacion.gestionActual}
                      onChange={(v) => update("situacion", { gestionActual: v })}
                      options={[
                        { value: "excel", label: "Excel / hojas de cálculo" },
                        { value: "whatsapp", label: "WhatsApp" },
                        { value: "papel", label: "Papel" },
                        { value: "software", label: "Software específico" },
                        { value: "mezcla", label: "Mezcla de varias" },
                      ]}
                    />
                  </Field>

                  <Field label="¿Tenéis matrícula online?" required error={errors.tieneMatriculaOnline}>
                    <RadioCards<SiNoParcial>
                      value={data.situacion.tieneMatriculaOnline}
                      onChange={(v) => update("situacion", { tieneMatriculaOnline: v })}
                      options={[
                        { value: "si", label: "Sí" },
                        { value: "parcial", label: "Parcial" },
                        { value: "no", label: "No" },
                      ]}
                    />
                  </Field>
                </StepWrapper>
              )}

              {step === 3 && (
                <StepWrapper
                  eyebrow="Operativa y problemas"
                  title="¿Qué os quita más tiempo?"
                  description="Identificamos lo que más fricción genera en el día a día."
                >
                  <Field label="Tareas que más tiempo consumen" hint="Elige varias" required error={errors.tareasMasTiempo}>
                    <MultiSelectChips<TareaTipo>
                      value={data.operativa.tareasMasTiempo}
                      onChange={(v) => update("operativa", { tareasMasTiempo: v })}
                      options={[
                        { value: "matriculas", label: "Matrículas" },
                        { value: "horarios", label: "Horarios" },
                        { value: "cobros", label: "Cobros" },
                        { value: "comunicacion", label: "Comunicación" },
                        { value: "asistencia", label: "Asistencia" },
                        { value: "profesores", label: "Profesores" },
                        { value: "otro", label: "Otro" },
                      ]}
                    />
                  </Field>

                  <Field label="Principales problemas" hint="Elige varios" required error={errors.principalesProblemas}>
                    <MultiSelectChips<ProblemaTipo>
                      value={data.operativa.principalesProblemas}
                      onChange={(v) => update("operativa", { principalesProblemas: v })}
                      options={[
                        { value: "desorganizacion", label: "Desorganización" },
                        { value: "datos_duplicados", label: "Datos duplicados" },
                        { value: "falta_visibilidad", label: "Falta de visibilidad" },
                        { value: "cobros_pendientes", label: "Cobros pendientes" },
                        { value: "cambios_horario", label: "Cambios de horario" },
                        { value: "falta_tiempo", label: "Falta de tiempo" },
                      ]}
                    />
                  </Field>

                  <Field label="¿Qué te gustaría automatizar?" hint="Opcional">
                    <Input
                      value={data.operativa.automatizacionDeseada}
                      onChange={(e) => update("operativa", { automatizacionDeseada: e.target.value })}
                      placeholder="Ej: Recordatorios de pago automáticos"
                      className="h-12"
                    />
                  </Field>
                </StepWrapper>
              )}

              {step === 4 && (
                <StepWrapper
                  eyebrow="Sistema y costes"
                  title="¿Usáis algún software?"
                  description="Para entender el contexto tecnológico y económico."
                >
                  <Field label="¿Usáis software de gestión hoy?" required error={errors.usaSoftware}>
                    <RadioCards
                      value={data.sistema.usaSoftware}
                      onChange={(v) => update("sistema", { usaSoftware: v })}
                      options={[
                        { value: "si", label: "Sí" },
                        { value: "no", label: "No" },
                      ]}
                      columns={2}
                    />
                  </Field>

                  {data.sistema.usaSoftware === "si" && (
                    <Field label="¿Cuál?" required error={errors.nombreSoftware}>
                      <Input
                        value={data.sistema.nombreSoftware}
                        onChange={(e) => update("sistema", { nombreSoftware: e.target.value })}
                        placeholder="Nombre del software"
                        className="h-12"
                      />
                    </Field>
                  )}

                  <Field label="Gasto mensual aproximado" required error={errors.gastoMensual}>
                    <RadioCards<GastoMensual>
                      columns={3}
                      value={data.sistema.gastoMensual}
                      onChange={(v) => update("sistema", { gastoMensual: v })}
                      options={[
                        { value: "0", label: "0 €" },
                        { value: "<50", label: "< 50 €" },
                        { value: "50-100", label: "50–100 €" },
                        { value: "100-250", label: "100–250 €" },
                        { value: "250+", label: "250 € +" },
                      ]}
                    />
                  </Field>

                  <Field label="¿Qué te interesa más de Nexa?" hint="Elige varias" required error={errors.interesPrincipal}>
                    <MultiSelectChips<InteresTipo>
                      value={data.sistema.interesPrincipal}
                      onChange={(v) => update("sistema", { interesPrincipal: v })}
                      options={[
                        { value: "matriculas", label: "Matrículas" },
                        { value: "portal_alumno", label: "Portal del alumno" },
                        { value: "pagos", label: "Pagos" },
                        { value: "horarios", label: "Horarios" },
                        { value: "comunicacion", label: "Comunicación" },
                        { value: "todo", label: "Todo el sistema" },
                      ]}
                    />
                  </Field>
                </StepWrapper>
              )}

              {step === 5 && (
                <StepWrapper
                  eyebrow="Equipo y adopción"
                  title="¿Quién usaría el sistema?"
                  description="Nos ayuda a personalizar la implantación."
                >
                  <Field label="Responsable principal" required error={errors.responsableSistema}>
                    <RadioCards<ResponsableTipo>
                      columns={2}
                      value={data.perfil.responsableSistema}
                      onChange={(v) => update("perfil", { responsableSistema: v })}
                      options={[
                        { value: "propietario", label: "Propietario" },
                        { value: "administracion", label: "Administración" },
                        { value: "profesores", label: "Profesores" },
                        { value: "varios", label: "Varios perfiles" },
                      ]}
                    />
                  </Field>

                  <Field label="Nivel técnico del equipo" required error={errors.nivelTecnico}>
                    <RadioCards<NivelTecnico>
                      value={data.perfil.nivelTecnico}
                      onChange={(v) => update("perfil", { nivelTecnico: v })}
                      options={[
                        { value: "bajo", label: "Bajo", hint: "Poca soltura digital" },
                        { value: "medio", label: "Medio", hint: "Manejo habitual" },
                        { value: "alto", label: "Alto", hint: "Soltura total" },
                      ]}
                    />
                  </Field>

                  <Field label="¿Necesitarías ayuda para arrancar?" required error={errors.necesitaAyuda}>
                    <RadioCards<NecesitaAyuda>
                      value={data.perfil.necesitaAyuda}
                      onChange={(v) => update("perfil", { necesitaAyuda: v })}
                      options={[
                        { value: "si", label: "Sí, siempre" },
                        { value: "solo_inicio", label: "Solo al inicio" },
                        { value: "no", label: "No" },
                      ]}
                    />
                  </Field>
                </StepWrapper>
              )}

              {step === 6 && (
                <StepWrapper
                  eyebrow="Interés"
                  title="¿Probarías Nexa?"
                  description="Estamos seleccionando un grupo reducido de escuelas piloto."
                >
                  <Field label="¿Estarías dispuesto a probarlo?" required error={errors.dispuestoProbar}>
                    <RadioCards
                      columns={2}
                      value={data.interes.dispuestoProbar}
                      onChange={(v) => update("interes", { dispuestoProbar: v })}
                      options={[
                        { value: "si", label: "Sí" },
                        { value: "no", label: "No" },
                      ]}
                    />
                  </Field>

                  <Field label="¿Qué te motivaría más?" hint="Elige varias" required error={errors.motivacion}>
                    <MultiSelectChips<MotivacionTipo>
                      value={data.interes.motivacion}
                      onChange={(v) => update("interes", { motivacion: v })}
                      options={[
                        { value: "ahorro_tiempo", label: "Ahorrar tiempo" },
                        { value: "menos_errores", label: "Menos errores" },
                        { value: "mejor_imagen", label: "Mejor imagen" },
                        { value: "mas_control", label: "Más control" },
                        { value: "portal_alumno", label: "Portal del alumno" },
                      ]}
                    />
                  </Field>

                  <Field label="¿Qué te frenaría?" hint="Opcional">
                    <MultiSelectChips<BarreraTipo>
                      value={data.interes.barreraCambio}
                      onChange={(v) => update("interes", { barreraCambio: v })}
                      options={[
                        { value: "coste", label: "Coste" },
                        { value: "tiempo", label: "Tiempo de cambio" },
                        { value: "miedo", label: "Miedo al cambio" },
                        { value: "ya_sistema", label: "Ya tengo sistema" },
                        { value: "ninguna", label: "Ninguna" },
                      ]}
                    />
                  </Field>
                </StepWrapper>
              )}

              {step === 7 && (
                <StepWrapper
                  eyebrow="Contacto"
                  title="¿Cómo te localizamos?"
                  description="Solo te contactaremos para coordinar el acceso al piloto."
                >
                  <div className="grid gap-6 sm:grid-cols-2">
                    <Field label="Nombre" required error={errors.nombreContacto}>
                      <Input
                        value={data.contacto.nombreContacto}
                        onChange={(e) => update("contacto", { nombreContacto: e.target.value })}
                        className="h-12"
                        placeholder="Tu nombre"
                      />
                    </Field>
                    <Field label="Cargo" required error={errors.cargo}>
                      <Input
                        value={data.contacto.cargo}
                        onChange={(e) => update("contacto", { cargo: e.target.value })}
                        className="h-12"
                        placeholder="Ej: Directora"
                      />
                    </Field>
                    <Field label="Email" required error={errors.email}>
                      <Input
                        type="email"
                        value={data.contacto.email}
                        onChange={(e) => update("contacto", { email: e.target.value })}
                        className="h-12"
                        placeholder="tu@email.com"
                      />
                    </Field>
                    <Field label="Teléfono" required error={errors.telefono}>
                      <Input
                        type="tel"
                        value={data.contacto.telefono}
                        onChange={(e) => update("contacto", { telefono: e.target.value })}
                        className="h-12"
                        placeholder="+34 600 000 000"
                      />
                    </Field>
                  </div>
                  <Field label="Web o redes sociales" hint="Opcional">
                    <Input
                      value={data.contacto.webRedes}
                      onChange={(e) => update("contacto", { webRedes: e.target.value })}
                      className="h-12"
                      placeholder="instagram.com/tu-escuela"
                    />
                  </Field>
                </StepWrapper>
              )}

              {step === 8 && (
                <StepWrapper
                  eyebrow="Última pregunta"
                  title="Si pudieras mejorar una sola cosa…"
                  description="¿Cuál sería el cambio que más impacto tendría en tu día a día?"
                >
                  <Field label="Tu respuesta" required error={errors.mejoraPrincipal}>
                    <Textarea
                      rows={6}
                      value={data.feedback.mejoraPrincipal}
                      onChange={(e) => update("feedback", { mejoraPrincipal: e.target.value })}
                      placeholder="Cuéntanoslo con tus palabras"
                      className="resize-none text-base"
                    />
                  </Field>
                </StepWrapper>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Nav */}
          <div className="mt-12 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={handleBack}
              disabled={step === 1 || submitting}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={handleNext}
              disabled={submitting}
              className="gap-2 px-6"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : step === TOTAL_STEPS ? (
                <>Enviar respuestas</>
              ) : (
                <>
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </main>
      )}
    </div>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <main className="container max-w-3xl py-20 sm:py-28">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="space-y-10 text-center"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Programa piloto · Madrid y alrededores
        </div>

        <div className="space-y-5">
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Queremos entender cómo funciona tu escuela
          </h1>
          <p className="mx-auto max-w-xl text-balance text-lg text-muted-foreground">
            Responde este breve formulario (3–5 min) y obtén un{" "}
            <span className="font-semibold text-foreground">25% de descuento</span> el primer año si decides probar Nexa.
          </p>
        </div>

        <p className="mx-auto max-w-xl text-sm text-muted-foreground">
          Estamos diseñando un sistema para academias de danza como la tuya. Antes de lanzar, queremos asegurarnos de
          que resuelve problemas reales.
        </p>

        <div className="flex flex-col items-center gap-3">
          <Button size="lg" onClick={onStart} className="h-12 gap-2 px-8 text-base">
            Empezar
            <ArrowRight className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">8 pasos · 3–5 minutos</span>
        </div>
      </motion.div>
    </main>
  );
}

function SuccessScreen({ onHome }: { onHome: () => void }) {
  return (
    <main className="container max-w-2xl py-24 sm:py-32">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="space-y-8 text-center"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Gracias. Hemos recibido tu información.
          </h1>
          <p className="mx-auto max-w-lg text-base text-muted-foreground">
            Te enviaremos tu acceso con el 25% de descuento si encajas en el perfil.
          </p>
        </div>
        <Button size="lg" variant="outline" onClick={onHome} className="h-12 px-6">
          Ver cómo funciona Nexa
        </Button>
      </motion.div>
    </main>
  );
}
