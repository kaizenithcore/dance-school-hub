import { useState, useCallback, useEffect, useMemo } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PaymentsTable } from "@/components/tables/PaymentsTable";
import { PaymentDetailDrawer } from "@/components/tables/PaymentDetailDrawer";
import { RecordPaymentModal } from "@/components/tables/RecordPaymentModal";
import {
  getPayments,
  recordPayment,
  updatePaymentStatus,
  getInvoices,
  generateMonthlyInvoices,
  getInvoiceDetail,
  markInvoiceAsPaid,
  deleteInvoice,
  createCashReceiptBatch,
  downloadReceiptBatchPdf,
  downloadPaymentReceiptPdf,
  type PaymentRecord,
  type InvoiceRecord,
  type InvoiceDetail,
} from "@/lib/api/payments";
import { getEnrollments } from "@/lib/api/enrollments";
import { redirectToStripeCheckout } from "@/lib/api/stripe";
import { toast } from "sonner";
import { Loader2, Copy, DollarSign, FileText, AlertTriangle, Eye, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { useSearchParams } from "react-router-dom";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatPaymentMethodLabel(value?: string) {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) return "-";

  if (normalized === "cash" || normalized === "efectivo" || normalized === "manual") {
    return "Efectivo";
  }
  if (normalized === "transfer" || normalized === "transferencia" || normalized === "bank_transfer") {
    return "Transferencia bancaria";
  }
  if (normalized === "card" || normalized === "tarjeta") {
    return "Tarjeta";
  }
  if (normalized === "mercadopago") {
    return "Mercado Pago";
  }

  return value || "-";
}

