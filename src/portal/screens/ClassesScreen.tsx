import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { MOCK_PORTAL_CLASSES, DAYS_OF_WEEK } from "../data/mockData";
import { PortalClassCard } from "../components/PortalClassCard";
import type { PortalClass } from "../data/mockData";
import { usePortalPersona } from "../services/portalPersona";

export default function ClassesScreen() {
  const { persona } = usePortalPersona();
  const [selected, setSelected] = useState<PortalClass | null>(null);
  const activeDays = DAYS_OF_WEEK.filter((d) => MOCK_PORTAL_CLASSES.some((c) => c.day === d));

  if (persona === "prospect") {
    return (
      <div className="px-4 pb-24 pt-6">
        <h1 className="mb-3 text-xl font-bold text-foreground">Mis Clases</h1>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">Aun no tienes clases asignadas</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cuando tu solicitud sea aprobada, aqui veras tu horario semanal automaticamente.
          </p>
          <div className="mt-3 space-y-2">
            <Link to="/portal" className="block rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground">
              Explorar escuelas
            </Link>
            <Link to="/portal/onboarding" className="block rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground">
              Completar perfil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="px-4 pb-24 pt-6">
        <button onClick={() => setSelected(null)} className="mb-4 flex items-center gap-1 text-sm text-primary">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <h1 className="text-xl font-bold text-foreground">{selected.name}</h1>
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <Detail label="Profesor" value={selected.teacher} />
            <Detail label="Día" value={selected.day} />
            <Detail label="Horario" value={selected.time} />
            <Detail label="Sala" value={selected.room} />
            <Detail label="Estilo" value={selected.style} />
            <Detail label="Nivel" value={selected.level} />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-24 pt-6">
      <h1 className="mb-4 text-xl font-bold text-foreground">Mis Clases</h1>

      {/* Weekly mini-calendar */}
      <div className="mb-5 flex gap-1 overflow-x-auto">
        {DAYS_OF_WEEK.map((d) => {
          const has = MOCK_PORTAL_CLASSES.some((c) => c.day === d);
          return (
            <div
              key={d}
              className={`flex shrink-0 flex-col items-center rounded-lg px-3 py-2 text-xs font-medium ${has ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
            >
              {d.slice(0, 3)}
              {has && <span className="mt-0.5 h-1 w-1 rounded-full bg-primary" />}
            </div>
          );
        })}
      </div>

      {activeDays.map((day) => {
        const classes = MOCK_PORTAL_CLASSES.filter((c) => c.day === day);
        return (
          <motion.div key={day} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{day}</h2>
            <div className="space-y-2">
              {classes.map((c) => (
                <PortalClassCard key={c.id} cls={c} onClick={() => setSelected(c)} />
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
