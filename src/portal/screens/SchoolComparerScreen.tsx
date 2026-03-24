import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { comparePortalSchools } from "@/lib/api/portalFoundation";
import { SchoolMetricsCard } from "@/portal/components/SchoolMetricsCard";

export default function SchoolComparerScreen() {
  const [slugsInput, setSlugsInput] = useState("");
  const [items, setItems] = useState<Awaited<ReturnType<typeof comparePortalSchools>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runCompare = async () => {
    const slugs = slugsInput
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .slice(0, 3);

    if (slugs.length < 2) {
      setError("Introduce al menos 2 slugs separados por comas");
      setItems([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await comparePortalSchools(slugs);
      setItems(result);
      if (result.length < 2) {
        setError("No se encontraron suficientes escuelas para comparar");
      }
    } catch (compareError) {
      setError(compareError instanceof Error ? compareError.message : "No se pudo comparar");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 pb-24 pt-6 space-y-4">
      <h1 className="text-xl font-bold text-foreground">Comparador de escuelas</h1>

      <div className="rounded-xl border border-border bg-card p-3">
        <p className="mb-2 text-xs text-muted-foreground">Slugs separados por coma (max 3)</p>
        <input
          value={slugsInput}
          onChange={(event) => setSlugsInput(event.target.value)}
          placeholder="escuela-centro, dance-lab"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={runCompare}
          disabled={loading}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" /> {loading ? "Comparando..." : "Comparar"}
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      <div className="space-y-3">
        {items.map((item) => (
          <SchoolMetricsCard
            key={item.school.slug}
            school={item.school}
            metrics={{
              tenantId: item.school.tenantId,
              slug: item.school.slug,
              name: item.school.name,
              ...item.metrics,
            }}
          />
        ))}
      </div>
    </div>
  );
}
