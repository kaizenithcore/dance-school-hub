import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getPublicFormData, submitPublicEnrollment, type PublicFormData, type EnrollmentFormData } from "@/lib/api/publicEnrollment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function EnrollPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const tenantSlug = schoolSlug; // Alias for consistency with API
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formConfig, setFormConfig] = useState<PublicFormData | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState<EnrollmentFormData>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    guardian_name: "",
    guardian_email: "",
    guardian_phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    class_id: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    medical_conditions: "",
    notes: "",
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (tenantSlug) {
      loadFormData();
    }
  }, [tenantSlug]);

  const loadFormData = async () => {
    if (!tenantSlug) return;
    
    setLoading(true);
    try {
      const data = await getPublicFormData(tenantSlug);
      if (data) {
        setFormConfig(data);
      } else {
        toast.error("No se encontró la escuela o está inactiva");
      }
    } catch (error) {
      toast.error("Error al cargar el formulario");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof EnrollmentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.first_name.trim()) newErrors.first_name = "El nombre es obligatorio";
    if (!formData.last_name.trim()) newErrors.last_name = "El apellido es obligatorio";
    if (!formData.email.trim()) newErrors.email = "El email es obligatorio";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email inválido";
    if (!formData.class_id) newErrors.class_id = "Debe seleccionar una clase";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate() || !tenantSlug) return;
    
    setSubmitting(true);
    try {
      await submitPublicEnrollment(tenantSlug, formData);
      setSuccess(true);
      toast.success("¡Inscripción enviada exitosamente!");
    } catch(error) {
      toast.error(error instanceof Error ? error.message : "Error al enviar la inscripción");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!formConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Escuela no encontrada</CardTitle>
            <CardDescription>
              La escuela que estás buscando no está disponible o está inactiva.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">¡Inscripción Enviada!</CardTitle>
            <CardDescription className="text-base mt-2">
              Tu solicitud de inscripción ha sido recibida exitosamente. Recibirás un email de confirmación pronto.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.location.reload()}>
              Hacer otra inscripción
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedClass = formConfig.availableClasses.find((c) => c.id === formData.class_id);

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            {formConfig.tenantName}
          </h1>
          <p className="text-muted-foreground text-lg">
            Formulario de Inscripción
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Class Selection */}
          <Card>
            <CardHeader>
              <CardTitle>1. Selecciona una Clase</CardTitle>
              <CardDescription>Elige la clase en la que deseas inscribirte</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Clase *</Label>
                <Select value={formData.class_id} onValueChange={(v) => handleChange("class_id", v)}>
                  <SelectTrigger className={errors.class_id ? "border-destructive" : ""}>
                    <SelectValue placeholder="Seleccionar clase" />
                  </SelectTrigger>
                  <SelectContent>
                    {formConfig.availableClasses.map((cls) => {
                      const isFull = cls.enrolled_count >= cls.capacity;
                      return (
                        <SelectItem key={cls.id} value={cls.id} disabled={isFull}>
                          <div className="flex justify-between items-center w-full gap-4">
                            <div className="flex flex-col text-left">
                              <span className="font-medium">{cls.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {cls.discipline} • {cls.category}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-semibold">${(cls.price_cents / 100).toFixed(2)}</span>
                              <span className={isFull ? "text-destructive" : "text-muted-foreground"}>
                                {cls.enrolled_count}/{cls.capacity}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {errors.class_id && <p className="text-xs text-destructive">{errors.class_id}</p>}
              </div>
              
              {selectedClass && (
                <div className="rounded-lg border p-4 bg-muted/50">
                  <h4 className="font-semibold mb-2">{selectedClass.name}</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Disciplina:</span> <strong>{selectedClass.discipline}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Nivel:</span> <strong>{selectedClass.category}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Precio:</span> <strong>${(selectedClass.price_cents / 100).toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cupos:</span> <strong>{selectedClass.enrolled_count}/{selectedClass.capacity}</strong>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Student Information */}
          <Card>
            <CardHeader>
              <CardTitle>2. Información del Estudiante</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => handleChange("first_name", e.target.value)}
                    className={errors.first_name ? "border-destructive" : ""}
                    placeholder="Juan"
                  />
                  {errors.first_name && <p className="text-xs text-destructive">{errors.first_name}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Apellido *</Label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) => handleChange("last_name", e.target.value)}
                    className={errors.last_name ? "border-destructive" : ""}
                    placeholder="Pérez"
                  />
                  {errors.last_name && <p className="text-xs text-destructive">{errors.last_name}</p>}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className={errors.email ? "border-destructive" : ""}
                    placeholder="juan@example.com"
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="+54 11 1234-5678"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Fecha de Nacimiento</Label>
                <Input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => handleChange("date_of_birth", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Guardian Information */}
          <Card>
            <CardHeader>
              <CardTitle>3. Información del Tutor</CardTitle>
              <CardDescription>Requerido para menores de edad</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del Tutor</Label>
                <Input
                  value={formData.guardian_name}
                  onChange={(e) => handleChange("guardian_name", e.target.value)}
                  placeholder="María Pérez"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email del Tutor</Label>
                  <Input
                    type="email"
                    value={formData.guardian_email}
                    onChange={(e) => handleChange("guardian_email", e.target.value)}
                    placeholder="maria@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono del Tutor</Label>
                  <Input
                    value={formData.guardian_phone}
                    onChange={(e) => handleChange("guardian_phone", e.target.value)}
                    placeholder="+54 11 1234-5678"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle>4. Contacto de Emergencia y Salud</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contacto de Emergencia</Label>
                  <Input
                    value={formData.emergency_contact_name}
                    onChange={(e) => handleChange("emergency_contact_name", e.target.value)}
                    placeholder="Nombre completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono de Emergencia</Label>
                  <Input
                    value={formData.emergency_contact_phone}
                    onChange={(e) => handleChange("emergency_contact_phone", e.target.value)}
                    placeholder="+54 11 1234-5678"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Condiciones Médicas / Alergias</Label>
                <Textarea
                  value={formData.medical_conditions}
                  onChange={(e) => handleChange("medical_conditions", e.target.value)}
                  rows={3}
                  placeholder="Opcional: Menciona cualquier condición médica, alergia o información relevante para la práctica de danza"
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card>
            <CardHeader>
              <CardTitle>5. Notas Adicionales</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={4}
                placeholder="Información adicional que desees compartir con nosotros"
              />
            </CardContent>
          </Card>

          <div className="flex justify-center pt-4">
            <Button type="submit" size="lg" disabled={submitting} className="w-full md:w-auto px-12">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? "Enviando..." : "Enviar Inscripción"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
