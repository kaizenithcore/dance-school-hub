import { cn } from "@/lib/utils";
import { Room } from "@/lib/api/rooms";

interface RoomSelectorProps {
  rooms: Room[];
  selected: string;
  onChange: (room: string) => void;
}

export function RoomSelector({ rooms, selected, onChange }: RoomSelectorProps) {
  const options = [{ id: "all", name: "Todas las salas" }, ...rooms.map((room) => ({ id: room.id, name: room.name }))];

  return (
    <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
      {options.map((room) => (
        <button
          key={room.id}
          onClick={() => onChange(room.id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
            selected === room.id
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {room.name}
        </button>
      ))}
    </div>
  );
}
