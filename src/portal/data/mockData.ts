// ── Models ──

export interface PortalStudent {
  id: string;
  name: string;
  avatar: string;
  school: string;
  styles: string[];
  yearsExperience: number;
  level: string;
  classesCompleted: number;
  currentStreak: number;
  joinDate: string;
  followersCount?: number;
  followingCount?: number;
  isPublicProfile?: boolean;
  xp?: number;
  xpToNextLevel?: number;
}

export interface PortalClass {
  id: string;
  name: string;
  teacher: string;
  day: string;
  time: string;
  room: string;
  style: string;
  level: string;
}

export interface PortalEvent {
  id: string;
  name: string;
  type: "festival" | "exhibition" | "competition" | "workshop";
  date: string;
  location: string;
  school: string;
  description: string;
  participants: number;
  imageUrl?: string;
  attended?: boolean;
}

export interface PortalAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedDate?: string;
  category: "attendance" | "events" | "milestones" | "certifications";
}

export interface PortalCertification {
  id: string;
  examName: string;
  discipline: string;
  level: string;
  date: string;
  school: string;
  grade: number;
  status: "passed" | "failed" | "pending";
}

export interface ActivityItem {
  id: string;
  type: "class" | "achievement" | "event" | "certification" | "social";
  text: string;
  timestamp: string;
  icon: string;
}

export interface FeedPost {
  id: string;
  type: "class" | "event" | "achievement" | "announcement" | "choreography";
  authorName: string;
  authorRole: "school" | "teacher";
  authorAvatar: string;
  schoolName: string;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  date: string;
  likes: number;
  liked: boolean;
  saved: boolean;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  xpReward: number;
  completed: boolean;
}

// ── Mock Data ──

export const CURRENT_STUDENT: PortalStudent = {
  id: "p1",
  name: "María Santos",
  avatar: "",
  school: "Estudio Ballet Norte",
  styles: ["Ballet", "Contemporáneo", "Jazz"],
  yearsExperience: 4,
  level: "Intermedio",
  classesCompleted: 82,
  currentStreak: 12,
  joinDate: "2022-03-15",
  followersCount: 34,
  followingCount: 18,
  isPublicProfile: true,
  xp: 2450,
  xpToNextLevel: 3000,
};

export const MOCK_PORTAL_CLASSES: PortalClass[] = [
  { id: "c1", name: "Ballet Intermedio", teacher: "Prof. Rivera", day: "Lunes", time: "18:00–19:30", room: "Sala A", style: "Ballet", level: "Intermedio" },
  { id: "c2", name: "Danza Contemporánea", teacher: "Prof. Lima", day: "Martes", time: "19:00–20:30", room: "Sala B", style: "Contemporáneo", level: "Intermedio" },
  { id: "c3", name: "Jazz Fusión", teacher: "Prof. Costa", day: "Miércoles", time: "18:00–19:30", room: "Sala A", style: "Jazz", level: "Todos los niveles" },
  { id: "c4", name: "Ballet Intermedio", teacher: "Prof. Rivera", day: "Jueves", time: "18:00–19:30", room: "Sala A", style: "Ballet", level: "Intermedio" },
  { id: "c5", name: "Técnica de Puntas", teacher: "Prof. Rivera", day: "Viernes", time: "17:00–18:00", room: "Sala A", style: "Ballet", level: "Avanzado" },
];

export const MOCK_PORTAL_EVENTS: PortalEvent[] = [
  { id: "e1", name: "Festival de Primavera 2026", type: "festival", date: "2026-04-12", location: "Teatro Municipal", school: "Estudio Ballet Norte", description: "Gran gala anual con todas las disciplinas del estudio. Participan más de 120 alumnos en 15 coreografías originales.", participants: 120, attended: false },
  { id: "e2", name: "Workshop Flamenco Intensivo", type: "workshop", date: "2026-03-22", location: "Sala Principal", school: "Estudio Ballet Norte", description: "Taller intensivo de 3 horas con la maestra invitada Carmen García. Abierto a todos los niveles.", participants: 25, attended: true },
  { id: "e3", name: "Competición Regional de Ballet", type: "competition", date: "2026-05-08", location: "Auditorio Nacional", school: "Federación Regional", description: "Competición oficial de la federación regional. Categorías infantil, juvenil y adulto.", participants: 45, attended: false },
  { id: "e4", name: "Exhibición Fin de Curso", type: "exhibition", date: "2026-06-20", location: "Teatro del Parque", school: "Estudio Ballet Norte", description: "Muestra de fin de curso donde cada clase presenta una pieza preparada durante el trimestre.", participants: 95, attended: false },
];

