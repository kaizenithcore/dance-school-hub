import { useState, useMemo } from "react";
import { EnrollmentRecord, EnrollmentStatus } from "@/lib/data/mockEnrollments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Eye, ChevronLeft, ChevronRight, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_CONFIG: Record<EnrollmentStatus, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "bg-warning/15 text-warning border-warning/20" },
  confirmed: { label: "Confirmada", className: "bg-success/15 text-success border-success/20" },
  declined: { label: "Rechazada", className: "bg-destructive/15 text-destructive border-destructive/20" },
  cancelled: { label: "Cancelada", className: "bg-muted text-muted-foreground border-border" },
};

const PAGE_SIZE = 8;

interface EnrollmentsTableProps {
  enrollments: EnrollmentRecord[];
  onViewDetail: (enrollment: EnrollmentRecord) => void;
}

export function EnrollmentsTable({ enrollments, onViewDetail }: EnrollmentsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    return enrollments.filter((e) => {
      const matchSearch =
        e.studentName.toLowerCase().includes(search.toLowerCase()) ||
        e.studentEmail.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || e.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [enrollments, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Stats
  const counts = useMemo(() => {
    const c: Record<string, number> = { pending: 0, confirmed: 0, declined: 0, cancelled: 0 };
    enrollments.forEach((e) => c[e.status]++);
    return c;
  }, [enrollments]);

  return (
    <div className="space-y-4">
      {/* Quick stats */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(STATUS_CONFIG) as EnrollmentStatus[]).map((status) => {
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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o email..."
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
              <TableHead className="text-xs text-center">Clases</TableHead>
              <TableHead className="text-xs text-right">Total</TableHead>
              <TableHead className="text-xs hidden md:table-cell">Método de Pago</TableHead>
              <TableHead className="text-xs hidden lg:table-cell">Fecha</TableHead>
              <TableHead className="text-xs text-center">Estado</TableHead>
              <TableHead className="text-xs text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                  No se encontraron inscripciones
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((enrollment) => {
                const statusCfg = STATUS_CONFIG[enrollment.status];
                return (
                  <TableRow key={enrollment.id} className="cursor-pointer" onClick={() => onViewDetail(enrollment)}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-foreground">{enrollment.studentName}</p>
                        <p className="text-[10px] text-muted-foreground">{enrollment.studentEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <GraduationCap className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium">{enrollment.classes.length}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold text-foreground">${enrollment.totalPrice}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{enrollment.paymentMethod}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                      {format(new Date(enrollment.date), "d MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("text-[10px] font-medium", statusCfg.className)}>
                        {statusCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onViewDetail(enrollment); }}>
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
