import { useEffect, useMemo, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { StatCard } from "@/components/cards/StatCard";
import {
  Users, GraduationCap, CreditCard, TrendingUp, AlertTriangle,
  ClipboardList, Clock, ArrowRight, CheckCircle, XCircle, UserPlus, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { getDashboardMetrics, getAnalyticsData } from "@/lib/api/payments";
import { getScheduleInsights, type ScheduleInsightsResult } from "@/lib/api/schedules";
import { getEnrollments } from "@/lib/api/enrollments";
import { getStudents } from "@/lib/api/students";
import { getPayments } from "@/lib/api/payments";
import { getTeachers } from "@/lib/api/teachers";
import { buildEconomySnapshot } from "@/lib/economy";
import { ScheduleInsightsPanel } from "@/components/schedule/ScheduleInsightsPanel";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend,
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

  const incomeDeltaPct = useMemo(() => {
    if (economy.previousMonthlyIncome <= 0) return "0%";
    const delta = ((economy.monthlyIncome - economy.previousMonthlyIncome) / economy.previousMonthlyIncome) * 100;
    return `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}% vs mes anterior`;
  }, [economy.monthlyIncome, economy.previousMonthlyIncome]);

  const hasEconomicAlert = economy.monthlyBalance < 0 || economy.monthlyIncome < economy.previousMonthlyIncome;

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
    pending: "bg-warning/15 text-warning border-warning/20",
    confirmed: "bg-success/15 text-success border-success/20",
    declined: "bg-destructive/15 text-destructive border-destructive/20",
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
      <PageContainer title="Estado de tu escuela" description="Gestiona en segundos lo que importa cada dia">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Estado de tu escuela"
      description="Bienvenido a Nexa"
    >
      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Alumnos Activos" 
          value={metrics?.activeStudents ?? 0} 
          change={`${metrics?.totalStudents ?? 0} totales`} 
          changeType="neutral" 
          icon={Users} 
        />
        <StatCard 
          title="Clases Activas" 
          value={metrics?.activeClasses ?? 0} 
          change={`${metrics?.totalClasses ?? 0} totales`} 
          changeType="neutral" 
          icon={GraduationCap} 
        />
        <StatCard 
          title={`Ingresos (${new Date().toLocaleString('es-AR', { month: 'short' })})`} 
          value={`${(metrics?.monthRevenue ?? 0).toLocaleString()}€`} 
          change={
            (metrics?.overduePayments ?? 0) > 0 
              ? `${metrics?.overduePayments} pago(s) vencido(s)` 
              : "Todo al día"
          } 
          changeType={(metrics?.overduePayments ?? 0) > 0 ? "negative" : "positive"} 
          icon={CreditCard} 
        />
        <StatCard 
          title="Tasa Inscripción" 
          value={`${metrics?.enrollmentRate ?? 0}%`} 
          change={`${metrics?.pendingEnrollments ?? 0} pendiente(s)`} 
          changeType="positive" 
          icon={TrendingUp} 
        />
      </div>

      <div className="rounded-lg border border-border bg-card p-5 shadow-soft mt-6 space-y-5">
        <div>
          <h3 className="text-base font-semibold text-foreground">Resumen económico</h3>
          <p className="text-sm text-muted-foreground">Visión rápida de ingresos y costes de tu escuela</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">Ingresos mensuales</p>
            <p className="text-2xl font-semibold text-foreground">{economy.monthlyIncome.toLocaleString()}€</p>
            <p className="text-xs text-success">{incomeDeltaPct}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">Gastos estimados</p>
            <p className="text-2xl font-semibold text-foreground">{economy.monthlyExpenses.toLocaleString()}€</p>
            <p className="text-xs text-muted-foreground">Profesores + otros</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className={cn("text-2xl font-semibold", economy.monthlyBalance >= 0 ? "text-success" : "text-destructive")}> 
              {economy.monthlyBalance >= 0 ? "+" : ""}{economy.monthlyBalance.toLocaleString()}€
            </p>
            <p className="text-xs text-muted-foreground">Resultado del mes</p>
          </div>
        </div>

        <div className="rounded-lg border border-border p-3">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={economy.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 91%)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${v.toLocaleString()}€`} />
              <Legend />
              <Area type="monotone" dataKey="ingresos" stroke="hsl(142, 72%, 35%)" fill="hsl(142, 72%, 35%)" fillOpacity={0.18} />
              <Area type="monotone" dataKey="gastos" stroke="hsl(0, 72%, 50%)" fill="hsl(0, 72%, 50%)" fillOpacity={0.16} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm font-medium text-foreground mb-2">Ingresos</p>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between"><span>Cuotas alumnos</span><span className="font-semibold">{economy.breakdownIncome.cuotas.toLocaleString()}€</span></div>
              <div className="flex items-center justify-between"><span>Eventos</span><span className="font-semibold">{economy.breakdownIncome.eventos.toLocaleString()}€</span></div>
              <div className="flex items-center justify-between"><span>Otros</span><span className="font-semibold">{economy.breakdownIncome.otros.toLocaleString()}€</span></div>
            </div>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm font-medium text-foreground mb-2">Gastos</p>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between"><span>Profesores</span><span className="font-semibold">{economy.breakdownExpense.profesores.toLocaleString()}€</span></div>
              <div className="flex items-center justify-between"><span>Otros</span><span className="font-semibold">{economy.breakdownExpense.otros.toLocaleString()}€</span></div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Recomendaciones</p>
          {economy.recommendations.slice(0, 3).map((tip, idx) => (
            <div key={idx} className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">{tip}</div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {((metrics?.overduePayments ?? 0) > 0 || (metrics?.pendingEnrollments ?? 0) > 0 || hasEconomicAlert) && (
        <div className="flex flex-wrap gap-3 mt-4">
          {(metrics?.overduePayments ?? 0) > 0 && (
            <button
              onClick={() => navigate("/admin/payments")}
              className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">{metrics?.overduePayments} pago(s) vencido(s)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          {(metrics?.pendingEnrollments ?? 0) > 0 && (
            <button
              onClick={() => navigate("/admin/enrollments")}
              className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/5 px-4 py-2.5 text-sm text-warning hover:bg-warning/10 transition-colors"
            >
              <ClipboardList className="h-4 w-4" />
              <span className="font-medium">{metrics?.pendingEnrollments} inscripción(es) pendiente(s)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          {hasEconomicAlert && (
            <button
              onClick={() => navigate("/admin/economia")}
              className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/5 px-4 py-2.5 text-sm text-warning hover:bg-warning/10 transition-colors"
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">
                {economy.monthlyBalance < 0 ? "Mes en negativo" : "Caída de ingresos"}
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Main content grid */}
      <div className="grid gap-4 lg:grid-cols-3 mt-6">
        {/* Revenue chart — 2 cols */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Ingresos por Mes</h3>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/admin/analytics")}>
              Ver más <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 91%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(215, 14%, 46%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(215, 14%, 46%)" tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
              <Bar dataKey="total" fill="hsl(263, 70%, 58%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top classes */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Ocupación de Clases</h3>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/admin/classes")}>
              Ver todas <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-3.5">
            {Object.entries(analytics?.studentsByClass || {}).slice(0, 5).map(([className, count]) => (
              <div key={className} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground truncate max-w-[160px]">{className}</span>
                  <span className="text-[10px] text-muted-foreground">{count}</span>
                </div>
                <Progress value={Math.min((count as number * 20), 100)} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <ScheduleInsightsPanel
          insights={scheduleInsights}
          compact
          onViewSchedule={() => navigate("/admin/schedule")}
        />
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-2 mt-4">
        {/* Recent enrollments */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Inscripciones Recientes</h3>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/admin/enrollments")}>
              Ver todas <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          {recentEnrollments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <UserPlus className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Empieza creando tu primera clase</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentEnrollments.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent">
                      <UserPlus className="h-3 w-3 text-accent-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{e.studentName}</p>
                      <p className="text-[10px] text-muted-foreground">{e.classes?.length || 1} clase(s) · {formatSafeDate(e.createdAt)}</p>
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

        {/* Overdue payments / quick info */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Pagos que Requieren Atención</h3>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/admin/payments")}>
              Ver todos <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          {overduePayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-8 w-8 text-success mb-2" />
              <p className="text-sm font-medium text-foreground">Todo al día</p>
              <p className="text-xs text-muted-foreground">Control total sin pagos vencidos</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {overduePayments.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.studentName}</p>
                    <p className="text-[10px] text-muted-foreground">{p.concept.slice(0, 40)}…</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-destructive">{p.amount.toLocaleString()}€</p>
                    <p className="text-[10px] text-muted-foreground">{formatSafeDate(p.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 shadow-soft mt-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Acciones rápidas</h3>
            <p className="text-xs text-muted-foreground">Menos gestión, más enseñanza</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/economia?tab=gastos")}>Añadir gasto</Button>
            <Button size="sm" onClick={() => navigate("/admin/economia?tab=ingresos")}>Registrar ingreso</Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

