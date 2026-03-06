import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MOCK_STUDENTS } from "@/lib/data/mockStudents";
import { PaymentRecord, PaymentMethod } from "@/lib/data/mockPayments";

const PAYMENT_METHODS: PaymentMethod[] = [
  "Transferencia bancaria",
  "Mercado Pago",
  "Efectivo",
  "Tarjeta de crédito/débito",
];

interface RecordPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payment: Omit<PaymentRecord, "id">) => void;
}

export function RecordPaymentModal({ open, onOpenChange, onSave }: RecordPaymentModalProps) {
  const [studentId, setStudentId] = useState("");
  const [concept, setConcept] = useState("");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Efectivo");
  const [notes, setNotes] = useState("");

  const activeStudents = MOCK_STUDENTS.filter((s) => s.status === "active");
  const selectedStudent = activeStudents.find((s) => s.id === studentId);

  const handleSave = () => {
    if (!selectedStudent || !concept.trim() || !amount || !month) return;
    onSave({
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      studentEmail: selectedStudent.email,
      concept: concept.trim(),
      month,
      amount: parseFloat(amount),
      method,
      status: "paid",
      date: new Date().toISOString().split("T")[0],
      notes: notes.trim() || undefined,
    });
    // Reset
    setStudentId("");
    setConcept("");
    setAmount("");
    setNotes("");
  };

  const handleStudentChange = (id: string) => {
    setStudentId(id);
    const student = activeStudents.find((s) => s.id === id);
    if (student && student.enrolledClasses.length > 0) {
      const total = student.enrolledClasses.reduce((s, c) => s + c.monthlyPrice, 0);
      setAmount(String(total));
      setConcept("Mensualidad — " + student.enrolledClasses.map((c) => c.name).join(" + "));
    }
  };

  const isValid = studentId && concept.trim() && amount && parseFloat(amount) > 0 && month;

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
                {activeStudents.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <Label className="text-xs">Monto ($) *</Label>
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
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
          <Button size="sm" disabled={!isValid} onClick={handleSave}>Registrar Pago</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
