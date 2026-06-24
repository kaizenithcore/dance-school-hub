import { useState, useMemo, useEffect } from "react";
import { EnrollmentRecord, EnrollmentStatus } from "@/lib/data/mockEnrollments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Eye, ChevronLeft, ChevronRight, GraduationCap, Loader2, ArrowUpDown, ChevronUp, ChevronDown, List } from "lucide-react";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { TablePagination, readPageSize } from "@/components/tables/TablePagination";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_CONFIG: Record<EnrollmentStatus, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "bg-warning/15 text-warning border-warning/20" },
  confirmed: { label: "Aceptada", className: "bg-success/15 text-success border-success/20" },
  declined: { label: "Rechazada", className: "bg-destructive/15 text-destructive border-destructive/20" },
  cancelled: { label: "Cancelada", className: "bg-muted text-muted-foreground border-border" },
};

const PAGE_PREFS_KEY = "enrollments-table-page";
const PAGE_SIZE_KEY = "enrollments-table-page-size";
const CLASSES_VIEW_KEY = "enrollments-table-classes-view";
const COLUMN_KEY = "enrollments-table-columns";
const DEFAULT_COLS_ENR = { paymentMethod: true, date: true };

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  bank_transfer: "Transferencia",
  card: "Tarjeta",
  mercadopago: "Mercado Pago",
};

function formatPaymentMethod(raw: string): string {
  if (!raw) return "—";
  const lower = raw.toLowerCase();
  return PAYMENT_METHOD_LABELS[lower] ?? PAYMENT_METHOD_LABELS[lower.replace(/_/g, "")] ?? raw;
}

const WEEKDAY_SHORT: Record<string, string> = {
  "0": "Dom", "1": "Lun", "2": "Mar", "3": "Mié",
  "4": "Jue", "5": "Vie", "6": "Sáb",
};

function formatClassDay(day: string): string {
  // If day is a weekday number (0-6), convert to name
  if (/^[0-6]$/.test(day.trim())) return WEEKDAY_SHORT[day.trim()] ?? day;
  return day;
}

type EnrollmentSortKey = "student" | "classes" | "total" | "paymentMethod" | "date" | "status";

interface EnrollmentsTableProps {
  enrollments: EnrollmentRecord[];
  isLoading?: boolean;
  onViewDetail: (enrollment: EnrollmentRecord) => void;
}

