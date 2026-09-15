/**
 * FE-P0-T10 — Shared Table / Data Display (UI-05)
 *
 * High-volume list defaults: compact density, sticky header, page-size, empty states.
 */

"use client";

import * as React from "react";
import { cn, toFaDigits } from "@/shared/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Button } from "@/shared/components/ui/button";
import { ChevronLeft, ChevronRight, SearchX, Inbox } from "lucide-react";

export type DataTableColumn<T> = {
  id: string;
  header: React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T, index: number) => string;
  loading?: boolean;
  /** True when user applied search/filter (empty message differs). */
  isFiltered?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptySearchTitle?: string;
  emptySearchDescription?: string;
  pageSizeOptions?: number[];
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  page?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  toolbar?: React.ReactNode;
  className?: string;
  skeletonRows?: number;
  /** compact = denser rows for high-volume operational lists */
  density?: "default" | "compact";
  /** Optional row click (e.g. open detail) */
  onRowClick?: (row: T) => void;
};

const DEFAULT_PAGE_SIZES = [10, 20, 50, 100];

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  loading = false,
  isFiltered = false,
  emptyTitle = "موردی ثبت نشده",
  emptyDescription = "هنوز داده‌ای برای نمایش وجود ندارد.",
  emptySearchTitle = "نتیجه‌ای برای این جستجو نیست",
  emptySearchDescription = "عبارت یا فیلتر را تغییر دهید و دوباره تلاش کنید.",
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  pageSize = 20,
  onPageSizeChange,
  page = 1,
  total,
  onPageChange,
  toolbar,
  className,
  skeletonRows = 8,
  density = "default",
  onRowClick,
}: DataTableProps<T>) {
  const totalCount = total ?? data.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const compact = density === "compact";

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">{toolbar}</div>
        {onPageSizeChange ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="whitespace-nowrap">در هر صفحه</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange(Number(v))}
            >
              <SelectTrigger
                className="h-8 w-[4.75rem]"
                aria-label="تعداد ردیف در صفحه"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {toFaDigits(n)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-1.5 rounded-lg border border-border/60 p-2.5">
          {Array.from({ length: skeletonRows }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn("w-full", compact ? "h-8" : "h-9")}
            />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={isFiltered ? SearchX : Inbox}
          title={isFiltered ? emptySearchTitle : emptyTitle}
          description={isFiltered ? emptySearchDescription : emptyDescription}
        />
      ) : (
        <div className="relative max-h-[min(70vh,40rem)] overflow-auto rounded-lg border border-border/60">
          <Table className="border-0">
            <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
              <TableRow className="hover:bg-transparent">
                {columns.map((col) => (
                  <TableHead
                    key={col.id}
                    className={cn(
                      compact && "h-8 px-2 text-[11px]",
                      col.headerClassName
                    )}
                  >
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow
                  key={getRowKey(row, index)}
                  className={cn(
                    onRowClick && "cursor-pointer",
                    compact && "[&_td]:py-1.5"
                  )}
                  onClick={
                    onRowClick
                      ? () => {
                          onRowClick(row);
                        }
                      : undefined
                  }
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.id}
                      className={cn(compact && "px-2 text-[13px]", col.className)}
                    >
                      {col.cell(row, index)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && totalCount > 0 && onPageChange ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">
            صفحه {toFaDigits(page)} از {toFaDigits(totalPages)} ·{" "}
            {toFaDigits(totalCount)} مورد
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={!canPrev}
              onClick={() => onPageChange(page - 1)}
              aria-label="صفحه قبل"
            >
              <ChevronRight className="h-4 w-4" />
              قبل
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={!canNext}
              onClick={() => onPageChange(page + 1)}
              aria-label="صفحه بعد"
            >
              بعد
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
