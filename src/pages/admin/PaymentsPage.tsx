import { useState, useCallback } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PaymentsTable } from "@/components/tables/PaymentsTable";
import { PaymentDetailDrawer } from "@/components/tables/PaymentDetailDrawer";
import { RecordPaymentModal } from "@/components/tables/RecordPaymentModal";
import { PaymentRecord, MOCK_PAYMENTS } from "@/lib/data/mockPayments";
import { toast } from "sonner";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>(MOCK_PAYMENTS);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const handleViewDetail = (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setDrawerOpen(true);
  };

  const handleMarkPaid = useCallback((id: string) => {
    setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, status: "paid" as const } : p)));
    setSelectedPayment((prev) => prev && prev.id === id ? { ...prev, status: "paid" as const } : prev);
    toast.success("Pago marcado como pagado");
  }, []);

  const handleMarkRefunded = useCallback((id: string) => {
    setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, status: "refunded" as const } : p)));
    setSelectedPayment((prev) => prev && prev.id === id ? { ...prev, status: "refunded" as const } : prev);
    toast.success("Pago marcado como reembolsado");
  }, []);

  const handleRecordPayment = useCallback((data: Omit<PaymentRecord, "id">) => {
    const newPayment: PaymentRecord = { id: `p${Date.now()}`, ...data };
    setPayments((prev) => [newPayment, ...prev]);
    setModalOpen(false);
    toast.success("Pago registrado correctamente");
  }, []);

  return (
    <PageContainer
      title="Pagos"
      description="Seguimiento y gestión de pagos"
    >
      <PaymentsTable
        payments={payments}
        onViewDetail={handleViewDetail}
        onAddPayment={() => setModalOpen(true)}
      />

      <PaymentDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        payment={selectedPayment}
        onMarkPaid={handleMarkPaid}
        onMarkRefunded={handleMarkRefunded}
      />

      <RecordPaymentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={handleRecordPayment}
      />
    </PageContainer>
  );
}
