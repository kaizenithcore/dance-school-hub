import { useMemo } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { StatCard } from "@/components/cards/StatCard";
import {
  Users, GraduationCap, CreditCard, TrendingUp, AlertTriangle,
  ClipboardList, Clock, ArrowRight, CheckCircle, XCircle, UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MOCK_STUDENTS } from "@/lib/data/mockStudents";
import { MOCK_PAYMENTS } from "@/lib/data/mockPayments";
import { MOCK_ENROLLMENTS } from "@/lib/data/mockEnrollments";
import { MOCK_CLASS_RECORDS } from "@/lib/data/mockClassRecords";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export default function DashboardPage() {
  const navigate = useNavigate();

  const activeStudents = MOCK_STUDENTS.filter((s) => s.status === "active").length;
  const activeClasses = MOCK_CLASS_RECORDS.filter((c) => c.status === "active").length;

  const monthRevenue = useMemo(() =>
    MOCK_PAYMENTS.filter((p) => p.status === "paid" && p.month === "2026-03").reduce((s, p) => s + p.amount, 0),
    []
  );

  const pendingEnrollments = MOCK_ENROLLMENTS.filter((e) => e.status === "pending").length;
  const overduePayments = MOCK_PAYMENTS.filter((p) => p.status === "overdue").length;

  const enrollmentRate = useMemo(() => {
    const confirmed = MOCK_ENROLLMENTS.filter((e) => e.status === "confirmed").length;
    return Math.round((confirmed / MOCK_ENROLLMENTS.length) * 100);
  }, []);

  // Recent enrollments (last 5)
  const recentEnrollments = useMemo(() =>
    [...MOCK_ENROLLMENTS].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    []
  );

  // Overdue payments
  const overdueList = useMemo(() =>
    MOCK_PAYMENTS.filter((p) => p.status === "overdue"),
    []
  );

  // Revenue by month for sparkline
  const revenueByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    MOCK_PAYMENTS.filter((p) => p.status === "paid").forEach((p) => {
      map[p.month] = (map[p.month] || 0) + p.amount;
    });
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => {
        const [, m] = month.split("-");
        return { name: monthNames[parseInt(m) - 1], total };
      });
  }, []);

  // Top classes by enrollment
  const topClasses = useMemo(() => {
    const map: Record<string, { name: string; count: number; capacity: number }> = {};
    MOCK_CLASS_RECORDS.filter((c) => c.status === "active").forEach((c) => {
      const enrolled = MOCK_STUDENTS.filter((s) =>
        s.status === "active" && s.enrolledClasses.some((ec) => ec.name === c.name)
      ).length;
      map[c.id] = { name: c.name, count: enrolled, capacity: c.capacity };
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
  }, []);

  const STATUS_STYLES: Record<string, string> = {
    pending: "bg-warning/15 text-warning border-warning/20",
    confirmed: "bg-success/15 text-success border-success/20",
    declined: "bg-destructive/15 text-destructive border-destructive/20",
    cancelled: "bg-muted text-muted-foreground border-border",
  };
  const STATUS_LABELS: Record<string, string> = {
    pending: "Pendiente", confirmed: "Confirmada", declined: "Rechazada", cancelled: "Cancelada",
  };

  return (
    <PageContainer
      title="Panel"
      description="Resumen general de tu escuela de danza"
    >
      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Alumnos Activos" value={activeStudents} change={`${MOCK_STUDENTS.length} totales`} changeType="neutral" icon={Users} />
        <StatCard title="Clases Activas" value={activeClasses} change={`${MOCK_CLASS_RECORDS.length} totales`} changeType="neutral" icon={GraduationCap} />
        <StatCard title="Ingresos (Mar)" value={`$${monthRevenue.toLocaleString()}`} change={overduePayments > 0 ? `${overduePayments} pago(s) vencido(s)` : "Todo al día"} changeType={overduePayments > 0 ? "negative" : "positive"} icon={CreditCard} />
        <StatCard title="Tasa Inscripción" value={`${enrollmentRate}%`} change={`${pendingEnrollments} pendiente(s)`} changeType="positive" icon={TrendingUp} />
      </div>

      {/* Alerts */}
      {(overduePayments > 0 || pendingEnrollments > 0) && (
        <div className="flex flex-wrap gap-3 mt-4">
          {overduePayments > 0 && (
            <button
              onClick={() => navigate("/admin/payments")}
              className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">{overduePayments} pago(s) vencido(s)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          {pendingEnrollments > 0 && (
            <button
              onClick={() => navigate("/admin/enrollments")}
              className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/5 px-4 py-2.5 text-sm text-warning hover:bg-warning/10 transition-colors"
            >
              <ClipboardList className="h-4 w-4" />
              <span className="font-medium">{pendingEnrollments} inscripción(es) pendiente(s)</span>
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
            {topClasses.map((cls) => {
              const pct = Math.round((cls.count / cls.capacity) * 100);
              return (
                <div key={cls.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground truncate max-w-[160px]">{cls.name}</span>
                    <span className="text-[10px] text-muted-foreground">{cls.count}/{cls.capacity}</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </div>
        </div>
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
          <div className="space-y-2.5">
            {recentEnrollments.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent">
                    <UserPlus className="h-3 w-3 text-accent-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{e.studentName}</p>
                    <p className="text-[10px] text-muted-foreground">{e.classes.length} clase(s) · {format(new Date(e.date), "d MMM", { locale: es })}</p>
                  </div>
                </div>
                <Badge variant="outline" className={cn("text-[10px] font-medium shrink-0", STATUS_STYLES[e.status])}>
                  {STATUS_LABELS[e.status]}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Overdue payments / quick info */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Pagos que Requieren Atención</h3>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/admin/payments")}>
              Ver todos <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          {overdueList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-8 w-8 text-success mb-2" />
              <p className="text-sm font-medium text-foreground">Todo al día</p>
              <p className="text-xs text-muted-foreground">No hay pagos vencidos</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {overdueList.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.studentName}</p>
                    <p className="text-[10px] text-muted-foreground">{p.concept.slice(0, 40)}…</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-destructive">${p.amount}</p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(p.date), "d MMM", { locale: es })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
