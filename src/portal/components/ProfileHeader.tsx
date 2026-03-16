import { User } from "lucide-react";
import type { PortalStudent } from "../data/mockData";

interface Props {
  student: PortalStudent;
  large?: boolean;
}

export function ProfileHeader({ student, large }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className={`flex items-center justify-center rounded-full bg-accent ${large ? "h-24 w-24" : "h-16 w-16"}`}>
        {student.avatar ? (
          <img src={student.avatar} alt={student.name} className="h-full w-full rounded-full object-cover" />
        ) : (
          <User className={`text-primary ${large ? "h-10 w-10" : "h-7 w-7"}`} />
        )}
      </div>
      <div>
        <h2 className={`font-bold text-foreground ${large ? "text-xl" : "text-lg"}`}>{student.name}</h2>
        <p className="text-sm text-muted-foreground">{student.school}</p>
        <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">
          {student.styles.map((s) => (
            <span key={s} className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium text-accent-foreground">
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
