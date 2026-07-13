import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { registerSchool } from "@/lib/auth";
import { defaultPlanType, freeTrialDays, planCatalog, planOrder, type PlanType } from "@/lib/commercialCatalog";
import { trackPortalEvent } from "@/lib/portalTelemetry";
import { useVerticalConfig } from "@/lib/vertical/context";

const REGISTER_CHECKOUT_SELECTION_KEY = "nexa:register:checkout-selection:v1";
const PRIMARY_PLAN = defaultPlanType;

type BillingCycle = "monthly" | "annual";
type RegisterOfferId = PlanType;

interface RegisterOffer {
  id: RegisterOfferId;
  name: string;
  studentsLabel: string;
  monthlyPriceEur: number;
  annualTotalEur: number;
  annualSavingsLabel?: string;
  highlighted?: boolean;
}

interface ValidationErrors {
  [key: string]: string | undefined;
}

function isNexaPlan(value: RegisterOfferId): value is PlanType {
  return planOrder.includes(value);
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { productName, logoPath, vocabulary } = useVerticalConfig();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Step 1 — School info
  const [schoolName, setSchoolName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");

  // Step 2 — Account
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Step 3 — Plan selection
  const [selectedPlan, setSelectedPlan] = useState<RegisterOfferId>(PRIMARY_PLAN);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("annual");

  const offers: RegisterOffer[] = planOrder.map((planType) => ({
    id: planType,
    name: planCatalog[planType].name,
    studentsLabel: planCatalog[planType].limits.marketingLabel,
    monthlyPriceEur: planCatalog[planType].billing.monthlyPriceEur,
    annualTotalEur: planCatalog[planType].billing.annualTotalEur,
    annualSavingsLabel: planCatalog[planType].billing.annualSavingsLabel,
    highlighted: planCatalog[planType].highlighted,
  }));

  const validateStep1 = () => {
    const errs: ValidationErrors = {};
    if (!schoolName.trim()) errs.schoolName = "El nombre de la escuela es obligatorio";
    if (!email.trim()) errs.email = "El correo electrónico es obligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Introduce un correo válido";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: ValidationErrors = {};
    if (!name.trim()) errs.name = "El nombre es obligatorio";
    if (!password) errs.password = "La contraseña es obligatoria";
    else if (password.length < 8) errs.password = "Mínimo 8 caracteres";
    if (password !== confirmPassword) errs.confirmPassword = "Las contraseñas no coinciden";
    if (!acceptTerms) errs.acceptTerms = "Debes aceptar los términos y condiciones";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) { setStep(2); setErrors({}); }
  };

  const handleGoToStep3 = () => {
    if (validateStep2()) { setStep(3); setErrors({}); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    trackPortalEvent({
      eventName: "submit_register_start",
      category: "funnel",
      metadata: { section: "register", step, selectedPlan, billingCycle },
    });

    setIsLoading(true);
    try {
      const result = await registerSchool({
        schoolName,
        ownerName: name,
        ownerEmail: email,
        ownerPassword: password,
        city: city || undefined,
      });

      if (result.success) {
        if (isNexaPlan(selectedPlan)) {
          localStorage.setItem("selected_plan", selectedPlan);
        } else {
          localStorage.removeItem("selected_plan");
        }
        localStorage.setItem("selected_billing_cycle", billingCycle);
        window.localStorage.setItem(
          REGISTER_CHECKOUT_SELECTION_KEY,
          JSON.stringify({ selectedPlan, billingCycle })
        );
        toast.success("Registro exitoso. Redirigiendo al panel...");
        navigate("/admin");
      } else {
        toast.error(result.error || "Error al registrar la escuela.");
      }
    } catch (error) {
      toast.error("Error inesperado. Por favor, intenta de nuevo.");
      if (import.meta.env.DEV) console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md space-y-8"
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-3">
          <img src={logoPath} alt={productName} className="h-12 w-12 object-contain" />
          <h1 className="text-2xl font-bold text-foreground">Registra tu {vocabulary.center}</h1>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-2 w-8 rounded-full ${step >= s ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </div>

        {/* Steps */}
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <p className="text-center text-sm text-muted-foreground">Paso 1 de 3: Datos de la escuela</p>

              <div className="space-y-2">
                <Label htmlFor="schoolName">Nombre de la escuela *</Label>
                <Input
                  id="schoolName"
                  placeholder="Academia de Baile Sol"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className={errors.schoolName ? "border-destructive" : ""}
                />
                {errors.schoolName && (
                  <div className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />{errors.schoolName}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@escuela.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <div className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />{errors.email}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  placeholder="Madrid"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <Button className="w-full" onClick={handleNextStep}>
                Siguiente <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>

          ) : step === 2 ? (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-5"
            >
              <p className="text-center text-sm text-muted-foreground">Paso 2 de 3: Tu cuenta</p>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo *</Label>
                <Input
                  id="name"
                  placeholder="María García"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <div className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />{errors.name}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={errors.password ? "border-destructive" : ""}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <div className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />{errors.password}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repite la contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={errors.confirmPassword ? "border-destructive" : ""}
                />
                {errors.confirmPassword && (
                  <div className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />{errors.confirmPassword}
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(v) => setAcceptTerms(v === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="terms" className="text-sm font-normal cursor-pointer leading-snug">
                  Acepto los{" "}
                  <Link to="/legal/terms" className="text-primary hover:underline" target="_blank">términos de servicio</Link>
                  {" "}y la{" "}
                  <Link to="/legal/privacy" className="text-primary hover:underline" target="_blank">política de privacidad</Link>
                </Label>
              </div>
              {errors.acceptTerms && (
                <div className="flex items-center gap-1.5 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />{errors.acceptTerms}
                </div>
              )}

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
                </Button>
                <Button type="button" onClick={handleGoToStep3} className="flex-1">
                  Siguiente <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>

          ) : (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-5"
            >
              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground">Paso 3 de 3</p>
                <p className="text-base font-semibold text-foreground">Elige tu plan</p>
                <p className="text-xs text-muted-foreground">{freeTrialDays} días gratis · Sin tarjeta · Sin compromiso</p>
              </div>

              {/* Billing cycle toggle */}
              <div className="flex items-center rounded-lg border border-border bg-muted/30 p-1 gap-0.5">
                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
                    billingCycle === "monthly" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Mensual
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("annual")}
                  className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
                    billingCycle === "annual" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Anual{" "}
                  <span className="ml-1 text-[10px] font-bold text-success">2 meses gratis</span>
                </button>
              </div>

              {/* Plan cards */}
              <div className="space-y-2">
                {offers.map((offer) => {
                  const isSelected = selectedPlan === offer.id;
                  const monthlyDisplay = billingCycle === "annual"
                    ? Math.round(offer.annualTotalEur / 12)
                    : offer.monthlyPriceEur;

                  return (
                    <button
                      key={offer.id}
                      type="button"
                      onClick={() => {
                        setSelectedPlan(offer.id);
                        trackPortalEvent({
                          eventName: "click_pricing_plan",
                          category: "funnel",
                          metadata: { section: "register", planType: offer.id, planName: offer.name, billingCycle },
                        });
                      }}
                      className={`w-full rounded-xl border-2 p-4 text-left transition ${
                        isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground">{offer.name}</p>
                            {offer.highlighted && (
                              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                Recomendado
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{offer.studentsLabel}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-foreground">
                            {monthlyDisplay}€<span className="text-sm font-normal text-muted-foreground">/mes</span>
                          </p>
                          {billingCycle === "annual" && offer.annualSavingsLabel && (
                            <p className="text-[10px] font-medium text-success">{offer.annualSavingsLabel}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Submit */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Empezar gratis
                  </Button>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  {freeTrialDays} días gratis · Sin tarjeta · Cancela cuando quieras.
                  Al registrarte aceptas los{" "}
                  <Link to="/legal/terms" className="text-primary hover:underline" target="_blank">términos</Link>
                  {" "}y la{" "}
                  <Link to="/legal/privacy" className="text-primary hover:underline" target="_blank">privacidad</Link>.
                </p>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {step !== 3 && (
          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link to="/auth/login" className="text-primary hover:underline">Inicia sesión</Link>
          </p>
        )}
      </motion.div>
    </div>
  );
}
