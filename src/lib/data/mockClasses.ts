import { ClassCardData } from "@/components/cards/ClassCard";

export const DAYS_ES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;

export const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00",
] as const;

export const MOCK_CLASSES: ClassCardData[] = [
  { id: "1", name: "Ballet Principiantes", teacher: "Prof. Rivera", time: "09:00–10:30", room: "Aula A", price: 85, spotsLeft: 6, totalSpots: 15, day: "Lunes", recurrence: "weekly" },
  { id: "2", name: "Danza Contemporánea", teacher: "Prof. Lima", time: "11:00–12:30", room: "Aula B", price: 90, spotsLeft: 3, totalSpots: 12, day: "Lunes", recurrence: "weekly" },
  { id: "3", name: "Hip Hop Niños", teacher: "Prof. Costa", time: "15:00–16:00", room: "Aula A", price: 65, spotsLeft: 8, totalSpots: 15, day: "Martes", recurrence: "weekly" },
  { id: "4", name: "Jazz Fusión", teacher: "Prof. Costa", time: "18:00–19:30", room: "Aula B", price: 90, spotsLeft: 0, totalSpots: 12, day: "Miércoles", recurrence: "weekly" },
  { id: "5", name: "Ballet Avanzado", teacher: "Prof. Rivera", time: "10:00–11:30", room: "Aula A", price: 95, spotsLeft: 4, totalSpots: 15, day: "Jueves", recurrence: "weekly" },
  { id: "6", name: "Salsa y Bachata", teacher: "Prof. Reyes", time: "19:00–20:30", room: "Aula C", price: 80, spotsLeft: 10, totalSpots: 20, day: "Viernes", recurrence: "weekly" },
  { id: "7", name: "Tango Intensivo", teacher: "Prof. Morales", time: "16:00–18:00", room: "Aula A", price: 120, spotsLeft: 5, totalSpots: 10, day: "Sábado", recurrence: "weekly" },
  { id: "8", name: "Workshop Flamenco", teacher: "Prof. García", time: "10:00–13:00", room: "Aula B", price: 150, spotsLeft: 12, totalSpots: 20, day: "Sábado", recurrence: "once", date: "15 Mar 2026" },
  { id: "9", name: "Clase Abierta K-Pop", teacher: "Prof. Kim", time: "17:00–18:30", room: "Aula C", price: 40, spotsLeft: 15, totalSpots: 25, day: "Miércoles", recurrence: "once", date: "19 Mar 2026" },
  { id: "10", name: "Danza Moderna", teacher: "Prof. Lima", time: "09:00–10:30", room: "Aula B", price: 90, spotsLeft: 7, totalSpots: 12, day: "Miércoles", recurrence: "weekly" },
  { id: "11", name: "Stretching & Barre", teacher: "Prof. Rivera", time: "08:00–09:00", room: "Aula A", price: 50, spotsLeft: 9, totalSpots: 15, day: "Viernes", recurrence: "weekly" },
];
