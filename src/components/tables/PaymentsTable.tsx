import { useState, useMemo, useEffect } from "react";
import { PaymentRecord, PaymentStatus, PAYMENT_METHODS } from "@/lib/data/mockPayments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Eye, ChevronLeft, ChevronRight, Plus, Receipt, FileCheck, Loader2, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { TablePagination, readPageSize } from "@/components/tables/TablePagination";
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

const PAGE_PREFS_KEY = "payments-table-page";
const PAGE_SIZE_KEY = "payments-table-page-size";
const COLUMN_KEY = "payments-table-columns";
const DEFAULT_COLS_PAY = { concept: true, month: true, method: true };

type PaymentSortKey = "student" | "concept" | "month" | "amount" | "method" | "status";

interface PaymentsTableProps {
  payments: PaymentRecord[];
  isLoading?: boolean;
  onViewDetail: (payment: PaymentRecord) => void;
  onAddPayment: () => void;
  onGenerateReceipt: (payment: PaymentRecord) => void;
  generatingReceiptPaymentId?: string | null;
}

export function PaymentsTable({
  payments,
  isLoading = false,
  onViewDetail,
  onAddPayment,
  onGenerateReceipt,
  generatingReceiptPaymentId,
}: PaymentsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pageSize, setPageSize] = useState(() => readPageSize(PAGE_SIZE_KEY));
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try { const r = window.localStorage.getItem(COLUMN_KEY); return r ? JSON.parse(r) as Record<string, boolean> : DEFAULT_COLS_PAY; } catch { return DEFAULT_COLS_PAY; }
  });
  const [sortKey, setSortKey] = useState<PaymentSortKey>("month");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(() => {
    if (typeof window === "undefined") return 0;
    const raw = window.localStorage.getItem(PAGE_PREFS_KEY);
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
  });

  // Available months from data
  const availableMonths = useMemo(() => {
    const months = [...new Set(payments.map((p) => p.month))].sort().reverse();
    return months;
  }, [payments]);

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const searchValue = search.toLowerCase();
      const studentName = (p.studentName || "").toLowerCase();
      const payerName = (p.payerName || "").toLowerCase();
      const concept = (p.concept || "").toLowerCase();
      const matchSearch =
        studentName.includes(searchValue) ||
        payerName.includes(searchValue) ||
        concept.includes(searchValue);
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      const matchMethod = methodFilter === "all" || p.method === methodFilter;
      const matchMonth = monthFilter === "all" || p.month === monthFilter;
      return matchSearch && matchStatus && matchMethod && matchMonth;
    });
  }, [payments, search, statusFilter, methodFilter, monthFilter]);

  const sorted = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1;
    const rows = [...filtered];

    rows.sort((a, b) => {
      const getValue = (payment: PaymentRecord) => {
        switch (sortKey) {
          case "student":
            return `${payment.studentName || ""} ${payment.payerName || ""}`.toLowerCase();
          case "concept":
            return (payment.concept || "").toLowerCase();
          case "month":
            return payment.month;
          case "amount":
            return payment.amount;
          case "method":
            return (payment.method || "").toLowerCase();
          case "status":
            return STATUS_CONFIG[payment.status]?.label || payment.status;
          default:
            return "";
        }
      };

      const aValue = getValue(a);
      const bValue = getValue(b);

      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * direction;
      }

      return String(aValue).localeCompare(String(bValue), "es", { sensitivity: "base" }) * direction;
    });

    return rows;
  }, [filtered, sortKey, sortDirection]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize);

  useEffect(() => {
    window.localStorage.setItem(PAGE_PREFS_KEY, String(page));
  }, [page]);

  useEffect(() => {
    if (totalPages === 0) {
      if (page !== 0) setPage(0);
      return;
    }

    if (page > totalPages - 1) {
      setPage(totalPages - 1);
    }
  }, [page, totalPages]);

  const toggleSort = (key: PaymentSortKey) => {
    setPage(0);
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  const renderSortableHead = (label: string, key: PaymentSortKey, className?: string, align: "left" | "center" | "right" = "left") => (
    <TableHead className={cn("text-xs", className)}>
      <button
        type="button"
        onClick={() => toggleSort(key)}
        className={cn(
          "inline-flex w-full items-center gap-1 hover:text-foreground",
          align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"
        )}
      >
        <span>{label}</span>
        {sortKey !== key ? <ArrowUpDown className="h-3 w-3 text-muted-foreground" /> : sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
    </TableHead>
  );

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
          <p className="text-xl font-bold text-success">€{totalCollected.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 shadow-soft">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pendiente</p>
          <p className="text-xl font-bold text-warning">€{totalPending.toLocaleString()}</p>
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

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <TableToolbar
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(0); }}
          searchPlaceholder="Buscar por alumno, pagador o concepto..."
          filtersOpen={filtersOpen}
          onFiltersOpenChange={setFiltersOpen}
          activeFilterCount={[statusFilter !== "all", methodFilter !== "all", monthFilter !== "all"].filter(Boolean).length}
          columns={[{ key: "concept", label: "Concepto" }, { key: "month", label: "Mes" }, { key: "method", label: "Método" }]}
          visibleColumns={visibleColumns}
          onColumnToggle={(key, v) => { const n = { ...visibleColumns, [key]: v }; setVisibleColumns(n); window.localStorage.setItem(COLUMN_KEY, JSON.stringify(n)); }}
          extra={
            <Button size="sm" onClick={onAddPayment} className="shrink-0">
              <Plus className="h-3.5 w-3.5 mr-1" /> Registrar Pago
            </Button>
          }
        />

        {filtersOpen && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
            {/* Status chips */}
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(STATUS_CONFIG) as PaymentStatus[]).map((status) => {
                const cfg = STATUS_CONFIG[status];
                return (
                  <button key={status} onClick={() => { setStatusFilter(statusFilter === status ? "all" : status); setPage(0); }}
                    className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors",
                      statusFilter === status ? cfg.className : "border-border text-muted-foreground hover:text-foreground")}>
                    {cfg.label}
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-background/50 px-1 text-[10px]">{counts[status]}</span>
                  </button>
                );
              })}
            </div>
            <Select value={methodFilter} onValueChange={(v) => { setMethodFilter(v); setPage(0); }}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Método" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los métodos</SelectItem>
                {PAYMENT_METHODS.map((m) => (<SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={(v) => { setMonthFilter(v); setPage(0); }}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Período" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los meses</SelectItem>
                {availableMonths.map((m) => (<SelectItem key={m} value={m} className="text-xs">{format(new Date(m + "-01"), "MMM yyyy", { locale: es })}</SelectItem>))}
              </SelectContent>
            </Select>
            {[statusFilter !== "all", methodFilter !== "all", monthFilter !== "all"].some(Boolean) && (
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground"
                onClick={() => { setStatusFilter("all"); setMethodFilter("all"); setMonthFilter("all"); setPage(0); }}>Limpiar</Button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card shadow-soft overflow-x-auto">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {renderSortableHead("Alumno / Pagador", "student")}
              {visibleColumns.concept !== false && renderSortableHead("Concepto", "concept", "hidden md:table-cell")}
              {visibleColumns.month !== false && renderSortableHead("Mes", "month", "hidden lg:table-cell")}
              {renderSortableHead("Monto", "amount", undefined, "right")}
              {visibleColumns.method !== false && renderSortableHead("Método", "method", "hidden md:table-cell")}
              {renderSortableHead("Estado", "status", undefined, "center")}
              <TableHead className="text-xs text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando pagos...
                  </div>
                </TableCell>
              </TableRow>
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState type={search || statusFilter !== "all" || methodFilter !== "all" || monthFilter !== "all" ? "search" : "payments"} />
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((payment, rowIdx) => {
                const statusCfg = STATUS_CONFIG[payment.status];
                const payerDiffers = payment.payerName !== payment.studentName;
                const isReceiptGenerationBusy = Boolean(generatingReceiptPaymentId);
                const isGeneratingReceipt = generatingReceiptPaymentId === payment.id;
                return (
                  <TableRow key={payment.id} className={cn("cursor-pointer hover:bg-accent/50", rowIdx % 2 !== 0 && "bg-muted/20")} onClick={() => onViewDetail(payment)}>
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
                    {visibleColumns.concept !== false && (
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                        <div className="flex items-center gap-1">
                          {payment.concept}
                          {payment.accountNumber && <span className="text-[10px] text-muted-foreground ml-1">(****{payment.accountNumber.slice(-4)})</span>}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.month !== false && (
                      <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                        {format(new Date(payment.month + "-01"), "MMM yyyy", { locale: es })}
                      </TableCell>
                    )}
                    <TableCell className="text-right text-sm font-semibold text-foreground">
                      <div className="flex items-center justify-end gap-1">
                        €{payment.amount.toLocaleString()}
                        {payment.amountChanged && <span className="text-[10px] text-warning">⚠</span>}
                      </div>
                    </TableCell>
                    {visibleColumns.method !== false && (
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                        {payment.method}
                        {payment.accountNumber && payment.method.toLowerCase().includes("transfer") && <span className="ml-1 text-[10px]">(****{payment.accountNumber.slice(-4)})</span>}
                      </TableCell>
                    )}
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
                              disabled={isReceiptGenerationBusy}
                              onClick={(e) => { e.stopPropagation(); onGenerateReceipt(payment); }}
                            >
                              {payment.receiptGenerated
                                ? <FileCheck className="h-3.5 w-3.5 text-success" />
                                : <Receipt className="h-3.5 w-3.5" />
                              }
                            </Button>
                          </TooltipTrigger><TooltipContent side="bottom"><p>{isGeneratingReceipt ? "Generando..." : isReceiptGenerationBusy ? "Espera a que termine la generación" : payment.receiptGenerated ? "Recibo generado" : "Generar recibo"}</p></TooltipContent></Tooltip>
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

      {!isLoading && filtered.length > 0 && (
        <TablePagination
          page={page} totalPages={totalPages} totalItems={filtered.length} pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(0); window.localStorage.setItem(PAGE_SIZE_KEY, String(s)); }}
          itemLabel="pagos"
        />
      )}
    </div>
  );
}
