import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Music, ArrowLeft, ArrowRight, Loader2, Eye, EyeOff, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { registerSchool } from "@/lib/auth";
import { getSelectableSubscriptionAddons, planCatalog, planOrder, type PlanType, type SubscriptionAddonKey } from "@/lib/commercialCatalog";
import { trackPortalEvent } from "@/lib/portalTelemetry";

interface ValidationErrors {
  [key: string]: string | undefined;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Step 1 - School info
  const [schoolName, setSchoolName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");

  // Step 2 - Account
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Step 3 - Plan selection
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("pro");
  const [addOns, setAddOns] = useState<Record<SubscriptionAddonKey, boolean>>({
    customDomain: false,
    prioritySupport: false,
    waitlistAutomation: false,
    renewalAutomation: false,
  });

  const plans = Object.fromEntries(
    planOrder.map((planType) => [
      planType,
      {
        name: planCatalog[planType].name,
        price: planCatalog[planType].billing.monthlyPriceEur,
        students: planCatalog[planType].limits.includedActiveStudents,
      },
    ])
  ) as Record<PlanType, { name: string; price: number; students: number }>;

  const selectableAddOns = getSelectableSubscriptionAddons(selectedPlan);

  const calculateTotal = () => {
    const planPrice = plans[selectedPlan].price;
    const addOnTotal = selectableAddOns
      .filter((addon) => addOns[addon.key])
      .reduce((sum, addon) => sum + addon.monthlyPriceEur, 0);
    return planPrice + addOnTotal;
  };

  const validateStep1 = () => {
    const newErrors: ValidationErrors = {};
    
    if (!schoolName.trim()) {
      newErrors.schoolName = "El nombre de la escuela es obligatorio";
    }
    
    if (!email.trim()) {
      newErrors.email = "El correo electrónico es obligatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Introduce un correo válido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: ValidationErrors = {};

    if (!name.trim()) {
      newErrors.name = "El nombre es obligatorio";
    }

    if (!password) {
      newErrors.password = "La contraseña es obligatoria";
    } else if (password.length < 8) {
      newErrors.password = "Mínimo 8 caracteres";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
    }

    if (!acceptTerms) {
      newErrors.acceptTerms = "Debes aceptar los términos y condiciones";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
      setErrors({});
    }
  };

  const handleGoToStep3 = () => {
    if (validateStep2()) {
      setStep(3);
      setErrors({});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    trackPortalEvent({
      eventName: "submit_register_start",
      category: "funnel",
      metadata: {
        section: "register",
        step,
        selectedPlan,
        selectedAddOns: selectableAddOns
          .filter((addon) => addOns[addon.key])
          .map((addon) => addon.key),
      },
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
        // Store selected plan and add-ons for later billing setup
        localStorage.setItem("selected_plan", selectedPlan);
        localStorage.setItem("selected_addons", JSON.stringify(
          selectableAddOns
            .filter((addon) => addOns[addon.key])
            .map((addon) => addon.key)
        ));
        
        toast.success("Registro exitoso. Redirigiendo al panel...");
        navigate("/admin");
      } else {
        toast.error(result.error || "Error al registrar la escuela.");
      }
    } catch (error) {
      toast.error("Error inesperado. Por favor, intenta de nuevo.");
      console.error("Registration error:", error);
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
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Music className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Registra tu escuela</h1>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-8 rounded-full ${step >= s ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>

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
                    <AlertCircle className="h-4 w-4" />
                    {errors.schoolName}
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
                    <AlertCircle className="h-4 w-4" />
                    {errors.email}
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
                    <AlertCircle className="h-4 w-4" />
                    {errors.name}
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
                    <AlertCircle className="h-4 w-4" />
                    {errors.password}
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
                    <AlertCircle className="h-4 w-4" />
                    {errors.confirmPassword}
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
                  <Link to="/legal/terms" className="text-primary hover:underline" target="_blank">
                    términos de servicio
                  </Link>
                  {" "}y la{" "}
                  <Link to="/legal/privacy" className="text-primary hover:underline" target="_blank">
                    política de privacidad
                  </Link>
                </Label>
              </div>
              {errors.acceptTerms && (
                <div className="flex items-center gap-1.5 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {errors.acceptTerms}
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
              <p className="text-center text-sm text-muted-foreground">Paso 3 de 3: Elige tu plan</p>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Plan base</Label>
                {planOrder.map((key) => {
                  const plan = plans[key];

                  return (
                  <div
                    key={key}
                    onClick={() => {
                      setSelectedPlan(key);
                      trackPortalEvent({
                        eventName: "click_pricing_plan",
                        category: "funnel",
                        metadata: {
                          section: "register",
                          planType: key,
                          planName: plan.name,
                          monthlyPriceEur: plan.price,
                        },
                      });
                    }}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                      selectedPlan === key
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{plan.name}</p>
                        <p className="text-sm text-muted-foreground">Hasta {plan.students} alumnos</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">{plan.price}€/mes</p>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Add-ons opcionales</Label>
                {selectableAddOns.map(({ key, label, monthlyPriceEur, starterOnly }) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition"
                  >
                    <Checkbox
                      checked={addOns[key] ?? false}
                      onCheckedChange={(checked) =>
                        setAddOns({ ...addOns, [key]: checked === true })
                      }
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      {starterOnly ? <p className="text-xs text-muted-foreground">Disponible en Starter</p> : null}
                    </div>
                    <p className="text-sm font-semibold text-primary">+{monthlyPriceEur}€</p>
                  </label>
                ))}
              </div>

              <div className="rounded-lg bg-primary/10 p-4 border border-primary/20">
                <p className="text-sm text-muted-foreground mb-2">Precio mensual tras periodo de prueba:</p>
                <p className="text-3xl font-bold text-foreground">{calculateTotal()}€/mes</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Empezar prueba gratis
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {step !== 3 && (
          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link to="/auth/login" className="text-primary hover:underline">
              Inicia sesión
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  );
}