export default function PaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Payments state
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  // Invoices state
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [invoiceDetailOpen, setInvoiceDetailOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [receiptMonth, setReceiptMonth] = useState<string>(getCurrentMonth());

  // Invoice filters
  const [invoiceMonthFilter, setInvoiceMonthFilter] = useState<string>("all");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("all");
  const [invoiceSearchFilter, setInvoiceSearchFilter] = useState<string>("");
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

  // Loading state
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingInvoices, setGeneratingInvoices] = useState(false);
  const [markingInvoiceId, setMarkingInvoiceId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<"mark-paid" | "delete" | null>(null);
  const [generatingReceipts, setGeneratingReceipts] = useState(false);
  const [generatingReceiptPaymentId, setGeneratingReceiptPaymentId] = useState<string | null>(null);
  const [acceptedEnrollments, setAcceptedEnrollments] = useState<Array<{ studentId?: string; studentName: string }>>([]);

  const loadData = useCallback(async (options?: { background?: boolean }) => {
    const background = options?.background ?? false;

    try {
      if (background) {
        setRefreshing(true);
      } else {
        setInitialLoading(true);
      }

      const [paymentsData, invoicesData, enrollmentsData] = await Promise.all([
        getPayments(),
        getInvoices(),
        getEnrollments(),
      ]);
      setPayments(paymentsData || []);
      setInvoices(invoicesData || []);
      setAcceptedEnrollments(
        (enrollmentsData || [])
          .filter((enrollment) => enrollment.status === "confirmed")
          .map((enrollment) => ({ studentId: enrollment.studentId, studentName: enrollment.studentName }))
      );
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      if (background) {
        setRefreshing(false);
      } else {
        setInitialLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (initialLoading) {
      return;
    }

    const targetId = searchParams.get("id");
    const action = searchParams.get("action");

    if (!targetId || action !== "preview") {
      return;
    }

    const targetPayment = payments.find((payment) => payment.id === targetId);
    if (!targetPayment) {
      return;
    }

    handleViewDetail(targetPayment);
    setSearchParams({}, { replace: true });
  }, [initialLoading, payments, searchParams, setSearchParams]);

  // Payments handlers
  const handleViewDetail = (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setDrawerOpen(true);
  };

  const handleMarkPaid = useCallback(async (id: string) => {
    try {
      await updatePaymentStatus(id, "paid");
      setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, status: "paid" } : p)));
      setSelectedPayment((prev) => prev && prev.id === id ? { ...prev, status: "paid" } : prev);
      toast.success("Pago marcado como pagado");
    } catch (error) {
      toast.error("Error al actualizar el pago");
    }
  }, []);

  const handleMarkRefunded = useCallback(async (id: string) => {
    try {
      await updatePaymentStatus(id, "refunded");
      setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, status: "refunded" } : p)));
      setSelectedPayment((prev) => prev && prev.id === id ? { ...prev, status: "refunded" } : prev);
      toast.success("Pago marcado como reembolsado");
    } catch (error) {
      toast.error("Error al actualizar el pago");
    }
  }, []);

  const handleGenerateReceipt = useCallback(async (payment: PaymentRecord) => {
    if (generatingReceiptPaymentId) {
      return;
    }

    try {
      setGeneratingReceiptPaymentId(payment.id);
      const blob = await downloadPaymentReceiptPdf(payment.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `recibo-${payment.studentName.replace(/\s+/g, "-").toLowerCase()}-${payment.month}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      await loadData({ background: true });
      toast.success(`Recibo generado para ${payment.studentName}`);
    } catch (error) {
      console.error("Failed to generate payment receipt:", error);
      toast.error("No se pudo generar el recibo para este pago");
    } finally {
      setGeneratingReceiptPaymentId(null);
    }
  }, [generatingReceiptPaymentId]);

  const handleGenerateCashReceiptsBatch = useCallback(async () => {
    try {
      setGeneratingReceipts(true);
      const batch = await createCashReceiptBatch(receiptMonth);

      if (!batch) {
        toast.error("No se pudo crear el lote de recibos");
        return;
      }

      if (batch.generatedCount === 0) {
        toast.info("No hay pagos en efectivo pendientes de recibo para el período seleccionado");
        return;
      }

      const pdfBlob = await downloadReceiptBatchPdf(batch.batchId);
      const url = URL.createObjectURL(pdfBlob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `recibos-efectivo-${batch.month}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      toast.success(`Lote generado: ${batch.generatedCount} recibo(s) en PDF`);
    } catch (error) {
      console.error("Failed to generate receipts batch:", error);
      toast.error("Error al generar o descargar el lote de recibos");
    } finally {
      setGeneratingReceipts(false);
    }
  }, [receiptMonth]);

  const handleRecordPayment = useCallback(async (data: { studentId: string; amount: number; metadata: Record<string, unknown> }) => {
    try {
      const newPayment = await recordPayment({
        studentId: data.studentId,
        amount: data.amount,
        status: "paid",
        metadata: data.metadata,
      });
      if (newPayment) {
        setPayments((prev) => [newPayment, ...prev]);
        setPaymentModalOpen(false);
        toast.success("Pago registrado correctamente");
      }
    } catch (error) {
      toast.error("Error al registrar el pago");
    }
  }, []);

  const handleStripeCheckout = useCallback(async (data: { studentId: string; amount: number; metadata: Record<string, unknown> }) => {
    try {
      await redirectToStripeCheckout({
        amount: data.amount,
        currency: "eur",
        description: String(data.metadata.concept || "Pago Nexa"),
        metadata: {
          studentId: data.studentId,
          studentName: String(data.metadata.student_name || ""),
          studentEmail: String(data.metadata.student_email || ""),
          period: String(data.metadata.month || ""),
        },
        successUrl: `${window.location.origin}/admin/payments?stripe=success`,
        cancelUrl: `${window.location.origin}/admin/payments?stripe=cancel`,
      });
    } catch (error) {
      console.error("Failed to start Stripe checkout:", error);
      toast.error(error instanceof Error ? error.message : "No se pudo iniciar el cobro con Stripe");
    }
  }, []);

  // Invoices handlers
  const handleGenerateMonthlyInvoices = async () => {
    try {
      setGeneratingInvoices(true);
      const result = await generateMonthlyInvoices(selectedMonth);

      if (result) {
        await loadData({ background: true }); // Reload invoices
        setGenerateDialogOpen(false);
        toast.success(`${result.created} factura(s) generada(s) para ${selectedMonth}`);
      }
    } catch (error) {
      console.error("Failed to generate invoices:", error);
      toast.error("Error al generar las facturas");
    } finally {
      setGeneratingInvoices(false);
    }
  };

  const handleViewInvoiceDetail = async (invoice: InvoiceRecord) => {
    try {
      const detail = await getInvoiceDetail(invoice.id);
      if (detail) {
        setSelectedInvoice(detail);
        setInvoiceDetailOpen(true);
      }
    } catch (error) {
      toast.error("Error al cargar los detalles de la factura");
    }
  };

  const handleMarkInvoiceAsPaid = useCallback(async (invoice: InvoiceRecord) => {
    if (markingInvoiceId) {
      return;
    }

    try {
      setMarkingInvoiceId(invoice.id);
      const updated = await markInvoiceAsPaid(invoice.id, {
        paymentMethod: "cash",
      });

      if (!updated) {
        toast.error("No se pudo marcar la factura como pagada");
        return;
      }

      await loadData({ background: true });
      toast.success(`Factura ${invoice.invoiceNumber} marcada como pagada`);
    } catch (error) {
      console.error("Failed to mark invoice as paid:", error);
      toast.error("Error al marcar la factura como pagada");
    } finally {
      setMarkingInvoiceId(null);
    }
  }, [markingInvoiceId]);

  const handleDeleteInvoice = useCallback(async (invoice: InvoiceRecord) => {
    const confirmed = window.confirm(`Eliminar la factura ${invoice.invoiceNumber} de ${invoice.studentName}?`);
    if (!confirmed) {
      return;
    }

    try {
      const ok = await deleteInvoice(invoice.id);
      if (!ok) {
        toast.error("No se pudo eliminar la factura");
        return;
      }

      await loadData({ background: true });
      setSelectedInvoiceIds((prev) => prev.filter((id) => id !== invoice.id));
      toast.success(`Factura ${invoice.invoiceNumber} eliminada`);
    } catch (error) {
      console.error("Failed to delete invoice:", error);
      toast.error("Error al eliminar la factura");
    }
  }, []);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesMonth = invoiceMonthFilter === "all" || invoice.month === invoiceMonthFilter;
      const matchesStatus = invoiceStatusFilter === "all" || invoice.status === invoiceStatusFilter;
      const matchesSearch =
        invoiceSearchFilter === "" ||
        invoice.studentName.toLowerCase().includes(invoiceSearchFilter.toLowerCase()) ||
        invoice.invoiceNumber.toLowerCase().includes(invoiceSearchFilter.toLowerCase());
      return matchesMonth && matchesStatus && matchesSearch;
    });
  }, [invoices, invoiceMonthFilter, invoiceStatusFilter, invoiceSearchFilter]);

  const selectableInvoices = useMemo(
    () => filteredInvoices.filter((invoice) => invoice.status !== "paid"),
    [filteredInvoices]
  );

  const allSelectableChecked =
    selectableInvoices.length > 0 && selectableInvoices.every((invoice) => selectedInvoiceIds.includes(invoice.id));

  const someSelectableChecked =
    selectableInvoices.some((invoice) => selectedInvoiceIds.includes(invoice.id)) && !allSelectableChecked;

  const selectedInvoices = useMemo(
    () => filteredInvoices.filter((invoice) => selectedInvoiceIds.includes(invoice.id)),
    [filteredInvoices, selectedInvoiceIds]
  );

  const selectedUnpaidInvoices = useMemo(
    () => selectedInvoices.filter((invoice) => invoice.status !== "paid"),
    [selectedInvoices]
  );

  useEffect(() => {
    const visibleIds = new Set(filteredInvoices.map((invoice) => invoice.id));
    setSelectedInvoiceIds((prev) => prev.filter((id) => visibleIds.has(id)));
  }, [filteredInvoices]);

  const toggleInvoiceSelection = useCallback((invoiceId: string, checked: boolean) => {
    setSelectedInvoiceIds((prev) => {
      if (checked) {
        if (prev.includes(invoiceId)) return prev;
        return [...prev, invoiceId];
      }

      return prev.filter((id) => id !== invoiceId);
    });
  }, []);

  const toggleAllSelectableInvoices = useCallback((checked: boolean) => {
    if (!checked) {
      setSelectedInvoiceIds([]);
      return;
    }

    setSelectedInvoiceIds(selectableInvoices.map((invoice) => invoice.id));
  }, [selectableInvoices]);

  const handleBulkMarkInvoicesAsPaid = useCallback(async () => {
    if (selectedUnpaidInvoices.length === 0 || bulkAction) {
      return;
    }

    setBulkAction("mark-paid");
    try {
      const results = await Promise.allSettled(
        selectedUnpaidInvoices.map((invoice) =>
          markInvoiceAsPaid(invoice.id, { paymentMethod: "cash" })
        )
      );

      const successCount = results.filter((result) => result.status === "fulfilled" && result.value).length;
      const failedCount = results.length - successCount;

      await loadData({ background: true });
      setSelectedInvoiceIds([]);

      if (successCount > 0) {
        toast.success(`${successCount} factura(s) marcada(s) como pagada(s)`);
      }
      if (failedCount > 0) {
        toast.error(`${failedCount} factura(s) no se pudieron marcar como pagadas`);
      }
    } catch (error) {
      console.error("Failed to mark invoices as paid in bulk:", error);
      toast.error("Error al marcar facturas como pagadas");
    } finally {
      setBulkAction(null);
    }
  }, [selectedUnpaidInvoices, bulkAction]);

  const handleBulkDeleteInvoices = useCallback(async () => {
    if (selectedUnpaidInvoices.length === 0 || bulkAction) {
      return;
    }

    const confirmed = window.confirm(
      `Eliminar ${selectedUnpaidInvoices.length} factura(s) seleccionada(s)? Esta acción no se puede deshacer.`
    );
    if (!confirmed) {
      return;
    }

    setBulkAction("delete");
    try {
      const results = await Promise.allSettled(
        selectedUnpaidInvoices.map((invoice) => deleteInvoice(invoice.id))
      );

      const successCount = results.filter((result) => result.status === "fulfilled" && result.value === true).length;
      const failedCount = results.length - successCount;

      await loadData({ background: true });
      setSelectedInvoiceIds([]);

      if (successCount > 0) {
        toast.success(`${successCount} factura(s) eliminada(s)`);
      }
      if (failedCount > 0) {
        toast.error(`${failedCount} factura(s) no se pudieron eliminar`);
      }
    } catch (error) {
      console.error("Failed to delete invoices in bulk:", error);
      toast.error("Error al eliminar facturas");
    } finally {
      setBulkAction(null);
    }
  }, [selectedUnpaidInvoices, bulkAction]);

  // Available months from invoices
  const availableInvoiceMonths = useMemo(() => {
    const months = [...new Set(invoices.map((i) => i.month))].sort().reverse();
    return months;
  }, [invoices]);

  const currentMonth = getCurrentMonth();
  const hasCurrentMonthInvoices = useMemo(
    () => invoices.some((invoice) => invoice.month === currentMonth),
    [invoices, currentMonth]
  );

  const acceptedStudentsWithoutCurrentMonthRecords = useMemo(() => {
    const students = new Map<string, string>();

    for (const enrollment of acceptedEnrollments) {
      if (!enrollment.studentId) continue;
      students.set(enrollment.studentId, enrollment.studentName);
    }

    const hasInvoice = new Set(
      invoices
        .filter((invoice) => invoice.month === currentMonth)
        .map((invoice) => invoice.studentId)
    );

    const hasPayment = new Set(
      payments
        .filter((payment) => payment.month === currentMonth)
        .map((payment) => payment.studentId)
    );

    return Array.from(students.entries())
      .filter(([studentId]) => !hasInvoice.has(studentId) && !hasPayment.has(studentId))
      .map(([studentId, studentName]) => ({ studentId, studentName }));
  }, [acceptedEnrollments, invoices, payments, currentMonth]);

  const preferredPaymentByStudent = useMemo(() => {
    const result: Record<string, { method?: "Efectivo" | "Transferencia bancaria"; payerName?: string; accountNumber?: string }> = {};

    for (const payment of payments) {
      if (!payment.studentId || result[payment.studentId]) continue;
      const normalizedMethod = (payment.method || "").toLowerCase();
      const method = normalizedMethod.includes("transfer")
        ? "Transferencia bancaria"
        : "Efectivo";

      result[payment.studentId] = {
        method,
        payerName: payment.payerName || undefined,
        accountNumber: payment.accountNumber || undefined,
      };
    }

    return result;
  }, [payments]);

  const pendingPaymentsCount = useMemo(
    () => payments.filter((payment) => payment.status === "pending" || payment.status === "overdue").length,
    [payments]
  );
  const paidPaymentsCount = useMemo(
    () => payments.filter((payment) => payment.status === "paid").length,
    [payments]
  );
  const collectedAmount = useMemo(
    () => payments.filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + payment.amount, 0),
    [payments]
  );

  if (initialLoading) {
    return (
      <PageContainer title="Pagos" description="Control de cobros claro y accionable">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Pagos" description="Control de cobros claro y accionable">
      <section className="mb-4 rounded-lg border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">Menos gestión. Más control.</p>
        <p className="mt-1 text-xs text-muted-foreground">Prioriza pendientes, confirma cobros y evita duplicados desde una sola vista.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-md border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Pagos pendientes</p>
            <p className="text-lg font-semibold text-foreground">{pendingPaymentsCount}</p>
          </div>
          <div className="rounded-md border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Pagos confirmados</p>
            <p className="text-lg font-semibold text-foreground">{paidPaymentsCount}</p>
          </div>
          <div className="rounded-md border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Cobrado</p>
            <p className="text-lg font-semibold text-foreground">€{collectedAmount.toFixed(2)}</p>
          </div>
        </div>
      </section>

      <Tabs defaultValue="payments" className="w-full">
        <div className="space-y-3 mb-4">
          {!hasCurrentMonthInvoices && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No se han generado recibos del mes actual</AlertTitle>
              <AlertDescription>
                Aún no hay facturas/recibos para {currentMonth}. Genera las facturas del mes para mantener el control de cobros al día.
              </AlertDescription>
            </Alert>
          )}

          {acceptedStudentsWithoutCurrentMonthRecords.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {acceptedStudentsWithoutCurrentMonthRecords.length} alumno(s) aceptado(s) sin registro del mes
              </AlertTitle>
              <AlertDescription>
                {acceptedStudentsWithoutCurrentMonthRecords
                  .slice(0, 5)
                  .map((student) => student.studentName)
                  .join(", ")}
                {acceptedStudentsWithoutCurrentMonthRecords.length > 5 ? "..." : ""}. Revisa si se matricularon durante el mes y genera sus recibos.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <TabsList>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Pagos
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Facturas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
          <Alert className="border-primary/25 bg-primary/5">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Flujo recomendado</AlertTitle>
            <AlertDescription>
              1) Genera facturas del mes. 2) Registra o confirma pagos. 3) Al marcar factura pagada se vincula con pagos existentes del mismo período para evitar duplicados.
            </AlertDescription>
          </Alert>

          <PaymentsTable
            payments={payments}
            isLoading={refreshing}
            onViewDetail={handleViewDetail}
            onAddPayment={() => setPaymentModalOpen(true)}
            onGenerateReceipt={handleGenerateReceipt}
            generatingReceiptPaymentId={generatingReceiptPaymentId}
          />

          <div className="flex justify-end">
            <Button onClick={() => setGenerateDialogOpen(true)}>
              Generar facturas del mes
            </Button>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Recibos en efectivo (PDF único)</h3>
              <p className="text-xs text-muted-foreground">
                Genera un PDF multipágina con todos los recibos de pagos en efectivo del mes.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="space-y-1">
                <Label htmlFor="receipt-month" className="text-xs">Mes</Label>
                <Input
                  id="receipt-month"
                  type="month"
                  value={receiptMonth}
                  onChange={(event) => setReceiptMonth(event.target.value)}
                  className="h-9 w-[170px]"
                />
              </div>
              <Button
                onClick={() => void handleGenerateCashReceiptsBatch()}
                disabled={generatingReceipts}
                className="sm:mt-5"
              >
                {generatingReceipts ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Generar PDF de Recibos
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Facturas</h3>
            <p className="text-sm text-muted-foreground">
              Genera y gestiona facturas mensuales de tus alumnos
            </p>
          </div>

          <Alert className="border-primary/25 bg-primary/5">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Flujo unificado de cobro</AlertTitle>
            <AlertDescription>
              Marca y registra pagos desde la pestaña <strong>Pagos</strong>. Esta vista de facturas es informativa para evitar duplicar acciones.
            </AlertDescription>
          </Alert>

          {/* Filters */}
          {invoices.length > 0 && (
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Input
                  placeholder="Buscar por alumno o número..."
                  value={invoiceSearchFilter}
                  onChange={(e) => setInvoiceSearchFilter(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <Select value={invoiceMonthFilter} onValueChange={setInvoiceMonthFilter}>
                <SelectTrigger className="h-9 w-[160px] text-sm">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los meses</SelectItem>
                  {availableInvoiceMonths.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                <SelectTrigger className="h-9 w-[140px] text-sm">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="paid">Pagada</SelectItem>
                  <SelectItem value="overdue">Vencida</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedInvoiceIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
              <p className="text-sm text-muted-foreground">
                {selectedInvoiceIds.length} factura(s) seleccionada(s)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => void handleBulkMarkInvoicesAsPaid()}
                  disabled={selectedUnpaidInvoices.length === 0 || bulkAction !== null}
                >
                  {bulkAction === "mark-paid" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Marcar pagadas
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => void handleBulkDeleteInvoices()}
                  disabled={selectedUnpaidInvoices.length === 0 || bulkAction !== null}
                >
                  {bulkAction === "delete" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Eliminar seleccionadas
                </Button>
              </div>
            </div>
          )}

          {filteredInvoices.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                {invoices.length === 0
                  ? "No hay facturas. Genera facturas para un mes específico para empezar."
                  : "No se encontraron facturas con los filtros aplicados."}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[42px]">
                      <Checkbox
                        checked={allSelectableChecked || (someSelectableChecked ? "indeterminate" : false)}
                        onCheckedChange={(checked) => toggleAllSelectableInvoices(checked === true)}
                        aria-label="Seleccionar facturas"
                      />
                    </TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Alumno</TableHead>
                    <TableHead>Mes</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedInvoiceIds.includes(invoice.id)}
                          onCheckedChange={(checked) => toggleInvoiceSelection(invoice.id, checked === true)}
                          aria-label={`Seleccionar factura ${invoice.invoiceNumber}`}
                          disabled={invoice.status === "paid"}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{invoice.invoiceNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{invoice.studentName}</p>
                          <p className="text-sm text-muted-foreground">{invoice.studentEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>{invoice.month}</TableCell>
                      <TableCell className="font-semibold">€{invoice.totalAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatPaymentMethodLabel(invoice.paymentMethod)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            invoice.status === "paid"
                              ? "default"
                              : invoice.status === "overdue"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {invoice.status === "paid"
                            ? "Pagada"
                            : invoice.status === "overdue"
                              ? "Vencida"
                              : "Pendiente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                        {invoice.status !== "paid" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => void handleMarkInvoiceAsPaid(invoice)}
                            disabled={markingInvoiceId === invoice.id}
                            title="Marcar como pagada"
                          >
                            {markingInvoiceId === invoice.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                            Marcar pagada
                          </Button>
                        )}
                        {invoice.status !== "paid" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => void handleDeleteInvoice(invoice)}
                            title="Eliminar factura"
                            disabled={bulkAction !== null}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewInvoiceDetail(invoice)}
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <PaymentDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        payment={selectedPayment}
        onMarkPaid={handleMarkPaid}
        onMarkRefunded={handleMarkRefunded}
        onGenerateReceipt={handleGenerateReceipt}
      />

      <RecordPaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        onSave={handleRecordPayment}
        onStartStripeCheckout={handleStripeCheckout}
        preferredByStudent={preferredPaymentByStudent}
      />

      {/* Generate Invoices Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar Facturas Mensuales</DialogTitle>
            <DialogDescription>
              Genera automáticamente facturas para todos los alumnos activos de un mes específico.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="month">Mes</Label>
              <Input
                id="month"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Las facturas se generarán para alumnos activos con matrícula confirmada.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleGenerateMonthlyInvoices}
              disabled={generatingInvoices}
            >
              {generatingInvoices && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Detail Dialog */}
      <Dialog open={invoiceDetailOpen} onOpenChange={setInvoiceDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles de Factura</DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6 py-4">
              {/* Header */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Número de Factura</p>
                  <p className="font-mono font-semibold">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <Badge
                    variant={
                      selectedInvoice.status === "paid"
                        ? "default"
                        : selectedInvoice.status === "overdue"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {selectedInvoice.status === "paid"
                      ? "Pagada"
                      : selectedInvoice.status === "overdue"
                        ? "Vencida"
                        : "Pendiente"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Alumno</p>
                  <p className="font-medium">{selectedInvoice.studentName}</p>
                  <p className="text-sm text-muted-foreground">{selectedInvoice.studentEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mes</p>
                  <p className="font-medium">{selectedInvoice.month}</p>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h4 className="font-semibold mb-3">Clases</h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Clase</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.className}</TableCell>
                          <TableCell className="text-right font-medium">
                            €{item.amount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted font-semibold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">
                          €{selectedInvoice.totalAmount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  Creada el {formatDate(selectedInvoice.createdAt)}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDetailOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
