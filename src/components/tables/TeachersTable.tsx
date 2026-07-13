import { useState, useMemo, useEffect } from "react";
import { Class, TeacherRecord } from "@/lib/data/mockTeachers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Book, DollarSign, Loader2, ArrowUpDown, ChevronUp, ChevronDown, List, Printer } from "lucide-react";
import { openPrintView } from "@/lib/printUtils";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { TablePagination, readPageSize } from "@/components/tables/TablePagination";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  active: { label: "Activo", className: "bg-success/15 text-success border-success/20" },
  inactive: { label: "Inactivo", className: "bg-muted text-muted-foreground border-border" },
};

const PAGE_PREFS_KEY = "teachers-table-page";
const PAGE_SIZE_KEY = "teachers-table-page-size";
const COLUMN_KEY = "teachers-table-columns";
const DEFAULT_COLS = { email: true, phone: true, salary: true };
const CLASSES_VIEW_KEY = "teachers-table-classes-view";

function teacherSalaryValue(teacher: TeacherRecord): number {
  return Number(teacher.salary ?? (teacher as { salay?: number }).salay ?? (teacher as { aulary?: number }).aulary ?? 0) || 0;
}

type TeacherSortKey = "name" | "email" | "phone" | "classes" | "salary" | "status";

interface TeachersTableProps {
  teachers: TeacherRecord[];
  isLoading?: boolean;
  onViewProfile: (teacher: TeacherRecord) => void;
  onEdit: (teacher: TeacherRecord) => void;
  onEditClasses: (teacher: TeacherRecord) => void;
  onDelete: (teacher: TeacherRecord) => void;
}

