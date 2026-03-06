import { useMemo } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { StatCard } from "@/components/cards/StatCard";
import { Users, GraduationCap, CreditCard, TrendingUp, AlertTriangle, UserCheck } from "lucide-react";
import { MOCK_STUDENTS } from "@/lib/data/mockStudents";
import { MOCK_PAYMENTS } from "@/lib/data/mockPayments";
import { MOCK_ENROLLMENTS } from "@/lib/data/mockEnrollments";
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
  const activeStudents = MOCK_STUDENTS.filter((s) => s.status === "active").length;
  const inactiveStudents = MOCK_STUDENTS.filter((s) => s.status === "inactive").length;
  const totalStudents = MOCK_STUDENTS.length;

  const totalRevenue = useMemo(() =>
    MOCK_PAYMENTS.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0),
    []
  );
  const pendingRevenue = useMemo(() =>
    MOCK_PAYMENTS.filter((p) => p.status === "pending" || p.status === "overdue").reduce((s, p) => s + p.amount, 0),
    []
  );
  const overdueCount = MOCK_PAYMENTS.filter((p) => p.status === "overdue").length;

  const enrollmentRate = useMemo(() => {
    const confirmed = MOCK_ENROLLMENTS.filter((e) => e.status === "confirmed").length;
    return Math.round((confirmed / MOCK_ENROLLMENTS.length) * 100);
  }, []);

  // Revenue by month
  const revenueByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    MOCK_PAYMENTS.filter((p) => p.status === "paid").forEach((p) => {
      map[p.month] = (map[p.month] || 0) + p.amount;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => {
        const [y, m] = month.split("-");
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        return { name: `${monthNames[parseInt(m) - 1]} ${y}`, total };
      });
  }, []);

  // Payment method distribution
  const methodDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    MOCK_PAYMENTS.forEach((p) => {
      map[p.method] = (map[p.method] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, []);

  // Enrollments by status
  const enrollmentsByStatus = useMemo(() => {
    const labels: Record<string, string> = {
      pending: "Pendiente", confirmed: "Confirmada", declined: "Rechazada", cancelled: "Cancelada",
    };
    const map: Record<string, number> = {};
    MOCK_ENROLLMENTS.forEach((e) => {
      map[e.status] = (map[e.status] || 0) + 1;
    });
    return Object.entries(map).map(([key, value]) => ({ name: labels[key] || key, value }));
  }, []);

  // Students per class (top classes)
  const studentsPerClass = useMemo(() => {
    const map: Record<string, number> = {};
    MOCK_STUDENTS.forEach((s) => {
      s.enrolledClasses.forEach((c) => {
        map[c.name] = (map[c.name] || 0) + 1;
      });
    });
    return Object.entries(map)
      .map(([name, alumnos]) => ({ name: name.length > 18 ? name.slice(0, 18) + "…" : name, alumnos }))
      .sort((a, b) => b.alumnos - a.alumnos)
      .slice(0, 8);
  }, []);

  // Monthly revenue for line chart (with pending)
  const revenueLineData = useMemo(() => {
    const map: Record<string, { paid: number; pending: number }> = {};
    MOCK_PAYMENTS.forEach((p) => {
      if (!map[p.month]) map[p.month] = { paid: 0, pending: 0 };
      if (p.status === "paid") map[p.month].paid += p.amount;
      else if (p.status === "pending" || p.status === "overdue") map[p.month].pending += p.amount;
    });
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => {
        const [y, m] = month.split("-");
        return { name: `${monthNames[parseInt(m) - 1]} ${y}`, Cobrado: data.paid, Pendiente: data.pending };
      });
  }, []);

  return (
    <PageContainer
      title="Analíticas"
      description="Indicadores de rendimiento de la escuela"
    >
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Alumnos Activos" value={activeStudents} change={`${inactiveStudents} inactivos de ${totalStudents}`} changeType="neutral" icon={Users} />
        <StatCard title="Recaudado" value={`$${totalRevenue.toLocaleString()}`} change={`$${pendingRevenue.toLocaleString()} pendiente`} changeType="positive" icon={CreditCard} />
        <StatCard title="Tasa de Inscripción" value={`${enrollmentRate}%`} change={`${MOCK_ENROLLMENTS.filter(e => e.status === "confirmed").length} confirmadas de ${MOCK_ENROLLMENTS.length}`} changeType="positive" icon={TrendingUp} />
        <StatCard title="Pagos Vencidos" value={overdueCount} change={overdueCount > 0 ? "Requiere atención" : "Todo al día"} changeType={overdueCount > 0 ? "negative" : "positive"} icon={AlertTriangle} />
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
              <Pie data={enrollmentsByStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
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
              <Pie data={methodDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {methodDistribution.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </PageContainer>
  );
}
