import { useState, useMemo, useEffect } from "react";
import { Class, TeacherRecord } from "@/lib/data/mockTeachers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Book, DollarSign, Loader2, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  active: { label: "Activo", className: "bg-success/15 text-success border-success/20" },
  inactive: { label: "Inactivo", className: "bg-muted text-muted-foreground border-border" },
};

const PAGE_SIZE = 8;
const PAGE_PREFS_KEY = "teachers-table-page";

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
            return teacher.aulary;
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
    return filtered.reduce((sum, teacher) => sum + (teacher.aulary || 0), 0);
  }, [filtered]);

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o teléfono..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
        <div className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-3">
          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Total salarios:</span>
          <span className="text-sm font-semibold text-foreground">${totalSalary}</span>
          <span className="text-[10px] text-muted-foreground">/mes</span>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-soft overflow-x-auto">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {renderSortableHead("Nombre", "name")}
              {renderSortableHead("Email", "email", "hidden md:table-cell")}
              {renderSortableHead("Teléfono", "phone", "hidden lg:table-cell")}
              {renderSortableHead("Clases", "classes", undefined, "center")}
              {renderSortableHead("Salario", "salary", undefined, "right")}
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
              paginated.map((teacher) => {
                const status = STATUS_MAP[teacher.status];
                return (
                  <TableRow key={teacher.id} className="cursor-pointer" onClick={() => onViewProfile(teacher)}>
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
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{teacher.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{teacher.phone}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Book className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm text-foreground font-medium">{teacher.assignedClasses.length}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-sm font-semibold text-foreground">${teacher.aulary}</span>
                        <span className="text-[10px] text-muted-foreground">/mes</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("text-[10px] font-medium", status.className)}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onViewProfile(teacher)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom"><p>Ver perfil</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditClasses(teacher)}>
                              <Book className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom"><p>Editar clases</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(teacher)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom"><p>Editar</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(teacher)}>
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

      {!isLoading && totalPages > 1 && (
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