export const MOCK_ACHIEVEMENTS: PortalAchievement[] = [
  { id: "a1", name: "Primera Clase", description: "Asististe a tu primera clase", icon: "🌟", earned: true, earnedDate: "2022-03-15", category: "milestones" },
  { id: "a2", name: "Racha de 7 días", description: "7 clases consecutivas sin faltar", icon: "🔥", earned: true, earnedDate: "2022-04-10", category: "attendance" },
  { id: "a3", name: "50 Clases", description: "Has completado 50 clases", icon: "⭐", earned: true, earnedDate: "2024-02-20", category: "attendance" },
  { id: "a4", name: "100 Clases", description: "Has completado 100 clases", icon: "💯", earned: false, category: "attendance" },
  { id: "a5", name: "Primer Festival", description: "Participaste en tu primer festival", icon: "🎭", earned: true, earnedDate: "2023-06-15", category: "events" },
  { id: "a6", name: "3 Años en la Escuela", description: "Llevas 3 años bailando con nosotros", icon: "🏆", earned: true, earnedDate: "2025-03-15", category: "milestones" },
  { id: "a7", name: "Certificación Oficial", description: "Obtuviste tu primera certificación", icon: "📜", earned: true, earnedDate: "2024-06-10", category: "certifications" },
  { id: "a8", name: "Triple Estilo", description: "Practicas 3 estilos diferentes", icon: "💃", earned: true, earnedDate: "2023-09-01", category: "milestones" },
  { id: "a9", name: "Racha de 30 días", description: "30 clases sin interrupción", icon: "🔥", earned: false, category: "attendance" },
  { id: "a10", name: "5 Eventos", description: "Has participado en 5 eventos", icon: "🎪", earned: false, category: "events" },
];

export const MOCK_CERTIFICATIONS: PortalCertification[] = [
  { id: "cert1", examName: "Examen Ballet Nivel 1", discipline: "Ballet", level: "Nivel 1", date: "2023-06-10", school: "Estudio Ballet Norte", grade: 8.5, status: "passed" },
  { id: "cert2", examName: "Examen Ballet Nivel 2", discipline: "Ballet", level: "Nivel 2", date: "2024-06-15", school: "Estudio Ballet Norte", grade: 7.8, status: "passed" },
  { id: "cert3", examName: "Certificación Contemporáneo Básico", discipline: "Contemporáneo", level: "Básico", date: "2024-12-10", school: "Estudio Ballet Norte", grade: 9.2, status: "passed" },
  { id: "cert4", examName: "Examen Ballet Nivel 3", discipline: "Ballet", level: "Nivel 3", date: "2026-05-20", school: "Estudio Ballet Norte", grade: 0, status: "pending" },
];

export const MOCK_ACTIVITY: ActivityItem[] = [
  { id: "act1", type: "class", text: "Has completado tu clase de Ballet Intermedio", timestamp: "Hace 2 horas", icon: "✅" },
  { id: "act2", type: "achievement", text: "¡Has desbloqueado: Racha de 7 días!", timestamp: "Ayer", icon: "🔥" },
  { id: "act3", type: "event", text: "Te has inscrito al Festival de Primavera", timestamp: "Hace 3 días", icon: "🎭" },
  { id: "act4", type: "class", text: "Has completado 82 clases en total", timestamp: "Hace 1 semana", icon: "⭐" },
  { id: "act5", type: "certification", text: "Certificación Contemporáneo Básico aprobada", timestamp: "Hace 3 meses", icon: "📜" },
  { id: "act6", type: "social", text: "Tu escuela ha publicado algo nuevo 👀", timestamp: "Hace 1 hora", icon: "📸" },
];

