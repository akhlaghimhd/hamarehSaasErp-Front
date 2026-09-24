/**
 * FE-ORG — فهرست شرکت‌ها (P0–P1 fields)
 * Create form: right-side Sheet drawer.
 */

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CircleHelp, Loader2, Plus, Search, Building2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  DataTable,
  type DataTableColumn,
} from "@/shared/components/data-display/data-table";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import { toFaDigits } from "@/shared/lib/utils";
import {
  useCompanies,
  useCreateCompany,
  useSoftDeleteCompany,
} from "../hooks/use-companies";
import {
  OrganizationPermissions,
  ENTITY_KIND_LABELS,
  ENTITY_KIND_FIELD_LABEL,
  ENTITY_KIND_OPTIONS,
  type CompanyDto,
} from "../types";

const MSG_LOAD = "بارگذاری فهرست شرکت‌ها ممکن نشد. کمی بعد دوباره تلاش کنید.";
const MSG_ERR = "انجام این کار ممکن نشد. کمی بعد دوباره تلاش کنید.";
const MSG_NO_ACCESS = "برای مشاهده این بخش مجوز لازم را ندارید.";

type CreateForm = {
  code: string;
  name: string;
  legal_name: string;
  trade_name: string;
  registration_number: string;
  economic_code: string;
  tax_identifier: string;
  entity_kind: string;
  is_primary: boolean;
  is_active: boolean;
};

