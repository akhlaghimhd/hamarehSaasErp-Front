/**
 * FE-ORG-T01 — فهرست شرکت‌ها
 */

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Search, Building2 } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import { toFaDigits } from "@/shared/lib/utils";
import {
  useCompanies,
  useCreateCompany,
  useSoftDeleteCompany,
} from "../hooks/use-companies";
import { OrganizationPermissions, type CompanyDto } from "../types";

const MSG_LOAD = "بارگذاری فهرست شرکت‌ها ممکن نشد. کمی بعد دوباره تلاش کنید.";
const MSG_ERR = "انجام این کار ممکن نشد. کمی بعد دوباره تلاش کنید.";
const MSG_NO_ACCESS = "برای مشاهده این بخش مجوز لازم را ندارید.";

type CreateForm = {
  code: string;
  name: string;
  registration_number: string;
  economic_code: string;
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
      registration_number: "",
      economic_code: "",
      is_active: true,
    },
  });

  const rows = data ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.code, r.name, r.registration_number, r.economic_code]
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
        <Link
          href={`/dashboard/organization/companies/${row.company_id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.name}
        </Link>
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
        registration_number: values.registration_number.trim() || null,
        economic_code: values.economic_code.trim() || null,
        is_active: values.is_active,
      });
      toast.success("شرکت ثبت شد");
      setCreateOpen(false);
      form.reset({
        code: "",
        name: "",
        registration_number: "",
        economic_code: "",
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
        description="فهرست شرکت‌های ثبت‌شده در سازمان"
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          onInteractOutside={(e) => {
            if (form.formState.isDirty) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (form.formState.isDirty) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>شرکت جدید</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label>کد *</Label>
              <Input
                className="h-9"
                dir="ltr"
                {...form.register("code", { required: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>نام *</Label>
              <Input
                className="h-9"
                {...form.register("name", { required: true })}
              />
            </div>
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
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="company-active">فعال</Label>
              <Switch
                id="company-active"
                checked={form.watch("is_active")}
                onCheckedChange={(v) => form.setValue("is_active", v)}
              />
            </div>
            <DialogFooter>
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
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
