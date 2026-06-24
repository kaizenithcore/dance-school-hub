/**
 * TableToolbar — shared search + filter toggle + column selector bar.
 * Used by all admin tables to ensure consistent UI/UX.
 */
import { Search, Filter, FilterX, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface ColumnDef {
  key: string;
  label: string;
}

interface TableToolbarProps {
  /** Search value */
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;

  /** Filter panel toggle */
  filtersOpen?: boolean;
  onFiltersOpenChange?: (v: boolean) => void;
  activeFilterCount?: number;

  /** Column visibility */
  columns?: ColumnDef[];
  visibleColumns?: Record<string, boolean>;
  onColumnToggle?: (key: string, visible: boolean) => void;

  /** Optional right-side extra content */
  extra?: React.ReactNode;
}

export function TableToolbar({
  search, onSearchChange, searchPlaceholder = "Buscar...",
  filtersOpen, onFiltersOpenChange, activeFilterCount = 0,
  columns, visibleColumns, onColumnToggle,
  extra,
}: TableToolbarProps) {
  const hasFilters = onFiltersOpenChange !== undefined;
  const hasColumns = columns && columns.length > 0 && onColumnToggle;

  return (
    <div className="flex items-center gap-2">
      {/* Search — always visible */}
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Filter toggle */}
      {hasFilters && (
        <Button
          variant={filtersOpen || activeFilterCount > 0 ? "default" : "outline"}
          size="sm"
          className="h-9 shrink-0"
          onClick={() => onFiltersOpenChange(!filtersOpen)}
        >
          {filtersOpen
            ? <FilterX className="h-3.5 w-3.5 mr-1.5" />
            : <Filter className="h-3.5 w-3.5 mr-1.5" />}
          Filtros
          {activeFilterCount > 0 && (
            <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-foreground text-[10px] font-bold text-primary">
              {activeFilterCount}
            </span>
          )}
        </Button>
      )}

      {/* Column visibility */}
      {hasColumns && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 shrink-0">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
              Columnas
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Mostrar columnas</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {columns.map(({ key, label }) => (
              <DropdownMenuCheckboxItem
                key={key}
                checked={visibleColumns?.[key] ?? true}
                onCheckedChange={(checked) => onColumnToggle(key, checked === true)}
              >
                {label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {extra}
    </div>
  );
}
