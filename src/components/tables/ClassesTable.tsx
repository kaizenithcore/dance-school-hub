import { useState, useMemo, useEffect } from "react";
import { ClassRecord } from "@/lib/data/mockClassRecords";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Eye, Pencil, Trash2, Search, Users, ChevronLeft, ChevronRight, Loader2, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  active: { label: "Activa", className: "bg-success/15 text-success border-success/20" },
  inactive: { label: "Inactiva", className: "bg-muted text-muted-foreground border-border" },
  draft: { label: "Borrador", className: "bg-warning/15 text-warning border-warning/20" },
};

const PAGE_SIZE = 8;
const PAGE_PREFS_KEY = "classes-table-page";

type ClassSortKey = "name" | "teacher" | "discipline" | "category" | "frequency" | "price" | "occupancy" | "status";

interface ClassesTableProps {
  classes: ClassRecord[];
  isLoading?: boolean;
  onPreview: (cls: ClassRecord) => void;
  onEdit: (cls: ClassRecord) => void;
  onDelete: (cls: ClassRecord) => void;
}

export function ClassesTable({ classes, isLoading = false, onPreview, onEdit, onDelete }: ClassesTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<ClassSortKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(() => {
    if (typeof window === "undefined") return 0;
    const raw = window.localStorage.getItem(PAGE_PREFS_KEY);
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
  });

  const filtered = useMemo(() => {
    return classes.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.teacher.toLowerCase().includes(search.toLowerCase()) ||
        c.discipline.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [classes, search, statusFilter]);

  const sorted = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1;
    const rows = [...filtered];

    rows.sort((a, b) => {
      const getValue = (cls: ClassRecord) => {
        switch (sortKey) {
          case "name":
            return cls.name.toLowerCase();
          case "teacher":
            return cls.teacher.toLowerCase();
          case "discipline":
            return cls.discipline.toLowerCase();
          case "category":
            return cls.category.toLowerCase();
          case "frequency":
            return cls.weeklyFrequency || 1;
          case "price":
            return cls.price;
          case "occupancy":
            return cls.capacity > 0 ? cls.enrolled / cls.capacity : 0;
          case "status":
            return STATUS_MAP[cls.status]?.label || cls.status;
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

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

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

  const toggleSort = (key: ClassSortKey) => {
    setPage(0);
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  const renderSortableHead = (label: string, key: ClassSortKey, className?: string, align: "left" | "center" | "right" = "left") => (
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

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, profesor o disciplina..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activas</SelectItem>
            <SelectItem value="inactive">Inactivas</SelectItem>
            <SelectItem value="draft">Borrador</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card shadow-soft overflow-x-auto">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {renderSortableHead("Nombre", "name")}
              {renderSortableHead("Profesor", "teacher")}
              {renderSortableHead("Disciplina", "discipline", "hidden md:table-cell")}
              {renderSortableHead("Categoría", "category", "hidden lg:table-cell")}
              {renderSortableHead("Frecuencia", "frequency", undefined, "center")}
              {renderSortableHead("Precio", "price", undefined, "right")}
              {renderSortableHead("Ocupación", "occupancy", "text-center hidden sm:table-cell", "center")}
              {renderSortableHead("Estado", "status", undefined, "center")}
              <TableHead className="text-xs text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando clases...
                  </div>
                </TableCell>
              </TableRow>
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <EmptyState type={search || statusFilter !== "all" ? "search" : "classes"} />
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((cls) => {
                const status = STATUS_MAP[cls.status];
                const occupancy = cls.capacity > 0 ? Math.round((cls.enrolled / cls.capacity) * 100) : 0;
                const targetFrequency = Math.max(cls.weeklyFrequency || 1, 1);
                const scheduled = cls.scheduledCount || 0;
                const remaining = Math.max(targetFrequency - scheduled, 0);
                return (
                  <TableRow key={cls.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-foreground">{cls.name}</p>
                        <p className="text-[10px] text-muted-foreground">{cls.room}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{cls.teacher}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{cls.discipline}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{cls.category}</TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5">
                        <span className="text-xs font-medium text-foreground">{scheduled}/{targetFrequency}</span>
                        <span
                          className={cn(
                            "text-[10px]",
                            scheduled > targetFrequency
                              ? "text-destructive"
                              : remaining === 0
                                ? "text-success"
                                : "text-warning"
                          )}
                        >
                          {scheduled > targetFrequency ? "exceso" : remaining === 0 ? "ok" : `faltan ${remaining}`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-foreground text-right">€{cls.price}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              occupancy >= 90 ? "bg-destructive" : occupancy >= 70 ? "bg-warning" : "bg-primary"
                            )}
                            style={{ width: `${occupancy}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-12 text-right">
                          {cls.enrolled}/{cls.capacity}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("text-[10px] font-medium", status.className)}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip><TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPreview(cls)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger><TooltipContent side="bottom"><p>Vista previa</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(cls)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger><TooltipContent side="bottom"><p>Editar</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(cls)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger><TooltipContent side="bottom"><p>Eliminar</p></TooltipContent></Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Página anterior"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Página anterior</TooltipContent>
            </Tooltip>
            <span className="text-xs text-muted-foreground px-2">
              {page + 1} / {totalPages}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Página siguiente"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Página siguiente</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
}
