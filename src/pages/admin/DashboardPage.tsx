import { useEffect, useMemo, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { StatCard } from "@/components/cards/StatCard";
import {
  Users,
  AlertTriangle,
  ClipboardList,
  ArrowRight,
  CheckCircle,
  UserPlus,
  Loader2,
  CircleDollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { getDashboardMetrics, getAnalyticsData } from "@/lib/api/payments";
import { getScheduleInsights, type ScheduleInsightsResult } from "@/lib/api/schedules";
import { getEnrollments } from "@/lib/api/enrollments";
import { getPayments } from "@/lib/api/payments";
import { getTeachers } from "@/lib/api/teachers";
import { buildEconomySnapshot } from "@/lib/economy";
import { ScheduleInsightsPanel } from "@/components/schedule/ScheduleInsightsPanel";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof getDashboardMetrics>> | null>(null);
  const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof getAnalyticsData>> | null>(null);
  const [scheduleInsights, setScheduleInsights] = useState<ScheduleInsightsResult | null>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [metricsData, analyticsData, enrollmentsData, paymentsData, insightsData, teachersData] = await Promise.all([
          getDashboardMetrics(),
          getAnalyticsData(),
          getEnrollments(),
          getPayments(),
          getScheduleInsights(),
          getTeachers(),
        ]);
        setMetrics(metricsData);
        setAnalytics(analyticsData);
        setEnrollments(enrollmentsData || []);
        setPayments(paymentsData || []);
        setScheduleInsights(insightsData);
        setTeachers(teachersData || []);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const overduePayments = useMemo(
    () => payments.filter((p) => p.status === "overdue" || p.status === "pending"),
    [payments]
  );

  const recentEnrollments = useMemo(
    () => enrollments.slice(0, 5),
    [enrollments]
  );

  const economy = useMemo(
    () => buildEconomySnapshot({ payments: payments || [], teachers: teachers || [], months: 6 }),
    [payments, teachers]
  );

  const revenueByMonth = useMemo(() => {
    if (!analytics?.revenueByMonth) return [];
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return Object.entries(analytics.revenueByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => {
        const [, m] = month.split("-");
        return { name: monthNames[parseInt(m) - 1], total: Math.round(total / 100) };
      })
      .slice(-6);
  }, [analytics]);

  const STATUS_STYLES: Record<string, string> = {
    pending: "bg-warning/10 text-warning border-warning/20",
    confirmed: "bg-success/10 text-success border-success/20",
    declined: "bg-destructive/10 text-destructive border-destructive/20",
    cancelled: "bg-muted text-muted-foreground border-border",
  };
  const STATUS_LABELS: Record<string, string> = {
    pending: "Pendiente", confirmed: "Confirmada", declined: "Rechazada", cancelled: "Cancelada",
  };

  const formatSafeDate = (value: unknown) => {
    if (!value) return "Sin fecha";
    const parsed = new Date(value as string | number | Date);
    return isValid(parsed) ? format(parsed, "d MMM", { locale: es }) : "Sin fecha";
  };

  if (loading) {
    return (
      <PageContainer title="Dashboard" description="Vista general de tu academia">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Dashboard" description="Vista general de tu academia">
      {/* KPIs */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard 
          title="Alumnos activos" 
          value={metrics?.activeStudents ?? 0} 
          change={`${metrics?.totalStudents ?? 0} en total`} 
          changeType="neutral" 
          icon={Users} 
        />
        <StatCard 
          title={`Ingresos ${new Date().toLocaleString("es-ES", { month: "short" })}`} 
          value={`${(metrics?.monthRevenue ?? 0).toLocaleString()}€`} 
          change={
            (metrics?.overduePayments ?? 0) > 0 
              ? `${metrics?.overduePayments} pendientes` 
              : "Todo al día"
          } 
          changeType={(metrics?.overduePayments ?? 0) > 0 ? "negative" : "positive"} 
          icon={CircleDollarSign} 
        />
        <StatCard 
          title="Inscripciones" 
          value={metrics?.pendingEnrollments ?? 0} 
          change="pendientes" 
          changeType={(metrics?.pendingEnrollments ?? 0) > 0 ? "neutral" : "positive"} 
          icon={ClipboardList} 
        />
      </div>

      {/* Alerts */}
      {((metrics?.overduePayments ?? 0) > 0 || (metrics?.pendingEnrollments ?? 0) > 0) && (
        <div className="flex flex-wrap gap-3">
          {(metrics?.overduePayments ?? 0) > 0 && (
            <button
              onClick={() => navigate("/admin/payments")}
              className="flex items-center gap-2 rounded-lg border border-destructive/15 bg-destructive/5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">{metrics?.overduePayments} pagos pendientes</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          {(metrics?.pendingEnrollments ?? 0) > 0 && (
            <button
              onClick={() => navigate("/admin/enrollments")}
              className="flex items-center gap-2 rounded-lg border border-warning/15 bg-warning/5 px-4 py-2.5 text-sm text-warning hover:bg-warning/10 transition-colors"
            >
              <ClipboardList className="h-4 w-4" />
              <span className="font-medium">{metrics?.pendingEnrollments} inscripciones pendientes</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Revenue chart + Financial status */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-medium text-foreground">Ingresos</h3>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/admin/analytics")}>
              Ver más <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 92%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 50%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 50%)" tickFormatter={(v) => `${v}€`} />
              <Tooltip formatter={(v: number) => `${v.toLocaleString()}€`} />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-medium text-foreground mb-5">Balance mensual</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Ingresos</p>
              <p className="text-xl font-semibold text-foreground mt-0.5">{economy.monthlyIncome.toLocaleString()}€</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gastos</p>
              <p className="text-xl font-semibold text-foreground mt-0.5">{economy.monthlyExpenses.toLocaleString()}€</p>
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className={cn("text-xl font-semibold mt-0.5", economy.monthlyBalance >= 0 ? "text-success" : "text-destructive")}>
                {economy.monthlyBalance >= 0 ? "+" : ""}{economy.monthlyBalance.toLocaleString()}€
              </p>
            </div>
            <Button className="w-full" variant="outline" size="sm" onClick={() => navigate("/admin/economia")}>Ver economía</Button>
          </div>
        </div>
      </div>

      {/* Schedule insights */}
      <ScheduleInsightsPanel
        insights={scheduleInsights}
        compact
        onViewSchedule={() => navigate("/admin/schedule")}
      />

      {/* Activity + Payments */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-medium text-foreground">Actividad reciente</h3>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/admin/enrollments")}>
              Ver todas <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          {recentEnrollments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <UserPlus className="h-5 w-5 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Sin actividad reciente</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentEnrollments.slice(0, 4).map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent">
                      <UserPlus className="h-3 w-3 text-accent-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{e.studentName}</p>
                      <p className="text-[11px] text-muted-foreground">{formatSafeDate(e.createdAt)}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] font-medium shrink-0", STATUS_STYLES[e.status])}>
                    {STATUS_LABELS[e.status]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-medium text-foreground">Pagos pendientes</h3>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/admin/payments")}>
              Ver todos <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          {overduePayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-6 w-6 text-success mb-2" />
              <p className="text-sm font-medium text-foreground">Todo al día</p>
            </div>
          ) : (
            <div className="space-y-1">
              {overduePayments.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.studentName}</p>
                    <p className="text-[11px] text-muted-foreground">{p.concept.slice(0, 35)}</p>
                  </div>
                  <p className="text-sm font-semibold text-destructive shrink-0">{p.amount.toLocaleString()}€</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
