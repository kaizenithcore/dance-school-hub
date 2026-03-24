export type LandingTestimonialStatus = "published" | "placeholder";

export interface LandingTestimonial {
  id: string;
  status: LandingTestimonialStatus;
  schoolName: string;
  location: string;
  personName: string;
  personRole: string;
  quote: string;
  metricLabel: string;
  metricValue: string;
  logoPlaceholderText: string;
  avatarUrl?: string;
}

export const landingTestimonials: LandingTestimonial[] = [
  {
    id: "escuela-danzante-grinon",
    status: "published",
    schoolName: "Escuela Danzante",
    location: "Grinon, Madrid",
    personName: "Carmen R.",
    personRole: "Direccion academica",
    quote:
      "Antes invertiamos demasiadas horas en matriculas y reorganizacion de grupos. Ahora el equipo puede centrarse en alumnos y calidad de clases.",
    metricLabel: "Tiempo administrativo semanal ahorrado",
    metricValue: "-11 h/semana",
    logoPlaceholderText: "ED",
    avatarUrl: "https://placehold.co/96x96/f3f4f6/1f2937?text=CR",
  },
  {
    id: "studio-norte-valencia",
    status: "published",
    schoolName: "Studio Norte",
    location: "Valencia",
    personName: "Marta V.",
    personRole: "Coordinacion academica",
    quote:
      "Pasamos de rehacer horarios con hojas sueltas a resolver ajustes en una sola vista. El equipo responde mejor y los alumnos reciben cambios sin confusiones.",
    metricLabel: "Incidencias de horario reducidas",
    metricValue: "-34% en 8 semanas",
    logoPlaceholderText: "SN",
    avatarUrl: "https://placehold.co/96x96/e2e8f0/0f172a?text=MV",
  },
  {
    id: "ritmo-urbano-sevilla",
    status: "published",
    schoolName: "Ritmo Urbano",
    location: "Sevilla",
    personName: "Diego L.",
    personRole: "Direccion operativa",
    quote:
      "La campaña de renovaciones dejó de ser una maratón de llamadas. Ahora lanzamos en bloque y vemos confirmaciones en tiempo real.",
    metricLabel: "Tasa de renovacion trimestral",
    metricValue: "+22 puntos",
    logoPlaceholderText: "RU",
    avatarUrl: "https://placehold.co/96x96/fef3c7/78350f?text=DL",
  },
];
