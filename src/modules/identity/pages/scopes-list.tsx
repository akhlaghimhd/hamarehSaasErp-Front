/** FE-P1-T16/T17 — فهرست محدوده‌های دسترسی */

"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, Search, Scan } from "lucide-react";
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
  useCreateScope,
  useScopes,
  useSoftDeleteScope,
} from "../hooks/use-scopes";
import { IdentityPermissions } from "../types";
import type { ScopeDto } from "../services/scope-service";
import {
  SCOPE_TYPE_FA,
  scopeTypeLabel,
  MSG_GENERIC_ERROR,
  MSG_LOAD_ERROR,
  MSG_NO_ACCESS,
} from "../lib/ui-copy";

export function ScopesListPage() {
  const canView = usePermission(IdentityPermissions.scopeView);
  const canCreate = usePermission("identity.scope.create");
  const canDelete = usePermission("identity.scope.delete");

  const { data, isLoading, isError, error, refetch, isFetching } = useScopes();
  const createMutation = useCreateScope();
  const deleteMutation = useSoftDeleteScope();

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createOpen, setCreateOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      scope_name: "",
      scope_type: "BRANCH",
      description: "",
    },
  });

  const rows = data ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const typeFa = scopeTypeLabel(r.scope_type);
      return [r.scope_name, typeFa, r.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, query]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const columns: DataTableColumn<ScopeDto>[] = [
    {
      id: "name",
      header: "نام محدوده",
      cell: (row) => <span className="font-medium">{row.scope_name}</span>,
    },
    {
      id: "type",
      header: "نوع",
      cell: (row) => (
        <span className="text-xs">{scopeTypeLabel(row.scope_type)}</span>
      ),
    },
    {
      id: "active",
      header: "وضعیت",
      cell: (row) =>
        row.is_active !== false ? (
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
              if (!window.confirm(`محدوده «${row.scope_name}» حذف شود؟`)) return;
              try {
                await deleteMutation.mutateAsync(row.scope_id);
                toast.success("محدوده حذف شد");
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
        scope_name: values.scope_name.trim(),
        scope_type: values.scope_type,
        description: values.description.trim() || null,
        is_active: true,
      });
      toast.success("محدوده دسترسی ثبت شد");
      setCreateOpen(false);
      form.reset({ scope_name: "", scope_type: "BRANCH", description: "" });
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
          title="محدوده دسترسی"
          breadcrumbs={[
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "محدوده دسترسی" },
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
        title="محدوده دسترسی"
        description="تعیین محدوده کار کاربران، مانند شعبه یا واحد سازمانی"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "محدوده دسترسی" },
        ]}
        actions={
          canCreate ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              محدوده جدید
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
        getRowKey={(r) => r.scope_id}
        loading={isLoading || (isFetching && !data)}
        isFiltered={query.trim().length > 0}
        emptyTitle="محدوده‌ای تعریف نشده"
        emptyDescription="اولین محدوده دسترسی سازمان را ثبت کنید."
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
                placeholder="جستجوی محدوده…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <Scan className="h-3.5 w-3.5" />
              <span>{toFaDigits(total)} محدوده</span>
            </div>
          </div>
        }
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>محدوده جدید</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label>نام *</Label>
              <Input className="h-9" {...form.register("scope_name", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>نوع *</Label>
              <Select
                value={form.watch("scope_type")}
                onValueChange={(v) => form.setValue("scope_type", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SCOPE_TYPE_FA).map(([code, label]) => (
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
