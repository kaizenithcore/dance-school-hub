/**
 * HomeScreen V1 — operational student dashboard.
 *
 * Replaced the social feed with three operational blocks:
 *   1. Next class (soonest upcoming schedule entry)
 *   2. Payment status (current month + next due)
 *   3. Recent announcements (last 3)
 *
 * No gamification, no feed, no streaks.
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarDays, CreditCard, Bell, ArrowRight,
  CheckCircle2, AlertCircle, Loader2, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getStudentPortalSchedule,
  listStudentPortalPayments,
} from "@/lib/api/studentPortal";
import { listPortalNotifications } from "@/lib/api/portalFoundation";
import { usePortalBranding } from "@/portal/services/portalBranding";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ScheduleEntry {
  className: string;
  room: string;
  teacher: string;
  startTime: string;
  endTime: string;
  weekday: number;
  day: string;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const WEEKDAY_NAMES: Record<number, string> = {
  0: "Domingo", 1: "Lunes", 2: "Martes", 3: "Miércoles",
  4: "Jueves", 5: "Viernes", 6: "Sábado",
};

function findNextClass(schedule: ScheduleEntry[]): ScheduleEntry | null {
  if (!schedule.length) return null;
  const today = new Date().getDay();
  const nowHHMM = format(new Date(), "HH:mm");

  const sorted = [...schedule].sort((a, b) => {
    const da = (a.weekday - today + 7) % 7;
    const db = (b.weekday - today + 7) % 7;
    return da !== db ? da - db : a.startTime.localeCompare(b.startTime);
  });

  for (const entry of sorted) {
    const daysUntil = (entry.weekday - today + 7) % 7;
    if (daysUntil > 0) return entry;
    if (daysUntil === 0 && entry.startTime > nowHHMM) return entry;
  }

  return sorted[0] ?? null;
}

function nextClassWhen(entry: ScheduleEntry): string {
  const today = new Date().getDay();
  const daysUntil = (entry.weekday - today + 7) % 7;
  if (daysUntil === 0) return "Hoy";
  if (daysUntil === 1) return "Mañana";
  return WEEKDAY_NAMES[entry.weekday] ?? entry.day;
}

function greetingFor(name: string): string {
  const h = new Date().getHours();
  const saludo = h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
  const first = name.trim().split(" ")[0];
  return first ? `${saludo}, ${first}` : saludo;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const navigate = useNavigate();
  const { branding } = usePortalBranding();

  const [studentName, setStudentName] = useState("");
  const [classNames, setClassNames] = useState<string[]>([]);
  const [nextClass, setNextClass] = useState<ScheduleEntry | null>(null);
  const [payments, setPayments] = useState<Awaited<ReturnType<typeof listStudentPortalPayments>>["items"]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [schedule, pays, notifs] = await Promise.allSettled([
          getStudentPortalSchedule(),
          listStudentPortalPayments(5, 0),
          listPortalNotifications({ limit: 3 }),
        ]);

        if (schedule.status === "fulfilled") {
          const { student, weeklySchedule: ws } = schedule.value;
          setStudentName(student?.name ?? "");
          setClassNames([...new Set(ws.map((s) => s.className))]);
          setNextClass(findNextClass(ws));
        }

        if (pays.status === "fulfilled") {
          setPayments(pays.value.items);
        }

        if (notifs.status === "fulfilled") {
          const items = notifs.value as NotificationItem[];
          setNotifications(items.slice(0, 3));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const currentMonthPayment = useMemo(() => {
    const monthStr = format(new Date(), "yyyy-MM");
    return payments.find(
      (p) => (p.createdAt ?? "").startsWith(monthStr) || (p.dueAt ?? "").startsWith(monthStr)
    ) ?? null;
  }, [payments]);

  const nextDuePayment = useMemo(
    () => payments.find((p) => p.status === "pending" || p.status === "overdue") ?? null,
    [payments]
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 pt-6 pb-2">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-foreground">{greetingFor(studentName)} 👋</h1>
        {classNames.length > 0 && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {classNames.slice(0, 3).join(" · ")}
            {classNames.length > 3 ? ` · +${classNames.length - 3}` : ""}
          </p>
        )}
      </div>

      {/* ── Próxima clase ─────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Próxima clase</p>
        </div>

        {nextClass ? (
          <>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">
                {nextClassWhen(nextClass)} · {nextClass.startTime.slice(0, 5)}
                {nextClass.endTime ? `–${nextClass.endTime.slice(0, 5)}` : ""}
              </p>
              <p className="text-lg font-bold text-foreground mt-0.5">{nextClass.className}</p>
              {(nextClass.room || nextClass.teacher) && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {[nextClass.room, nextClass.teacher].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/portal/app/clases")}>
              Ver horario completo <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-3 text-center">
            <Clock className="h-6 w-6 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Sin clases programadas</p>
          </div>
        )}
      </section>

      {/* ── Estado de pagos ───────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado de pagos</p>
        </div>

        {payments.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Sin registros de pago</p>
        ) : (
          <div className="space-y-2">
            {currentMonthPayment && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {currentMonthPayment.status === "paid" ? (
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-warning shrink-0" />
                  )}
                  <span className="text-sm text-foreground capitalize">
                    {format(new Date(), "MMMM yyyy", { locale: es })}
                  </span>
                </div>
                <span className={cn(
                  "text-xs font-semibold",
                  currentMonthPayment.status === "paid" ? "text-success" : "text-warning"
                )}>
                  {currentMonthPayment.status === "paid" ? "Pagado" : "Pendiente"}
                </span>
              </div>
            )}

            {nextDuePayment && (
              <div className="rounded-lg border border-warning/20 bg-warning/5 px-3 py-2">
                <p className="text-xs text-muted-foreground">Próximo pago</p>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-sm font-medium text-foreground truncate flex-1 mr-2">
                    {nextDuePayment.concept}
                  </p>
                  <p className="text-sm font-bold text-foreground shrink-0">
                    {nextDuePayment.amount.toLocaleString("es-ES")} {nextDuePayment.currency}
                  </p>
                </div>
                {nextDuePayment.dueAt && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Vence: {format(new Date(nextDuePayment.dueAt), "d 'de' MMMM", { locale: es })}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/portal/app/cobros")}>
          Ver historial de cobros <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </section>

      {/* ── Avisos de la escuela ──────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Avisos de la escuela</p>
          </div>
          {unreadCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </div>

        {notifications.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Sin avisos recientes</p>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-2.5 rounded-lg px-2 py-2",
                  !n.isRead && "bg-primary/5"
                )}
              >
                {!n.isRead && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                <div className={cn("flex-1 min-w-0", n.isRead && "pl-4")}>
                  <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/portal/app/avisos")}>
          Ver todos los avisos <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </section>
    </div>
  );
}
