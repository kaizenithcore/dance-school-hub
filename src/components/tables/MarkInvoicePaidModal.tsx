import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface MarkInvoicePaidModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceNumber: string;
  studentName: string;
  amount: number;
  onConfirm: (data: { paymentMethod: string; accountNumber?: string; payerName?: string }) => Promise<void>;
}

export function MarkInvoicePaidModal({
  open,
  onOpenChange,
  invoiceNumber,
  studentName,
  amount,
  onConfirm,
}: MarkInvoicePaidModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [accountNumber, setAccountNumber] = useState("");
  const [payerName, setPayerName] = useState(studentName);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm({
        paymentMethod,
        accountNumber: paymentMethod === "transfer" ? accountNumber : undefined,
        payerName: payerName !== studentName ? payerName : undefined,
      });
      onOpenChange(false);
      // Reset form
      setPaymentMethod("cash");
      setAccountNumber("");
      setPayerName(studentName);
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar Factura como Pagada</DialogTitle>
          <DialogDescription>
            Registra el pago de la factura {invoiceNumber} de {studentName} por €{amount.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Método de pago</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="paymentMethod">
                <SelectValue placeholder="Selecciona un método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="transfer">Transferencia bancaria</SelectItem>
                <SelectItem value="card">Tarjeta de crédito/débito</SelectItem>
                <SelectItem value="mercadopago">Mercado Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === "transfer" && (
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Número de cuenta</Label>
              <Input
                id="accountNumber"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Ej: 1234-5678-9012-3456"
              />
              <p className="text-xs text-muted-foreground">
                Últimos 4 dígitos de la cuenta desde la que se realizó la transferencia
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="payerName">Nombre del pagador</Label>
            <Input
              id="payerName"
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              placeholder="Nombre de quien realiza el pago"
            />
            <p className="text-xs text-muted-foreground">
              Si el pago lo realiza otra persona (tutor, familiar, etc.), indica su nombre
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar Pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
