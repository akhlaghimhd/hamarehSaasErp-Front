/**
 * FE-P0-T10 — Shared Table / Data Display (UI-05)
 *
 * - page-size selector
 * - distinct empty-initial vs empty-search
 * - skeleton loading
 * - stripe + hover from design tokens
 */

"use client";

import * as React from "react";
import { cn } from "@/shared/lib/utils";
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
};

const DEFAULT_PAGE_SIZES = [10, 20, 50];

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
  pageSize = 10,
  onPageSizeChange,
  page = 1,
  total,
  onPageChange,
  toolbar,
  className,
  skeletonRows = 5,
}: DataTableProps<T>) {
  const totalCount = total ?? data.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">{toolbar}</div>
        {onPageSizeChange ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="whitespace-nowrap">تعداد در صفحه</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange(Number(v))}
            >
              <SelectTrigger className="h-8 w-[4.5rem]" aria-label="تعداد ردیف در صفحه">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-2 rounded-lg border border-border/60 p-3">
          {Array.from({ length: skeletonRows }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={isFiltered ? SearchX : Inbox}
          title={isFiltered ? emptySearchTitle : emptyTitle}
          description={isFiltered ? emptySearchDescription : emptyDescription}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.id} className={col.headerClassName}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={getRowKey(row, index)}>
                {columns.map((col) => (
                  <TableCell key={col.id} className={col.className}>
                    {col.cell(row, index)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {!loading && totalCount > 0 && onPageChange ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            صفحه {page} از {totalPages} · {totalCount} مورد
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
