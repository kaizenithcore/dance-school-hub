import { useEffect, useMemo, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { StatCard } from "@/components/cards/StatCard";
import { Users, CreditCard, TrendingUp, AlertTriangle, Loader2, Wallet, Trophy, Target, Activity, CircleDollarSign } from "lucide-react";
import { getAnalyticsData, getDashboardMetrics, type AnalyticsData, type DashboardMetrics } from "@/lib/api/payments";
import { getStudents } from "@/lib/api/students";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

const CHART_COLORS = [
  "hsl(263, 70%, 58%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(210, 92%, 55%)",
  "hsl(263, 70%, 78%)",
];

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [analyticsData, metricsData, studentsData] = await Promise.all([
          getAnalyticsData(),
          getDashboardMetrics(),
          getStudents(),
        ]);

        setAnalytics(analyticsData);
        setMetrics(metricsData);
        setStudents(studentsData || []);
      } catch (error) {
        console.error("Failed to load analytics:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const totalStudents = students.length;
  const inactiveStudents = students.filter((s) => s.status === "inactive").length;
  const activeStudents = totalStudents - inactiveStudents;

  const revenueLineData = useMemo(() => {
    if (!analytics?.revenueByMonth) return [];
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const allMonths = Array.from(
      new Set([
        ...Object.keys(analytics.revenueByMonth || {}),
        ...Object.keys(analytics.pendingByMonth || {}),
      ])
    ).sort((a, b) => a.localeCompare(b));

    return allMonths.map((month) => {
        const [y, m] = month.split("-");
        const paidCents = analytics.revenueByMonth?.[month] || 0;
        const pendingCents = analytics.pendingByMonth?.[month] || 0;
        return {
          name: `${monthNames[parseInt(m) - 1]} ${y}`,
          Cobrado: Math.round(paidCents / 100),
          Pendiente: Math.round(pendingCents / 100),
          CobroPct: analytics.collectionRateByMonth?.[month] || 0,
        };
      });
  }, [analytics]);

  const enrollmentsByStatus = useMemo(() => {
    if (!analytics?.enrollmentsByStatus) return [];
    const labels: Record<string, string> = {
      pending: "Pendiente",
      confirmed: "Confirmada",
      declined: "Rechazada",
      cancelled: "Cancelada",
    };
    return Object.entries(analytics.enrollmentsByStatus).map(([key, value]) => ({
      name: labels[key] || key,
      value,
    }));
  }, [analytics]);

  const methodDistribution = useMemo(() => {
    if (!analytics?.methodDistribution) return [];
    return Object.entries(analytics.methodDistribution).map(([name, value]) => ({
      name,
      value,
    }));
  }, [analytics]);

  const studentsPerClass = useMemo(() => {
    if (!analytics?.studentsByClass) return [];
    return Object.entries(analytics.studentsByClass)
      .map(([name, alumnos]) => ({
        name: name.length > 18 ? name.slice(0, 18) + "…" : name,
        alumnos,
      }))
      .sort((a, b) => b.alumnos - a.alumnos)
      .slice(0, 8);
  }, [analytics]);

  const formatCurrency = (value: number) => `${value.toLocaleString("es-ES")} €`;
  const formatShortDate = (value: string | null) => {
    if (!value) return "Sin fecha";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "Sin fecha" : format(parsed, "d MMM", { locale: es });
  };

  if (loading) {
    return (
      <PageContainer title="Analíticas" description="Control financiero y comercial en tiempo real">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  const activeStudentsBase = analytics?.activeStudentsCount || activeStudents;
  const payingStudents = analytics?.payingStudentsCount || 0;
  const payingStudentsPct = analytics?.payingStudentsPct || 0;
  const potentialRevenue = analytics?.potentialRevenue || 0;
  const potentialCollectionPct = analytics?.potentialCollectionPct || 0;
  const totalRevenue = analytics?.totalRevenue || 0;
  const pendingRevenue = analytics?.pendingRevenue || 0;
  const overdueRevenue = analytics?.overdueRevenue || 0;
  const collectionRatePct = analytics?.collectionRatePct || 0;
  const totalEnrollments = Object.values(analytics?.enrollmentsByStatus || {}).reduce((a: number, b: number) => a + b, 0);
  const revenueGap = Math.max(0, potentialRevenue - totalRevenue);

  return (
    <PageContainer
      title="Analíticas"
      description="Control financiero y comercial en tiempo real"
    >
      <div className="rounded-lg border border-border bg-card p-4 shadow-soft">
        <p className="text-sm font-medium text-foreground">Resumen ejecutivo</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Prioriza tres señales para decidir rápido: cobro efectivo, riesgo de impago y capacidad de crecimiento.
        </p>
      </div>

      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">1. Pulso de caja</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ingresos totales"
          value={formatCurrency(totalRevenue)}
          change={`${totalEnrollments} inscripciones analizadas`}
          changeType="positive"
          icon={CreditCard}
        />
        <StatCard
          title="Pendiente de cobro"
          value={formatCurrency(pendingRevenue)}
          change={overdueRevenue > 0 ? `${formatCurrency(overdueRevenue)} en riesgo de impago` : "Sin importe vencido"}
          changeType={overdueRevenue > 0 ? "negative" : "neutral"}
          icon={AlertTriangle}
        />
        <StatCard
          title="Tasa de cobro"
          value={`${collectionRatePct}%`}
          change={`${formatCurrency(totalRevenue)} cobrados · ${formatCurrency(pendingRevenue)} pendientes`}
          changeType="positive"
          icon={TrendingUp}
        />
        <StatCard
          title="Pagos vencidos"
          value={analytics?.overduePaymentsCount || 0}
          change={
            (analytics?.overduePaymentsCount || 0) > 0
              ? `${analytics?.overdueStudentsCount || 0} alumno(s) afectados`
              : "Todo al día"
          }
          changeType={(analytics?.overduePaymentsCount || 0) > 0 ? "negative" : "positive"}
          icon={Activity}
        />
      </div>

      <div className="mt-4 rounded-lg border border-border bg-card p-5 shadow-soft">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Cobrado vs pendiente</p>
          <p className="text-xs text-muted-foreground">{collectionRatePct}% cobrado</p>
        </div>
        <Progress value={collectionRatePct} className="h-2" />
      </div>

      <div className="mt-6 mb-3">
        <h3 className="text-sm font-semibold text-foreground">2. Eficiencia operativa</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ingreso medio por alumno (mes)"
          value={formatCurrency(analytics?.avgRevenuePerActiveStudent || 0)}
          change="Depende de cuántos alumnos han pagado este mes"
          changeType="neutral"
          icon={Users}
          tooltip="Ingresos totales dividido entre alumnos activos"
        />
        <StatCard
          title="Precio medio por cuota"
          value={formatCurrency(analytics?.avgPaymentAmount || 0)}
          change="Media de los pagos realizados"
          changeType="positive"
          icon={Wallet}
          tooltip="Importe medio de cada cobro realizado"
        />
        <StatCard
          title="Alumnos que pagan"
          value={`${payingStudents} / ${activeStudentsBase}`}
          change={`${payingStudentsPct}% de alumnos activos`}
          changeType={payingStudentsPct >= 70 ? "positive" : payingStudentsPct >= 40 ? "neutral" : "negative"}
          icon={CircleDollarSign}
        />
        <StatCard
          title="Tasa de inscripción"
          value={`${metrics?.enrollmentRate || 0}%`}
          change={`${totalEnrollments} inscripciones totales`}
          changeType="positive"
          icon={TrendingUp}
        />
        <StatCard
          title="Ocupación vs ingresos"
          value={`${analytics?.occupancyPct || 0}% ocupación`}
          change={`${formatCurrency(analytics?.revenuePerConfirmedEnrollment || 0)} por plaza ocupada`}
          changeType={(analytics?.occupancyPct || 0) >= 70 ? "positive" : "neutral"}
          icon={Target}
        />
      </div>

      <div className="mt-6 mb-3">
        <h3 className="text-sm font-semibold text-foreground">3. Potencial capturable</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Ingreso potencial vs real"
          value={`${formatCurrency(totalRevenue)} / ${formatCurrency(potentialRevenue)}`}
          change={`${potentialCollectionPct}% del potencial mensual`}
          changeType={potentialCollectionPct >= 80 ? "positive" : potentialCollectionPct >= 50 ? "neutral" : "negative"}
          icon={Target}
        />
        <StatCard
          title="Gap de ingresos"
          value={formatCurrency(revenueGap)}
          change={revenueGap > 0 ? "Importe recuperable si sube el porcentaje de cobro" : "Sin gap relevante"}
          changeType={revenueGap > 0 ? "neutral" : "positive"}
          icon={AlertTriangle}
        />
        <StatCard
          title="Alumnos activos"
          value={activeStudentsBase}
          change={`${inactiveStudents} inactivos de ${totalStudents}`}
          changeType="neutral"
          icon={Users}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-2 mt-6">
        {/* Revenue line chart */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-semibold text-foreground mb-4">Tendencia de cobro mensual</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={revenueLineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 91%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(215, 14%, 46%)" />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="hsl(215, 14%, 46%)" tickFormatter={(v) => `${v}€`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="hsl(215, 14%, 46%)" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: number, key: string) => key === "CobroPct" ? `${v}%` : `${v.toLocaleString("es-ES")} €`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line yAxisId="left" type="monotone" dataKey="Cobrado" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 4 }} />
              <Line yAxisId="left" type="monotone" dataKey="Pendiente" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 4 }} />
              <Line yAxisId="right" type="monotone" dataKey="CobroPct" stroke="hsl(210, 92%, 55%)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Students per class */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-semibold text-foreground mb-4">Alumnos por Clase</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={studentsPerClass} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 91%)" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(215, 14%, 46%)" />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} stroke="hsl(215, 14%, 46%)" />
              <Tooltip />
              <Bar dataKey="alumnos" fill="hsl(263, 70%, 58%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-2 mt-4">
        {/* Enrollment status pie */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-semibold text-foreground mb-4">Inscripciones por Estado</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={enrollmentsByStatus}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {enrollmentsByStatus.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Payment method pie */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-semibold text-foreground mb-4">Distribución por Método de Pago</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={methodDistribution}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {methodDistribution.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mt-4">
        <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Alumnos que más pagan</h3>
          </div>
          <div className="space-y-3">
            {(analytics?.topPayingStudents || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no hay pagos suficientes para calcular el ranking.</p>
            ) : (
              analytics?.topPayingStudents.map((student, index) => (
                <div key={student.studentId} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{index + 1}. {student.studentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {student.paymentsCount} cobro(s) · ticket medio {formatCurrency(student.avgPayment)} · último pago {formatShortDate(student.lastPaymentAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(student.totalPaid)}</p>
                    <p className="text-xs text-muted-foreground">acumulado</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-semibold text-foreground">Mayor saldo pendiente</h3>
          </div>
          <div className="space-y-3">
            {(analytics?.highestPendingBalances || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay deuda pendiente acumulada en este momento.</p>
            ) : (
              analytics?.highestPendingBalances.map((student) => (
                <div key={student.studentId} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{student.studentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {student.itemsCount} recibo(s) pendiente(s) · último vencimiento {formatShortDate(student.latestDueAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-warning">{formatCurrency(student.pendingAmount)}</p>
                    <p className="text-xs text-muted-foreground">por recuperar</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
