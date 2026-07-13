import type { VerticalId } from "./types";

export interface LandingPillar {
  icon: string;
  title: string;
  description: string;
}

export interface LandingStat {
  value: string;
  label: string;
}

export interface LandingTestimonial {
  quote: string;
  author: string;
  role: string;
}

export interface LandingCompareItem {
  without: string;
  with: string;
}

export interface LandingFaq {
  q: string;
  a: string;
}

export interface LandingContent {
  pillars: LandingPillar[];
  stats: LandingStat[];
  testimonial: LandingTestimonial;
  compareItems: LandingCompareItem[];
  faqs: LandingFaq[];
}

const danceContent: LandingContent = {
  pillars: [
    {
      icon: "Link",
      title: "Todo conectado",
      description: "Alumnos, clases, pagos y comunicación en un solo lugar. Sin saltar entre apps.",
    },
    {
      icon: "Clock",
      title: "Menos trabajo",
      description: "Automatiza cobros, listas de espera y recordatorios. Recupera horas cada semana.",
    },
    {
      icon: "BarChart2",
      title: "Más control",
      description: "Dashboards claros sobre ocupación, ingresos y asistencia en tiempo real.",
    },
    {
      icon: "Star",
      title: "Mejor experiencia",
      description: "Portal de familias para consultas, pagos y novedades. Menos llamadas, más satisfacción.",
    },
  ],
  stats: [
    { value: "-70%", label: "tiempo en gestión" },
    { value: "+25h", label: "ahorradas al mes" },
    { value: "+40%", label: "satisfacción de familias" },
  ],
  testimonial: {
    quote: "Antes perdía las mañanas en Excel y WhatsApp. Ahora abro Nexa y en 5 minutos tengo todo bajo control.",
    author: "Etna G.",
    role: "Directora, Escuela Danzante",
  },
  compareItems: [
    { without: "Listas de alumnos en Excel dispersas", with: "Ficha digital centralizada con historial" },
    { without: "Cobros manuales por transferencia", with: "Domiciliación y cobros automáticos" },
    { without: "WhatsApp para avisos de clase", with: "Comunicación masiva con confirmación de lectura" },
    { without: "Sin control de asistencia", with: "Registro con un clic desde el móvil" },
  ],
  faqs: [
    {
      q: "¿Puedo empezar sin migrar todos mis datos?",
      a: "Sí. Puedes importar alumnos desde Excel o empezar con los nuevos e ir incorporando el histórico poco a poco.",
    },
    {
      q: "¿Cómo funciona la domiciliación?",
      a: "Integrada con Stripe. El alumno añade su tarjeta o cuenta y los cobros mensuales se procesan solos.",
    },
    {
      q: "¿Es apto para escuelas con varias disciplinas?",
      a: "Sí. Puedes crear grupos por disciplina, nivel y horario, y cada alumno puede estar en varios grupos.",
    },
    {
      q: "¿Hay contrato de permanencia?",
      a: "No. El plan se renueva mes a mes y puedes cancelar cuando quieras sin penalización.",
    },
    {
      q: "¿Qué pasa si supero el límite de alumnos?",
      a: "Te avisamos antes. Puedes añadir bloques de 50 alumnos desde el panel o cambiar de plan.",
    },
    {
      q: "¿Tienen soporte en español?",
      a: "Sí. Soporte por email y chat en horario de oficina (CET). El plan Pro incluye soporte prioritario.",
    },
  ],
};

