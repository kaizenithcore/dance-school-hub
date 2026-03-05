import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ClassSchedulePreview } from "@/components/schedule/ClassSchedulePreview";
import { ArrowRight, MapPin, Phone, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SchoolLandingPage() {
  const { schoolSlug } = useParams();
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const schoolName = schoolSlug?.replace(/-/g, " ") || "Escuela de Danza";

  const toggleClass = (id: string) => {
    setSelectedClasses((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/30" />
        <div className="container relative py-16 sm:py-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground mb-4">
              <Sparkles className="h-3 w-3" />
              Inscripciones abiertas — Otoño 2026
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight capitalize">
              {schoolName}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed max-w-lg">
              Descubrí el placer del movimiento. Ofrecemos una amplia variedad de clases de danza para todas las edades y niveles en un ambiente inspirador.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={`/s/${schoolSlug}/enroll`}>
                  Comenzar Inscripción
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="#schedule">Ver Clases</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Info */}
      <section className="border-b border-border bg-card">
        <div className="container py-4 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> Av. Danza 123, Barrio Estudio
          </span>
          <span className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" /> (011) 1234-5678
          </span>
          <span className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" /> hola@{schoolSlug}.com
          </span>
        </div>
      </section>

      {/* Schedule Preview */}
      <section id="schedule" className="container py-12 sm:py-16">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Clases Disponibles</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Seleccioná las clases que te interesan y luego procedé a inscribirte.
            </p>
          </div>
          <div className="flex gap-2">
            {selectedClasses.length > 0 && (
              <Button asChild className="animate-fade-in">
                <Link to={`/s/${schoolSlug}/enroll`}>
                  Inscribirse en {selectedClasses.length} clase{selectedClasses.length > 1 ? "s" : ""}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to={`/s/${schoolSlug}/schedule`}>
                Ver Horario Completo
              </Link>
            </Button>
          </div>
        </div>

        <ClassSchedulePreview
          selectedClassIds={selectedClasses}
          onToggleClass={toggleClass}
        />
      </section>
    </div>
  );
}
