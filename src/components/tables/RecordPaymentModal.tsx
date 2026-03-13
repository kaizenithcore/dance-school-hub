import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PaymentMethod, PAYMENT_METHODS } from "@/lib/data/mockPayments";
import { getStudents } from "@/lib/api/students";
import { getSchoolSettings } from "@/lib/api/settings";
import { Loader2 } from "lucide-react";

interface StudentOption {
  id: string;
  name: string;
  email: string;
  status: string;
  guardian?: {
    name: string;
  };
  enrolledClasses: Array<{
    id: string;
    name: string;
    monthlyPrice: number;
  }>;
}

interface RecordPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payment: {
    studentId: string;
    amount: number;
    metadata: Record<string, unknown>;
  }) => void;
  onStartStripeCheckout?: (payment: {
    studentId: string;
    amount: number;
    metadata: Record<string, unknown>;
  }) => Promise<void>;
  preferredByStudent?: Record<
    string,
    { method?: PaymentMethod; payerName?: string; accountNumber?: string }
  >;
}

export function RecordPaymentModal({
  open,
  onOpenChange,
  onSave,
  onStartStripeCheckout,
  preferredByStudent,
}: RecordPaymentModalProps) {
  const [studentId, setStudentId] = useState("");
  const [payerName, setPayerName] = useState("");
  const [concept, setConcept] = useState("");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Efectivo");
  const [accountNumber, setAccountNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [availableMethods, setAvailableMethods] = useState<PaymentMethod[]>(PAYMENT_METHODS);
  const [currency, setCurrency] = useState("ARS");

  const activeStudents = students.filter((s) => s.status === "active");
  const selectedStudent = activeStudents.find((s) => s.id === studentId);

  useEffect(() => {
    void (async () => {
      setLoadingStudents(true);
      try {
        const data = await getStudents();
        setStudents(data as unknown as StudentOption[]);
      } finally {
        setLoadingStudents(false);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const settings = await getSchoolSettings();
        const payment = (settings?.payment || {}) as Record<string, unknown>;
        const nextMethods: PaymentMethod[] = [];

        if (payment.enableTransfer !== false) {
          nextMethods.push("Transferencia bancaria");
        }
        if (payment.enableCash !== false) {
          nextMethods.push("Efectivo");
        }

        if (nextMethods.length > 0) {
          setAvailableMethods(nextMethods);
          if (!nextMethods.includes(method)) {
            setMethod(nextMethods[0]);
          }
        }

        if (typeof payment.currency === "string" && payment.currency.trim().length > 0) {
          setCurrency(payment.currency.toUpperCase());
        }
      } catch {
        // Keep defaults when payment settings are not available
      }
    })();
  }, []);

  const handleStudentChange = (id: string) => {
    setStudentId(id);
    const student = activeStudents.find((s) => s.id === id);
    const preferred = id ? preferredByStudent?.[id] : undefined;

    if (student) {
      // Auto-fill payer: use guardian if exists, otherwise student
      setPayerName(preferred?.payerName || (student.guardian ? student.guardian.name : student.name));
      if (preferred?.method) {
        setMethod(preferred.method);
      }
      setAccountNumber(preferred?.accountNumber || "");
      if (student.enrolledClasses.length > 0) {
        const total = student.enrolledClasses.reduce((s, c) => s + c.monthlyPrice, 0);
        setAmount(String(total));
        setConcept("Mensualidad — " + student.enrolledClasses.map((c) => c.name).join(" + "));
      }
    }
  };

  const buildPayload = () => {
    if (!selectedStudent || !concept.trim() || !amount || !payerName.trim() || !month) {
      return null;
    }

    const paymentMethodKey =
      method === "Transferencia bancaria"
        ? "transfer"
        : method === "Tarjeta"
          ? "card"
          : method === "MercadoPago"
            ? "mercadopago"
            : "cash";

    return {
      studentId: selectedStudent.id,
      amount: parseFloat(amount),
      metadata: {
        payer_name: payerName.trim(),
        concept: concept.trim(),
        month,
        student_name: selectedStudent.name,
        student_email: selectedStudent.email,
        payment_method: paymentMethodKey,
        account_number:
          method === "Transferencia bancaria"
            ? accountNumber.trim() || (preferredByStudent?.[selectedStudent.id]?.accountNumber ?? undefined)
            : undefined,
        notes: notes.trim() || undefined,
      },
    };
  };

  const handleSave = () => {
    const payload = buildPayload();
    if (!payload) return;

    onSave(payload);
    // Reset
    setStudentId("");
    setPayerName("");
    setConcept("");
    setAmount("");
    setAccountNumber("");
    setNotes("");
  };

  const handleStripeCheckout = async () => {
    if (!onStartStripeCheckout) return;
    const payload = buildPayload();
    if (!payload) return;
    await onStartStripeCheckout(payload);
  };

  const isValid = studentId && concept.trim() && payerName.trim() && amount && parseFloat(amount) > 0 && month;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Student */}
          <div className="space-y-1.5">
            <Label className="text-xs">Alumno *</Label>
            <Select value={studentId} onValueChange={handleStudentChange}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Seleccionar alumno..." />
              </SelectTrigger>
              <SelectContent>
                {loadingStudents ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Cargando alumnos...
                  </div>
                ) : activeStudents.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payer name */}
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre del Pagador *</Label>
            <Input
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              placeholder="Nombre de quien realiza el pago"
              className="h-9 text-sm"
            />
          </div>

          {/* Concept */}
          <div className="space-y-1.5">
            <Label className="text-xs">Concepto *</Label>
            <Input
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Ej: Mensualidad — Ballet Principiantes"
              className="h-9 text-sm"
            />
          </div>

          {/* Month & Amount row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Período *</Label>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Monto ({currency}) *</Label>
              <Input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Method */}
          <div className="space-y-1.5">
            <Label className="text-xs">Método de Pago</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableMethods.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {method === "Transferencia bancaria" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Número de cuenta</Label>
              <Input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Ej: ES91 **** **** **** 1234"
                className="h-9 text-sm"
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales..."
              className="text-sm min-h-[60px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {onStartStripeCheckout ? (
            <Button variant="secondary" size="sm" disabled={!isValid} onClick={handleStripeCheckout}>
              Cobrar con Stripe
            </Button>
          ) : null}
          <Button size="sm" disabled={!isValid} onClick={handleSave}>Registrar Pago</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
