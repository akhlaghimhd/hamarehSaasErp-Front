/** فهرست محدوده‌های دسترسی — حذف تأیید‌شده، فعال/غیرفعال، بازیابی */

"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RotateCcw, Search, Scan } from "lucide-react";
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
import { Switch } from "@/shared/components/ui/switch";
import { usePermission } from "@/auth";
import { apiGet, ApiClientError } from "@/api";
import { toFaDigits } from "@/shared/lib/utils";
import {
  useCreateScope,
  useRestoreScope,
  useScopes,
  useSoftDeleteScope,
  useUpdateScope,
} from "../hooks/use-scopes";
import { IdentityPermissions } from "../types";
import type {
  ScopeDto,
  ScopeMembershipFilter,
} from "../services/scope-service";
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

const STRUCTURAL_TYPES = new Set([
  "COMPANY",
  "BRANCH",
  "WAREHOUSE",
  "DEPARTMENT",
  "COST_CENTER",
  "BUSINESS_UNIT",
]);

type RefOption = { id: string; label: string };
type StatusFilter = "all" | "active" | "inactive";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function pickEntityId(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const c of candidates) {
    const v = (c ?? "").trim();
    if (v && UUID_RE.test(v)) return v;
  }
  return null;
}

type CreateForm = {
  scope_name: string;
  scope_type: string;
  reference_id: string;
  description: string;
};

function asArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { data?: T[] }).data)
  ) {
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
  const canUpdate = usePermission("identity.scope.update");
  const canDelete = usePermission("identity.scope.delete");

  const [membershipFilter, setMembershipFilter] =
    useState<ScopeMembershipFilter>("active");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ScopeDto | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useScopes(membershipFilter);
  const createMutation = useCreateScope();
  const updateMutation = useUpdateScope();
  const deleteMutation = useSoftDeleteScope();
  const restoreMutation = useRestoreScope();

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
          options = list
            .map((c) => {
              const id = pickEntityId(
                c.company_id,
                (c as { id?: string }).id
              );
              if (!id) return null;
              return {
                id,
                label: c.name || c.legal_name || c.code || id,
              };
            })
            .filter(Boolean) as RefOption[];
        } else if (type === "BRANCH") {
          const list = await branchService.listAll("active");
          options = list
            .map((b) => {
              const id = pickEntityId(
                b.branch_id,
                (b as { id?: string }).id
              );
              if (!id) return null;
              return {
                id,
                label: [b.name, b.code].filter(Boolean).join(" · ") || id,
              };
            })
            .filter(Boolean) as RefOption[];
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
                const id = pickEntityId(
                  d.department_id,
                  (d as { id?: string }).id
                );
                if (!id) continue;
                all.push({
                  id,
                  label: `${d.name}${d.code ? ` · ${d.code}` : ""} (${c.name ?? ""})`,
                });
              }
            } catch {
              /* soft */
            }
          }
          options = all;
        } else if (type === "BUSINESS_UNIT") {
          const envelope = await apiGet(organizationPaths.businessUnits);
          const list = asArray<{
            business_unit_id: string;
            name?: string;
            code?: string;
            id?: string;
          }>(unwrap(envelope));
          options = list
            .map((bu) => {
              const id = pickEntityId(bu.business_unit_id, bu.id);
              if (!id) return null;
              return {
                id,
                label: [bu.name, bu.code].filter(Boolean).join(" · ") || id,
              };
            })
            .filter(Boolean) as RefOption[];
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
                id?: string;
              }>(unwrap(envelope));
              for (const cc of list) {
                const id = pickEntityId(cc.cost_center_id, cc.id);
                if (!id) continue;
                all.push({
                  id,
                  label: `${cc.name ?? cc.code ?? id} (${c.name ?? ""})`,
                });
              }
            } catch {
              /* soft */
            }
          }
          options = all;
        } else if (type === "WAREHOUSE") {
          let list: Array<{
            warehouse_id?: string;
            id?: string;
            name?: string;
            code?: string;
          }> = [];
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
              const id = pickEntityId(w.warehouse_id, w.id);
              if (!id) return null;
              return {
                id,
                label: [w.name, w.code].filter(Boolean).join(" · ") || id,
              };
            })
            .filter(Boolean) as RefOption[];

          if (options.length === 0) {
            setRefHint(
              "هنوز انباری در سیستم ثبت نشده. ابتدا در ماژول انبار، انبار تعریف کنید."
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOpen, scopeType]);

  const rows = data ?? [];
  const filtered = useMemo(() => {
    let list = rows;
    if (membershipFilter === "active" && statusFilter !== "all") {
      list = list.filter((r) =>
        statusFilter === "active"
          ? r.is_active !== false
          : r.is_active === false
      );
    }
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => {
      const typeFa = scopeTypeLabel(r.scope_type);
      return [r.scope_name, typeFa, r.description, r.reference_id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, query, membershipFilter, statusFilter]);

  const total = filtered.length;
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  async function onToggleActive(row: ScopeDto, next: boolean) {
    try {
      await updateMutation.mutateAsync({
        id: row.scope_id,
        payload: { is_active: next },
      });
      toast.success(next ? "محدوده فعال شد" : "محدوده غیرفعال شد");
      void refetch();
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_GENERIC_ERROR
      );
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.scope_id);
      toast.success("محدوده حذف شد");
      setDeleteTarget(null);
      void refetch();
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_GENERIC_ERROR
      );
    }
  }

  async function onRestore(row: ScopeDto) {
    try {
      await restoreMutation.mutateAsync(row.scope_id);
      toast.success("محدوده بازگردانی شد");
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
    const refId = pickEntityId(values.reference_id);
    if (STRUCTURAL_TYPES.has(type) && !refId) {
      toast.error(
        `برای نوع «${scopeTypeLabel(type)}» باید موجودیت مرجع را از فهرست انتخاب کنید.`
      );
      return;
    }
    try {
      await createMutation.mutateAsync({
        scope_name: name,
        scope_type: type,
        reference_id: refId,
        description: values.description?.trim() || null,
        is_active: true,
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
      toast.error(msg);
    }
  }

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
        <span className="font-mono text-[11px] text-muted-foreground" dir="ltr">
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
        membershipFilter === "deleted" ? (
          <StatusChip label="حذف‌شده" tone="neutral" />
        ) : canUpdate ? (
          <div className="flex items-center gap-2">
            <Switch
              checked={row.is_active !== false}
              disabled={updateMutation.isPending}
              onCheckedChange={(c) => void onToggleActive(row, c)}
              aria-label="فعال/غیرفعال"
            />
            <span className="text-xs text-muted-foreground">
              {row.is_active !== false ? "فعال" : "غیرفعال"}
            </span>
          </div>
        ) : (
          <StatusChip
            label={row.is_active !== false ? "فعال" : "غیرفعال"}
            tone={row.is_active !== false ? "success" : "neutral"}
          />
        ),
    },
    {
      id: "actions",
      header: "عملیات",
      cell: (row) => (
        <div className="flex items-center gap-1">
          {membershipFilter === "deleted" && canUpdate ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={restoreMutation.isPending}
              onClick={() => void onRestore(row)}
            >
              بازگردانی
            </Button>
          ) : null}
          {membershipFilter === "active" && canDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive"
              onClick={() => setDeleteTarget(row)}
            >
              حذف
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

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
          canCreate && membershipFilter === "active" ? (
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
        getRowKey={(row) => row.scope_id}
        loading={isLoading}
        isFiltered={
          Boolean(query.trim()) ||
          statusFilter !== "all" ||
          membershipFilter !== "active"
        }
        emptyTitle={
          membershipFilter === "deleted"
            ? "محدوده حذف‌شده‌ای نیست"
            : "هنوز محدوده‌ای تعریف نشده"
        }
        emptyDescription={
          membershipFilter === "deleted"
            ? "با حذف نرم، موارد اینجا ظاهر می‌شوند."
            : "با دکمه «محدوده جدید» اولین محدوده را بسازید."
        }
        page={page}
        pageSize={pageSize}
        total={total}
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
            <Select
              value={membershipFilter}
              onValueChange={(v) => {
                setMembershipFilter(v as ScopeMembershipFilter);
                setPage(1);
                setStatusFilter("all");
              }}
            >
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">موارد جاری</SelectItem>
                <SelectItem value="deleted">حذف‌شده‌ها</SelectItem>
              </SelectContent>
            </Select>
            {membershipFilter === "active" ? (
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v as StatusFilter);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                  <SelectItem value="active">فعال</SelectItem>
                  <SelectItem value="inactive">غیرفعال</SelectItem>
                </SelectContent>
              </Select>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              {isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
            </Button>
            <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <Scan className="h-3.5 w-3.5" />
              <span>{toFaDigits(total)} محدوده</span>
            </div>
          </div>
        }
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>حذف محدوده</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-relaxed text-muted-foreground">
            محدوده «{deleteTarget?.scope_name}» به‌صورت نرم حذف شود؟ می‌توانید
            بعداً از فهرست «حذف‌شده‌ها» آن را بازگردانی کنید.
          </p>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "در حال حذف…" : "حذف محدوده"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                onValueChange={(v) =>
                  form.setValue("scope_type", v, {
                    shouldDirty: true,
                    shouldTouch: true,
                  })
                }
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
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                برای شرکت، شعبه، انبار و واحد باید موجودیت واقعی انتخاب شود. نوع
                «سفارشی» بدون مرجع است.
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
                    onValueChange={(v) =>
                      form.setValue("reference_id", v, {
                        shouldDirty: true,
                        shouldTouch: true,
                      })
                    }
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
                  <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
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
