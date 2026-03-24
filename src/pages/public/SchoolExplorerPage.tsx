import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getPublicPortalSchoolMetrics,
  listRecommendedPortalSchools,
  listTrendingPortalSchools,
  searchPublicPortalSchools,
  type PortalSchool,
  type PortalSchoolMetrics,
} from "@/lib/api/portalFoundation";
import { SchoolMetricsCard } from "@/portal/components/SchoolMetricsCard";
import { EcosystemStatsWidget } from "@/portal/components/EcosystemStatsWidget";
import { trackPortalEvent } from "@/lib/portalTelemetry";

const tabs = ["trending", "recommended", "search"] as const;
type ExplorerTab = (typeof tabs)[number];

export default function SchoolExplorerPage() {
  const [tab, setTab] = useState<ExplorerTab>("trending");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [schools, setSchools] = useState<PortalSchool[]>([]);
  const [metricsBySlug, setMetricsBySlug] = useState<Record<string, PortalSchoolMetrics | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => {
    if (tab === "trending") return "Escuelas más activas";
    if (tab === "recommended") return "Escuelas recomendadas";
    return "Resultados de búsqueda";
  }, [tab]);

  useEffect(() => {
    trackPortalEvent({
      eventName: "school_explorer_view",
      category: "funnel",
      metadata: { tab },
    });
  }, [tab]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const result =
          tab === "trending"
            ? await listTrendingPortalSchools({ limit: 12, offset: 0, orderBy: "engagement" })
            : tab === "recommended"
              ? await listRecommendedPortalSchools({ city: city.trim() || undefined, limit: 12, offset: 0 })
              : await searchPublicPortalSchools({ q: query.trim() || undefined, city: city.trim() || undefined, limit: 12, offset: 0 });

        if (cancelled) return;

        setSchools(result.items as PortalSchool[]);

        const metricsEntries = await Promise.all(
          result.items.map(async (school) => {
            const metrics = await getPublicPortalSchoolMetrics(school.slug).catch(() => null);
            return [school.slug, metrics] as const;
          })
        );

        if (!cancelled) {
          setMetricsBySlug(Object.fromEntries(metricsEntries));
          if (tab === "search" && query.trim().length >= 2) {
            trackPortalEvent({
              eventName: "global_search",
              category: "adoption",
              metadata: {
                source: "school_explorer",
                queryLength: query.trim().length,
                city: city.trim() || null,
                results: result.items.length,
              },
            });
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setSchools([]);
          setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar escuelas");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [tab, query, city]);

  return (
    <div className="min-h-screen bg-background px-4 pb-12 pt-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Descubrimiento</p>
          <h1 className="text-2xl font-bold text-foreground">Explorador de escuelas</h1>
          <p className="text-sm text-muted-foreground">
            Descubre escuelas por actividad, comunidad y nivel de engagement.
          </p>
        </header>

        <EcosystemStatsWidget />

        <div className="flex flex-wrap gap-2">
          {tabs.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold touch-manipulation active:scale-[0.98] ${tab === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {value === "trending" ? "Trending" : value === "recommended" ? "Recomendadas" : "Buscar"}
            </button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre o zona"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Filtrar por ciudad"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          ) : null}

          {loading ? <p className="text-sm text-muted-foreground">Cargando escuelas...</p> : null}

          {!loading && schools.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay resultados con estos filtros.</p>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {schools.map((school) => (
              <Link key={school.slug} to={`/s/${school.slug}`}>
                <SchoolMetricsCard school={school} metrics={metricsBySlug[school.slug]} compact />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
