import { GraduationCap, Clock, User, MapPin, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ClassItem {
  id: string;
  name: string;
  teacher: string;
  duration: number;
  room: string;
  capacity: number;
  spotsLeft: number;
}

const AVAILABLE_CLASSES: ClassItem[] = [
  { id: "c1", name: "Ballet Principiantes", teacher: "Prof. Rivera", duration: 1.5, room: "Sala A", capacity: 15, spotsLeft: 6 },
  { id: "c2", name: "Danza Contemporánea", teacher: "Prof. Lima", duration: 1.5, room: "Sala B", capacity: 12, spotsLeft: 3 },
  { id: "c3", name: "Hip Hop Niños", teacher: "Prof. Costa", duration: 1, room: "Sala A", capacity: 15, spotsLeft: 8 },
  { id: "c4", name: "Jazz Fusión", teacher: "Prof. Costa", duration: 1.5, room: "Sala B", capacity: 12, spotsLeft: 0 },
  { id: "c5", name: "Ballet Avanzado", teacher: "Prof. Rivera", duration: 1.5, room: "Sala A", capacity: 15, spotsLeft: 4 },
  { id: "c6", name: "Salsa y Bachata", teacher: "Prof. Reyes", duration: 1.5, room: "Sala C", capacity: 20, spotsLeft: 10 },
  { id: "c7", name: "Tango Intensivo", teacher: "Prof. Morales", duration: 2, room: "Sala A", capacity: 10, spotsLeft: 5 },
  { id: "c8", name: "Danza Moderna", teacher: "Prof. Lima", duration: 1.5, room: "Sala B", capacity: 12, spotsLeft: 7 },
  { id: "c9", name: "Stretching & Barre", teacher: "Prof. Rivera", duration: 1, room: "Sala A", capacity: 15, spotsLeft: 9 },
  { id: "c10", name: "Folklore", teacher: "Prof. García", duration: 1.5, room: "Sala C", capacity: 20, spotsLeft: 14 },
];

interface ClassSidebarProps {
  onDragStart: (classData: { name: string; teacher: string; duration: number; classId: string; room: string }) => void;
}

export function ClassSidebar({ onDragStart }: ClassSidebarProps) {
  return (
    <div className="w-full lg:w-[240px] shrink-0 rounded-lg border border-border bg-card shadow-soft overflow-hidden">
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <GraduationCap className="h-3.5 w-3.5" />
          Clases Disponibles
        </h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">Arrastrá una clase al calendario</p>
      </div>
      <div className="p-2 space-y-1 max-h-[600px] overflow-y-auto">
        {AVAILABLE_CLASSES.map((cls) => {
          const almostFull = cls.spotsLeft <= 3 && cls.spotsLeft > 0;
          const full = cls.spotsLeft === 0;

          return (
            <div
              key={cls.id}
              draggable={!full}
              onDragStart={(e) => {
                if (full) return;
                e.dataTransfer.setData("application/json", JSON.stringify({
                  type: "new",
                  classId: cls.id,
                  name: cls.name,
                  teacher: cls.teacher,
                  duration: cls.duration,
                  room: cls.room,
                }));
                onDragStart({ name: cls.name, teacher: cls.teacher, duration: cls.duration, classId: cls.id, room: cls.room });
              }}
              className={cn(
                "flex flex-col gap-1.5 rounded-md border bg-background p-2.5 transition-all select-none",
                full
                  ? "border-border opacity-50 cursor-not-allowed"
                  : "border-border cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-soft"
              )}
            >
              <span className="text-xs font-medium text-foreground leading-tight">{cls.name}</span>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  <User className="h-2.5 w-2.5 shrink-0" />{cls.teacher}
                </span>
                <span className="flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5 shrink-0" />{cls.duration}h
                </span>
                <span className="flex items-center gap-0.5">
                  <MapPin className="h-2.5 w-2.5 shrink-0" />{cls.room}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    full ? "text-destructive" : almostFull ? "text-warning" : "text-muted-foreground"
                  )}
                >
                  {full ? "Completo" : `${cls.spotsLeft}/${cls.capacity} lugares`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
