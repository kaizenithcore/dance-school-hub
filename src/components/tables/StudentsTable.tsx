import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TablePagination, readPageSize, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/components/tables/TablePagination";
import { StudentRecord } from "@/lib/data/mockStudents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, GraduationCap, SlidersHorizontal, Loader2, ArrowUpDown, ChevronUp, ChevronDown, Filter, FilterX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import type { SchoolStudentField } from "@/lib/api/studentFields";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  active: { label: "Activo", className: "bg-success/15 text-success border-success/20" },
  inactive: { label: "Inactivo", className: "bg-muted text-muted-foreground border-border" },
};

const PAYMENT_LABELS: Record<string, string> = {
  monthly: "Mensual",
  per_class: "Por clase",
  none: "—",
};

const COLUMN_PREFS_KEY = "students-table-visible-columns";
const PAGE_PREFS_KEY = "students-table-page";
const PAGE_SIZE_KEY = "students-table-page-size";

type StudentsVisibleColumns = {
  email: boolean;
  phone: boolean;
  locality: boolean;
  document: boolean;
  address: boolean;
};

type StudentSortKey = "name" | "email" | "phone" | "locality" | "document" | "address" | "classes" | "monthlyTotal" | "status" | "joinDate";

const DEFAULT_VISIBLE_COLUMNS: StudentsVisibleColumns = {
  email: true,
  phone: true,
  locality: true,
  document: true,
  address: false,
};

interface StudentsTableProps {
  students: StudentRecord[];
  customFields?: SchoolStudentField[];
  isLoading?: boolean;
  onViewProfile: (student: StudentRecord) => void;
  onEdit: (student: StudentRecord) => void;
  onManageClasses: (student: StudentRecord) => void;
  onDelete: (student: StudentRecord) => void;
}

