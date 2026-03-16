import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarDays, MapPin, Users } from "lucide-react";
import { MOCK_PORTAL_EVENTS, type PortalEvent } from "../data/mockData";
import { EventCard } from "../components/EventCard";
import { cn } from "@/lib/utils";

const types = ["Todos", "Festival", "Workshop", "Competición", "Exhibición"] as const;
const typeMap: Record<string, PortalEvent["type"] | "all"> = {
  Todos: "all", Festival: "festival", Workshop: "workshop", Competición: "competition", Exhibición: "exhibition",
};

export default function EventsScreen() {
  const [filter, setFilter] = useState("Todos");
  const [detail, setDetail] = useState<PortalEvent | null>(null);

  const filtered = filter === "Todos"
    ? MOCK_PORTAL_EVENTS
    : MOCK_PORTAL_EVENTS.filter((e) => e.type === typeMap[filter]);

  if (detail) {
    const d = new Date(detail.date);
    return (
      <div className="px-4 pb-24 pt-6">
        <button onClick={() => setDetail(null)} className="mb-4 flex items-center gap-1 text-sm text-primary">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <h1 className="text-xl font-bold text-foreground">{detail.name}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />{d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</span>
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{detail.location}</span>
            <span className="flex items-center gap-1"><Users className="h-4 w-4" />{detail.participants} participantes</span>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm leading-relaxed text-foreground">{detail.description}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Organiza</h3>
            <p className="text-sm text-muted-foreground">{detail.school}</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-24 pt-6 space-y-4">
      <h1 className="text-xl font-bold text-foreground">Eventos</h1>
      <div className="flex gap-2 overflow-x-auto">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition",
              filter === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.map((e) => (
          <EventCard key={e.id} event={e} onClick={() => setDetail(e)} />
        ))}
      </div>
    </div>
  );
}
