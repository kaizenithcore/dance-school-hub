export interface Class {
  id: string;
  name: string;
  discipline: string;
  level: string;
  day: string;
  time: string;
  room: string;
  students: number;
}

export interface TeacherRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  bio: string;
  specialties: string[];
  assignedClasses: Class[];
  status: "active" | "inactive";
  hireDate: string;
  aulary: number;
  notes?: string;
}

export const MOCK_TEACHERS: TeacherRecord[] = [
  {
    id: "t1",
    name: "Laura Martínez",
    email: "laura@escuela-prueba.com",
    phone: "(011) 5555-1001",
    bio: "Maestra de ballet clásico con 15 años de experiencia. Especializada en técnica Vaganova.",
    specialties: ["Ballet Clásico", "Técnica Vaganova", "Danza Contemporánea"],
    assignedClasses: [
      {
        id: "c1",
        name: "Ballet Clásico Iniciación",
        discipline: "Ballet",
        level: "Iniciación",
        day: "Lunes",
        time: "09:00–10:30",
        room: "Aula Principal",
        students: 12,
      },
      {
        id: "c2",
        name: "Ballet Clásico Avanzado",
        discipline: "Ballet",
        level: "Avanzado",
        day: "Viernes",
        time: "10:00–11:30",
        room: "Aula Principal",
        students: 8,
      },
    ],
    status: "active",
    hireDate: "2015-01-15",
    aulary: 2500,
  },
  {
    id: "t2",
    name: "Carlos Ramírez",
    email: "carlos@escuela-prueba.com",
    phone: "(011) 5555-1002",
    bio: "Experto en danzas latinas. Profesional en Salsa, Bachata y Merengue con certificación internacional.",
    specialties: ["Salsa", "Bachata", "Merengue", "Timba"],
    assignedClasses: [
      {
        id: "c3",
        name: "Salsa y Bachata",
        discipline: "Latino",
        level: "Nivel 1",
        day: "Martes",
        time: "19:00–20:30",
        room: "Aula 2",
        students: 15,
      },
    ],
    status: "active",
    hireDate: "2018-05-20",
    aulary: 2200,
  },
  {
    id: "t3",
    name: "Ana Fernández",
    email: "ana@escuela-prueba.com",
    phone: "(011) 5555-1003",
    bio: "Instructora de Hip Hop urbano. Especializada en freestyle y coreografía moderna. Competidora profesional.",
    specialties: ["Hip Hop", "Freestyle", "Breaking", "Urban Dance"],
    assignedClasses: [
      {
        id: "c4",
        name: "Hip Hop Urbano",
        discipline: "Hip Hop",
        level: "Todos",
        day: "Miércoles",
        time: "18:00–19:00",
        room: "Aula 3 - Estudio",
        students: 10,
      },
    ],
    status: "active",
    hireDate: "2019-09-10",
    aulary: 1900,
  },
  {
    id: "t4",
    name: "Miguel Torres",
    email: "miguel@escuela-prueba.com",
    phone: "(011) 5555-1004",
    bio: "Coreógrafo y profesor de danza contemporánea. Formación en movimiento expresivo y composición coreográfica.",
    specialties: ["Danza Contemporánea", "Composición", "Movimiento Expresivo", "Butoh"],
    assignedClasses: [
      {
        id: "c5",
        name: "Danza Contemporánea",
        discipline: "Contemporáneo",
        level: "Intermedio",
        day: "Jueves",
        time: "20:00–21:30",
        room: "Aula Principal",
        students: 9,
      },
    ],
    status: "active",
    hireDate: "2020-02-01",
    aulary: 2100,
  },
];
