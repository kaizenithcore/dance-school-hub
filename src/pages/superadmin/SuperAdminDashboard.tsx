import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2, RefreshCw, Search, AlertTriangle, Sparkles,
  TrendingUp, Users, Building2, CreditCard, ArrowUpDown, ChevronUp, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getAllTenants, type TenantSummary, type CrmStatus } from "@/lib/api/platformAdmin";
import { TenantDetailPanel } from "./TenantDetailPanel";
import { TablePagination, readPageSize } from "@/components/tables/TablePagination";

const PAGE_SIZE_KEY = "superadmin-table-page-size";

const CRM_LABELS: Record<CrmStatus, { label: string; dot: string }> = {
  new:       { label: "Nueva",      dot: "bg-muted-foreground" },
  contacted: { label: "Contactada", dot: "bg-primary" },
  active:    { label: "Activa",     dot: "bg-success" },
  at_risk:   { label: "En riesgo",  dot: "bg-amber-500" },
  churned:   { label: "Perdida",    dot: "bg-destructive" },
};

type FilterKey = "all" | "trial" | "active" | "at_risk" | "new";
type SortKey = "name" | "created" | "usage" | "students" | "plan";

function fmtEur(cents: number) {
  if (cents === 0) return "—";
  return `${(cents / 100).toFixed(0)} €`;
}
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function UsageChip({ pct }: { pct: number }) {
  const cls = pct >= 90 ? "bg-destructive/15 text-destructive border-destructive/20"
    : pct >= 70 ? "bg-amber-500/10 text-amber-700 border-amber-400/30"
    : "bg-success/15 text-success border-success/20";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full", pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-amber-500" : "bg-success")}
          style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <Badge variant="outline" className={cn("text-[10px] font-medium px-1.5 py-0", cls)}>{pct}%</Badge>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(() => readPageSize(PAGE_SIZE_KEY));
  const [selected, setSelected] = useState<TenantSummary | null>(null);

  // Update local tenant state when suspend/resume is toggled in the detail panel
  const handleSuspendChange = (id: string, suspended: boolean) => {
    setTenants((prev) => prev.map((t) => t.id === id ? { ...t, isSuspended: suspended } : t));
    setSelected((prev) => prev?.id === id ? { ...prev, isSuspended: suspended } : prev);
  };

  const load = async () => {
    setLoading(true);
    try { setTenants(await getAllTenants()); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Error al cargar"); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  // Global KPIs
  const kpis = useMemo(() => ({
    total: tenants.length,
    trial: tenants.filter((t) => !t.trialPaymentCompleted).length,
    active: tenants.filter((t) => t.trialPaymentCompleted).length,
    atRisk: tenants.filter((t) => t.usagePct >= 80).length,
    newThis7d: tenants.filter((t) => t.isNew).length,
    stripeRevenue: tenants.reduce((s, t) => s + t.stripeTotalCents, 0),
    suspended: tenants.filter((t) => t.isSuspended).length,
  }), [tenants]);

  const filtered = useMemo(() => {
    let rows = tenants;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.ownerEmail.toLowerCase().includes(q)
      );
    }
    if (filter === "trial") rows = rows.filter((t) => !t.trialPaymentCompleted);
    else if (filter === "active") rows = rows.filter((t) => t.trialPaymentCompleted);
    else if (filter === "at_risk") rows = rows.filter((t) => t.usagePct >= 80);
    else if (filter === "new") rows = rows.filter((t) => t.isNew);

    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortKey === "name")    return a.name.localeCompare(b.name) * dir;
      if (sortKey === "created") return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      if (sortKey === "usage")   return (a.usagePct - b.usagePct) * dir;
      if (sortKey === "students")return (a.activeStudents - b.activeStudents) * dir;
      if (sortKey === "plan")    return a.planType.localeCompare(b.planType) * dir;
      return 0;
    });
  }, [tenants, search, filter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);
  useEffect(() => { setPage(0); }, [search, filter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };
  const SortIcon = ({ k }: { k: SortKey }) => sortKey !== k
    ? <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
    : sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;

  const FILTERS: Array<{ key: FilterKey; label: string; count: number }> = [
    { key: "all",      label: `Todas (${kpis.total})`,           count: kpis.total },
    { key: "trial",    label: `Trial (${kpis.trial})`,           count: kpis.trial },
    { key: "active",   label: `Activas (${kpis.active})`,        count: kpis.active },
    { key: "at_risk",  label: `En riesgo (${kpis.atRisk})`,      count: kpis.atRisk },
    { key: "new",      label: `Nuevas <7d (${kpis.newThis7d})`,  count: kpis.newThis7d },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Nexa — Panel interno</p>
              <p className="text-xs text-muted-foreground">Monitorización de escuelas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin">← Panel admin</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* KPI bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { icon: Building2,  label: "Escuelas",      value: kpis.total },
            { icon: Users,      label: "En trial",      value: kpis.trial },
            { icon: TrendingUp, label: "Activas",       value: kpis.active },
            { icon: AlertTriangle, label: "En riesgo",  value: kpis.atRisk, warn: kpis.atRisk > 0 },
            { icon: Sparkles,   label: "Nuevas <7d",      value: kpis.newThis7d },
            { icon: CreditCard, label: "Cobrado (Stripe)", value: fmtEur(kpis.stripeRevenue) },
          ].map(({ icon: Icon, label, value, warn }) => (
            <div key={label} className={cn("rounded-lg border border-border bg-card px-3 py-2.5",
              warn ? "border-amber-300/50 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20" : "")}>
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={cn("h-3.5 w-3.5", warn ? "text-amber-600" : "text-muted-foreground")} />
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
              <p className={cn("text-lg font-bold", warn ? "text-amber-700" : "text-foreground")}>{value}</p>
            </div>
          ))}
        </div>

        {/* Search + filters */}
        <div className="space-y-2">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Buscar por nombre, slug o email…" value={search}
              onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map(({ key, label }) => (
              <button key={key} type="button" onClick={() => setFilter(key)}
                className={cn("rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                  filter === key ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground")}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" /></div>
        ) : (
          <>
            <div className="rounded-lg border border-border bg-card shadow-sm overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-border hover:bg-transparent">
                    {([
                      { label: "Escuela",       key: "name"     as SortKey | null },
                      { label: "Plan",          key: "plan"     as SortKey | null },
                      { label: "Alumnos",       key: "students" as SortKey | null },
                      { label: "Uso",           key: "usage"    as SortKey | null },
                      { label: "Trial / Pago",  key: null },
                      { label: "Pagado a Nexa", key: null },
                      { label: "Alta",          key: "created"  as SortKey | null },
                      { label: "CRM",           key: null },
                    ] as const).map(({ label, key }) => (
                      <th key={label} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                        {key ? (
                          <button type="button" onClick={() => toggleSort(key as SortKey)}
                            className="inline-flex items-center gap-1 hover:text-foreground">
                            {label} <SortIcon k={key as SortKey} />
                          </button>
                        ) : label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-10 text-sm text-muted-foreground">Sin resultados</td></tr>
                  ) : paginated.map((t, idx) => {
                    const crm = CRM_LABELS[t.crmStatus];
                    const isExpiringSoon = !t.trialPaymentCompleted && (t.daysUntilTrialExpiry ?? 99) <= 5;
                    return (
                      <tr key={t.id}
                        onClick={() => setSelected(t)}
                        className={cn("border-t border-border cursor-pointer hover:bg-accent/40 transition-colors",
                          idx % 2 !== 0 && "bg-muted/20",
                          t.isSuspended && "opacity-60")}>
                        <td className="px-3 py-2.5">
                          <div>
                            <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                              {t.name}
                              {t.isNew && <span className="rounded-full bg-primary/10 text-primary text-[9px] font-bold px-1.5 py-0.5">NEW</span>}
                              {t.isSuspended && <span className="rounded-full bg-destructive/15 text-destructive text-[9px] font-bold px-1.5 py-0.5">SUSPENDIDA</span>}
                            </p>
                            {/* Admin email — clickable mailto */}
                            <a href={`mailto:${t.ownerEmail}`} onClick={(e) => e.stopPropagation()}
                              className="text-[10px] text-primary hover:underline">{t.ownerEmail}</a>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs font-semibold text-foreground uppercase">{t.planType}</span>
                        </td>
                        <td className="px-3 py-2.5 text-sm text-foreground">{t.activeStudents}<span className="text-muted-foreground text-xs">/{t.maxStudents}</span></td>
                        <td className="px-3 py-2.5"><UsageChip pct={t.usagePct} /></td>
                        <td className="px-3 py-2.5">
                          {t.trialPaymentCompleted
                            ? <span className="text-xs text-success font-medium flex items-center gap-1">✓ Activa</span>
                            : <span className={cn("text-xs font-medium", isExpiringSoon ? "text-destructive" : "text-amber-600")}>
                                Trial {t.daysUntilTrialExpiry}d
                              </span>
                          }
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-sm font-semibold text-foreground">{fmtEur(t.stripeTotalCents)}</span>
                          {t.stripePaymentCount > 0 && (
                            <span className="text-[10px] text-muted-foreground ml-1">({t.stripePaymentCount}x)</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(t.createdAt)}</td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1 text-xs">
                            <span className={cn("h-2 w-2 rounded-full shrink-0", crm.dot)} />
                            {crm.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <TablePagination
              page={page} totalPages={totalPages} totalItems={filtered.length} pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(s) => { setPageSize(s); setPage(0); localStorage.setItem(PAGE_SIZE_KEY, String(s)); }}
              itemLabel="escuelas"
            />
          </>
        )}
      </div>

      <TenantDetailPanel tenant={selected} onClose={() => setSelected(null)} onSuspendChange={handleSuspendChange} />
    </div>
  );
}
