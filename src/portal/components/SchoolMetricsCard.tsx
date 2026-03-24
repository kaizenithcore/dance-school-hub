import { Flame, TrendingUp, Users, Eye, CalendarDays } from "lucide-react";
import type { PortalSchool, PortalSchoolMetrics } from "@/lib/api/portalFoundation";

interface SchoolMetricsCardProps {
  school: PortalSchool;
  metrics?: PortalSchoolMetrics | null;
  compact?: boolean;
}

export function SchoolMetricsCard({ school, metrics, compact = false }: SchoolMetricsCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{school.name}</p>
            {metrics?.trendingBadge ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                <Flame className="h-3 w-3" /> Trending
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">{school.location || "Ubicacion no indicada"}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <Metric icon={Users} label="Alumnos" value={metrics?.activeStudents ?? school.totalStudents} />
        <Metric icon={TrendingUp} label="Engagement" value={`${(metrics?.engagementRate ?? 0).toFixed(1)}%`} />
        {!compact ? <Metric icon={Eye} label="Vistas" value={metrics?.viewsCount ?? 0} /> : null}
        {!compact ? <Metric icon={CalendarDays} label="Posts/sem" value={(metrics?.postsPerWeek ?? 0).toFixed(1)} /> : null}
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-lg bg-muted/60 px-2.5 py-2">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Icon className="h-3 w-3" />
        <span>{label}</span>
      </div>
      <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
