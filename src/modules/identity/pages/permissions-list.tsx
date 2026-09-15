/** FE-P1-T12 — فهرست مجوزهای سازمان */

"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, Search, KeyRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  DataTable,
  type DataTableColumn,
} from "@/shared/components/data-display/data-table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import { toFaDigits } from "@/shared/lib/utils";
import {
  useCreatePermission,
  usePermissions,
  useSoftDeletePermission,
} from "../hooks/use-permissions";
import { IdentityPermissions } from "../types";
import type { PermissionDto } from "../services/permission-service";
import {
  ACTION_TYPE_FA,
  actionTypeLabel,
  MSG_GENERIC_ERROR,
  MSG_LOAD_ERROR,
  MSG_NO_ACCESS,
} from "../lib/ui-copy";

export function PermissionsListPage() {
  const canView = usePermission(IdentityPermissions.permissionView);
  const canCreate = usePermission("identity.permission.create");
  const canDelete = usePermission("identity.permission.delete");

  const { data, isLoading, isError, error, refetch, isFetching } =
    usePermissions();
  const createMutation = useCreatePermission();
  const deleteMutation = useSoftDeletePermission();

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [createOpen, setCreateOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      code: "",
      name: "",
      module_name: "Identity",
      action_type: "READ",
      description: "",
    },
  });

  const rows = data ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name, r.module_name, r.description]
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

  const columns: DataTableColumn<PermissionDto>[] = [
    {
      id: "name",
      header: "عنوان مجوز",
      cell: (row) => <span className="text-sm font-medium">{row.name}</span>,
    },
    {
      id: "module",
      header: "بخش",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{row.module_name ?? "—"}</span>
      ),
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
    },
    {
      id: "action",
      header: "نوع کار",
      cell: (row) => (
        <span className="text-xs">{actionTypeLabel(row.action_type)}</span>
      ),
      className: "hidden sm:table-cell",
      headerClassName: "hidden sm:table-cell",
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
              if (!window.confirm(`مجوز «${row.name}» حذف شود؟`)) return;
              try {
                await deleteMutation.mutateAsync(row.tenant_permission_id);
                toast.success("مجوز حذف شد");
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
        ) : null,
    },
  ];

  const onCreate = form.handleSubmit(async (values) => {
    try {
      await createMutation.mutateAsync({
        code: values.code.trim(),
        name: values.name.trim(),
        module_name: values.module_name.trim(),
        action_type: values.action_type || null,
        description: values.description.trim() || null,
      });
      toast.success("مجوز جدید ثبت شد");
      setCreateOpen(false);
      form.reset({
        code: "",
        name: "",
        module_name: "Identity",
        action_type: "READ",
        description: "",
      });
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
          title="مجوزها"
          breadcrumbs={[
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "مجوزها" },
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
        title="مجوزها"
        description="فهرست دسترسی‌هایی که می‌توان به نقش‌های سازمان داد"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "مجوزها" },
        ]}
        actions={
          canCreate ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              مجوز جدید
            </Button>
          ) : null
        }
      />

      {isError ? (
        <div className="text-sm text-destructive">
          {error instanceof ApiClientError && error.message
            ? error.message
            : MSG_LOAD_ERROR}
          <Button variant="outline" size="sm" className="ms-2" onClick={() => void refetch()}>
            تلاش مجدد
          </Button>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={pageRows}
        getRowKey={(r) => r.tenant_permission_id}
        loading={isLoading || (isFetching && !data)}
        isFiltered={query.trim().length > 0}
        emptyTitle="مجوزی ثبت نشده"
        emptyDescription="در صورت نیاز می‌توانید مجوز جدید تعریف کنید."
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
                placeholder="جستجو بر اساس عنوان…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <KeyRound className="h-3.5 w-3.5" />
              <span>{toFaDigits(total)} مجوز</span>
            </div>
          </div>
        }
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>مجوز جدید</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label>عنوان نمایشی *</Label>
              <Input className="h-9" {...form.register("name", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>شناسه سیستمی *</Label>
              <Input
                className="h-9"
                dir="ltr"
                placeholder="مثال: inventory.item.view"
                {...form.register("code", { required: true })}
              />
              <p className="text-[11px] text-muted-foreground">
                فقط برای ثبت در سامانه لازم است؛ در فهرست اصلی به کاربر نشان داده نمی‌شود.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>نام بخش *</Label>
              <Input className="h-9" {...form.register("module_name", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>نوع کار</Label>
              <Select
                value={form.watch("action_type")}
                onValueChange={(v) => form.setValue("action_type", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTION_TYPE_FA).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>توضیح</Label>
              <Input className="h-9" {...form.register("description")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" size="sm" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
