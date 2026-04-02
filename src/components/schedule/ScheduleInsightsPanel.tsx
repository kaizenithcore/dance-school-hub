import { useState } from "react";
import { AlertTriangle, ArrowRight, ChevronDown, Clock3, LayoutGrid, Users } from "lucide-react";
import type { ScheduleInsight, ScheduleInsightsResult } from "@/lib/api/schedules";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ScheduleInsightsPanelProps {
  insights: ScheduleInsightsResult | null;
  loading?: boolean;
  compact?: boolean;
  onViewSchedule?: () => void;
}

function severityLabel(severity: ScheduleInsight["severity"]) {
  if (severity === "high") return "Alta";
  if (severity === "medium") return "Media";
  return "Baja";
}

function severityClass(severity: ScheduleInsight["severity"]) {
  if (severity === "high") return "bg-destructive/15 text-destructive border-destructive/30";
  if (severity === "medium") return "bg-warning/15 text-warning border-warning/30";
  return "bg-muted text-muted-foreground border-border";
}

function typeLabel(type: ScheduleInsight["type"]) {
  if (type === "low_demand") return "Baja demanda";
  if (type === "over_demand") return "Sobredemanda";
  if (type === "unused_teacher") return "Profesor sin clases";
  if (type === "schedule_gap") return "Hueco de horario";
  if (type === "unused_room") return "Aula infrautilizada";
  return "Otro";
}

export function ScheduleInsightsPanel({
  insights,
  loading = false,
  compact = false,
  onViewSchedule,
}: ScheduleInsightsPanelProps) {
  const [expanded, setExpanded] = useState(true);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 shadow-soft space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="rounded-md border border-border p-2.5 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-10" />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Analizando ocupación, demanda y huecos del horario...</p>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 shadow-soft">
        <p className="text-sm text-muted-foreground">No se pudieron cargar los insights de horario.</p>
      </div>
    );
  }

  const alerts = compact ? insights.alerts.slice(0, 3) : insights.alerts.slice(0, 8);

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-soft space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Alertas de horario</h3>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpanded((prev) => !prev)}
              aria-label={expanded ? "Contraer alertas" : "Desplegar alertas"}
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", expanded ? "rotate-0" : "-rotate-90")} />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {insights.summary.totalAlerts} alerta(s) detectadas · ocupacion media {insights.metrics.avgClassOccupancyPct}%
          </p>
        </div>
        {onViewSchedule && (
          <Button variant="outline" size="sm" onClick={onViewSchedule}>
            Abrir Horarios
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        )}
      </div>

      {expanded ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-md border border-border p-2.5">
              <p className="text-[11px] text-muted-foreground">Baja demanda</p>
              <p className="text-sm font-semibold text-foreground">{insights.summary.lowDemandClasses}</p>
            </div>
            <div className="rounded-md border border-border p-2.5">
              <p className="text-[11px] text-muted-foreground">Sobredemanda</p>
              <p className="text-sm font-semibold text-foreground">{insights.summary.overDemandClasses}</p>
            </div>
            <div className="rounded-md border border-border p-2.5">
              <p className="text-[11px] text-muted-foreground">Profesores sin clases</p>
              <p className="text-sm font-semibold text-foreground">{insights.summary.unusedTeachers}</p>
            </div>
            <div className="rounded-md border border-border p-2.5">
              <p className="text-[11px] text-muted-foreground">Huecos de horario</p>
              <p className="text-sm font-semibold text-foreground">{insights.summary.scheduleGaps}</p>
            </div>
            <div className="rounded-md border border-border p-2.5">
              <p className="text-[11px] text-muted-foreground">Aulas infrautilizadas</p>
              <p className="text-sm font-semibold text-foreground">{insights.summary.unusedRooms}</p>
            </div>
          </div>

          {alerts.length === 0 ? (
            <div className="flex items-center gap-2 rounded-md border border-success/20 bg-success/5 px-3 py-2 text-sm text-success">
              <AlertTriangle className="h-4 w-4" />
              No se detectaron problemas relevantes de horario en este momento.
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={cn("text-[10px] font-medium", severityClass(alert.severity))}>
                      {severityLabel(alert.severity)}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {typeLabel(alert.type)}
                    </Badge>
                    {alert.type === "schedule_gap" ? (
                      <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : alert.type === "unused_room" ? (
                      <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : alert.type === "unused_teacher" ? (
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <p className="text-xs font-semibold text-foreground">{alert.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{alert.description}</p>
                  {!compact && (
                    <p className="mt-1 text-xs text-foreground">Sugerencia: {alert.suggestedAction}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
