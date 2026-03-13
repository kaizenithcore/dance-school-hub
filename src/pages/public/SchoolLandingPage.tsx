import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PublicScheduleSelector } from "@/components/schedule/PublicScheduleSelector";
import { ArrowRight, MapPin, Phone, Mail, Sparkles, Loader2, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublicFormData, type PublicFormData } from "@/lib/api/publicEnrollment";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DAY_ORDER = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function formatHour(hour: number) {
  const normalized = Math.max(0, Math.floor(hour));
  return `${String(normalized).padStart(2, "0")}:00`;
}

function normalizeRecurringMode(value: unknown): "linked" | "single_day" | undefined {
  return value === "single_day" || value === "linked" ? value : undefined;
}

export default function SchoolLandingPage() {
  const { schoolSlug } = useParams();
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<PublicFormData | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!schoolSlug) return;

      setLoading(true);
      try {
        const data = await getPublicFormData(schoolSlug);
        setFormData(data);
        setNotFound(!data);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [schoolSlug]);

  const toggleClass = (selectionId: string, linkedSelectionIds?: string[]) => {
    setSelectedClasses((prev) => {
      if (linkedSelectionIds && linkedSelectionIds.length > 0) {
        const hasAny = linkedSelectionIds.some((id) => prev.includes(id));
        return hasAny
          ? prev.filter((id) => !linkedSelectionIds.includes(id))
          : Array.from(new Set([...prev, ...linkedSelectionIds]));
      }

      return prev.includes(selectionId)
        ? prev.filter((id) => id !== selectionId)
        : [...prev, selectionId];
    });
  };

  const schoolName = formData?.tenantName || schoolSlug?.replace(/-/g, " ") || "Escuela de Danza";
  const selectedClassIdsForQuery = Array.from(new Set(selectedClasses.map((selectionId) => selectionId.split("::")[0] || selectionId)));
  const enrollQuery = selectedClassIdsForQuery.length > 0
    ? `?class_ids=${encodeURIComponent(selectedClassIdsForQuery.join(","))}`
    : "";
  const enrollPath = `/s/${schoolSlug}/enroll${enrollQuery}`;

  const previewClassesCount = (formData?.availableClasses || []).length;

  const scheduleStats = useMemo(() => {
    const classes = formData?.availableClasses || [];
    const allSchedules = classes.flatMap((item) => item.schedules || []);

    if (allSchedules.length === 0) {
      return {
        days: "Horario por publicar",
        range: "",
        weeklyHours: 0,
      };
    }

    const uniqueDays = Array.from(new Set(allSchedules.map((item) => item.day))).sort(
      (a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b)
    );

    const starts = allSchedules.map((item) => item.startHour);
    const ends = allSchedules.map((item) => item.startHour + item.duration);

    return {
      days: `${uniqueDays[0]} a ${uniqueDays[uniqueDays.length - 1]}`,
      range: `${formatHour(Math.min(...starts))} - ${formatHour(Math.max(...ends))}`,
      weeklyHours: allSchedules.reduce((sum, item) => sum + item.duration, 0),
    };
  }, [formData]);

  const effectivePublicScheduleConfig = useMemo(() => {
    const formBuilderConfig = formData?.formConfig.scheduleSettings ?? formData?.formConfig.jointEnrollment?.schedule;
    const settingsConfig = formData?.scheduleConfig;

    if (!formBuilderConfig) return undefined;

    return {
      ...formBuilderConfig,
      recurringSelectionMode: normalizeRecurringMode(settingsConfig?.recurringSelectionMode) ?? formBuilderConfig.recurringSelectionMode,
      startHour: settingsConfig?.startHour,
      endHour: settingsConfig?.endHour,
    };
  }, [formData]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !formData) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Escuela no encontrada</CardTitle>
            <CardDescription>
              La escuela que buscas no existe o no esta disponible.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/30" />
        <div className="container relative py-16 sm:py-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground mb-4">
              <Sparkles className="h-3 w-3" />
              Inscripciones abiertas
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight capitalize">
              {schoolName}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed max-w-lg">
              {formData?.publicProfile?.description || formData?.publicProfile?.tagline || "Consulta el horario real de clases y comienza tu matrícula en línea."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={enrollPath}>
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

      <section className="border-b border-border bg-card">
        <div className="container py-4 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> {formData?.publicProfile?.address || "Dirección pendiente de definir"}
          </span>
          <span className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" /> {formData?.publicProfile?.phone || "Teléfono pendiente de definir"}
          </span>
          <span className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" /> {formData?.publicProfile?.email || `contacto@${schoolSlug}.com`}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" /> {scheduleStats.days}{scheduleStats.range ? ` · ${scheduleStats.range}` : ""}
          </span>
        </div>
      </section>

      <section id="schedule" className="container py-12 sm:py-16">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Clases Disponibles</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {previewClassesCount} clase{previewClassesCount === 1 ? "" : "s"} activa{previewClassesCount === 1 ? "" : "s"} · {scheduleStats.weeklyHours.toFixed(1)}h semanales publicadas.
            </p>
          </div>
          <div className="flex gap-2">
            {selectedClasses.length > 0 && (
              <Button asChild className="animate-fade-in">
                <Link to={enrollPath}>
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

        <PublicScheduleSelector
          classes={formData.availableClasses}
          selectedClassIds={selectedClasses}
          onToggleClass={toggleClass}
          scheduleConfig={effectivePublicScheduleConfig}
        />
      </section>
    </div>
  );
}
