/**
 * FE-ORG — فهرست سراسری واحدهای سازمانی (FINAL PERF tenant-wide)
 * bulk، فیلتر، sort، ستون‌ها، فرم کامل
 */
"use client";

import {
  Columns3, Loader2, Network, Pencil, Plus,
  Power, PowerOff, RotateCcw, Search, Trash2, X,
} from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { cn, toFaDigits } from "@/shared/lib/utils";
import { companyDetailPath } from "../lib/company-ref";
import { IconAction, fd } from "./companies-list-helpers";
import {
  MSG_NO_ACCESS, ALL, COLS, formatCodeDisplay,
} from "./departments-list-helpers";
import { useDepartmentsListPage } from "./use-departments-list-page";
import { DepartmentsListDialogs } from "./departments-list-dialogs";

export function DepartmentsListPage() {
  const c = useDepartmentsListPage();
  const SortIcon = c.SortIcon;

  if (!c.canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="واحدهای سازمانی"
          icon={<Network className="h-4 w-4" />}
          breadcrumbs={[
            { label: "سازمان", href: "/dashboard/organization" },
            { label: "واحدها" },
          ]}
        />
        <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          {MSG_NO_ACCESS}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-0 flex-col gap-3">
        <PageHeader
          title="واحدهای سازمانی"
          icon={<Network className="h-4 w-4" />}
          description="فهرست واحدهای همه شرکت‌ها — ثبت، ویرایش و مدیریت وضعیت"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "سازمان", href: "/dashboard/organization" },
            { label: "واحدها" },
          ]}
          actions={
            c.canCreate && !c.isDeletedView ? (
              <Button size="sm" className="h-8 gap-1.5" onClick={c.openCreate}>
                <Plus className="h-4 w-4" />
                واحد جدید
              </Button>
            ) : null
          }
        />

        {c.isError ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <span>بارگذاری واحدها ممکن نشد. دوباره تلاش کنید.</span>
            <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => c.refetch()}>
              تلاش مجدد
            </Button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className={cn("h-8 ps-8 text-sm", c.query && "pe-8")}
              placeholder="نام، کد، شرکت، شعبه…"
              value={c.query}
              onChange={(e) => {
                c.setQuery(e.target.value);
                c.setPage(1);
              }}
            />
            {c.query ? (
              <button
                type="button"
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted"
                aria-label="پاک کردن جستجو"
                onClick={() => {
                  c.setQuery("");
                  c.setPage(1);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <Select
            value={c.companyFilter}
            onValueChange={(v) => {
              c.setCompanyFilter(v);
              c.setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[12rem]">
              <SelectValue placeholder="شرکت" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>همه شرکت‌ها</SelectItem>
              {c.companyList.map((co) => (
                <SelectItem key={co.company_id} value={co.company_id}>
                  {co.legal_name || co.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={c.membershipFilter}
            onValueChange={(v) => {
              c.setMembershipFilter(v as typeof c.membershipFilter);
              c.setPage(1);
              c.setSelected(new Set());
            }}
          >
            <SelectTrigger className="h-8 w-[10rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">واحدهای جاری</SelectItem>
              <SelectItem value="deleted">حذف‌شده‌ها</SelectItem>
            </SelectContent>
          </Select>
          {!c.isDeletedView ? (
            <Select
              value={c.statusFilter}
              onValueChange={(v) => {
                c.setStatusFilter(v as typeof c.statusFilter);
                c.setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[8.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                <SelectItem value="active">فعال</SelectItem>
                <SelectItem value="inactive">غیرفعال</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1">
                <Columns3 className="h-3.5 w-3.5" />
                ستون‌ها
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>نمایش ستون‌ها</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COLS.filter((col) => col.hideable !== false).map((col) => (
                <DropdownMenuItem
                  key={col.id}
                  className="gap-2"
                  onSelect={(e) => e.preventDefault()}
                  onClick={() => c.setVisible((v) => ({ ...v, [col.id]: !v[col.id] }))}
                >
                  <Checkbox checked={c.visible[col.id] !== false} />
                  {col.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {c.isRefreshing ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
        </div>

        {c.selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              {c.bulkBusy ? "در حال انجام…" : `${toFaDigits(c.selected.size)} مورد انتخاب‌شده`}
            </span>
            {!c.bulkBusy && c.isDeletedView && c.canUpdate ? (
              <Button type="button" size="sm" className="h-7 gap-1" onClick={() => c.requestBulk("restore", c.selectedRows)}>
                <RotateCcw className="h-3.5 w-3.5" />
                بازگردانی
              </Button>
            ) : null}
            {!c.bulkBusy && !c.isDeletedView && c.canUpdate ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 gap-1"
                  onClick={() => c.requestBulk("activate", c.selectedRows.filter((r) => r.is_active === false))}
                >
                  <Power className="h-3.5 w-3.5" />
                  فعال
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1"
                  onClick={() => c.requestBulk("deactivate", c.selectedRows.filter((r) => r.is_active !== false))}
                >
                  <PowerOff className="h-3.5 w-3.5" />
                  غیرفعال
                </Button>
              </>
            ) : null}
            {!c.bulkBusy && !c.isDeletedView && c.canDelete ? (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="h-7 gap-1"
                onClick={() => c.requestBulk("delete", c.selectedRows)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                حذف
              </Button>
            ) : null}
            {!c.bulkBusy ? (
              <Button type="button" size="sm" variant="ghost" className="h-7" onClick={() => c.setSelected(new Set())}>
                پاک کردن انتخاب
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="overflow-auto rounded-xl border">
          {c.isInitialLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : c.pageRows.length === 0 ? (
            <div className="p-8">
              <EmptyState title={c.isFiltered ? "نتیجه‌ای پیدا نشد" : "واحدی ثبت نشده"} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 px-2">
                    <Checkbox
                      checked={c.allPageSelected ? true : c.somePageSelected ? "indeterminate" : false}
                      onCheckedChange={(checked) => {
                        c.setSelected((prev) => {
                          const n = new Set(prev);
                          if (checked) c.pageIds.forEach((id) => n.add(id));
                          else c.pageIds.forEach((id) => n.delete(id));
                          return n;
                        });
                      }}
                    />
                  </TableHead>
                  {c.visible.name !== false ? (
                    <TableHead className="cursor-pointer px-2" onClick={() => c.toggleSort("name")}>
                      نام <SortIcon k="name" />
                    </TableHead>
                  ) : null}
                  {c.visible.code !== false ? (
                    <TableHead className="cursor-pointer px-2" onClick={() => c.toggleSort("code")}>
                      کد <SortIcon k="code" />
                    </TableHead>
                  ) : null}
                  {c.visible.company !== false ? (
                    <TableHead className="cursor-pointer px-2" onClick={() => c.toggleSort("company")}>
                      شرکت <SortIcon k="company" />
                    </TableHead>
                  ) : null}
                  {c.visible.branch !== false ? (
                    <TableHead className="cursor-pointer px-2" onClick={() => c.toggleSort("branch")}>
                      شعبه <SortIcon k="branch" />
                    </TableHead>
                  ) : null}
                  {c.visible.status !== false ? (
                    <TableHead className="cursor-pointer px-2" onClick={() => c.toggleSort("status")}>
                      وضعیت <SortIcon k="status" />
                    </TableHead>
                  ) : null}
                  {c.visible.created !== false ? (
                    <TableHead className="cursor-pointer px-2" onClick={() => c.toggleSort("created")}>
                      تاریخ ایجاد <SortIcon k="created" />
                    </TableHead>
                  ) : null}
                  {c.visible.actions !== false ? <TableHead className="px-2">عملیات</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {c.pageRows.map((row) => {
                  const codeDisp = formatCodeDisplay(row.code);
                  return (
                    <TableRow key={row.department_id} data-state={c.selected.has(row.department_id) ? "selected" : undefined}>
                      <TableCell className="px-2">
                        <Checkbox
                          checked={c.selected.has(row.department_id)}
                          onCheckedChange={(checked) => {
                            c.setSelected((prev) => {
                              const n = new Set(prev);
                              if (checked) n.add(row.department_id);
                              else n.delete(row.department_id);
                              return n;
                            });
                          }}
                        />
                      </TableCell>
                      {c.visible.name !== false ? (
                        <TableCell className="px-2 font-medium">{row.name}</TableCell>
                      ) : null}
                      {c.visible.code !== false ? (
                        <TableCell className="px-2 font-mono text-xs" dir={codeDisp.dir}>
                          {codeDisp.text}
                        </TableCell>
                      ) : null}
                      {c.visible.company !== false ? (
                        <TableCell className="px-2 text-xs">
                          {row.company_id ? (
                            <a href={companyDetailPath(row.company_id)} className="text-primary hover:underline">
                              {row.company_name}
                            </a>
                          ) : (
                            row.company_name
                          )}
                        </TableCell>
                      ) : null}
                      {c.visible.branch !== false ? (
                        <TableCell className="px-2 text-xs">{row.branch_name}</TableCell>
                      ) : null}
                      {c.visible.status !== false ? (
                        <TableCell className="px-2">
                          <StatusChip
                            tone={row.is_active !== false ? "success" : "neutral"}
                            label={row.is_active !== false ? "فعال" : "غیرفعال"}
                          />
                        </TableCell>
                      ) : null}
                      {c.visible.created !== false ? (
                        <TableCell className="px-2 text-xs text-muted-foreground">{fd(row.created_at)}</TableCell>
                      ) : null}
                      {c.visible.actions !== false ? (
                        <TableCell className="px-2">
                          <div className="flex items-center gap-0.5">
                            {c.isDeletedView ? (
                              c.canUpdate ? (
                                <IconAction label="بازگردانی" onClick={() => void c.restoreOne(row)}>
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </IconAction>
                              ) : null
                            ) : (
                              <>
                                {c.canUpdate ? (
                                  <>
                                    <IconAction label="ویرایش" onClick={() => c.openEdit(row)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </IconAction>
                                    {row.is_active !== false ? (
                                      <IconAction label="غیرفعال‌سازی" onClick={() => void c.setActive(row, false)}>
                                        <PowerOff className="h-3.5 w-3.5" />
                                      </IconAction>
                                    ) : (
                                      <IconAction label="فعال‌سازی" onClick={() => void c.setActive(row, true)}>
                                        <Power className="h-3.5 w-3.5" />
                                      </IconAction>
                                    )}
                                  </>
                                ) : null}
                                {c.canDelete ? (
                                  <IconAction
                                    label="حذف"
                                    variant="destructive"
                                    onClick={() => c.setConfirmDelete(row)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </IconAction>
                                ) : null}
                              </>
                            )}
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {c.total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {toFaDigits(c.total)} مورد — صفحه {toFaDigits(c.safePage)} از {toFaDigits(c.totalPages)}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7"
                disabled={c.safePage <= 1}
                onClick={() => c.setPage((p) => Math.max(1, p - 1))}
              >
                قبلی
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7"
                disabled={c.safePage >= c.totalPages}
                onClick={() => c.setPage((p) => p + 1)}
              >
                بعدی
              </Button>
              <Select
                value={String(c.pageSize)}
                onValueChange={(v) => {
                  c.setPageSize(Number(v));
                  c.setPage(1);
                }}
              >
                <SelectTrigger className="h-7 w-[4.5rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {toFaDigits(n)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}

        <DepartmentsListDialogs c={c} />
      </div>
    </TooltipProvider>
  );
}