export const MOCK_OTHER_STUDENTS: PortalStudent[] = [
  { id: "p2", name: "Ana López", avatar: "", school: "Estudio Ballet Norte", styles: ["Ballet", "Jazz"], yearsExperience: 6, level: "Avanzado", classesCompleted: 210, currentStreak: 8, joinDate: "2020-09-01", followersCount: 52, followingCount: 31, isPublicProfile: true, xp: 4200, xpToNextLevel: 5000 },
  { id: "p3", name: "Carlos Méndez", avatar: "", school: "Estudio Ballet Norte", styles: ["Salsa", "Tango"], yearsExperience: 3, level: "Intermedio", classesCompleted: 95, currentStreak: 5, joinDate: "2023-02-10", followersCount: 19, followingCount: 12, isPublicProfile: false, xp: 1800, xpToNextLevel: 3000 },
];

export const MOCK_FEED_POSTS: FeedPost[] = [
  {
    id: "fp1",
    type: "class",
    authorName: "Prof. Rivera",
    authorRole: "teacher",
    authorAvatar: "",
    schoolName: "Estudio Ballet Norte",
    text: "¡Gran ensayo hoy con el grupo de Ballet Intermedio! Preparando la coreografía para el Festival de Primavera 🩰✨",
    imageUrl: "https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=600&h=400&fit=crop",
    date: "Hace 2 horas",
    likes: 24,
    liked: false,
    saved: false,
  },
  {
    id: "fp2",
    type: "event",
    authorName: "Estudio Ballet Norte",
    authorRole: "school",
    authorAvatar: "",
    schoolName: "Estudio Ballet Norte",
    text: "📢 ¡Inscripciones abiertas para el Festival de Primavera 2026! No te quedes fuera. Plazas limitadas.",
    imageUrl: "https://images.unsplash.com/photo-1547153760-18fc86c7e2a1?w=600&h=400&fit=crop",
    date: "Hace 5 horas",
    likes: 47,
    liked: true,
    saved: false,
  },
  {
    id: "fp3",
    type: "achievement",
    authorName: "Estudio Ballet Norte",
    authorRole: "school",
    authorAvatar: "",
    schoolName: "Estudio Ballet Norte",
    text: "🏆 ¡Felicidades a Ana López por completar 200 clases! Un ejemplo de constancia y dedicación.",
    date: "Hace 1 día",
    likes: 62,
    liked: false,
    saved: true,
  },
  {
    id: "fp4",
    type: "choreography",
    authorName: "Prof. Lima",
    authorRole: "teacher",
    authorAvatar: "",
    schoolName: "Estudio Ballet Norte",
    text: "Nueva coreografía de contemporáneo que estamos trabajando este trimestre. ¡El grupo está brillando! 🎬💫",
    imageUrl: "https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?w=600&h=400&fit=crop",
    date: "Hace 2 días",
    likes: 38,
    liked: false,
    saved: false,
  },
  {
    id: "fp5",
    type: "announcement",
    authorName: "Estudio Ballet Norte",
    authorRole: "school",
    authorAvatar: "",
    schoolName: "Estudio Ballet Norte",
    text: "📢 Recordatorio: las clases del viernes 28 de marzo se trasladan al sábado 29 por mantenimiento de instalaciones.",
    date: "Hace 3 días",
    likes: 12,
    liked: false,
    saved: false,
  },
];

export const MOCK_MISSIONS: Mission[] = [
  { id: "m1", title: "Asistir 3 clases esta semana", description: "Mantén tu racha activa asistiendo a 3 clases", icon: "🎯", progress: 2, target: 3, xpReward: 50, completed: false },
  { id: "m2", title: "Completar 10 clases este mes", description: "Objetivo mensual de clases", icon: "📚", progress: 7, target: 10, xpReward: 150, completed: false },
  { id: "m3", title: "Participar en 1 evento", description: "Inscríbete y asiste a un evento", icon: "🎭", progress: 1, target: 1, xpReward: 100, completed: true },
  { id: "m4", title: "Racha de 14 días", description: "No faltes a ninguna clase en 2 semanas", icon: "🔥", progress: 12, target: 14, xpReward: 200, completed: false },
];

export const DAYS_OF_WEEK = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;
