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
    id: "proximo-caso-01",
    status: "placeholder",
    schoolName: "Tu escuela",
    location: "Proximo caso destacado",
    personName: "Tu equipo",
    personRole: "Caso de exito en preparacion",
    quote:
      "Tu escuela podria ser el siguiente caso de exito. Implementa DanceHub y convierte tu operacion diaria en un proceso simple, medible y escalable.",
    metricLabel: "Tu resultado aqui",
    metricValue: "Proximo caso",
    logoPlaceholderText: "NX",
  },
];
