import { useEffect, useMemo, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { StatCard } from "@/components/cards/StatCard";
import { Users, CreditCard, TrendingUp, AlertTriangle, Loader2, Wallet, Trophy } from "lucide-react";
import { getAnalyticsData, getDashboardMetrics, type AnalyticsData, type DashboardMetrics } from "@/lib/api/payments";
import { getStudents } from "@/lib/api/students";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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
    const combined: Record<string, { Cobrado: number; Pendiente: number }> = {};

    // Add revenue from revenueByMonth
    Object.entries(analytics.revenueByMonth).forEach(([month, total]) => {
      if (!combined[month]) combined[month] = { Cobrado: 0, Pendiente: 0 };
      combined[month].Cobrado = Math.round(total / 100);
    });

    return Object.entries(combined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => {
        const [y, m] = month.split("-");
        return {
          name: `${monthNames[parseInt(m) - 1]} ${y}`,
          Cobrado: data.Cobrado,
          Pendiente: Math.round(analytics.pendingRevenue / (Object.keys(analytics.revenueByMonth).length || 1) / 100),
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

  const formatCurrency = (value: number) => `${value.toLocaleString("es-ES")} EUR`;
  const formatShortDate = (value: string | null) => {
    if (!value) return "Sin fecha";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "Sin fecha" : format(parsed, "d MMM", { locale: es });
  };

  if (loading) {
    return (
      <PageContainer title="Analíticas" description="Indicadores de rendimiento de la escuela">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Analíticas"
      description="Indicadores de rendimiento de la escuela"
    >
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Alumnos Activos"
          value={activeStudents}
          change={`${inactiveStudents} inactivos de ${totalStudents}`}
          changeType="neutral"
          icon={Users}
        />
        <StatCard
          title="Recaudado"
          value={`$${(analytics?.totalRevenue || 0).toLocaleString()}`}
          change={`$${(analytics?.pendingRevenue || 0).toLocaleString()} pendiente`}
          changeType="positive"
          icon={CreditCard}
        />
        <StatCard
          title="Tasa de Inscripción"
          value={`${metrics?.enrollmentRate || 0}%`}
          change={`${Object.values(analytics?.enrollmentsByStatus || {}).reduce((a: number, b: number) => a + b, 0)} inscripciones totales`}
          changeType="positive"
          icon={TrendingUp}
        />
        <StatCard
          title="Pagos Vencidos"
          value={metrics?.overduePayments || 0}
          change={
            (metrics?.overduePayments || 0) > 0
              ? "Requiere atención"
              : "Todo al día"
          }
          changeType={(metrics?.overduePayments || 0) > 0 ? "negative" : "positive"}
          icon={AlertTriangle}
        />
        <StatCard
          title="Ticket medio / alumno"
          value={formatCurrency(analytics?.avgRevenuePerActiveStudent || 0)}
          change={formatCurrency(analytics?.avgRevenuePerPayingStudent || 0) + " entre alumnos que pagan"}
          changeType="positive"
          icon={Users}
        />
        <StatCard
          title="Importe medio / cobro"
          value={formatCurrency(analytics?.avgPaymentAmount || 0)}
          change={`Tasa de cobro ${analytics?.collectionRatePct || 0}%`}
          changeType={(analytics?.collectionRatePct || 0) >= 80 ? "positive" : "neutral"}
          icon={Wallet}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-2 mt-6">
        {/* Revenue line chart */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-semibold text-foreground mb-4">Ingresos por Mes</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={revenueLineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 91%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(215, 14%, 46%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(215, 14%, 46%)" tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Cobrado" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Pendiente" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 4 }} />
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
