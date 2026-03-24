import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createStudentEnrollmentCheckout,
  downloadStudentActivityExport,
  downloadStudentCalendarIcs,
  downloadStudentReceipt,
  listStudentPortalPayments,
  type StudentPortalPayment,
} from "@/lib/api/studentPortal";

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(date);
}

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function PortalFinanceScreen() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<StudentPortalPayment[]>([]);
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const result = await listStudentPortalPayments(50, 0);
        if (cancelled) return;
        setPayments(result.items);
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "No se pudo cargar finanzas");
          setPayments([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(() => {
    return payments.reduce(
      (acc, payment) => {
        if (payment.status === "paid") {
          acc.paid += payment.amount;
        } else if (payment.status === "pending" || payment.status === "overdue") {
          acc.pending += payment.amount;
        }
        return acc;
      },
      { paid: 0, pending: 0 }
    );
  }, [payments]);

  const handleCheckout = async (payment: StudentPortalPayment) => {
    if (!payment.enrollmentId) {
      toast.error("Este pago no tiene matrícula vinculada para checkout");
      return;
    }

    setProcessingPaymentId(payment.id);
    try {
      const result = await createStudentEnrollmentCheckout({
        enrollmentId: payment.enrollmentId,
      });

      if (result.url) {
        window.location.href = result.url;
      } else {
        toast.error("No se pudo obtener URL de checkout");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo iniciar checkout");
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const handleDownloadReceipt = async (payment: StudentPortalPayment) => {
    setProcessingPaymentId(payment.id);
    try {
      const blob = await downloadStudentReceipt(payment.id);
      saveBlob(blob, `recibo-${payment.id}.txt`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo descargar el recibo");
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const handleDownloadCalendar = async () => {
    try {
      const blob = await downloadStudentCalendarIcs();
      saveBlob(blob, "mi-calendario.ics");
      toast.success("Calendario exportado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo exportar calendario");
    }
  };

  const handleDownloadActivity = async (format: "json" | "csv") => {
    try {
      const blob = await downloadStudentActivityExport(format);
      saveBlob(blob, `mi-actividad.${format}`);
      toast.success("Historial de actividad exportado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo exportar actividad");
    }
  };

  return (
    <div className="space-y-4 px-4 pb-24 pt-6">
      <h1 className="text-xl font-bold text-foreground">Finanzas y exportaciones</h1>

      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pagado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-foreground">{totals.paid} EUR</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pendiente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-foreground">{totals.pending} EUR</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de pagos</CardTitle>
          <CardDescription>Consulta estado, paga matrículas y descarga recibos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p className="text-sm text-muted-foreground">Cargando pagos...</p> : null}

          {!loading && payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay pagos registrados.</p>
          ) : null}

          {!loading
            ? payments.map((payment) => (
                <div key={payment.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{payment.concept}</p>
                      <p className="text-xs text-muted-foreground">{payment.className}</p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {payment.amount} {payment.currency}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>Estado: {payment.status}</span>
                    <span>Pago: {formatDate(payment.paidAt)}</span>
                    <span>Vence: {formatDate(payment.dueAt)}</span>
                    <span>Recibo: {payment.receiptNumber || "No generado"}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {payment.checkoutAvailable ? (
                      <Button
                        size="sm"
                        onClick={() => void handleCheckout(payment)}
                        disabled={processingPaymentId === payment.id}
                      >
                        Pagar ahora
                      </Button>
                    ) : null}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleDownloadReceipt(payment)}
                      disabled={processingPaymentId === payment.id}
                    >
                      Descargar recibo
                    </Button>
                  </div>
                </div>
              ))
            : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exportaciones</CardTitle>
          <CardDescription>Integra tu calendario y descarga tu historial de actividad.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void handleDownloadCalendar()}>
            Exportar iCal
          </Button>
          <Button variant="outline" onClick={() => void handleDownloadActivity("json")}>
            Actividad JSON
          </Button>
          <Button variant="outline" onClick={() => void handleDownloadActivity("csv")}>
            Actividad CSV
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
