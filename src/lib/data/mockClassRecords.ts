export interface ClassRecord {
  id: string;
  name: string;
  teacher: string;
  teacherId?: string;
  teacherIds?: string[];
  discipline: string;
  disciplineId?: string;
  category: string;
  categoryId?: string;
  price: number;
  capacity: number;
  weeklyFrequency?: number;
  scheduledCount?: number;
  enrolled: number;
  room: string;
  roomId?: string;
  status: "active" | "inactive" | "draft";
}

export const MOCK_CLASS_RECORDS: ClassRecord[] = [
  { id: "1", name: "Ballet Principiantes", teacher: "Prof. Rivera", discipline: "Ballet", category: "Principiante", price: 85, capacity: 15, enrolled: 9, room: "Aula A", status: "active" },
  { id: "2", name: "Danza Contemporánea", teacher: "Prof. Lima", discipline: "Contemporáneo", category: "Intermedio", price: 90, capacity: 12, enrolled: 9, room: "Aula B", status: "active" },
  { id: "3", name: "Hip Hop Niños", teacher: "Prof. Costa", discipline: "Hip Hop", category: "Niños", price: 65, capacity: 15, enrolled: 7, room: "Aula A", status: "active" },
  { id: "4", name: "Jazz Fusión", teacher: "Prof. Costa", discipline: "Jazz", category: "Avanzado", price: 90, capacity: 12, enrolled: 12, room: "Aula B", status: "active" },
  { id: "5", name: "Ballet Avanzado", teacher: "Prof. Rivera", discipline: "Ballet", category: "Avanzado", price: 95, capacity: 15, enrolled: 11, room: "Aula A", status: "active" },
  { id: "6", name: "Salsa y Bachata", teacher: "Prof. Reyes", discipline: "Latinos", category: "Todos los niveles", price: 80, capacity: 20, enrolled: 10, room: "Aula C", status: "active" },
  { id: "7", name: "Tango Intensivo", teacher: "Prof. Morales", discipline: "Tango", category: "Intermedio", price: 120, capacity: 10, enrolled: 5, room: "Aula A", status: "active" },
  { id: "8", name: "Danza Moderna", teacher: "Prof. Lima", discipline: "Moderno", category: "Intermedio", price: 90, capacity: 12, enrolled: 5, room: "Aula B", status: "active" },
  { id: "9", name: "Stretching & Barre", teacher: "Prof. Rivera", discipline: "Acondicionamiento", category: "Todos los niveles", price: 50, capacity: 15, enrolled: 6, room: "Aula A", status: "active" },
  { id: "10", name: "Folklore", teacher: "Prof. García", discipline: "Folklore", category: "Todos los niveles", price: 75, capacity: 20, enrolled: 6, room: "Aula C", status: "active" },
  { id: "11", name: "Danza Aérea", teacher: "Prof. Lima", discipline: "Aéreo", category: "Avanzado", price: 130, capacity: 8, enrolled: 0, room: "Aula B", status: "draft" },
  { id: "12", name: "K-Pop Dance", teacher: "Prof. Kim", discipline: "K-Pop", category: "Principiante", price: 70, capacity: 25, enrolled: 0, room: "Aula C", status: "inactive" },
];

export const TEACHERS = ["Prof. Rivera", "Prof. Lima", "Prof. Costa", "Prof. Reyes", "Prof. Morales", "Prof. García", "Prof. Kim"];
export const DISCIPLINES = ["Ballet", "Contemporáneo", "Hip Hop", "Jazz", "Latinos", "Tango", "Moderno", "Acondicionamiento", "Folklore", "Aéreo", "K-Pop"];
export const CATEGORIES = ["Principiante", "Intermedio", "Avanzado", "Niños", "Todos los niveles"];
export const ROOMS = ["Aula A", "Aula B", "Aula C"];
