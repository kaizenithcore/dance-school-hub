import { useState, useMemo } from "react";
import { PaymentRecord, PaymentStatus } from "@/lib/data/mockPayments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Eye, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
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
}

export function PaymentsTable({ payments, onViewDetail, onAddPayment }: PaymentsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const matchSearch =
        p.studentName.toLowerCase().includes(search.toLowerCase()) ||
        p.concept.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [payments, search, statusFilter]);

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

      {/* Filters row */}
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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar por alumno o concepto..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card shadow-soft overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">Alumno</TableHead>
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
                <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                  No se encontraron pagos
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((payment) => {
                const statusCfg = STATUS_CONFIG[payment.status];
                return (
                  <TableRow key={payment.id} className="cursor-pointer" onClick={() => onViewDetail(payment)}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-foreground">{payment.studentName}</p>
                        <p className="text-[10px] text-muted-foreground">{payment.studentEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                      {payment.concept}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                      {format(new Date(payment.month + "-01"), "MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold text-foreground">
                      ${payment.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{payment.method}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("text-[10px] font-medium", statusCfg.className)}>
                        {statusCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onViewDetail(payment); }}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
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
