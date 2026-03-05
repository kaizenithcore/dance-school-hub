import { GraduationCap, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClassItem {
  id: string;
  name: string;
  teacher: string;
  duration: number;
}

const AVAILABLE_CLASSES: ClassItem[] = [
  { id: "c1", name: "Ballet Principiantes", teacher: "Prof. Rivera", duration: 1.5 },
  { id: "c2", name: "Danza Contemporánea", teacher: "Prof. Lima", duration: 1.5 },
  { id: "c3", name: "Hip Hop Niños", teacher: "Prof. Costa", duration: 1 },
  { id: "c4", name: "Jazz Fusión", teacher: "Prof. Costa", duration: 1.5 },
  { id: "c5", name: "Ballet Avanzado", teacher: "Prof. Rivera", duration: 1.5 },
  { id: "c6", name: "Salsa y Bachata", teacher: "Prof. Reyes", duration: 1.5 },
  { id: "c7", name: "Tango Intensivo", teacher: "Prof. Morales", duration: 2 },
  { id: "c8", name: "Danza Moderna", teacher: "Prof. Lima", duration: 1.5 },
  { id: "c9", name: "Stretching & Barre", teacher: "Prof. Rivera", duration: 1 },
  { id: "c10", name: "Folklore", teacher: "Prof. García", duration: 1.5 },
];

interface ClassSidebarProps {
  onDragStart: (classData: { name: string; teacher: string; duration: number; classId: string }) => void;
}

export function ClassSidebar({ onDragStart }: ClassSidebarProps) {
  return (
    <div className="w-full lg:w-[220px] shrink-0 rounded-lg border border-border bg-card shadow-soft overflow-hidden">
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <GraduationCap className="h-3.5 w-3.5" />
          Clases Disponibles
        </h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">Arrastrá una clase al calendario</p>
      </div>
      <div className="p-2 space-y-1 max-h-[500px] overflow-y-auto">
        {AVAILABLE_CLASSES.map((cls) => (
          <div
            key={cls.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/json", JSON.stringify({
                type: "new",
                classId: cls.id,
                name: cls.name,
                teacher: cls.teacher,
                duration: cls.duration,
              }));
              onDragStart({ name: cls.name, teacher: cls.teacher, duration: cls.duration, classId: cls.id });
            }}
            className="flex flex-col gap-1 rounded-md border border-border bg-background p-2.5 cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-soft transition-all select-none"
          >
            <span className="text-xs font-medium text-foreground leading-tight">{cls.name}</span>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-0.5"><User className="h-2.5 w-2.5" />{cls.teacher}</span>
              <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{cls.duration}h</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