const sportsContent: LandingContent = {
  pillars: [
    {
      icon: "Users",
      title: "Socios organizados",
      description: "Ficha completa de cada socio: modalidades, cuota, asistencia e historial en un solo sitio.",
    },
    {
      icon: "Activity",
      title: "Planes flexibles",
      description: "Define cuotas por modalidad o acceso libre. Aplica descuentos y gestiona bajas sin fricciones.",
    },
    {
      icon: "BarChart2",
      title: "Datos del centro",
      description: "Ocupación por horario, tasa de renovación y evolución de socios. Toma decisiones con datos.",
    },
    {
      icon: "Smartphone",
      title: "Portal del socio",
      description: "Consulta de reservas, pagos y comunicados desde el móvil. Reduce llamadas y WhatsApp.",
    },
  ],
  stats: [
    { value: "-70%", label: "tiempo en gestión" },
    { value: "+30h", label: "ahorradas al mes" },
    { value: "+35%", label: "retención de socios" },
  ],
  testimonial: {
    quote: "Antes llevábamos las cuotas en Excel y la asistencia en papel. Ahora todo está en Nexa Sport y el equipo lo usa desde el móvil.",
    author: "Marcos L.",
    role: "Gerente, Club Deportivo Atalaya",
  },
  compareItems: [
    { without: "Excel por socio y modalidad", with: "Ficha centralizada con historial completo" },
    { without: "Cobros manuales o transferencias", with: "Domiciliación automática por plan" },
    { without: "Llamadas para gestionar bajas", with: "Autogestión desde el portal del socio" },
    { without: "Sin datos de retención ni ocupación", with: "Dashboard con KPIs en tiempo real" },
  ],
  faqs: [
    {
      q: "¿Puedo tener varias modalidades con cuotas distintas?",
      a: "Sí. Define tantos planes de cuota como necesites: musculación, clases dirigidas, acceso libre, familiar…",
    },
    {
      q: "¿Cómo gestiono las altas y bajas de socios?",
      a: "Desde el panel en segundos. El socio puede también solicitar su baja desde el portal y tú la confirmas.",
    },
    {
      q: "¿Los socios pueden reservar clases dirigidas?",
      a: "Sí. Las clases aparecen en el portal y los socios reservan su plaza con un límite de aforo configurable.",
    },
    {
      q: "¿Funciona para centros con varios responsables?",
      a: "Sí. Crea usuarios con diferentes roles (admin, recepción, entrenador) con acceso limitado a cada área.",
    },
    {
      q: "¿Qué pasa si un socio no paga?",
      a: "Recibes una alerta y puedes bloquear el acceso automáticamente hasta que regularice su situación.",
    },
    {
      q: "¿Puedo probar antes de comprometer mi centro?",
      a: "Sí. 14 días gratis con todos los datos reales. Sin tarjeta hasta que decidas continuar.",
    },
  ],
};

const languagesContent: LandingContent = {
  pillars: [
    {
      icon: "BookOpen",
      title: "Niveles MCER",
      description: "Organiza grupos por idioma y nivel (A1-C2). Cada estudiante avanza con su itinerario propio.",
    },
    {
      icon: "FileText",
      title: "Evaluaciones",
      description: "Registra notas por habilidad y genera informes para estudiantes y familias en un clic.",
    },
    {
      icon: "Bell",
      title: "Comunicación masiva",
      description: "Avisa a grupos concretos por idioma o nivel. Sin WhatsApp, sin listas manuales.",
    },
    {
      icon: "Smartphone",
      title: "Portal de familias",
      description: "Progreso, notas, horarios y pagos accesibles desde el móvil en cualquier momento.",
    },
  ],
  stats: [
    { value: "-65%", label: "tiempo en inscripciones" },
    { value: "+20h", label: "ahorradas al mes" },
    { value: "+45%", label: "satisfacción familias" },
  ],
  testimonial: {
    quote: "Ahora las familias consultan las notas y los horarios directamente en el portal. Ya no recibimos llamadas preguntando si hay plazas.",
    author: "Marta V.",
    role: "Directora, Academia Lingua Plus",
  },
  compareItems: [
    { without: "Excel por idioma y nivel", with: "Grupos MCER organizados y filtrables" },
    { without: "WhatsApp para avisos de cambio de horario", with: "Comunicación segmentada por idioma o nivel" },
    { without: "Notas en papel o correo", with: "Informes de evaluación digitales y descargables" },
    { without: "Pagos por transferencia sin control", with: "Domiciliación automática con alertas de impago" },
  ],
  faqs: [
    {
      q: "¿Puedo organizar grupos por idioma y nivel MCER?",
      a: "Sí. Crea grupos con idioma, nivel (A1 a C2) y horario. Cada estudiante puede estar en varios grupos.",
    },
    {
      q: "¿Cómo funcionan las evaluaciones?",
      a: "Registras notas por habilidad (speaking, writing, reading, listening) y el sistema genera un informe automático.",
    },
    {
      q: "¿Las familias pueden ver el progreso en tiempo real?",
      a: "Sí. El portal de familias muestra notas, asistencia, próximas clases y recibos desde el móvil.",
    },
    {
      q: "¿Puedo gestionar listas de espera?",
      a: "Sí. Cuando un grupo está completo, los nuevos estudiantes entran en lista y se notifican solos cuando hay plaza.",
    },
    {
      q: "¿Funciona para academias con profesores externos?",
      a: "Sí. Crea usuarios para cada profesor con acceso solo a sus grupos y horarios.",
    },
    {
      q: "¿Puedo probar la plataforma con mis datos reales?",
      a: "Sí. 14 días de prueba gratuita. Importa estudiantes desde Excel y empieza a gestionar desde el primer día.",
    },
  ],
};

