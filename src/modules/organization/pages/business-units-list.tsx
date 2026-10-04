/**
 * FE-ORG — فهرست واحدهای کسب‌وکار (FINAL + multi_business_unit gate)
 */
"use client";

import {
  Columns3, Layers, Link2, Loader2, Pencil, Plus,
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { cn, toFaDigits } from "@/shared/lib/utils";
import { IconAction, fd } from "./companies-list-helpers";
import {
  MSG_NO_ACCESS, COLS, formatCodeDisplay, companyLabels, isRecentCreated,
} from "./business-units-list-helpers";
import { useBusinessUnitsListPage } from "./use-business-units-list-page";
import { BusinessUnitsListDialogs } from "./business-units-list-dialogs";

export function BusinessUnitsListPage() {
  const c = useBusinessUnitsListPage();
  const SortIcon = c.SortIcon;

  if (!c.canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="واحدهای کسب‌وکار"
          icon={<Layers className="h-4 w-4" />}
          breadcrumbs={[
            { label: "سازمان", href: "/dashboard/organization" },
            { label: "واحدهای کسب‌وکار" },
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
          title="واحدهای کسب‌وکار"
          icon={<Layers className="h-4 w-4" />}
          description="فهرست واحدهای کسب‌وکار — اتصال به شرکت‌ها و مدیریت وضعیت"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "سازمان", href: "/dashboard/organization" },
            { label: "واحدهای کسب‌وکار" },
          ]}
          actions={
            c.canManage && c.membership === "active" ? (
              <Button
                size="sm"
                className="h-8 gap-1.5"
                onClick={c.openCreate}
                disabled={c.createBuBlocked}
                title={c.createBuBlocked ? "بسته multi_business_unit لازم است" : undefined}
              >
                <Plus className="h-4 w-4" />
                واحد جدید
              </Button>
            ) : null
          }
        />

        {c.listQuery.isError ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <span>بارگذاری ممکن نشد.</span>
            <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => void c.listQuery.refetch()}>
              تلاش مجدد
            </Button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className={cn("h-8 ps-8 text-sm", c.search && "pe-8")}
              placeholder="نام، کد…"
              value={c.search}
              onChange={(e) => {
                c.setSearch(e.target.value);
                c.setPage(1);
              }}
            />
            {c.search ? (
              <button
                type="button"
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted"
                onClick={() => {
                  c.setSearch("");
                  c.setPage(1);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <Select
            value={c.membership}
            onValueChange={(v) => {
              c.setMembership(v as typeof c.membership);
              c.setPage(1);
              c.setSelected(new Set());
            }}
          >
            <SelectTrigger className="h-8 w-[10rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">جاری</SelectItem>
              <SelectItem value="deleted">حذف‌شده</SelectItem>
            </SelectContent>
          </Select>
          {c.membership === "active" ? (
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
                  onClick={() =>
                    c.setVisibleCols((prev) => {
                      const n = new Set(prev);
                      if (n.has(col.id)) n.delete(col.id);
                      else n.add(col.id);
                      return n;
                    })
                  }
                >
                  <Checkbox checked={c.visibleCols.has(col.id)} />
                  {col.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {c.listQuery.isFetching && !c.listQuery.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        {c.selected.size > 0 && c.canManage ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2">
            <span className="text-xs text-muted-foreground">{toFaDigits(c.selected.size)} انتخاب‌شده</span>
            {c.membership === "deleted" ? (
              <Button type="button" size="sm" className="h-7 gap-1" onClick={() => c.requestBulk("restore", c.pageRows.filter((r) => c.selected.has(r.business_unit_id)))}>
                <RotateCcw className="h-3.5 w-3.5" />
                بازگردانی
              </Button>
            ) : (
              <>
                <Button type="button" size="sm" className="h-7 gap-1" onClick={() => c.requestBulk("activate", c.pageRows.filter((r) => c.selected.has(r.business_unit_id) && r.is_active === false))}>
                  <Power className="h-3.5 w-3.5" />
                  فعال
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-7 gap-1" onClick={() => c.requestBulk("deactivate", c.pageRows.filter((r) => c.selected.has(r.business_unit_id) && r.is_active !== false))}>
                  <PowerOff className="h-3.5 w-3.5" />
                  غیرفعال
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-7 gap-1" onClick={() => c.openAssignBulk(c.pageRows.filter((r) => c.selected.has(r.business_unit_id)))}>
                  <Link2 className="h-3.5 w-3.5" />
                  اتصال شرکت
                </Button>
                <Button type="button" size="sm" variant="destructive" className="h-7 gap-1" onClick={() => c.requestBulk("delete", c.pageRows.filter((r) => c.selected.has(r.business_unit_id)))}>
                  <Trash2 className="h-3.5 w-3.5" />
                  حذف
                </Button>
              </>
            )}
            <Button type="button" size="sm" variant="ghost" className="h-7" onClick={() => c.setSelected(new Set())}>
              پاک کردن
            </Button>
          </div>
        ) : null}

        <div className="overflow-auto rounded-xl border">
          {c.listQuery.isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : c.pageRows.length === 0 ? (
            <div className="p-8">
              <EmptyState title={c.search || c.statusFilter !== "all" ? "نتیجه‌ای پیدا نشد" : "واحدی ثبت نشده"} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 px-2">
                    <Checkbox
                      checked={c.pageRows.length > 0 && c.pageRows.every((r) => c.selected.has(r.business_unit_id))}
                      onCheckedChange={(checked) => {
                        c.setSelected((prev) => {
                          const n = new Set(prev);
                          for (const r of c.pageRows) {
                            if (checked) n.add(r.business_unit_id);
                            else n.delete(r.business_unit_id);
                          }
                          return n;
                        });
                      }}
                    />
                  </TableHead>
                  {c.visibleCols.has("name") ? (
                    <TableHead className="cursor-pointer whitespace-nowrap px-3 text-start" onClick={() => c.toggleSort("name")}>
                      نام <SortIcon k="name" />
                    </TableHead>
                  ) : null}
                  {c.visibleCols.has("code") ? (
                    <TableHead className="cursor-pointer whitespace-nowrap px-3 text-start" onClick={() => c.toggleSort("code")}>
                      کد <SortIcon k="code" />
                    </TableHead>
                  ) : null}
                  {c.visibleCols.has("companies") ? (
                    <TableHead className="cursor-pointer px-2" onClick={() => c.toggleSort("companies")}>
                      شرکت‌ها <SortIcon k="companies" />
                    </TableHead>
                  ) : null}
                  {c.visibleCols.has("status") ? (
                    <TableHead className="cursor-pointer px-2" onClick={() => c.toggleSort("status")}>
                      وضعیت <SortIcon k="status" />
                    </TableHead>
                  ) : null}
                  {c.visibleCols.has("created") ? (
                    <TableHead className="cursor-pointer px-2" onClick={() => c.toggleSort("created")}>
                      ایجاد <SortIcon k="created" />
                    </TableHead>
                  ) : null}
                  {c.visibleCols.has("actions") ? <TableHead className="px-2">عملیات</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {c.pageRows.map((row) => {
                  const codeDisp = formatCodeDisplay(row.code);
                  return (
                    <TableRow key={row.business_unit_id} data-state={c.selected.has(row.business_unit_id) ? "selected" : undefined}>
                      <TableCell className="px-2">
                        <Checkbox
                          checked={c.selected.has(row.business_unit_id)}
                          onCheckedChange={(checked) => {
                            c.setSelected((prev) => {
                              const n = new Set(prev);
                              if (checked) n.add(row.business_unit_id);
                              else n.delete(row.business_unit_id);
                              return n;
                            });
                          }}
                        />
                      </TableCell>
                      {c.visibleCols.has("name") ? (
                        <TableCell className="whitespace-nowrap px-3 text-start font-medium">
                          <span className="inline-flex items-center gap-1.5">
                            <span>{row.name}</span>
                            {isRecentCreated(row.created_at) ? (
                              <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-normal text-emerald-700">جدید</span>
                            ) : null}
                          </span>
                        </TableCell>
                      ) : null}
                      {c.visibleCols.has("code") ? (
                        <TableCell className="whitespace-nowrap px-3 text-start font-mono text-xs tabular-nums" dir={codeDisp.dir}>
                          {codeDisp.text}
                        </TableCell>
                      ) : null}
                      {c.visibleCols.has("companies") ? (
                        <TableCell className="max-w-[20rem] px-3 text-start text-xs text-muted-foreground">
                          <span className="line-clamp-2 break-words" title={companyLabels(row, c.companies)}>
                            {companyLabels(row, c.companies)}
                          </span>
                        </TableCell>
                      ) : null}
                      {c.visibleCols.has("status") ? (
                        <TableCell className="px-2">
                          <StatusChip
                            tone={row.is_active !== false ? "success" : "neutral"}
                            label={row.is_active !== false ? "فعال" : "غیرفعال"}
                          />
                        </TableCell>
                      ) : null}
                      {c.visibleCols.has("created") ? (
                        <TableCell className="px-2 text-xs text-muted-foreground">{fd(row.created_at)}</TableCell>
                      ) : null}
                      {c.visibleCols.has("actions") ? (
                        <TableCell className="px-2">
                          <div className="flex items-center gap-0.5">
                            {c.membership === "deleted" ? (
                              c.canManage ? (
                                <IconAction label="بازگردانی" onClick={() => c.requestBulk("restore", [row])}>
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </IconAction>
                              ) : null
                            ) : c.canManage ? (
                              <>
                                <IconAction label="ویرایش" onClick={() => c.openEdit(row)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </IconAction>
                                <IconAction label="اتصال شرکت" onClick={() => c.openAssign(row)}>
                                  <Link2 className="h-3.5 w-3.5" />
                                </IconAction>
                                {row.is_active !== false ? (
                                  <IconAction label="غیرفعال" onClick={() => c.requestBulk("deactivate", [row])}>
                                    <PowerOff className="h-3.5 w-3.5" />
                                  </IconAction>
                                ) : (
                                  <IconAction label="فعال" onClick={() => c.requestBulk("activate", [row])}>
                                    <Power className="h-3.5 w-3.5" />
                                  </IconAction>
                                )}
                                <IconAction label="حذف" variant="destructive" onClick={() => c.requestBulk("delete", [row])}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </IconAction>
                              </>
                            ) : null}
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

        {c.filtered.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {toFaDigits(c.filtered.length)} مورد — صفحه {toFaDigits(c.page)} از {toFaDigits(c.pageCount)}
            </span>
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="sm" className="h-7" disabled={c.page <= 1} onClick={() => c.setPage((p) => Math.max(1, p - 1))}>
                قبلی
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-7" disabled={c.page >= c.pageCount} onClick={() => c.setPage((p) => p + 1)}>
                بعدی
              </Button>
            </div>
          </div>
        ) : null}

        <BusinessUnitsListDialogs c={c} />
      </div>
    </TooltipProvider>
  );
}
