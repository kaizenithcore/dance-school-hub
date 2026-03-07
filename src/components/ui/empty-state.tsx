import { Search, GraduationCap, Users, CreditCard, ClipboardList, Inbox } from "lucide-react";
import { motion } from "framer-motion";

interface EmptyStateProps {
  type: "students" | "teachers" | "classes" | "enrollments" | "payments" | "search";
  message?: string;
}

const CONFIGS = {
  students: { icon: Users, title: "Sin alumnos", description: "Aún no hay alumnos registrados. Comenzá agregando el primero." },
  teachers: { icon: Users, title: "Sin profesores", description: "Aún no hay profesores registrados. Comenzá agregando el primero." },
  classes: { icon: GraduationCap, title: "Sin clases", description: "No hay clases creadas todavía. Creá tu primera clase para empezar." },
  enrollments: { icon: ClipboardList, title: "Sin inscripciones", description: "No se encontraron inscripciones. Las solicitudes aparecerán aquí." },
  payments: { icon: CreditCard, title: "Sin pagos", description: "No hay pagos registrados. Los pagos aparecerán aquí al registrarlos." },
  search: { icon: Search, title: "Sin resultados", description: "No se encontraron registros con los filtros aplicados. Intentá ajustar la búsqueda." },
};

export function EmptyState({ type, message }: EmptyStateProps) {
  const config = CONFIGS[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-12 px-4"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/50 mb-4">
        <Icon className="h-7 w-7 text-accent-foreground/60" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">{config.title}</p>
      <p className="text-xs text-muted-foreground text-center max-w-[260px]">
        {message || config.description}
      </p>
    </motion.div>
  );
}
