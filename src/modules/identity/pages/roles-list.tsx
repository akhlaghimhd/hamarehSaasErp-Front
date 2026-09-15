/** FE-P1-T11 — فهرست و ایجاد نقش */

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Search, Shield } from "lucide-react";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import { toFaDigits } from "@/shared/lib/utils";
import { useCreateRole, useRoles, useSoftDeleteRole } from "../hooks/use-roles";
import { IdentityPermissions } from "../types";
import type { RoleDto } from "../services/role-service";
import { MSG_GENERIC_ERROR, MSG_LOAD_ERROR, MSG_NO_ACCESS } from "../lib/ui-copy";

export function RolesListPage() {
  const canView = usePermission(IdentityPermissions.roleView);
  const canCreate = usePermission(IdentityPermissions.roleCreate);
  const canDelete = usePermission(IdentityPermissions.roleDelete);

  const { data, isLoading, isError, error, refetch, isFetching } = useRoles();
  const createMutation = useCreateRole();
  const deleteMutation = useSoftDeleteRole();

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createOpen, setCreateOpen] = useState(false);

  const form = useForm({
    defaultValues: { role_name: "", description: "" },
  });

  const rows = data ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name, r.description].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [rows, query]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const columns: DataTableColumn<RoleDto>[] = [
    {
      id: "name",
      header: "نام نقش",
      cell: (row) => <div className="font-medium">{row.name}</div>,
    },
    {
      id: "desc",
      header: "توضیح",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.description?.trim() || "—"}
        </span>
      ),
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
    },
    {
      id: "status",
      header: "وضعیت",
      cell: (row) =>
        Number(row.status) === 1 || row.status === undefined ? (
          <StatusChip label="فعال" tone="success" />
        ) : (
          <StatusChip label="غیرفعال" tone="neutral" />
        ),
    },
    {
      id: "actions",
      header: "",
      cell: (row) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-8" asChild>
            <Link href={`/dashboard/identity/roles/${row.tenant_role_id}`}>
              جزئیات
            </Link>
          </Button>
          {canDelete ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-destructive"
              disabled={deleteMutation.isPending}
              onClick={async () => {
                if (!window.confirm(`نقش «${row.name}» از فهرست نقش‌های سازمان حذف شود؟`)) return;
                try {
                  await deleteMutation.mutateAsync(row.tenant_role_id);
                  toast.success("نقش حذف شد");
                } catch (e) {
                  toast.error(
                    e instanceof ApiClientError && e.message
                      ? e.message
                      : MSG_GENERIC_ERROR
                  );
                }
              }}
            >
              حذف
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  const onCreate = form.handleSubmit(async (values) => {
    try {
      const role = await createMutation.mutateAsync({
        role_name: values.role_name.trim(),
        description: values.description.trim() || null,
      });
      toast.success("نقش با موفقیت ساخته شد");
      setCreateOpen(false);
      form.reset();
      window.location.href = `/dashboard/identity/roles/${role.tenant_role_id}`;
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_GENERIC_ERROR
      );
    }
  });

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="نقش‌ها"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "نقش‌ها" },
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
        title="نقش‌ها"
        description="تعریف نقش‌های سازمان و تعیین سطح دسترسی هر نقش"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "نقش‌ها" },
        ]}
        actions={
          canCreate ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              نقش جدید
            </Button>
          ) : null
        }
      />

      {isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error instanceof ApiClientError && error.message
            ? error.message
            : MSG_LOAD_ERROR}
          <Button variant="outline" size="sm" className="mt-2" onClick={() => void refetch()}>
            تلاش مجدد
          </Button>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={pageRows}
        getRowKey={(r) => r.tenant_role_id}
        loading={isLoading || (isFetching && !data)}
        isFiltered={query.trim().length > 0}
        emptyTitle="هنوز نقشی تعریف نشده"
        emptyDescription="اولین نقش سازمان را بسازید تا بتوانید به کاربران اختصاص دهید."
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
                placeholder="جستجوی نقش…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <Shield className="h-3.5 w-3.5" />
              <span>{toFaDigits(total)} نقش</span>
            </div>
          </div>
        }
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>نقش جدید</DialogTitle>
            <DialogDescription>
              نامی قابل فهم برای نقش در سازمان خود وارد کنید.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="role_name">نام نقش *</Label>
              <Input id="role_name" className="h-9" {...form.register("role_name", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">توضیح</Label>
              <Input id="description" className="h-9" {...form.register("description")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" size="sm" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ایجاد"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
