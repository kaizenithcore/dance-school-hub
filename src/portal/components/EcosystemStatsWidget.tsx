import { useEffect, useState } from "react";
import { Building2, Users2, Newspaper, CalendarRange } from "lucide-react";
import { getPortalEcosystemStats, type PortalEcosystemStats } from "@/lib/api/portalFoundation";

export function EcosystemStatsWidget() {
  const [stats, setStats] = useState<PortalEcosystemStats | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await getPortalEcosystemStats();
        if (!cancelled) {
          setStats(data);
        }
      } catch {
        if (!cancelled) {
          setStats(null);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    { icon: Building2, label: "Escuelas", value: stats?.totalSchools ?? 0 },
    { icon: Users2, label: "Bailarines", value: stats?.totalDancers ?? 0 },
    { icon: Newspaper, label: "Publicaciones", value: stats?.totalPosts ?? 0 },
    { icon: CalendarRange, label: "Eventos", value: stats?.totalPublishedEvents ?? 0 },
  ];

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Ecosistema Nexa</p>
        <p className="text-[11px] text-muted-foreground">
          Activas: {stats?.activeSchools ?? 0} ({(stats?.activeSchoolsRate ?? 0).toFixed(1)}%)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl bg-muted/60 px-3 py-2.5">
            <div className="flex items-center gap-1 text-muted-foreground text-[11px]">
              <card.icon className="h-3.5 w-3.5" /> {card.label}
            </div>
            <p className="mt-1 text-base font-bold text-foreground">{card.value.toLocaleString("es-ES")}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
