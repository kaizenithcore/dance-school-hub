import { useState, useMemo } from "react";
import { ClassRecord } from "@/lib/data/mockClassRecords";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2, Search, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  active: { label: "Activa", className: "bg-success/15 text-success border-success/20" },
  inactive: { label: "Inactiva", className: "bg-muted text-muted-foreground border-border" },
  draft: { label: "Borrador", className: "bg-warning/15 text-warning border-warning/20" },
};

const PAGE_SIZE = 8;

interface ClassesTableProps {
  classes: ClassRecord[];
  onEdit: (cls: ClassRecord) => void;
  onDelete: (cls: ClassRecord) => void;
}

export function ClassesTable({ classes, onEdit, onDelete }: ClassesTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

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

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

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
      <div className="rounded-lg border border-border bg-card shadow-soft overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">Nombre</TableHead>
              <TableHead className="text-xs">Profesor</TableHead>
              <TableHead className="text-xs hidden md:table-cell">Disciplina</TableHead>
              <TableHead className="text-xs hidden lg:table-cell">Categoría</TableHead>
              <TableHead className="text-xs text-right">Precio</TableHead>
              <TableHead className="text-xs text-center hidden sm:table-cell">Ocupación</TableHead>
              <TableHead className="text-xs text-center">Estado</TableHead>
              <TableHead className="text-xs text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">
                  No se encontraron clases
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((cls) => {
                const status = STATUS_MAP[cls.status];
                const occupancy = cls.capacity > 0 ? Math.round((cls.enrolled / cls.capacity) * 100) : 0;
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
                    <TableCell className="text-sm font-medium text-foreground text-right">${cls.price}</TableCell>
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
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(cls)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(cls)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              {page + 1} / {totalPages}
            </span>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