export function CompaniesListPage() {
  const canView = usePermission(OrganizationPermissions.companyView);
  const canCreate = usePermission(OrganizationPermissions.companyCreate);
  const canDelete = usePermission(OrganizationPermissions.companyDelete);

  const { data, isLoading, isError, error, refetch, isFetching } = useCompanies();
  const createMutation = useCreateCompany();
  const deleteMutation = useSoftDeleteCompany();

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createOpen, setCreateOpen] = useState(false);

  const form = useForm<CreateForm>({
    defaultValues: {
      code: "",
      name: "",
      legal_name: "",
      trade_name: "",
      registration_number: "",
      economic_code: "",
      tax_identifier: "",
      entity_kind: "OPERATING",
      is_primary: false,
      is_active: true,
    },
  });

  const selectedKind = form.watch("entity_kind") || "OPERATING";

  const rows = data ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.code, r.name, r.legal_name, r.registration_number, r.economic_code]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, query]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const columns: DataTableColumn<CompanyDto>[] = [
    {
      id: "name",
      header: "نام شرکت",
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          <Link
            href={`/dashboard/organization/companies/${row.company_id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.legal_name || row.name}
          </Link>
          {row.is_primary ? (
            <span className="text-[10px] text-amber-700 dark:text-amber-400">
              شرکت اصلی
            </span>
          ) : null}
        </div>
      ),
    },
    {
      id: "code",
      header: "کد",
      cell: (row) => (
        <span className="font-mono text-xs" dir="ltr">
          {row.code}
        </span>
      ),
    },
    {
      id: "kind",
      header: "کاربرد",
      cell: (row) => (
        <span className="text-xs">
          {ENTITY_KIND_LABELS[row.entity_kind ?? "OPERATING"] ??
            row.entity_kind ??
            "—"}
        </span>
      ),
    },
    {
      id: "reg",
      header: "شماره ثبت",
      cell: (row) => (
        <span className="text-xs text-muted-foreground" dir="ltr">
          {row.registration_number || "—"}
        </span>
      ),
    },
    {
      id: "active",
      header: "وضعیت",
      cell: (row) =>
        row.is_active ? (
          <StatusChip label="فعال" tone="success" />
        ) : (
          <StatusChip label="غیرفعال" tone="neutral" />
        ),
    },
    {
      id: "actions",
      header: "",
      cell: (row) =>
        canDelete ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-destructive"
            onClick={async () => {
              if (!window.confirm(`شرکت «${row.name}» حذف شود؟`)) return;
              try {
                await deleteMutation.mutateAsync(row.company_id);
                toast.success("شرکت حذف شد");
              } catch (e) {
                toast.error(
                  e instanceof ApiClientError && e.message ? e.message : MSG_ERR
                );
              }
            }}
          >
            حذف
          </Button>
        ) : null,
    },
  ];

  const onCreate = form.handleSubmit(async (values) => {
    try {
      await createMutation.mutateAsync({
        code: values.code.trim(),
        name: values.name.trim(),
        legal_name: values.legal_name.trim() || values.name.trim(),
        trade_name: values.trade_name.trim() || null,
        registration_number: values.registration_number.trim() || null,
        economic_code: values.economic_code.trim() || null,
        tax_identifier: values.tax_identifier.trim() || null,
        entity_kind: values.entity_kind || "OPERATING",
        is_primary: values.is_primary,
        is_active: values.is_active,
      });
      toast.success("شرکت ثبت شد");
      setCreateOpen(false);
      form.reset({
        code: "",
        name: "",
        legal_name: "",
        trade_name: "",
        registration_number: "",
        economic_code: "",
        tax_identifier: "",
        entity_kind: "OPERATING",
        is_primary: false,
        is_active: true,
      });
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_ERR
      );
    }
  });

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="شرکت‌ها"
          breadcrumbs={[
            { label: "سازمان", href: "/dashboard/organization" },
            { label: "شرکت‌ها" },
          ]}
        />
        <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          {MSG_NO_ACCESS}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="شرکت‌ها"
        description="فهرست شرکت‌های حقوقی و عملیاتی سازمان"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "سازمان", href: "/dashboard/organization" },
          { label: "شرکت‌ها" },
        ]}
        actions={
          canCreate ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              شرکت جدید
            </Button>
          ) : null
        }
      />

      {isError ? (
        <div className="text-sm text-destructive">
          {error instanceof ApiClientError && error.message
            ? error.message
            : MSG_LOAD}
          <Button
            variant="outline"
            size="sm"
            className="ms-2"
            onClick={() => void refetch()}
          >
            تلاش مجدد
          </Button>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={pageRows}
        getRowKey={(r) => r.company_id}
        loading={isLoading || (isFetching && !data)}
        isFiltered={query.trim().length > 0}
        emptyTitle="شرکتی ثبت نشده"
        emptyDescription="اولین شرکت سازمان را ثبت کنید."
        emptySearchTitle="نتیجه‌ای پیدا نشد"
        emptySearchDescription="عبارت جستجو را تغییر دهید."
        page={safePage}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2">
            <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 ps-8"
                placeholder="جستجوی شرکت…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <Building2 className="h-3.5 w-3.5" />
              <span>{toFaDigits(total)} شرکت</span>
            </div>
          </div>
        }
      />

      <Sheet
        open={createOpen}
        onOpenChange={(open) => {
          if (!open && form.formState.isDirty) {
            if (!window.confirm("تغییرات ذخیره نشده‌اند. فرم بسته شود؟")) return;
          }
          setCreateOpen(open);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>شرکت جدید</SheetTitle>
          </SheetHeader>
          <form
            onSubmit={onCreate}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>کد *</Label>
                  <Input
                    className="h-9"
                    dir="ltr"
                    {...form.register("code", { required: true })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>نام نمایشی *</Label>
                  <Input
                    className="h-9"
                    {...form.register("name", { required: true })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>نام حقوقی</Label>
                <Input className="h-9" {...form.register("legal_name")} />
              </div>
              <div className="space-y-1.5">
                <Label>نام تجاری</Label>
                <Input className="h-9" {...form.register("trade_name")} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>شماره ثبت</Label>
                  <Input
                    className="h-9"
                    dir="ltr"
                    {...form.register("registration_number")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>کد اقتصادی</Label>
                  <Input
                    className="h-9"
                    dir="ltr"
                    {...form.register("economic_code")}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>شناسه مالیاتی</Label>
                <Input
                  className="h-9"
                  dir="ltr"
                  {...form.register("tax_identifier")}
                />
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium leading-none">
                  {ENTITY_KIND_FIELD_LABEL}
                </legend>
                <TooltipProvider delayDuration={200}>
                  <div className="space-y-1.5">
                    {ENTITY_KIND_OPTIONS.map((opt) => {
                      const checked = selectedKind === opt.value;
                      return (
                        <label
                          key={opt.value}
                          className={
                            "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors " +
                            (checked
                              ? "border-primary/50 bg-primary/5"
                              : "border-border/80 hover:bg-muted/40")
                          }
                        >
                          <input
                            type="radio"
                            className="mt-1 h-3.5 w-3.5 shrink-0 accent-primary"
                            value={opt.value}
                            checked={checked}
                            onChange={() =>
                              form.setValue("entity_kind", opt.value, {
                                shouldDirty: true,
                              })
                            }
                          />
                          <span className="min-w-0 flex-1 text-sm leading-snug">
                            {opt.label}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="mt-0.5 shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                                aria-label={`راهنمای ${opt.label}`}
                                onClick={(e) => e.preventDefault()}
                              >
                                <CircleHelp className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="max-w-[16rem] text-right leading-relaxed"
                            >
                              {opt.tooltip}
                            </TooltipContent>
                          </Tooltip>
                        </label>
                      );
                    })}
                  </div>
                </TooltipProvider>
              </fieldset>

              <div className="flex items-center justify-between gap-2 pt-1">
                <Label>شرکت اصلی سازمان</Label>
                <Switch
                  checked={form.watch("is_primary")}
                  onCheckedChange={(v) => form.setValue("is_primary", v)}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label>فعال</Label>
                <Switch
                  checked={form.watch("is_active")}
                  onCheckedChange={(v) => form.setValue("is_active", v)}
                />
              </div>
            </div>

            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateOpen(false)}
              >
                انصراف
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "ثبت"
                )}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
