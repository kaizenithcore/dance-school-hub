import { cn } from "@/lib/utils";

const ROOMS = ["all", "Sala A", "Sala B", "Sala C"] as const;

const ROOM_LABELS: Record<string, string> = {
  all: "Todas las salas",
  "Sala A": "Sala A",
  "Sala B": "Sala B",
  "Sala C": "Sala C",
};

interface RoomSelectorProps {
  selected: string;
  onChange: (room: string) => void;
}

export function RoomSelector({ selected, onChange }: RoomSelectorProps) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
      {ROOMS.map((room) => (
        <button
          key={room}
          onClick={() => onChange(room)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
            selected === room
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {ROOM_LABELS[room]}
        </button>
      ))}
    </div>
  );
}
