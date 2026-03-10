import { useState, useMemo } from "react";
import { PaymentRecord, PaymentStatus, PAYMENT_METHODS } from "@/lib/data/mockPayments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Eye, ChevronLeft, ChevronRight, Plus, Receipt, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_CONFIG: Record<PaymentStatus, { label: string; className: string }> = {
  paid: { label: "Pagado", className: "bg-success/15 text-success border-success/20" },
  pending: { label: "Pendiente", className: "bg-warning/15 text-warning border-warning/20" },
  overdue: { label: "Vencido", className: "bg-destructive/15 text-destructive border-destructive/20" },
  refunded: { label: "Reembolsado", className: "bg-info/15 text-info border-info/20" },
};

const PAGE_SIZE = 8;

interface PaymentsTableProps {
  payments: PaymentRecord[];
  onViewDetail: (payment: PaymentRecord) => void;
  onAddPayment: () => void;
  onGenerateReceipt: (payment: PaymentRecord) => void;
}

export function PaymentsTable({ payments, onViewDetail, onAddPayment, onGenerateReceipt }: PaymentsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  // Available months from data
  const availableMonths = useMemo(() => {
    const months = [...new Set(payments.map((p) => p.month))].sort().reverse();
    return months;
  }, [payments]);

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const matchSearch =
        p.studentName.toLowerCase().includes(search.toLowerCase()) ||
        p.payerName.toLowerCase().includes(search.toLowerCase()) ||
        p.concept.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      const matchMethod = methodFilter === "all" || p.method === methodFilter;
      const matchMonth = monthFilter === "all" || p.month === monthFilter;
      return matchSearch && matchStatus && matchMethod && matchMonth;
    });
  }, [payments, search, statusFilter, methodFilter, monthFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const counts = useMemo(() => {
    const c: Record<string, number> = { paid: 0, pending: 0, overdue: 0, refunded: 0 };
    payments.forEach((p) => c[p.status]++);
    return c;
  }, [payments]);

  const totalCollected = useMemo(() =>
    payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0),
    [payments]
  );

  const totalPending = useMemo(() =>
    payments.filter((p) => p.status === "pending" || p.status === "overdue").reduce((s, p) => s + p.amount, 0),
    [payments]
  );

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3 shadow-soft">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Recaudado</p>
          <p className="text-xl font-bold text-success">${totalCollected.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 shadow-soft">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pendiente</p>
          <p className="text-xl font-bold text-warning">${totalPending.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 shadow-soft">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Transacciones</p>
          <p className="text-xl font-bold text-foreground">{payments.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 shadow-soft">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Vencidos</p>
          <p className="text-xl font-bold text-destructive">{counts.overdue}</p>
        </div>
      </div>

      {/* Status chips + Add button */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STATUS_CONFIG) as PaymentStatus[]).map((status) => {
            const config = STATUS_CONFIG[status];
            return (
              <button
                key={status}
                onClick={() => { setStatusFilter(statusFilter === status ? "all" : status); setPage(0); }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                  statusFilter === status ? config.className : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {config.label}
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-background/50 px-1 text-[10px]">
                  {counts[status]}
                </span>
              </button>
            );
          })}
        </div>
        <Button size="sm" onClick={onAddPayment}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Registrar Pago
        </Button>
      </div>

      {/* Filters row: search + method + month */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por alumno, pagador o concepto..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={methodFilter} onValueChange={(v) => { setMethodFilter(v); setPage(0); }}>
          <SelectTrigger className="h-9 w-[180px] text-sm">
            <SelectValue placeholder="Método de pago" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los métodos</SelectItem>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={monthFilter} onValueChange={(v) => { setMonthFilter(v); setPage(0); }}>
          <SelectTrigger className="h-9 w-[160px] text-sm">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los meses</SelectItem>
            {availableMonths.map((m) => (
              <SelectItem key={m} value={m}>
                {format(new Date(m + "-01"), "MMM yyyy", { locale: es })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card shadow-soft overflow-x-auto">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">Alumno / Pagador</TableHead>
              <TableHead className="text-xs hidden md:table-cell">Concepto</TableHead>
              <TableHead className="text-xs hidden lg:table-cell">Mes</TableHead>
              <TableHead className="text-xs text-right">Monto</TableHead>
              <TableHead className="text-xs hidden md:table-cell">Método</TableHead>
              <TableHead className="text-xs text-center">Estado</TableHead>
              <TableHead className="text-xs text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState type={search || statusFilter !== "all" || methodFilter !== "all" || monthFilter !== "all" ? "search" : "payments"} />
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((payment) => {
                const statusCfg = STATUS_CONFIG[payment.status];
                const payerDiffers = payment.payerName !== payment.studentName;
                return (
                  <TableRow key={payment.id} className="cursor-pointer" onClick={() => onViewDetail(payment)}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-foreground">{payment.studentName}</p>
                        {payerDiffers ? (
                          <p className="text-[10px] text-warning font-medium">↳ Paga: {payment.payerName}</p>
                        ) : (
                          <p className="text-[10px] text-muted-foreground">{payment.studentEmail}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                      <div className="flex items-center gap-1">
                        {payment.concept}
                        {payment.accountNumber && (
                          <span className="text-[10px] text-muted-foreground ml-1">
                            (****{payment.accountNumber.slice(-4)})
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                      {format(new Date(payment.month + "-01"), "MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold text-foreground">
                      <div className="flex items-center justify-end gap-1">
                        ${payment.amount.toLocaleString()}
                        {payment.amountChanged && (
                          <span className="text-[10px] text-warning">⚠</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{payment.method}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("text-[10px] font-medium", statusCfg.className)}>
                        {statusCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        {payment.status === "paid" && (
                          <Tooltip><TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); onGenerateReceipt(payment); }}
                            >
                              {payment.receiptGenerated
                                ? <FileCheck className="h-3.5 w-3.5 text-success" />
                                : <Receipt className="h-3.5 w-3.5" />
                              }
                            </Button>
                          </TooltipTrigger><TooltipContent side="bottom"><p>{payment.receiptGenerated ? "Recibo generado" : "Generar recibo"}</p></TooltipContent></Tooltip>
                        )}
                        <Tooltip><TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onViewDetail(payment); }}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger><TooltipContent side="bottom"><p>Ver detalle</p></TooltipContent></Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
