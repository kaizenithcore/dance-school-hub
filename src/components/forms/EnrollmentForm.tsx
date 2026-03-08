import { useState, useCallback } from "react";
import { FormSectionConfig, FormFieldConfig } from "@/lib/types/formSchema";
import { FormSection } from "@/components/forms/FormSection";
import { DynamicField } from "@/components/forms/DynamicField";
import { EnrollmentSummary } from "@/components/forms/EnrollmentSummary";
import { ClassCardData } from "@/components/cards/ClassCard";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft, ArrowRight, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EnrollmentFormProps {
  schema: FormSectionConfig[];
  selectedClasses: ClassCardData[];
  onRemoveClass: (id: string) => void;
}

export function EnrollmentForm({ schema, selectedClasses, onRemoveClass }: EnrollmentFormProps) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  // Steps: each form section + class summary as first step
  const allSteps = [
    { id: "_classes", title: "Clases Seleccionadas" },
    ...schema,
  ];

  const currentStep = allSteps[step];
  const isLastStep = step === allSteps.length - 1;
  const isFirstStep = step === 0;

  const setValue = useCallback((fieldId: string, value: any) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  const validateCurrentStep = useCallback(() => {
    if (currentStep.id === "_classes") {
      if (selectedClasses.length === 0) {
        toast.error("Selecciona al menos una clase para continuar.");
        return false;
      }
      return true;
    }

    const section = schema.find((s) => s.id === currentStep.id);
    if (!section) return true;

    const newErrors: Record<string, string> = {};
    for (const field of section.fields) {
      const val = values[field.id];
      if (field.required) {
        if (field.type === "checkbox" && !val) {
          newErrors[field.id] = "Este campo es obligatorio";
        } else if (field.type !== "checkbox" && (!val || (typeof val === "string" && val.trim() === ""))) {
          newErrors[field.id] = "Este campo es obligatorio";
        }
      }
      if (field.type === "email" && val && typeof val === "string" && val.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val.trim())) {
          newErrors[field.id] = "Ingresá un correo electrónico válido";
        }
      }
      if (field.maxLength && typeof val === "string" && val.length > field.maxLength) {
        newErrors[field.id] = `Máximo ${field.maxLength} caracteres`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentStep, schema, values, selectedClasses]);

  const handleNext = useCallback(() => {
    if (validateCurrentStep()) {
      setStep((s) => Math.min(s + 1, allSteps.length - 1));
    }
  }, [validateCurrentStep, allSteps.length]);

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!validateCurrentStep()) return;

    // TODO: call createEnrollment() API
    console.log("Enrollment submitted:", { values, classIds: selectedClasses.map((c) => c.id) });
    setSubmitted(true);
    toast.success("¡Inscripción enviada exitosamente!");
  }, [validateCurrentStep, values, selectedClasses]);

  if (submitted) {
    return (
      <div className="rounded-lg border border-border bg-card p-10 shadow-soft text-center animate-fade-in">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent">
          <CheckCircle className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">¡Inscripción Enviada!</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
          Tu solicitud de inscripción fue recibida. Te contactaremos pronto para confirmar los detalles y el pago.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Clases seleccionadas: {selectedClasses.length} · Total: €{selectedClasses.reduce((s, c) => s + c.price, 0)}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {allSteps.map((s, i) => (
          <button
            key={s.id}
            onClick={() => i < step && setStep(i)}
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
              i === step
                ? "bg-primary text-primary-foreground"
                : i < step
                ? "bg-accent text-accent-foreground cursor-pointer hover:bg-accent/80"
                : "bg-muted text-muted-foreground"
            )}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background/20 text-[10px] font-bold">
              {i + 1}
            </span>
            <span className="hidden sm:inline">{s.title}</span>
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="animate-fade-in" key={currentStep.id}>
        {currentStep.id === "_classes" ? (
          <EnrollmentSummary
            selectedClasses={selectedClasses}
            onRemoveClass={onRemoveClass}
          />
        ) : (
          <FormSection
            title={currentStep.title}
            description={(currentStep as FormSectionConfig).description}
          >
            {(currentStep as FormSectionConfig).fields.map((field) => (
              <DynamicField
                key={field.id}
                field={field}
                value={values[field.id]}
                onChange={(val) => setValue(field.id, val)}
                error={errors[field.id]}
              />
            ))}
          </FormSection>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={isFirstStep}
          className={cn(isFirstStep && "invisible")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Anterior
        </Button>

        {isLastStep ? (
          <Button onClick={handleSubmit}>
            <Send className="h-4 w-4 mr-1" />
            Enviar Inscripción
          </Button>
        ) : (
          <Button onClick={handleNext}>
            Siguiente
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
