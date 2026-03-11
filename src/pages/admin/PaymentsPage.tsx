import { useState, useCallback, useEffect, useMemo } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PaymentsTable } from "@/components/tables/PaymentsTable";
import { PaymentDetailDrawer } from "@/components/tables/PaymentDetailDrawer";
import { RecordPaymentModal } from "@/components/tables/RecordPaymentModal";
import { MarkInvoicePaidModal } from "@/components/tables/MarkInvoicePaidModal";
import {
  getPayments,
  recordPayment,
  updatePaymentStatus,
  getInvoices,
  generateMonthlyInvoices,
  markInvoiceAsPaid,
  getInvoiceDetail,
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
import { Loader2, Copy, DollarSign, FileText, AlertTriangle, Eye, CircleCheck } from "lucide-react";
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
  const [markPaidModalOpen, setMarkPaidModalOpen] = useState(false);
  const [invoiceToMarkPaid, setInvoiceToMarkPaid] = useState<InvoiceRecord | null>(null);

  // Invoice filters
  const [invoiceMonthFilter, setInvoiceMonthFilter] = useState<string>("all");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("all");
  const [invoiceSearchFilter, setInvoiceSearchFilter] = useState<string>("");

  // Loading state
  const [loading, setLoading] = useState(true);
  const [generatingInvoices, setGeneratingInvoices] = useState(false);
  const [generatingReceipts, setGeneratingReceipts] = useState(false);
  const [acceptedEnrollments, setAcceptedEnrollments] = useState<Array<{ studentId?: string; studentName: string }>>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (loading) {
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
  }, [loading, payments, searchParams, setSearchParams]);

  async function loadData() {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  }

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
    try {
      const blob = await downloadPaymentReceiptPdf(payment.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `recibo-${payment.studentName.replace(/\s+/g, "-").toLowerCase()}-${payment.month}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      await loadData();
      toast.success(`Recibo generado para ${payment.studentName}`);
    } catch (error) {
      console.error("Failed to generate payment receipt:", error);
      toast.error("No se pudo generar el recibo para este pago");
    }
  }, []);

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
        description: String(data.metadata.concept || "Pago DanceHub"),
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
        await loadData(); // Reload invoices
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

  const handleMarkInvoiceAsPaid = async (invoice: InvoiceRecord) => {
    setInvoiceToMarkPaid(invoice);
    setMarkPaidModalOpen(true);
  };

  const handleConfirmInvoiceAsPaid = async (data: { paymentMethod: string; accountNumber?: string; payerName?: string }) => {
    if (!invoiceToMarkPaid) return;

    try {
      const updated = await markInvoiceAsPaid(invoiceToMarkPaid.id, {
        paymentMethod: data.paymentMethod,
        accountNumber: data.accountNumber,
        payerName: data.payerName,
      });

      if (updated) {
        setInvoices((prev) =>
          prev.map((inv) => (inv.id === invoiceToMarkPaid.id ? { ...inv, status: "paid", paidDate: new Date().toISOString() } : inv))
        );
        if (selectedInvoice?.id === invoiceToMarkPaid.id) {
          setInvoiceDetailOpen(false);
        }
        setMarkPaidModalOpen(false);
        setInvoiceToMarkPaid(null);
        toast.success("Factura marcada como pagada");
        await loadData(); // Reload to sync payments
      }
    } catch (error) {
      toast.error("Error al marcar la factura como pagada");
    }
  };

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

  if (loading) {
    return (
      <PageContainer title="Pagos" description="Seguimiento y gestión de pagos">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Pagos" description="Seguimiento y gestión de pagos">
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

          <PaymentsTable
            payments={payments}
            onViewDetail={handleViewDetail}
            onAddPayment={() => setPaymentModalOpen(true)}
            onGenerateReceipt={handleGenerateReceipt}
          />
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Facturas</h3>
              <p className="text-sm text-muted-foreground">
                Genera y gestiona facturas mensuales de tus alumnos
              </p>
            </div>
            <Button onClick={() => setGenerateDialogOpen(true)}>
              Generar Facturas
            </Button>
          </div>

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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewInvoiceDetail(invoice)}
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {invoice.status !== "paid" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-success hover:text-success"
                            onClick={() => handleMarkInvoiceAsPaid(invoice)}
                            title="Marcar pagada"
                          >
                            <CircleCheck className="h-4 w-4" />
                          </Button>
                        )}
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
                Las facturas se generarán solo para alumnos con clases en este mes.
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
            {selectedInvoice?.status !== "paid" && (
              <Button
                onClick={() => {
                  if (selectedInvoice) {
                    setInvoiceToMarkPaid(selectedInvoice as unknown as InvoiceRecord);
                    setMarkPaidModalOpen(true);
                    setInvoiceDetailOpen(false);
                  }
                }}
              >
                Marcar como Pagada
              </Button>
            )}
            <Button variant="outline" onClick={() => setInvoiceDetailOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Invoice Paid Modal */}
      {invoiceToMarkPaid && (
        <MarkInvoicePaidModal
          open={markPaidModalOpen}
          onOpenChange={setMarkPaidModalOpen}
          invoiceNumber={invoiceToMarkPaid.invoiceNumber}
          studentName={invoiceToMarkPaid.studentName}
          amount={invoiceToMarkPaid.totalAmount}
          onConfirm={handleConfirmInvoiceAsPaid}
        />
      )}
    </PageContainer>
  );
}
