import { useMemo, useState } from "react";
import { Search, School, CalendarDays, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { searchPortalGlobal, type PortalGlobalSearchResults } from "@/lib/api/portalFoundation";
import { trackPortalEvent } from "@/lib/portalTelemetry";

const emptyResults: PortalGlobalSearchResults = {
  query: "",
  schools: [],
  events: [],
  profiles: [],
};

export default function GlobalSearchScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PortalGlobalSearchResults>(emptyResults);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasResults = useMemo(
    () => results.schools.length > 0 || results.events.length > 0 || results.profiles.length > 0,
    [results]
  );

  const runSearch = async () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(emptyResults);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await searchPortalGlobal(trimmed, 8);
      setResults(data);
      trackPortalEvent({
        eventName: "global_search",
        category: "adoption",
        metadata: {
          queryLength: trimmed.length,
          schools: data.schools.length,
          events: data.events.length,
          profiles: data.profiles.length,
        },
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo buscar");
      setResults(emptyResults);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 px-4 pb-24 pt-6">
      <h1 className="text-xl font-bold text-foreground">Busqueda global</h1>

      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void runSearch();
              }
            }}
            placeholder="Busca escuelas, eventos o perfiles..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={() => void runSearch()}
            className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground"
          >
            Buscar
          </button>
        </div>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Buscando...</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!loading && !error && query.trim().length >= 2 && !hasResults ? (
        <p className="text-sm text-muted-foreground">Sin resultados para "{query.trim()}".</p>
      ) : null}

      {results.schools.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Escuelas</h2>
          {results.schools.map((school) => (
            <Link key={school.slug} to={`/portal/explorer?school=${school.slug}`} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
              <School className="h-4 w-4 text-primary" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{school.name}</p>
                <p className="truncate text-xs text-muted-foreground">{school.location || "Ubicacion no especificada"}</p>
              </div>
            </Link>
          ))}
        </section>
      ) : null}

      {results.events.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Eventos</h2>
          {results.events.map((event) => (
            <div key={event.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{event.name}</p>
                <p className="truncate text-xs text-muted-foreground">{event.location}</p>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {results.profiles.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Perfiles</h2>
          {results.profiles.map((profile) => (
            <div key={profile.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
              <UserRound className="h-4 w-4 text-primary" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{profile.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{profile.city || "Sin ciudad"}</p>
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