export function EnrollmentsTable({ enrollments, isLoading = false, onViewDetail }: EnrollmentsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pageSize, setPageSize] = useState(() => readPageSize(PAGE_SIZE_KEY));
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try { const r = window.localStorage.getItem(COLUMN_KEY); return r ? JSON.parse(r) as Record<string, boolean> : DEFAULT_COLS_ENR; } catch { return DEFAULT_COLS_ENR; }
  });
  const [classesView, setClassesView] = useState<"count" | "list">(() => {
    return (window.localStorage.getItem(CLASSES_VIEW_KEY) as "count" | "list") ?? "count";
  });

  const toggleClassesView = () => {
    const next = classesView === "count" ? "list" : "count";
    setClassesView(next);
    window.localStorage.setItem(CLASSES_VIEW_KEY, next);
  };
  const [sortKey, setSortKey] = useState<EnrollmentSortKey>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(() => {
    if (typeof window === "undefined") return 0;
    const raw = window.localStorage.getItem(PAGE_PREFS_KEY);
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
  });

  const filtered = useMemo(() => {
    return enrollments.filter((e) => {
      const matchSearch =
        e.studentName.toLowerCase().includes(search.toLowerCase()) ||
        e.studentEmail.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || e.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [enrollments, search, statusFilter]);

  const sorted = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1;
    const rows = [...filtered];

    rows.sort((a, b) => {
      const getValue = (enrollment: EnrollmentRecord) => {
        switch (sortKey) {
          case "student":
            return enrollment.studentName.toLowerCase();
          case "classes":
            return enrollment.classes.length;
          case "total":
            return enrollment.totalPrice;
          case "paymentMethod":
            return (enrollment.paymentMethod || "").toLowerCase();
          case "date":
            return new Date(enrollment.date).getTime();
          case "status":
            return STATUS_CONFIG[enrollment.status]?.label || enrollment.status;
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

  const toggleSort = (key: EnrollmentSortKey) => {
    setPage(0);
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  const renderSortableHead = (label: string, key: EnrollmentSortKey, className?: string, align: "left" | "center" | "right" = "left") => (
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

  // Stats
  const counts = useMemo(() => {
    const c: Record<string, number> = { pending: 0, confirmed: 0, declined: 0, cancelled: 0 };
    enrollments.forEach((e) => c[e.status]++);
    return c;
  }, [enrollments]);

  return (
    <div className="space-y-3">
      <TableToolbar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(0); }}
        searchPlaceholder="Buscar por nombre o email..."
        filtersOpen={filtersOpen}
        onFiltersOpenChange={setFiltersOpen}
        activeFilterCount={statusFilter !== "all" ? 1 : 0}
        columns={[{ key: "paymentMethod", label: "Método de pago" }, { key: "date", label: "Fecha" }]}
        visibleColumns={visibleColumns}
        onColumnToggle={(key, v) => { const n = { ...visibleColumns, [key]: v }; setVisibleColumns(n); window.localStorage.setItem(COLUMN_KEY, JSON.stringify(n)); }}
      />

      {filtersOpen && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
          {/* Quick stats chips */}
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(STATUS_CONFIG) as EnrollmentStatus[]).map((status) => {
              const cfg = STATUS_CONFIG[status];
              return (
                <button
                  key={status}
                  onClick={() => { setStatusFilter(statusFilter === status ? "all" : status); setPage(0); }}
                  className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors",
                    statusFilter === status ? cfg.className : "border-border text-muted-foreground hover:text-foreground")}
                >
                  {cfg.label}
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-background/50 px-1 text-[10px]">{counts[status]}</span>
                </button>
              );
            })}
          </div>
          {statusFilter !== "all" && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => { setStatusFilter("all"); setPage(0); }}>Limpiar</Button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border bg-card shadow-soft overflow-x-auto">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {renderSortableHead("Alumno", "student")}
              <TableHead className="text-xs text-center">
                <button type="button" onClick={toggleClassesView} className="inline-flex items-center gap-1 hover:text-foreground text-muted-foreground transition-colors" title={classesView === "count" ? "Mostrar detalle de clases" : "Mostrar total de clases"}>
                  Clases
                  <List className="h-3 w-3" />
                </button>
              </TableHead>
              {renderSortableHead("Total", "total", undefined, "right")}
              {visibleColumns.paymentMethod !== false && renderSortableHead("Método de Pago", "paymentMethod", "hidden md:table-cell")}
              {visibleColumns.date !== false && renderSortableHead("Fecha", "date", "hidden lg:table-cell")}
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
                    Cargando inscripciones...
                  </div>
                </TableCell>
              </TableRow>
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState type={search || statusFilter !== "all" ? "search" : "enrollments"} />
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((enrollment, rowIdx) => {
                const statusCfg = STATUS_CONFIG[enrollment.status];
                return (
                  <TableRow key={enrollment.id} className={cn("cursor-pointer hover:bg-accent/50", rowIdx % 2 !== 0 && "bg-muted/20")} onClick={() => onViewDetail(enrollment)}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-foreground">{enrollment.studentName}</p>
                        <p className="text-[10px] text-muted-foreground">{enrollment.studentEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell className={classesView === "list" ? "max-w-[200px]" : "text-center"}>
                      {classesView === "count" ? (
                        <div className="flex items-center justify-center gap-1">
                          <GraduationCap className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-medium">{enrollment.classes.length}</span>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          {enrollment.classes.map((cls) => (
                            <p key={cls.id} className="text-xs text-foreground leading-snug">
                              <span className="font-medium">{cls.name}</span>
                              {cls.day || cls.time ? (
                                <span className="text-muted-foreground">
                                  {" "}({[formatClassDay(cls.day), cls.time].filter(Boolean).join(" · ")})
                                </span>
                              ) : null}
                            </p>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold text-foreground">€{enrollment.totalPrice}</TableCell>
                    {visibleColumns.paymentMethod !== false && <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{formatPaymentMethod(enrollment.paymentMethod)}</TableCell>}
                    {visibleColumns.date !== false && <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{format(new Date(enrollment.date), "d MMM yyyy", { locale: es })}</TableCell>}
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("text-[10px] font-medium", statusCfg.className)}>
                        {statusCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onViewDetail(enrollment); }}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger><TooltipContent side="bottom"><p>Ver detalle</p></TooltipContent></Tooltip>
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
          itemLabel="matrículas"
        />
      )}
    </div>
  );
}
