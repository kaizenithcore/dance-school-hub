/**
 * TablePagination — shared pagination bar with page size selector.
 * Placed BELOW the table in all admin views.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const PAGE_SIZE_OPTIONS = [8, 15, 25, 50] as const;
export type PageSizeOption = typeof PAGE_SIZE_OPTIONS[number];
export const DEFAULT_PAGE_SIZE: PageSizeOption = 8;

/** Read persisted page size from localStorage */
export function readPageSize(storageKey: string): PageSizeOption {
  if (typeof window === "undefined") return DEFAULT_PAGE_SIZE;
  const raw = window.localStorage.getItem(storageKey);
  const parsed = Number(raw);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)
    ? (parsed as PageSizeOption)
    : DEFAULT_PAGE_SIZE;
}

interface TablePaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  /** Label shown in "Mostrando X–Y de Z" */
  itemLabel?: string;
}

export function TablePagination({
  page, totalPages, totalItems, pageSize,
  onPageChange, onPageSizeChange,
  itemLabel = "resultados",
}: TablePaginationProps) {
  if (totalItems === 0) return null;

  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
      <p className="text-xs text-muted-foreground">
        Mostrando {from}–{to} de {totalItems} {itemLabel}
      </p>

      <div className="flex items-center gap-2">
        {/* Prev / Next */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground px-2 min-w-[48px] text-center">
            {page + 1} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={page >= totalPages - 1}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Page size */}
        <Select
          value={String(pageSize)}
          onValueChange={(v) => { onPageSizeChange(Number(v)); onPageChange(0); }}
        >
          <SelectTrigger className="w-[90px] h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((s) => (
              <SelectItem key={s} value={String(s)} className="text-xs">
                {s} / pág.
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
