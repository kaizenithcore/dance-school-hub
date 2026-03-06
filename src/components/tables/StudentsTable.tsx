import { useState, useMemo } from "react";
import { StudentRecord } from "@/lib/data/mockStudents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Eye, ChevronLeft, ChevronRight, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  active: { label: "Activo", className: "bg-success/15 text-success border-success/20" },
  inactive: { label: "Inactivo", className: "bg-muted text-muted-foreground border-border" },
};

const PAGE_SIZE = 8;

interface StudentsTableProps {
  students: StudentRecord[];
  onViewProfile: (student: StudentRecord) => void;
}

export function StudentsTable({ students, onViewProfile }: StudentsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase()) ||
        s.phone.includes(search);
      const matchStatus = statusFilter === "all" || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [students, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Filters */}
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
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card shadow-soft overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">Nombre</TableHead>
              <TableHead className="text-xs hidden md:table-cell">Email</TableHead>
              <TableHead className="text-xs hidden lg:table-cell">Teléfono</TableHead>
              <TableHead className="text-xs text-center">Clases</TableHead>
              <TableHead className="text-xs text-center">Estado</TableHead>
              <TableHead className="text-xs text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                  No se encontraron alumnos
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((student) => {
                const status = STATUS_MAP[student.status];
                return (
                  <TableRow key={student.id} className="cursor-pointer" onClick={() => onViewProfile(student)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-semibold">
                          {student.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{student.name}</p>
                          <p className="text-[10px] text-muted-foreground md:hidden">{student.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{student.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{student.phone}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <GraduationCap className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm text-foreground font-medium">{student.enrolledClasses.length}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("text-[10px] font-medium", status.className)}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onViewProfile(student); }}>
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
