import { GraduationCap, Clock, User, MapPin, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ClassItem {
  id: string;
  name: string;
  teacher: string;
  duration: number;
  roomId?: string;
  roomName?: string;
  capacity: number;
  spotsLeft: number;
}

interface ClassSidebarProps {
  classes: ClassItem[];
  defaultRoomId?: string;
  defaultRoomName?: string;
  onDragStart: (classData: { name: string; teacher: string; duration: number; classId: string; room: string }) => void;
}

export function ClassSidebar({ classes, defaultRoomId, defaultRoomName, onDragStart }: ClassSidebarProps) {
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
        {classes.map((cls) => {
          const almostFull = cls.spotsLeft <= 3 && cls.spotsLeft > 0;
          const full = cls.spotsLeft === 0;
          const roomId = cls.roomId || defaultRoomId || "";
          const roomName = cls.roomName || defaultRoomName || "Sin aula";

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
                  roomId,
                  roomName,
                }));
                onDragStart({ name: cls.name, teacher: cls.teacher, duration: cls.duration, classId: cls.id, room: roomName });
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
                  <MapPin className="h-2.5 w-2.5 shrink-0" />{roomName}
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
