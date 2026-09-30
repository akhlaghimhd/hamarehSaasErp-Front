/** FE-P1-T16/T17 — فهرست محدوده‌های دسترسی + ایجاد با reference_id */

"use client";

import { useEffect, useMemo, useState } from "react";
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
import { apiGet, ApiClientError } from "@/api";
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
import { companyService } from "@/modules/organization/services/company-service";
import { branchService } from "@/modules/organization/services/branch-service";
import { departmentService } from "@/modules/organization/services/department-service";
import { organizationPaths } from "@/modules/organization/services/paths";

/** Types that must point at a real org entity (backend STRUCTURAL_TYPES). */
const STRUCTURAL_TYPES = new Set([
  "COMPANY",
  "BRANCH",
  "WAREHOUSE",
  "DEPARTMENT",
  "COST_CENTER",
  "BUSINESS_UNIT",
]);

type RefOption = { id: string; label: string };

type CreateForm = {
  scope_name: string;
  scope_type: string;
  reference_id: string;
  description: string;
};

function asArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { data?: T[] }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
}

function unwrap(envelope: unknown): unknown {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as { data: unknown }).data;
  }
  return envelope;
}

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

  const [refOptions, setRefOptions] = useState<RefOption[]>([]);
  const [refLoading, setRefLoading] = useState(false);
  const [refHint, setRefHint] = useState<string | null>(null);

  const form = useForm<CreateForm>({
    defaultValues: {
      scope_name: "",
      scope_type: "BRANCH",
      reference_id: "",
      description: "",
    },
  });

  const scopeType = form.watch("scope_type");
  const needsReference = STRUCTURAL_TYPES.has(String(scopeType).toUpperCase());

  useEffect(() => {
    if (!createOpen) return;
    form.setValue("reference_id", "");
    setRefOptions([]);
    setRefHint(null);

    const type = String(scopeType).toUpperCase();
    if (!STRUCTURAL_TYPES.has(type)) {
      setRefLoading(false);
      return;
    }

    let cancelled = false;
    setRefLoading(true);

    (async () => {
      try {
        let options: RefOption[] = [];

        if (type === "COMPANY") {
          const list = await companyService.list("active");
          options = list.map((c) => ({
            id: c.company_id,
            label: c.name || c.legal_name || c.code || c.company_id,
          }));
        } else if (type === "BRANCH") {
          const list = await branchService.listAll("active");
          options = list.map((b) => ({
            id: b.branch_id,
            label:
              [b.name, b.code].filter(Boolean).join(" · ") || b.branch_id,
          }));
        } else if (type === "DEPARTMENT") {
          const companies = await companyService.list("active");
          const all: RefOption[] = [];
          for (const c of companies) {
            try {
              const deps = await departmentService.listByCompany(
                c.company_id,
                "active"
              );
              for (const d of deps) {
                all.push({
                  id: d.department_id,
                  label: `${d.name}${d.code ? ` · ${d.code}` : ""} (${c.name ?? ""})`,
                });
              }
            } catch {
              /* soft skip company */
            }
          }
          options = all;
        } else if (type === "BUSINESS_UNIT") {
          const envelope = await apiGet(organizationPaths.businessUnits);
          const list = asArray<{
            business_unit_id: string;
            name?: string;
            code?: string;
          }>(unwrap(envelope));
          options = list.map((bu) => ({
            id: bu.business_unit_id,
            label: [bu.name, bu.code].filter(Boolean).join(" · ") || bu.business_unit_id,
          }));
        } else if (type === "COST_CENTER") {
          const companies = await companyService.list("active");
          const all: RefOption[] = [];
          for (const c of companies) {
            try {
              const envelope = await apiGet(
                organizationPaths.companyCostCenters(c.company_id)
              );
              const list = asArray<{
                cost_center_id: string;
                name?: string;
                code?: string;
              }>(unwrap(envelope));
              for (const cc of list) {
                all.push({
                  id: cc.cost_center_id,
                  label: `${cc.name ?? cc.code ?? cc.cost_center_id} (${c.name ?? ""})`,
                });
              }
            } catch {
              /* soft */
            }
          }
          options = all;
        } else if (type === "WAREHOUSE") {
          // Inventory module: GET /api/v1/inventory/warehouses (or /inventory/warehouses)
          let list: Array<{ warehouse_id?: string; id?: string; name?: string; code?: string }> =
            [];
          try {
            const envelope = await apiGet("/inventory/warehouses");
            list = asArray(unwrap(envelope));
          } catch {
            try {
              const envelope = await apiGet("/inventory-core/warehouses");
              list = asArray(unwrap(envelope));
            } catch {
              list = [];
            }
          }
          options = list
            .map((w) => {
              const id = w.warehouse_id || w.id;
              if (!id) return null;
              return {
                id,
                label: [w.name, w.code].filter(Boolean).join(" · ") || id,
              };
            })
            .filter(Boolean) as RefOption[];

          if (options.length === 0) {
            setRefHint(
              "هنوز انباری در سیستم ثبت نشده. ابتدا در ماژول انبار، انبار تعریف کنید؛ سپس محدودهٔ انبار بسازید."
            );
          }
        }

        if (!cancelled) {
          setRefOptions(options);
          if (options.length === 0 && type !== "WAREHOUSE") {
            setRefHint(
              `موردی برای نوع «${scopeTypeLabel(type)}» پیدا نشد. ابتدا موجودیت مربوطه را در سازمان بسازید.`
            );
          }
        }
      } catch (e) {
        if (!cancelled) {
          setRefOptions([]);
          setRefHint(
            e instanceof ApiClientError && e.message
              ? e.message
              : "بارگذاری فهرست موجودیت‌ها ممکن نشد."
          );
        }
      } finally {
        if (!cancelled) setRefLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form.setValue stable enough
  }, [createOpen, scopeType]);

  const rows = data ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const typeFa = scopeTypeLabel(r.scope_type);
      return [r.scope_name, typeFa, r.description, r.reference_id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, query]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const columns: DataTableColumn<ScopeDto>[] = [
    {
      id: "name",
      header: "نام",
      cell: (row) => (
        <span className="font-medium">{row.scope_name || "—"}</span>
      ),
    },
    {
      id: "type",
      header: "نوع",
      cell: (row) => (
        <span className="text-xs">{scopeTypeLabel(row.scope_type)}</span>
      ),
    },
    {
      id: "ref",
      header: "مرجع",
      cell: (row) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          {row.reference_id
            ? `${String(row.reference_id).slice(0, 8)}…`
            : "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: "وضعیت",
      cell: (row) =>
        row.is_active === false ? (
          <StatusChip label="غیرفعال" tone="neutral" />
        ) : (
          <StatusChip label="فعال" tone="success" />
        ),
    },
    {
      id: "actions",
      header: "",
      cell: (row) =>
        canDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive"
            disabled={deleteMutation.isPending}
            onClick={() => void onDelete(row)}
          >
            حذف
          </Button>
        ) : null,
    },
  ];

  async function onDelete(row: ScopeDto) {
    if (!window.confirm(`محدوده «${row.scope_name}» حذف شود؟`)) return;
    try {
      await deleteMutation.mutateAsync(row.scope_id);
      toast.success("محدوده حذف شد");
      void refetch();
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_GENERIC_ERROR
      );
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const values = form.getValues();
    const name = values.scope_name.trim();
    if (!name) {
      toast.error("نام محدوده را وارد کنید");
      return;
    }
    const type = String(values.scope_type).toUpperCase();
    if (STRUCTURAL_TYPES.has(type) && !values.reference_id) {
      toast.error(
        `برای نوع «${scopeTypeLabel(type)}» باید موجودیت مرجع را انتخاب کنید.`
      );
      return;
    }
    try {
      await createMutation.mutateAsync({
        scope_name: name,
        scope_type: type,
        reference_id: values.reference_id || null,
        description: values.description?.trim() || null,
      });
      toast.success("محدوده ایجاد شد");
      setCreateOpen(false);
      form.reset({
        scope_name: "",
        scope_type: "BRANCH",
        reference_id: "",
        description: "",
      });
      void refetch();
    } catch (err) {
      const msg =
        err instanceof ApiClientError && err.message
          ? err.message
          : MSG_GENERIC_ERROR;
      // Map known English backend messages
      if (/reference_id is required/i.test(msg)) {
        toast.error("انتخاب موجودیت مرجع برای این نوع محدوده الزامی است.");
      } else if (/does not exist/i.test(msg)) {
        toast.error("موجودیت انتخاب‌شده در این سازمان یافت نشد.");
      } else {
        toast.error(msg);
      }
    }
  }

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="محدوده‌های دسترسی"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "محدوده‌ها" },
          ]}
        />
        <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          {MSG_NO_ACCESS}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="محدوده‌های دسترسی"
        description="هر محدوده مشخص می‌کند کاربر به کدام شرکت، شعبه، انبار یا واحد دسترسی دارد."
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "محدوده‌ها" },
        ]}
        actions={
          canCreate ? (
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              محدوده جدید
            </Button>
          ) : null
        }
      />

      {isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <p className="font-medium">بارگذاری ممکن نشد</p>
          <p className="mt-1 text-xs">
            {error instanceof ApiClientError && error.message
              ? error.message
              : MSG_LOAD_ERROR}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 h-8"
            onClick={() => void refetch()}
          >
            تلاش مجدد
          </Button>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={pageRows}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyTitle="هنوز محدوده‌ای تعریف نشده"
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>محدوده جدید</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label>نام *</Label>
              <Input
                className="h-9"
                placeholder="مثلاً شعبه شمال"
                {...form.register("scope_name", { required: true })}
              />
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
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                برای شرکت، شعبه، انبار، واحد و مرکز هزینه باید موجودیت واقعی
                انتخاب شود. نوع «سفارشی» بدون مرجع است.
              </p>
            </div>

            {needsReference ? (
              <div className="space-y-1.5">
                <Label>موجودیت مرجع *</Label>
                {refLoading ? (
                  <div className="flex h-9 items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    در حال بارگذاری فهرست…
                  </div>
                ) : (
                  <Select
                    value={form.watch("reference_id") || undefined}
                    onValueChange={(v) => form.setValue("reference_id", v)}
                    disabled={refOptions.length === 0}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="انتخاب کنید…" />
                    </SelectTrigger>
                    <SelectContent>
                      {refOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {refHint ? (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                    {refHint}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label>توضیح</Label>
              <Input className="h-9" {...form.register("description")} />
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
                disabled={
                  createMutation.isPending ||
                  (needsReference && !form.watch("reference_id"))
                }
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