export function TeachersTable({
  teachers,
  isLoading = false,
  onViewProfile,
  onEdit,
  onEditClasses,
  onDelete,
}: TeachersTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pageSize, setPageSize] = useState(() => readPageSize(PAGE_SIZE_KEY));
  const [classesView, setClassesView] = useState<"count" | "list">(() =>
    (window.localStorage.getItem(CLASSES_VIEW_KEY) as "count" | "list") ?? "count"
  );
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try { const r = window.localStorage.getItem(COLUMN_KEY); return r ? JSON.parse(r) as Record<string, boolean> : DEFAULT_COLS; } catch { return DEFAULT_COLS; }
  });
  const [sortKey, setSortKey] = useState<TeacherSortKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(() => {
    if (typeof window === "undefined") return 0;
    const raw = window.localStorage.getItem(PAGE_PREFS_KEY);
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
  });

  const filtered = useMemo(() => {
    return teachers.filter((t) => {
      const matchSearch =
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.email.toLowerCase().includes(search.toLowerCase()) ||
        t.phone.includes(search);
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [teachers, search, statusFilter]);

  const sorted = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1;
    const rows = [...filtered];

    rows.sort((a, b) => {
      const getValue = (teacher: TeacherRecord) => {
        switch (sortKey) {
          case "name":
            return teacher.name.toLowerCase();
          case "email":
            return (teacher.email || "").toLowerCase();
          case "phone":
            return (teacher.phone || "").toLowerCase();
          case "classes":
            return teacher.assignedClasses.length;
          case "salary":
            return teacherSalaryValue(teacher);
          case "status":
            return STATUS_MAP[teacher.status]?.label || teacher.status;
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

  const totalSalary = useMemo(() => {
    return filtered.reduce((sum, teacher) => sum + teacherSalaryValue(teacher), 0);
  }, [filtered]);

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

  const toggleSort = (key: TeacherSortKey) => {
    setPage(0);
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  const renderSortableHead = (label: string, key: TeacherSortKey, className?: string, align: "left" | "center" | "right" = "left") => (
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
    <div className="space-y-3">
      <TableToolbar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(0); }}
        searchPlaceholder="Buscar por nombre, email o teléfono..."
        filtersOpen={filtersOpen}
        onFiltersOpenChange={setFiltersOpen}
        activeFilterCount={statusFilter !== "all" ? 1 : 0}
        columns={[{ key: "email", label: "Email" }, { key: "phone", label: "Teléfono" }, { key: "salary", label: "Salario" }]}
        visibleColumns={visibleColumns}
        onColumnToggle={(key, v) => { const n = { ...visibleColumns, [key]: v }; setVisibleColumns(n); window.localStorage.setItem(COLUMN_KEY, JSON.stringify(n)); }}
        extra={
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <div className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-3">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Salarios:</span>
              <span className="text-sm font-semibold text-foreground">${totalSalary}/mes</span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0"
                  onClick={() => void openPrintView({
                    title: "Listado de profesores",
                    columns: [
                      { label: "Nombre", key: "name" },
                      { label: "Email", key: "email" },
                      { label: "Teléfono", key: "phone" },
                      { label: "Clases", key: "classes", align: "center" },
                      { label: "Salario/mes", key: "salary", align: "right" },
                      { label: "Estado", key: "statusLabel" },
                    ],
                    rows: filtered.map((t) => ({
                      name: t.name,
                      email: t.email || "-",
                      phone: t.phone || "-",
                      classes: String(t.assignedClasses.length),
                      salary: `€${teacherSalaryValue(t)}`,
                      statusLabel: STATUS_MAP[t.status]?.label ?? t.status,
                    })),
                  })}
                >
                  <Printer className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Imprimir vista actual ({filtered.length})</p></TooltipContent>
            </Tooltip>
          </div>
        }
      />
      {filtersOpen && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
          {statusFilter !== "all" && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => { setStatusFilter("all"); setPage(0); }}>Limpiar</Button>
          )}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card shadow-soft overflow-x-auto">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {renderSortableHead("Nombre", "name")}
              {visibleColumns.email !== false && renderSortableHead("Email", "email", "hidden md:table-cell")}
              {visibleColumns.phone !== false && renderSortableHead("Teléfono", "phone", "hidden lg:table-cell")}
              <TableHead className="text-xs text-center">
                <button type="button"
                  onClick={() => { const n = classesView === "count" ? "list" : "count"; setClassesView(n); window.localStorage.setItem(CLASSES_VIEW_KEY, n); }}
                  className="inline-flex items-center gap-1 hover:text-foreground text-muted-foreground transition-colors"
                  title={classesView === "count" ? "Mostrar nombres de clases" : "Mostrar total de clases"}>
                  Clases <List className="h-3 w-3" />
                </button>
              </TableHead>
              {visibleColumns.salary !== false && renderSortableHead("Salario", "salary", undefined, "right")}
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
                    Cargando profesores...
                  </div>
                </TableCell>
              </TableRow>
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState type={search || statusFilter !== "all" ? "search" : "teachers"} />
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((teacher, rowIdx) => {
                const status = STATUS_MAP[teacher.status];
                return (
                  <TableRow key={teacher.id} className={cn("cursor-pointer hover:bg-accent/50", rowIdx % 2 !== 0 && "bg-muted/20")} onClick={() => onViewProfile(teacher)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                          {teacher.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{teacher.name}</p>
                          <p className="text-[10px] text-muted-foreground md:hidden">{teacher.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    {visibleColumns.email !== false && <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{teacher.email}</TableCell>}
                    {visibleColumns.phone !== false && <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{teacher.phone}</TableCell>}
                    <TableCell className={classesView === "list" ? "max-w-[200px]" : "text-center"}>
                      {classesView === "count" ? (
                        <div className="flex items-center justify-center gap-1">
                          <Book className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm text-foreground font-medium">{teacher.assignedClasses.length}</span>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          {teacher.assignedClasses.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Sin clases</span>
                          ) : teacher.assignedClasses.slice(0, 3).map((cls) => (
                            <p key={cls.id} className="text-xs text-foreground leading-snug truncate">{cls.name}</p>
                          ))}
                          {teacher.assignedClasses.length > 3 && (
                            <p className="text-[10px] text-muted-foreground">+{teacher.assignedClasses.length - 3} más</p>
                          )}
                        </div>
                      )}
                    </TableCell>
                    {visibleColumns.salary !== false && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-sm font-semibold text-foreground">${teacherSalaryValue(teacher)}</span>
                          <span className="text-[10px] text-muted-foreground">/mes</span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("text-[10px] font-medium", status.className)}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Ver perfil" onClick={() => onViewProfile(teacher)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom"><p>Ver perfil</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Editar profesor" onClick={() => onEdit(teacher)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom"><p>Editar</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" aria-label="Eliminar profesor" onClick={() => onDelete(teacher)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom"><p>Eliminar</p></TooltipContent>
                        </Tooltip>
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
          itemLabel="profesores"
        />
      )}
    </div>
  );
}
