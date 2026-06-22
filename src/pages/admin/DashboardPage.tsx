import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, isValid, differenceInDays, addDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  CreditCard, Repeat, ClipboardList, CheckCircle2, ArrowRight,
  UserPlus, AlertTriangle, CalendarDays, Loader2, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getDashboardMetrics } from "@/lib/api/payments";
import { getPayments, type PaymentRecord } from "@/lib/api/payments";
import { getEnrollments } from "@/lib/api/enrollments";
import { getSchedules } from "@/lib/api/schedules";
import { getRenewalCampaigns, type RenewalCampaign } from "@/lib/api/renewals";
import type { EnrollmentRecord } from "@/lib/data/mockEnrollments";
import { useAuth } from "@/contexts/AuthContext";

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (!isValid(d)) return "";
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function getDayName(weekday: number): string {
  // weekday: 0=Sun, 1=Mon … 6=Sat
  return ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][weekday];
}

// ── Action card ────────────────────────────────────────────────────────────────

interface ActionCardProps {
  label: string;
  icon: React.ElementType;
  allGood: boolean;
  primary: string;
  secondary: string;
  actionLabel: string;
  onAction: () => void;
  urgent?: boolean;
}

function ActionCard({ label, icon: Icon, allGood, primary, secondary, actionLabel, onAction, urgent }: ActionCardProps) {
  return (
    <div className={cn(
      "flex flex-col rounded-xl border bg-card p-5 gap-4",
      urgent ? "border-destructive/30 bg-destructive/[0.02]" : "border-border"
    )}>
      <div className="flex items-center gap-2">
        <div className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg",
          urgent ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
        )}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>

      {allGood ? (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
          <p className="text-sm font-medium text-success">Todo gestionado</p>
        </div>
      ) : (
        <div>
          <p className="text-2xl font-bold text-foreground leading-none">{primary}</p>
          <p className="text-xs text-muted-foreground mt-1">{secondary}</p>
        </div>
      )}

      <Button
        size="sm"
        variant={allGood ? "outline" : "default"}
        className="mt-auto w-full"
        onClick={onAction}
      >
        {actionLabel}
        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const { authContext } = useAuth();

  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof getDashboardMetrics>> | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [schedules, setSchedules] = useState<Awaited<ReturnType<typeof getSchedules>>>([]);
  const [campaigns, setCampaigns] = useState<RenewalCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [metricsData, paymentsData, enrollmentsData, schedulesData, campaignsData] = await Promise.allSettled([
          getDashboardMetrics(),
          getPayments(),
          getEnrollments(),
          getSchedules(),
          getRenewalCampaigns(),
        ]);
        if (metricsData.status === "fulfilled") setMetrics(metricsData.value);
        if (paymentsData.status === "fulfilled") setPayments(paymentsData.value ?? []);
        if (enrollmentsData.status === "fulfilled") setEnrollments(enrollmentsData.value ?? []);
        if (schedulesData.status === "fulfilled") setSchedules(schedulesData.value ?? []);
        if (campaignsData.status === "fulfilled") setCampaigns(campaignsData.value ?? []);
      } catch {
        // Best-effort — show empty states
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────────

  // Cobros pendientes
  const pendingPayments = useMemo(
    () => payments.filter((p) => p.status === "overdue" || p.status === "pending"),
    [payments]
  );
  const pendingPaymentsTotal = useMemo(
    () => pendingPayments.reduce((sum, p) => sum + p.amount, 0),
    [pendingPayments]
  );

  // Renovaciones — use the most recent active campaign
  const activeCampaign = useMemo(
    () => campaigns.find((c) => c.status === "active") ?? campaigns[0] ?? null,
    [campaigns]
  );

  // Inscripciones pendientes
  const pendingEnrollments = useMemo(
    () => enrollments.filter((e) => e.status === "pending"),
    [enrollments]
  );

  // Esta semana — classes per weekday (0=Sun…6=Sat)
  const classesPerWeekday = useMemo(() => {
    const counts: Record<number, number> = {};
    schedules.forEach((s) => { counts[s.weekday] = (counts[s.weekday] ?? 0) + 1; });
    return counts;
  }, [schedules]);

  // Working days to display (Mon-Sat = 1-6)
  const weekDays = [1, 2, 3, 4, 5, 6];
  const todayWeekday = new Date().getDay(); // 0=Sun
  const tomorrowWeekday = addDays(new Date(), 1).getDay();
  const tomorrowSchedules = useMemo(
    () => schedules.filter((s) => s.weekday === tomorrowWeekday),
    [schedules, tomorrowWeekday]
  );

  // Actividad reciente — last 5 enrollments sorted by date
  const recentActivity = useMemo(() => {
    return [...enrollments]
      .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())
      .slice(0, 5);
  }, [enrollments]);

  // Alumnos a destacar — overdue > 30 days + pending renewals
  const studentsToHighlight = useMemo(() => {
    const items: Array<{ id: string; name: string; reason: string; action: () => void }> = [];
    const seen = new Set<string>();

    // Overdue payments > 30 days
    payments.forEach((p) => {
      if (seen.has(p.studentId)) return;
      if (p.status !== "overdue" && p.status !== "pending") return;
      const daysOverdue = p.dueAt ? differenceInDays(new Date(), new Date(p.dueAt)) : 0;
      if (daysOverdue >= 30) {
        seen.add(p.studentId);
        items.push({
          id: p.studentId,
          name: p.studentName,
          reason: `${daysOverdue}d sin pagar`,
          action: () => navigate("/admin/payments"),
        });
      }
    });

    // Pending renewals
    if (activeCampaign && activeCampaign.counts.pending > 0 && items.length < 5) {
      items.push({
        id: "renewals-pending",
        name: `${activeCampaign.counts.pending} alumnos`,
        reason: "no han renovado aún",
        action: () => navigate("/admin/renewals"),
      });
    }

    return items.slice(0, 5);
  }, [payments, activeCampaign, navigate]);

  // Greeting name — from email prefix or fallback
  const userName = useMemo(() => {
    const email = authContext?.user?.email ?? "";
    return email ? email.split("@")[0].split(".")[0] : "";
  }, [authContext]);

  // ── Loading ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-foreground">
          {greeting()}{userName ? `, ${userName}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
        </p>
      </div>

      {/* ── Bloque 1: 3 action cards ─────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <ActionCard
          label="Cobros pendientes"
          icon={CreditCard}
          allGood={pendingPayments.length === 0}
          primary={`${pendingPayments.length} alumnos · ${pendingPaymentsTotal.toLocaleString()}€`}
          secondary="del mes en curso"
          actionLabel="Ver cobros"
          onAction={() => navigate("/admin/payments")}
          urgent={pendingPayments.length > 0}
        />
        <ActionCard
          label="Renovaciones"
          icon={Repeat}
          allGood={!activeCampaign || activeCampaign.counts.pending === 0}
          primary={
            activeCampaign
              ? `${activeCampaign.counts.confirmed} de ${activeCampaign.counts.total}`
              : "Sin campaña activa"
          }
          secondary={activeCampaign ? "completadas este curso" : ""}
          actionLabel="Ver renovaciones"
          onAction={() => navigate("/admin/renewals")}
        />
        <ActionCard
          label="Inscripciones"
          icon={ClipboardList}
          allGood={pendingEnrollments.length === 0}
          primary={`${pendingEnrollments.length} solicitudes`}
          secondary="esperando respuesta"
          actionLabel="Revisar"
          onAction={() => navigate("/admin/enrollments")}
        />
      </div>

      {/* ── Bloque 2: Esta semana ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Esta semana</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => navigate("/admin/classes?view=schedule")}
          >
            Ver horario completo <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>

        {/* Day bars */}
        <div className="grid grid-cols-6 gap-1.5">
          {weekDays.map((wd) => {
            const count = classesPerWeekday[wd] ?? 0;
            const isToday = wd === todayWeekday;
            const isTomorrow = wd === tomorrowWeekday;
            const maxCount = Math.max(...weekDays.map((d) => classesPerWeekday[d] ?? 0), 1);
            const heightPct = count > 0 ? Math.max(20, Math.round((count / maxCount) * 100)) : 8;

            return (
              <button
                key={wd}
                type="button"
                onClick={() => navigate(`/admin/classes?view=schedule`)}
                className="flex flex-col items-center gap-1.5 group"
                title={`${getDayName(wd)}: ${count} clases`}
              >
                <div className="w-full flex flex-col items-center justify-end h-16">
                  <div
                    className={cn(
                      "w-full rounded-md transition-colors group-hover:opacity-80",
                      isToday ? "bg-primary" : isTomorrow ? "bg-primary/40" : "bg-muted"
                    )}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span className={cn(
                  "text-[11px] font-medium",
                  isToday ? "text-primary" : isTomorrow ? "text-foreground" : "text-muted-foreground"
                )}>
                  {getDayName(wd)}
                </span>
                <span className={cn(
                  "text-[10px]",
                  count > 0 ? "text-foreground" : "text-muted-foreground/40"
                )}>
                  {count > 0 ? count : "—"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tomorrow highlight */}
        {tomorrowSchedules.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-1.5">
              Mañana ({getDayName(tomorrowWeekday)}) — {tomorrowSchedules.length} {tomorrowSchedules.length === 1 ? "clase" : "clases"}:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {tomorrowSchedules.slice(0, 4).map((s, i) => (
                <span key={i} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-foreground">
                  {s.startTime?.slice(0, 5) ?? "—"} {s.className ?? s.classId}
                </span>
              ))}
              {tomorrowSchedules.length > 4 && (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                  +{tomorrowSchedules.length - 4} más
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Bloque 3: Actividad + Alumnos a destacar ─────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Actividad reciente */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-foreground">Actividad reciente</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => navigate("/admin/enrollments")}
            >
              Ver todo <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>

          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Sin actividad reciente</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {recentActivity.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => navigate("/admin/enrollments")}
                  className="w-full flex items-start gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-accent transition-colors"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                    <UserPlus className="h-3 w-3 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{e.studentName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {e.classes?.[0]?.name ?? "Inscripción"} · {timeAgo(e.date)}
                    </p>
                  </div>
                  <span className={cn(
                    "shrink-0 text-[10px] font-medium rounded-full px-2 py-0.5 mt-0.5",
                    e.status === "confirmed" ? "bg-success/10 text-success" :
                    e.status === "pending" ? "bg-warning/10 text-warning" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {e.status === "confirmed" ? "Confirmada" : e.status === "pending" ? "Pendiente" : e.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Alumnos a destacar */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-foreground">Alumnos que necesitan atención</p>
          </div>

          {studentsToHighlight.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <p className="text-sm font-medium text-success">Todo en orden</p>
              <p className="text-xs text-muted-foreground">No hay alumnos con alertas activas</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {studentsToHighlight.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={student.action}
                  className="w-full flex items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-accent transition-colors"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning/10">
                    <AlertTriangle className="h-3 w-3 text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{student.name}</p>
                    <p className="text-[11px] text-muted-foreground">{student.reason}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
