import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarDays, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { MOCK_PORTAL_EVENTS, type PortalEvent } from "../data/mockData";
import { EventCard } from "../components/EventCard";
import { cn } from "@/lib/utils";
import { usePortalPersona } from "../services/portalPersona";

const types = ["Todos", "Festival", "Workshop", "Competición", "Exhibición"] as const;
const typeMap: Record<string, PortalEvent["type"] | "all"> = {
  Todos: "all", Festival: "festival", Workshop: "workshop", Competición: "competition", Exhibición: "exhibition",
};

export default function EventsScreen() {
  const { persona } = usePortalPersona();
  const [filter, setFilter] = useState("Todos");
  const [detail, setDetail] = useState<PortalEvent | null>(null);

  const filtered = filter === "Todos"
    ? MOCK_PORTAL_EVENTS
    : MOCK_PORTAL_EVENTS.filter((e) => e.type === typeMap[filter]);

  if (persona === "prospect") {
    return (
      <div className="px-4 pb-24 pt-6 space-y-4">
        <h1 className="text-xl font-bold text-foreground">Eventos</h1>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">Eventos publicos de escuelas cercanas</p>
          <p className="mt-1 text-xs text-muted-foreground">Puedes seguir eventos y festivales abiertos incluso antes de matricularte.</p>
        </div>
        <div className="space-y-3">
          {MOCK_PORTAL_EVENTS.slice(0, 2).map((e) => (
            <EventCard key={e.id} event={e} onClick={() => setDetail(e)} />
          ))}
        </div>
        <Link to="/portal" className="block rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground">
          Ver mas en el landing del portal
        </Link>
      </div>
    );
  }

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
      {persona === "community" ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
          Comunidad activa: puedes crear publicaciones y eventos internos desde el feed social de tu escuela.
        </div>
      ) : null}
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