const tutoringContent: LandingContent = {
  pillars: [
    {
      icon: "Users",
      title: "Alumnos organizados",
      description: "Ficha completa: materias, horario, profesor asignado y evolución académica en un solo lugar.",
    },
    {
      icon: "Calendar",
      title: "Horarios sin conflictos",
      description: "Planifica sesiones individuales o en grupo. Detección automática de solapamientos.",
    },
    {
      icon: "FileText",
      title: "Notas y seguimiento",
      description: "Registra el progreso por materia y genera informes para familias con un clic.",
    },
    {
      icon: "CreditCard",
      title: "Cobros sin fricción",
      description: "Domiciliación automática mensual o por sesión. Olvídate de perseguir transferencias.",
    },
  ],
  stats: [
    { value: "-75%", label: "tiempo en cobros" },
    { value: "+15h", label: "ahorradas al mes" },
    { value: "+50%", label: "comunicación con familias" },
  ],
  testimonial: {
    quote: "El portal de familias ha cambiado todo. Ahora los padres ven el progreso de sus hijos y los pagos sin tener que llamarnos.",
    author: "Ana T.",
    role: "Directora, Academia Superación",
  },
  compareItems: [
    { without: "Agenda en papel para cada alumno", with: "Horarios online con reserva y recordatorio" },
    { without: "Transferencias que hay que rastrear", with: "Cobros automáticos por sesión o mensualidad" },
    { without: "Informes de progreso por correo manual", with: "Informe digital en el portal de familias" },
    { without: "WhatsApp para cada novedad", with: "Comunicados segmentados por materia o grupo" },
  ],
  faqs: [
    {
      q: "¿Puedo gestionar clases individuales y en grupo?",
      a: "Sí. Define sesiones 1:1 o en grupos reducidos, con profesor y materia asignados.",
    },
    {
      q: "¿Los padres pueden ver el progreso de sus hijos?",
      a: "Sí. El portal de familias muestra notas, asistencia, próximas clases y estado de pagos.",
    },
    {
      q: "¿Puedo cobrar por sesión o con cuota mensual fija?",
      a: "Ambas opciones están disponibles. Configura el modelo de cobro por alumno o materia.",
    },
    {
      q: "¿Funciona para academias con varios profesores?",
      a: "Sí. Cada profesor solo ve sus alumnos y horarios. Tú tienes visión global desde el panel de dirección.",
    },
    {
      q: "¿Puedo registrar las faltas de asistencia?",
      a: "Sí. Pasa lista en cada sesión desde el móvil y genera un resumen mensual de asistencia automáticamente.",
    },
    {
      q: "¿Hay un periodo de prueba gratuito?",
      a: "Sí. 14 días gratis, sin tarjeta. Importa tus alumnos desde Excel y empieza a funcionar el mismo día.",
    },
  ],
};

export const landingContent: Record<VerticalId, LandingContent> = {
  dance: danceContent,
  sports: sportsContent,
  languages: languagesContent,
  tutoring: tutoringContent,
};
