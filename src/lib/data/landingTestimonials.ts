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
    location: "Griñón, Madrid",
    personName: "Etna G.",
    personRole: "Directora",
    quote:
      "Antes invertiamos demasiadas horas en matriculas y reorganizacion de grupos. Ahora el equipo puede centrarse en alumnos y calidad de clases.",
    metricLabel: "Tiempo administrativo semanal ahorrado",
    metricValue: "-14 h/semana",
    logoPlaceholderText: "ED",
    avatarUrl: "https://placehold.co/96x96/f3f4f6/1f2937?text=EG",
  },
  {
    id: "tu-escuela",
    status: "published",
    schoolName: "Tu escuela",
    location: "España",
    personName: "Tú",
    personRole: "Director/a",
    quote:
      "¿Quieres ser el próximo caso de éxito? Contáctanos para publicar tu experiencia con Nexa y ayudar a otras escuelas a dar el salto digital.",
    metricLabel: "Tu caso aquí",
    metricValue: "Contáctanos",
    logoPlaceholderText: "SN",
    avatarUrl: "https://placehold.co/96x96/e2e8f0/0f172a?text=TE",
  },
  // {
  //   id: "ritmo-urbano-sevilla",
  //   status: "published",
  //   schoolName: "Ritmo Urbano",
  //   location: "Sevilla",
  //   personName: "Diego L.",
  //   personRole: "Direccion operativa",
  //   quote:
  //     "La campaña de renovaciones dejó de ser una maratón de llamadas. Ahora lanzamos en bloque y vemos confirmaciones en tiempo real.",
  //   metricLabel: "Tasa de renovacion trimestral",
  //   metricValue: "+22 puntos",
  //   logoPlaceholderText: "RU",
  //   avatarUrl: "https://placehold.co/96x96/fef3c7/78350f?text=DL",
  // },
];
