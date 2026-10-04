/**
 * FE-ORG — فهرست شرکت‌ها (FINAL restore via hook + UI)
 * Table, bulk, filters, export, create/edit sheets, multi_company gate.
 */
"use client";

import Link from "next/link";
import {
  Building2, Columns3, Download, Eye,
  FileSpreadsheet, FileText, Loader2, Pencil, Plus, Power, PowerOff,
  RotateCcw, Search, Trash2, X, Sparkles,
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
import { ENTITY_KIND_LABELS } from "../types";
import { companyDetailPath } from "../lib/company-ref";
import { exportCompaniesExcel, exportCompaniesPdf } from "../lib/companies-export";
import {
  MSG_NO_ACCESS, COLS,
  displayName, fd, IconAction,
} from "./companies-list-helpers";
import { useCompaniesListPage } from "./use-companies-list-page";
import { CompaniesListDialogs } from "./companies-list-dialogs";

export function CompaniesListPage() {
  const c = useCompaniesListPage();
  const SortIcon = c.SortIcon;
  if (!c.canView) {
    return <div className="p-6"><EmptyState title={MSG_NO_ACCESS} /></div>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-0 flex-col gap-3">
        <PageHeader
          title="شرکت‌ها"
          description="فهرست شرکت‌های سازمان — ویرایش، فعال‌سازی و مدیریت ساختار"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "سازمان", href: "/dashboard/organization" },
            { label: "شرکت‌ها" },
          ]}
          icon={<Building2 className="h-4 w-4" />}
          actions={
            c.canCreate ? (
              <Button size="sm" className="h-8 gap-1.5" onClick={c.openCreate} disabled={c.createBlockedByPack}>
                <Plus className="h-4 w-4" /> شرکت جدید
              </Button>
            ) : null
          }
        />

        {c.isError ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
            <p className="font-medium">بارگذاری فهرست ممکن نشد</p>
            <Button variant="outline" size="sm" className="mt-3 h-8" onClick={() => void c.refetch()}>تلاش مجدد</Button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className={cn("h-8 ps-8 text-sm", c.query && "pe-8")}
              placeholder="نام، کد، شماره ثبت…"
              value={c.query}
              onChange={(e) => { c.setQuery(e.target.value); c.setPage(1); }}
            />
            {c.query ? (
              <button
                type="button"
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted"
                aria-label="پاک کردن جستجو"
                onClick={() => { c.setQuery(""); c.setPage(1); }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <Select value={c.membershipFilter} onValueChange={(v) => c.setMembershipFilter(v as typeof c.membershipFilter)}>
            <SelectTrigger className="h-8 w-[10rem]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">شرکت‌های جاری</SelectItem>
              <SelectItem value="deleted">حذف‌شده‌ها</SelectItem>
            </SelectContent>
          </Select>
          {!c.isDeletedView ? (
            <Select value={c.statusFilter} onValueChange={(v) => { c.setStatusFilter(v as typeof c.statusFilter); c.setPage(1); }}>
              <SelectTrigger className="h-8 w-[8.5rem]"><SelectValue /></SelectTrigger>
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
                <Columns3 className="h-3.5 w-3.5" />ستون‌ها
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1">
                <Download className="h-3.5 w-3.5" />خروجی
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{c.exportLabel}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2" onClick={() => exportCompaniesExcel(c.exportTarget, c.parentMap)}>
                <FileSpreadsheet className="h-3.5 w-3.5" />اکسل
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2" onClick={() => exportCompaniesPdf(c.exportTarget, c.parentMap)}>
                <FileText className="h-3.5 w-3.5" />PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {c.isFetching && !c.isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
        </div>

        {c.selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              {c.bulkBusy
                ? `در حال انجام… ${toFaDigits(c.bulkProgress.done)} از ${toFaDigits(c.bulkProgress.total)}`
                : `${toFaDigits(c.selected.size)} مورد انتخاب‌شده`}
            </span>
            {!c.bulkBusy && c.isDeletedView && c.canUpdate ? (
              <Button type="button" size="sm" className="h-7 gap-1" onClick={() => c.requestBulk("restore", c.selectedRows)}>
                <RotateCcw className="h-3.5 w-3.5" />بازگردانی
              </Button>
            ) : null}
            {!c.bulkBusy && !c.isDeletedView && c.canUpdate ? (
              <>
                <Button type="button" size="sm" className="h-7 gap-1" onClick={() => c.requestBulk("activate", c.selectedRows.filter((r) => r.is_active === false))}>
                  <Power className="h-3.5 w-3.5" />فعال
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-7 gap-1" onClick={() => c.requestBulk("deactivate", c.selectedRows.filter((r) => r.is_active !== false && !r.is_primary))}>
                  <PowerOff className="h-3.5 w-3.5" />غیرفعال
                </Button>
              </>
            ) : null}
            {!c.bulkBusy && !c.isDeletedView && c.canDelete ? (
              <Button type="button" size="sm" variant="destructive" className="h-7 gap-1" onClick={() => c.requestBulk("delete", c.selectedRows.filter((r) => !r.is_primary))}>
                <Trash2 className="h-3.5 w-3.5" />حذف
              </Button>
            ) : null}
            {c.bulkBusy ? (
              <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => { c.cancelRef.current = true; }}>لغو</Button>
            ) : (
              <Button type="button" size="sm" variant="ghost" className="h-7" onClick={() => c.setSelected(new Set())}>پاک کردن انتخاب</Button>
            )}
          </div>
        ) : null}

        <div className="overflow-auto rounded-xl border">
          {c.isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : c.pageRows.length === 0 ? (
            <div className="p-8">
              <EmptyState title={c.isFiltered ? "نتیجه‌ای پیدا نشد" : "شرکتی ثبت نشده"} />
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
                  {c.visible.kind !== false ? (
                    <TableHead className="cursor-pointer px-2" onClick={() => c.toggleSort("kind")}>
                      کاربرد <SortIcon k="kind" />
                    </TableHead>
                  ) : null}
                  {c.visible.reg !== false ? (
                    <TableHead className="cursor-pointer px-2" onClick={() => c.toggleSort("reg")}>
                      شماره ثبت <SortIcon k="reg" />
                    </TableHead>
                  ) : null}
                  {c.visible.parent !== false ? (
                    <TableHead className="cursor-pointer px-2" onClick={() => c.toggleSort("parent")}>
                      شرکت والد <SortIcon k="parent" />
                    </TableHead>
                  ) : null}
                  {c.visible.branches !== false ? (
                    <TableHead className="cursor-pointer px-2" onClick={() => c.toggleSort("branches")}>
                      شعب <SortIcon k="branches" />
                    </TableHead>
                  ) : null}
                  {c.visible.departments !== false ? (
                    <TableHead className="cursor-pointer px-2" onClick={() => c.toggleSort("departments")}>
                      واحدها <SortIcon k="departments" />
                    </TableHead>
                  ) : null}
                  {c.visible.children !== false ? (
                    <TableHead className="cursor-pointer px-2" onClick={() => c.toggleSort("children")}>
                      زیرمجموعه <SortIcon k="children" />
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
                {c.pageRows.map((row) => (
                  <TableRow key={row.company_id} data-state={c.selected.has(row.company_id) ? "selected" : undefined}>
                    <TableCell className="px-2">
                      <Checkbox
                        checked={c.selected.has(row.company_id)}
                        onCheckedChange={(checked) => {
                          c.setSelected((prev) => {
                            const n = new Set(prev);
                            if (checked) n.add(row.company_id);
                            else n.delete(row.company_id);
                            return n;
                          });
                        }}
                      />
                    </TableCell>
                    {c.visible.name !== false ? (
                      <TableCell className="px-2 font-medium">
                        <Link href={companyDetailPath(row.company_id)} className="text-primary hover:underline">
                          {displayName(row)}
                        </Link>
                        {row.is_primary ? (
                          <span className="ms-2 inline-block">
                            <StatusChip label="اصلی" tone="warning" />
                          </span>
                        ) : null}
                        {c.isRecentCreated(row.created_at) ? (
                          <Sparkles className="ms-1 inline h-3.5 w-3.5 text-amber-500" />
                        ) : null}
                      </TableCell>
                    ) : null}
                    {c.visible.code !== false ? (
                      <TableCell className="px-2 font-mono text-xs" dir="ltr">
                        {row.code || "—"}
                      </TableCell>
                    ) : null}
                    {c.visible.kind !== false ? (
                      <TableCell className="px-2 text-xs">
                        {ENTITY_KIND_LABELS[row.entity_kind ?? "OPERATING"] ?? row.entity_kind}
                      </TableCell>
                    ) : null}
                    {c.visible.reg !== false ? (
                      <TableCell className="px-2 font-mono text-xs" dir="ltr">
                        {row.registration_number || "—"}
                      </TableCell>
                    ) : null}
                    {c.visible.parent !== false ? (
                      <TableCell className="px-2 text-xs">
                        {row.parent_company_id ? c.parentMap.get(row.parent_company_id) ?? "—" : "—"}
                      </TableCell>
                    ) : null}
                    {c.visible.branches !== false ? (
                      <TableCell className="px-2 text-xs tabular-nums">
                        {toFaDigits(String(row.branches_count ?? 0))}
                      </TableCell>
                    ) : null}
                    {c.visible.departments !== false ? (
                      <TableCell className="px-2 text-xs tabular-nums">
                        {toFaDigits(String(row.departments_count ?? 0))}
                      </TableCell>
                    ) : null}
                    {c.visible.children !== false ? (
                      <TableCell className="px-2 text-xs tabular-nums">
                        {toFaDigits(String(row.children_count ?? 0))}
                      </TableCell>
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
                      <TableCell className="px-2 text-xs text-muted-foreground">
                        {fd(row.created_at)}
                      </TableCell>
                    ) : null}
                    {c.visible.actions !== false ? (
                      <TableCell className="px-2">
                        <div className="flex items-center gap-0.5">
                          <IconAction
                            label="جزئیات"
                            onClick={() => {
                              window.location.href = companyDetailPath(row.company_id);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </IconAction>
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
                                    <IconAction label="غیرفعال‌سازی" onClick={() => c.requestDeactivate(row)}>
                                      <PowerOff className="h-3.5 w-3.5" />
                                    </IconAction>
                                  ) : (
                                    <IconAction label="فعال‌سازی" onClick={() => void c.activateOne(row)}>
                                      <Power className="h-3.5 w-3.5" />
                                    </IconAction>
                                  )}
                                </>
                              ) : null}
                              {c.canDelete ? (
                                <IconAction label="حذف" variant="destructive" onClick={() => c.requestDelete(row)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </IconAction>
                              ) : null}
                            </>
                          )}
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
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

        <CompaniesListDialogs c={c} />
      </div>
    </TooltipProvider>
  );
}