function formatCustomFieldValue(value: unknown): string {
  if (value == null) return "-";
  if (typeof value === "string") return value.trim() || "-";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

export function StudentsTable({ students, customFields = [], isLoading = false, onViewProfile, onEdit, onManageClasses, onDelete }: StudentsTableProps) {
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [localityFilter, setLocalityFilter] = useState<string>("all");
  const [documentFilter, setDocumentFilter] = useState<string>("");
  const [addressFilter, setAddressFilter] = useState<string>("");
  const [sortKey, setSortKey] = useState<StudentSortKey>("joinDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState<number>(() => {
    const raw = window.localStorage.getItem(PAGE_SIZE_KEY);
    const parsed = Number(raw);
    return PAGE_SIZE_OPTIONS.includes(parsed as typeof PAGE_SIZE_OPTIONS[number]) ? parsed : DEFAULT_PAGE_SIZE;
  });
  const [visibleColumns, setVisibleColumns] = useState<StudentsVisibleColumns>(() => {
    if (typeof window === "undefined") return DEFAULT_VISIBLE_COLUMNS;
    const raw = window.localStorage.getItem(COLUMN_PREFS_KEY);
    if (!raw) return DEFAULT_VISIBLE_COLUMNS;

    try {
      const parsed = JSON.parse(raw) as Partial<StudentsVisibleColumns>;
      return {
        email: parsed.email ?? DEFAULT_VISIBLE_COLUMNS.email,
        phone: parsed.phone ?? DEFAULT_VISIBLE_COLUMNS.phone,
        locality: parsed.locality ?? DEFAULT_VISIBLE_COLUMNS.locality,
        document: parsed.document ?? DEFAULT_VISIBLE_COLUMNS.document,
        address: parsed.address ?? DEFAULT_VISIBLE_COLUMNS.address,
      };
    } catch {
      return DEFAULT_VISIBLE_COLUMNS;
    }
  });
  const [page, setPage] = useState(() => {
    if (typeof window === "undefined") return 0;
    const raw = window.localStorage.getItem(PAGE_PREFS_KEY);
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
  });

  useEffect(() => {
    window.localStorage.setItem(COLUMN_PREFS_KEY, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    window.localStorage.setItem(PAGE_SIZE_KEY, String(pageSize));
  }, [pageSize]);

  const localityOptions = useMemo(() => {
    return Array.from(
      new Set(
        students
          .map((student) => (student.locality || "").trim())
          .filter((value) => value.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b, "es"));
  }, [students]);

  const tableCustomFields = useMemo(
    () => customFields.filter((field) => field.visible && field.visibleInTable),
    [customFields]
  );

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase()) ||
        s.phone.includes(search) ||
        (s.identityDocumentNumber || "").toLowerCase().includes(search.toLowerCase()) ||
        (s.locality || "").toLowerCase().includes(search.toLowerCase()) ||
        (s.address || "").toLowerCase().includes(search.toLowerCase()) ||
        tableCustomFields.some((field) =>
          formatCustomFieldValue(s.extraData?.[field.key]).toLowerCase().includes(search.toLowerCase())
        );
      const matchStatus = statusFilter === "all" || s.status === statusFilter;
      const matchLocality = localityFilter === "all" || (s.locality || "") === localityFilter;
      const matchDocument = !documentFilter.trim() || (s.identityDocumentNumber || "").toLowerCase().includes(documentFilter.toLowerCase());
      const matchAddress = !addressFilter.trim() || (s.address || "").toLowerCase().includes(addressFilter.toLowerCase());
      return matchSearch && matchStatus && matchLocality && matchDocument && matchAddress;
    });
  }, [students, search, statusFilter, localityFilter, documentFilter, addressFilter, tableCustomFields]);

  useEffect(() => {
    window.localStorage.setItem(PAGE_PREFS_KEY, String(page));
  }, [page]);

  const getMonthlyTotal = (student: StudentRecord) => {
    if (student.paymentType !== "monthly") return null;
    if (typeof student.monthlyTotalOverride === "number") {
      return student.monthlyTotalOverride;
    }
    return student.enrolledClasses.reduce((sum, c) => sum + c.monthlyPrice, 0);
  };

  const sorted = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1;
    const rows = [...filtered];

    rows.sort((a, b) => {
      const getValue = (student: StudentRecord) => {
        switch (sortKey) {
          case "name":
            return student.name.toLowerCase();
          case "email":
            return student.email.toLowerCase();
          case "phone":
            return (student.phone || "").toLowerCase();
          case "locality":
            return (student.locality || "").toLowerCase();
          case "document":
            return `${student.identityDocumentType || ""}-${student.identityDocumentNumber || ""}`.toLowerCase();
          case "address":
            return (student.address || "").toLowerCase();
          case "classes":
            return student.enrolledClasses.length;
          case "monthlyTotal":
            return getMonthlyTotal(student) ?? -1;
          case "status":
            return STATUS_MAP[student.status]?.label || student.status;
          case "joinDate":
            return student.joinDate || "";
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
    if (totalPages === 0) {
      if (page !== 0) setPage(0);
      return;
    }

    if (page > totalPages - 1) {
      setPage(totalPages - 1);
    }
  }, [page, totalPages]);

  const getDocumentLabel = (student: StudentRecord) => {
    if (!student.identityDocumentType || !student.identityDocumentNumber) {
      return "-";
    }
    const typeLabel = student.identityDocumentType === "dni" ? "DNI" : "Pasaporte";
    return `${typeLabel}: ${student.identityDocumentNumber}`;
  };

  const getMobileSecondary = (student: StudentRecord) => {
    if (visibleColumns.email) return student.email;
    if (visibleColumns.phone) return student.phone || "-";
    if (visibleColumns.locality) return student.locality || "-";
    if (visibleColumns.document) return getDocumentLabel(student);
    if (visibleColumns.address) return student.address || "-";
    for (const field of tableCustomFields) {
      const value = formatCustomFieldValue(student.extraData?.[field.key]);
      if (value !== "-") return `${field.label}: ${value}`;
    }
    return "";
  };

  const visibleDataColumnsCount = Object.values(visibleColumns).filter(Boolean).length;
  const totalColumnCount = 5 + visibleDataColumnsCount + tableCustomFields.length;

  const toggleSort = (key: StudentSortKey) => {
    setPage(0);
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  const renderSortableHead = (label: string, key: StudentSortKey, className?: string, align: "left" | "center" | "right" = "left") => (
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

  const activeFilterCount = [
    statusFilter !== "all",
    localityFilter !== "all",
    documentFilter.trim() !== "",
    addressFilter.trim() !== "",
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Search bar — always visible */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o teléfono..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Filter toggle */}
        <Button
          variant={filtersOpen || activeFilterCount > 0 ? "default" : "outline"}
          size="sm"
          className="h-9 shrink-0"
          onClick={() => setFiltersOpen((o) => !o)}
        >
          {filtersOpen ? <FilterX className="h-3.5 w-3.5 mr-1.5" /> : <Filter className="h-3.5 w-3.5 mr-1.5" />}
          Filtros
          {activeFilterCount > 0 && (
            <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-foreground text-[10px] font-bold text-primary">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {/* Columns */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 shrink-0">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
              Columnas
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Mostrar en resultados</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {[
              { key: "email" as const, label: "Email" },
              { key: "phone" as const, label: "Teléfono" },
              { key: "locality" as const, label: "Localidad" },
              { key: "document" as const, label: "DNI/Pasaporte" },
              { key: "address" as const, label: "Domicilio" },
            ].map(({ key, label }) => (
              <DropdownMenuCheckboxItem
                key={key}
                checked={visibleColumns[key]}
                onCheckedChange={(checked) => setVisibleColumns((prev) => ({ ...prev, [key]: checked === true }))}
              >
                {label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

      </div>

      {/* Collapsible filters */}
      {filtersOpen && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={localityFilter} onValueChange={(v) => { setLocalityFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Localidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las localidades</SelectItem>
              {localityOptions.map((locality) => (
                <SelectItem key={locality} value={locality} className="text-xs">{locality}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="DNI/Pasaporte"
            value={documentFilter}
            onChange={(e) => { setDocumentFilter(e.target.value); setPage(0); }}
            className="h-8 w-[170px] text-xs"
          />

          <Input
            placeholder="Domicilio"
            value={addressFilter}
            onChange={(e) => { setAddressFilter(e.target.value); setPage(0); }}
            className="h-8 w-[170px] text-xs"
          />

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => {
                setStatusFilter("all");
                setLocalityFilter("all");
                setDocumentFilter("");
                setAddressFilter("");
                setPage(0);
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card shadow-soft overflow-x-auto">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {renderSortableHead("Nombre", "name")}
              {visibleColumns.email && renderSortableHead("Email", "email", "hidden md:table-cell")}
              {visibleColumns.phone && renderSortableHead("Teléfono", "phone", "hidden lg:table-cell")}
              {visibleColumns.locality && renderSortableHead("Localidad", "locality", "hidden lg:table-cell")}
              {visibleColumns.document && renderSortableHead("DNI/Pasaporte", "document", "hidden xl:table-cell")}
              {visibleColumns.address && renderSortableHead("Domicilio", "address", "hidden xl:table-cell")}
              {tableCustomFields.map((field) => (
                <TableHead key={field.id} className="text-xs hidden xl:table-cell">{field.label}</TableHead>
              ))}
              {renderSortableHead("Inscripción", "joinDate", "hidden md:table-cell")}
              {renderSortableHead("Clases", "classes", undefined, "center")}
              {renderSortableHead("Mensualidad", "monthlyTotal", undefined, "right")}
              {renderSortableHead("Estado", "status", undefined, "center")}
              <TableHead className="text-xs text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={totalColumnCount}>
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando alumnos...
                  </div>
                </TableCell>
              </TableRow>
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={totalColumnCount}>
                  <EmptyState type={search || statusFilter !== "all" ? "search" : "students"} />
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((student, rowIdx) => {
                const status = STATUS_MAP[student.status];
                const monthlyTotal = getMonthlyTotal(student);
                return (
                  <TableRow key={student.id} className={cn("cursor-pointer hover:bg-accent/50", rowIdx % 2 !== 0 && "bg-muted/20")} onClick={() => onViewProfile(student)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-semibold">
                          {student.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{student.name}</p>
                          {getMobileSecondary(student) && (
                            <p className="text-[10px] text-muted-foreground md:hidden">{getMobileSecondary(student)}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    {visibleColumns.email && <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{student.email}</TableCell>}
                    {visibleColumns.phone && <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{student.phone}</TableCell>}
                    {visibleColumns.locality && <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{student.locality || "-"}</TableCell>}
                    {visibleColumns.document && <TableCell className="text-sm text-muted-foreground hidden xl:table-cell">{getDocumentLabel(student)}</TableCell>}
                    {visibleColumns.address && <TableCell className="text-sm text-muted-foreground hidden xl:table-cell">{student.address || "-"}</TableCell>}
                    {tableCustomFields.map((field) => (
                      <TableCell key={field.id} className="text-sm text-muted-foreground hidden xl:table-cell">
                        {formatCustomFieldValue(student.extraData?.[field.key])}
                      </TableCell>
                    ))}
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                      {student.joinDate ? format(new Date(student.joinDate), "dd/MM/yy", { locale: es }) : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <GraduationCap className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm text-foreground font-medium">{student.enrolledClasses.length}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {monthlyTotal !== null ? (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-sm font-semibold text-foreground">€{monthlyTotal}</span>
                          <span className="text-[10px] text-muted-foreground">/mes</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">{PAYMENT_LABELS[student.paymentType]}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("text-[10px] font-medium", status.className)}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Tooltip><TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onViewProfile(student)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger><TooltipContent side="bottom"><p>Ver perfil</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(student)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger><TooltipContent side="bottom"><p>Editar</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(student)}>
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

      {!isLoading && filtered.length > 0 && (
        <TablePagination
          page={page}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(0); window.localStorage.setItem(PAGE_SIZE_KEY, String(s)); }}
          itemLabel="alumnos"
        />
      )}
    </div>
  );
}
