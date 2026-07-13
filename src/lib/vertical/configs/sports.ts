import type { VerticalConfig } from "../types";

export const sportsConfig: VerticalConfig = {
  id: "sports",
  productName: "Nexa Sport",
  productTagline: "Gestiona tu centro deportivo desde el primer día",
  logoPath: "/nexa_graphics/icon_big_trans.PNG",
  primaryColor: "210 80% 48%",
  accentColor: "210 60% 96%",
  vocabulary: {
    student: "socio",
    students: "socios",
    classItem: "entrenamiento",
    classItems: "entrenamientos",
    teacher: "entrenador",
    teachers: "entrenadores",
    enrollment: "alta",
    enrollments: "altas",
    discipline: "deporte",
    disciplines: "deportes",
    addStudent: "Dar de alta socio",
    center: "centro",
  },
  verticalFeatures: ["membership_plans", "performance_notes"],
};
