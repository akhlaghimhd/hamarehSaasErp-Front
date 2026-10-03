/** فهرست محدوده‌های دسترسی — جدول کامل: سورت، صفحه، Excel، فعال/حذف/بازگردانی */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  FileSpreadsheet,
  Loader2,
  Plus,
  Power,
  PowerOff,
  RotateCcw,
  Scan,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { cn, toFaDigits } from "@/shared/lib/utils";
import { ApiClientError } from "@/api";
import { usePermission } from "@/auth";
import {
  useCreateScope,
  useScopes,
  useSoftDeleteScope,
  useUpdateScope,
  useRestoreScope,
} from "@/modules/identity/hooks/use-scopes";
import type {
  ScopeDto,
  ScopeMembershipFilter,
} from "@/modules/identity/services/scope-service";
import { companyService } from "@/modules/organization/services/company-service";
import { branchService } from "@/modules/organization/services/branch-service";
import { departmentService } from "@/modules/organization/services/department-service";
import {
  businessUnitService,
  costCenterService,
} from "@/modules/organization/services/org-extended-service";
import {
  STRUCTURAL,
  CREATE_TYPES,
  type RefOption,
  type SortKey,
  type SortDir,
  scopeTypeLabel,
  refCount,
  exportScopesExcel,
} from "./scopes-list-helpers";

type CreateForm = {
  scope_name: string;
  scope_type: string;
  reference_ids: string[];
  description: string;
};

export function ScopesListPage() {
  const canView = usePermission("identity.scope.view");
  const canCreate = usePermission("identity.scope.create");
  const canUpdate = usePermission("identity.scope.update");
  const canDelete = usePermission("identity.scope.delete");

  const [membership, setMembership] =
    useState<ScopeMembershipFilter>("active");
  const [listStatus, setListStatus] = useState<"all" | "active" | "inactive">(
    "all"
  );
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { data = [], isLoading, isError, error, refetch, isFetching } =
    useScopes(membership);
  const createMutation = useCreateScope();
  const updateMutation = useUpdateScope();
  const deleteMutation = useSoftDeleteScope();
  const restoreMutation = useRestoreScope();

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ScopeDto | null>(null);
  const [refOptions, setRefOptions] = useState<RefOption[]>([]);
  const [refLoading, setRefLoading] = useState(false);
  const [refSearch, setRefSearch] = useState("");

  const form = useForm<CreateForm>({
    defaultValues: {
      scope_name: "",
      scope_type: "BRANCH",
      reference_ids: [],
      description: "",
    },
  });

  const scopeType = form.watch("scope_type");
  const needsReference = STRUCTURAL.has(String(scopeType).toUpperCase());
  const selectedIds = form.watch("reference_ids") || [];
  const isDeletedView = membership === "deleted";

  useEffect(() => {
    setPage(1);
  }, [membership, listStatus, q, sortKey, sortDir]);

  useEffect(() => {
    if (!createOpen) return;
    form.setValue("reference_ids", []);
    setRefOptions([]);
    setRefSearch("");
    const type = String(scopeType).toUpperCase();
    if (!STRUCTURAL.has(type)) return;

    let cancelled = false;
    setRefLoading(true);
    (async () => {
      try {
        let options: RefOption[] = [];
        if (type === "COMPANY") {
          const list = await companyService.list("active");
          options = list
            .map((c) => {
              const id = c.company_id || (c as { id?: string }).id;
              if (!id) return null;
              return {
                id: String(id),
                label: c.name || c.legal_name || c.code || String(id),
              };
            })
            .filter(Boolean) as RefOption[];
        } else if (type === "BRANCH") {
          const list = await branchService.listAll("active");
          options = list
            .map((b) => {
              const id = b.branch_id || (b as { id?: string }).id;
              if (!id) return null;
              return {
                id: String(id),
                label: [b.name, b.code].filter(Boolean).join(" · ") || String(id),
              };
            })
            .filter(Boolean) as RefOption[];
        } else if (type === "DEPARTMENT") {
          const companies = await companyService.list("active");
          const batches = await Promise.all(
            companies.map(async (c) => {
              const cid = c.company_id || (c as { id?: string }).id;
              if (!cid) return [] as RefOption[];
              try {
                const deps = await departmentService.listByCompany(
                  String(cid),
                  "active"
                );
                const companyLabel = c.name || c.legal_name || c.code || "";
                return deps
                  .map((d) => {
                    const id = (d as { department_id?: string }).department_id;
                    if (!id) return null;
                    const name = (d as { name?: string }).name || "";
                    const code = (d as { code?: string }).code || "";
                    return {
                      id: String(id),
                      label: [name, code, companyLabel]
                        .filter(Boolean)
                        .join(" · "),
                    };
                  })
                  .filter(Boolean) as RefOption[];
              } catch {
                return [] as RefOption[];
              }
            })
          );
          options = batches.flat();
        } else if (type === "BUSINESS_UNIT") {
          const list = await businessUnitService.list({ membership: "active" });
          options = list
            .map((bu) => {
              const id = bu.business_unit_id;
              if (!id) return null;
              return {
                id: String(id),
                label:
                  [bu.name, bu.code].filter(Boolean).join(" · ") || String(id),
              };
            })
            .filter(Boolean) as RefOption[];
        } else if (type === "COST_CENTER") {
          const companies = await companyService.list("active");
          const batches = await Promise.all(
            companies.map(async (c) => {
              const cid = c.company_id || (c as { id?: string }).id;
              if (!cid) return [] as RefOption[];
              try {
                const ccs = await costCenterService.list(String(cid));
                const companyLabel = c.name || c.legal_name || c.code || "";
                return ccs
                  .map((cc) => {
                    const row = cc as {
                      cost_center_id?: string;
                      id?: string;
                      name?: string;
                      code?: string;
                    };
                    const id = row.cost_center_id || row.id;
                    if (!id) return null;
                    return {
                      id: String(id),
                      label: [row.name, row.code, companyLabel]
                        .filter(Boolean)
                        .join(" · "),
                    };
                  })
                  .filter(Boolean) as RefOption[];
              } catch {
                return [] as RefOption[];
              }
            })
          );
          options = batches.flat();
        }
        if (!cancelled) setRefOptions(options);
      } catch {
        if (!cancelled) {
          setRefOptions([]);
          toast.error("بارگذاری موجودیت‌های مرجع ناموفق بود");
        }
      } finally {
        if (!cancelled) setRefLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [createOpen, scopeType, form]);

  const filteredRefs = useMemo(() => {
    const qq = refSearch.trim().toLowerCase();
    if (!qq) return refOptions;
    return refOptions.filter((o) => o.label.toLowerCase().includes(qq));
  }, [refOptions, refSearch]);

  const filteredSorted = useMemo(() => {
    let list = [...data];
    if (!isDeletedView && listStatus === "active") {
      list = list.filter((r) => r.is_active !== false);
    } else if (!isDeletedView && listStatus === "inactive") {
      list = list.filter((r) => r.is_active === false);
    }
    const qq = q.trim().toLowerCase();
    if (qq) {
      list = list.filter((r) =>
        [r.scope_name, r.scope_type, r.description, ...(r.reference_ids || [])]
          .map((x) => String(x ?? "").toLowerCase())
          .join(" ")
          .includes(qq)
      );
    }
    list.sort((a, b) => {
      let va: string | number = "";
      let vb: string | number = "";
      if (sortKey === "name") {
        va = a.scope_name || "";
        vb = b.scope_name || "";
      } else if (sortKey === "type") {
        va = scopeTypeLabel(a.scope_type);
        vb = scopeTypeLabel(b.scope_type);
      } else if (sortKey === "refs") {
        va = refCount(a);
        vb = refCount(b);
      } else {
        va = a.is_active === false ? 1 : 0;
        vb = b.is_active === false ? 1 : 0;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [data, isDeletedView, listStatus, q, sortKey, sortDir]);

  const total = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredSorted.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k)
      return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  }

  async function onCreateSubmit(values: CreateForm) {
    const name = values.scope_name.trim();
    if (!name) {
      toast.error("نام محدوده الزامی است");
      return;
    }
    const type = String(values.scope_type).toUpperCase();
    const refIds = (values.reference_ids || []).map(String).filter(Boolean);
    if (STRUCTURAL.has(type) && refIds.length === 0) {
      toast.error(
        `برای نوع «${scopeTypeLabel(type)}» حداقل یک مورد هم‌نوع را انتخاب کنید.`
      );
      return;
    }
    try {
      const payload: {
        scope_name: string;
        scope_type: string;
        reference_ids?: string[];
        reference_id?: string | null;
        description: string | null;
        is_active: boolean;
      } = {
        scope_name: name,
        scope_type: type,
        description: values.description?.trim() || null,
        is_active: true,
      };
      if (refIds.length > 0) {
        payload.reference_ids = refIds;
        payload.reference_id = refIds[0];
      }
      await createMutation.mutateAsync(payload);
      toast.success("محدوده دسترسی ثبت شد");
      setCreateOpen(false);
      form.reset({
        scope_name: "",
        scope_type: "BRANCH",
        reference_ids: [],
        description: "",
      });
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "خطا در ثبت محدوده");
    }
  }

  async function setActive(row: ScopeDto, active: boolean) {
    try {
      await updateMutation.mutateAsync({
        id: row.scope_id,
        payload: { is_active: active },
      });
      toast.success(active ? "محدوده فعال شد" : "محدوده غیرفعال شد");
    } catch (e) {
      toast.error(
        e instanceof ApiClientError ? e.message : "خطا در تغییر وضعیت"
      );
    }
  }

  async function onRestore(row: ScopeDto) {
    try {
      await restoreMutation.mutateAsync(row.scope_id);
      toast.success("محدوده بازگردانی شد");
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "خطا در بازگردانی");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.scope_id);
      toast.success("محدوده حذف شد (قابل بازیابی)");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "خطا در حذف");
    }
  }

  if (!canView) {
    return (
      <EmptyState
        title="دسترسی ندارید"
        description="مجوز مشاهده محدوده‌ها را ندارید."
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <PageHeader
        title="محدوده‌های دسترسی"
        description="هر محدوده یک نوع دارد و می‌تواند یک یا چند موجودیت هم‌نوع را پوشش دهد"
        icon={<Scan className="h-5 w-5" />}
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "محدوده‌ها" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="sm" variant="outline">
                  <Download className="me-1.5 h-4 w-4" />
                  خروجی
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => exportScopesExcel(filteredSorted)}
                >
                  <FileSpreadsheet className="me-2 h-4 w-4" />
                  Excel ({toFaDigits(filteredSorted.length)} مورد)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {canCreate && !isDeletedView ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="me-1.5 h-4 w-4" />
                محدوده جدید
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 ps-9"
            placeholder="جستجو…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select
          value={membership}
          onValueChange={(v) => setMembership(v as ScopeMembershipFilter)}
        >
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">موارد جاری</SelectItem>
            <SelectItem value="deleted">حذف‌شده‌ها</SelectItem>
          </SelectContent>
        </Select>
        {!isDeletedView ? (
          <Select
            value={listStatus}
            onValueChange={(v) =>
              setListStatus(v as "all" | "active" | "inactive")
            }
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
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : isError ? (
        <EmptyState
          title="خطا در بارگذاری"
          description={error instanceof Error ? error.message : "ناموفق"}
        />
      ) : filteredSorted.length === 0 ? (
        <EmptyState title="موردی یافت نشد" />
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-start">
              <tr>
                <th className="w-10 px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1"
                    onClick={() => toggleSort("name")}
                  >
                    نام <SortIcon k="name" />
                  </button>
                </th>
                <th className="px-3 py-2 font-medium">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1"
                    onClick={() => toggleSort("type")}
                  >
                    نوع <SortIcon k="type" />
                  </button>
                </th>
                <th className="px-3 py-2 font-medium">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1"
                    onClick={() => toggleSort("refs")}
                  >
                    مرجع <SortIcon k="refs" />
                  </button>
                </th>
                <th className="px-3 py-2 font-medium">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1"
                    onClick={() => toggleSort("status")}
                  >
                    وضعیت <SortIcon k="status" />
                  </button>
                </th>
                <th className="px-3 py-2 font-medium">توضیح</th>
                <th className="w-28 px-3 py-2 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, idx) => (
                <tr key={r.scope_id} className="border-t">
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {toFaDigits((safePage - 1) * pageSize + idx + 1)}
                  </td>
                  <td className="px-3 py-2 font-medium">{r.scope_name}</td>
                  <td className="px-3 py-2">{scopeTypeLabel(r.scope_type)}</td>
                  <td className="px-3 py-2 tabular-nums">{refCount(r)}</td>
                  <td className="px-3 py-2">
                    {isDeletedView ? (
                      <StatusChip label="حذف‌شده" tone="danger" />
                    ) : r.is_active === false ? (
                      <StatusChip label="غیرفعال" tone="warning" />
                    ) : (
                      <StatusChip label="فعال" tone="success" />
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {r.description || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-0.5">
                      {isDeletedView ? (
                        canUpdate ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="بازگردانی"
                            onClick={() => void onRestore(r)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        ) : null
                      ) : (
                        <>
                          {canUpdate ? (
                            r.is_active === false ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="فعال‌سازی"
                                onClick={() => void setActive(r, true)}
                              >
                                <Power className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="غیرفعال‌سازی"
                                onClick={() => void setActive(r, false)}
                              >
                                <PowerOff className="h-4 w-4" />
                              </Button>
                            )
                          ) : null}
                          {canDelete ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="حذف"
                              onClick={() => setDeleteTarget(r)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-sm text-muted-foreground">
            <span>
              نمایش {toFaDigits((safePage - 1) * pageSize + 1)}–
              {toFaDigits(Math.min(safePage * pageSize, total))} از{" "}
              {toFaDigits(total)}
            </span>
            <div className="flex items-center gap-2">
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[80px]">
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
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                قبلی
              </Button>
              <span className="tabular-nums">
                {toFaDigits(safePage)} / {toFaDigits(totalPages)}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                بعدی
              </Button>
            </div>
          </div>
        </div>
      )}

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>محدوده جدید</SheetTitle>
          </SheetHeader>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={form.handleSubmit(onCreateSubmit)}
          >
            <div className="flex-1 space-y-4 overflow-y-auto px-1 py-2">
              <div className="space-y-2">
                <Label>نام محدوده</Label>
                <Input className="h-9" {...form.register("scope_name")} />
              </div>
              <div className="space-y-2">
                <Label>نوع</Label>
                <Select
                  value={form.watch("scope_type")}
                  onValueChange={(v) =>
                    form.setValue("scope_type", v, { shouldDirty: true })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CREATE_TYPES.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {needsReference ? (
                <div className="space-y-2">
                  <Label>موجودیت‌های مرجع (هم‌نوع — یک یا چند)</Label>
                  {refLoading ? (
                    <div className="flex h-9 items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      بارگذاری فهرست…
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <div className="border-b p-1.5">
                        <Input
                          className="h-8"
                          placeholder="جستجو…"
                          value={refSearch}
                          onChange={(e) => setRefSearch(e.target.value)}
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto p-1">
                        {filteredRefs.length === 0 ? (
                          <p className="px-2 py-2 text-xs text-muted-foreground">
                            موردی نیست
                          </p>
                        ) : (
                          filteredRefs.map((o) => {
                            const selected = selectedIds.includes(o.id);
                            return (
                              <button
                                key={o.id}
                                type="button"
                                className={cn(
                                  "flex w-full items-center gap-2 rounded px-2 py-1.5 text-start text-sm hover:bg-muted/60",
                                  selected && "bg-primary/10 font-medium"
                                )}
                                onClick={() => {
                                  const next = selected
                                    ? selectedIds.filter((id) => id !== o.id)
                                    : [...selectedIds, o.id];
                                  form.setValue("reference_ids", next, {
                                    shouldDirty: true,
                                  });
                                }}
                              >
                                <span
                                  className={cn(
                                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]",
                                    selected
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-muted-foreground/40"
                                  )}
                                >
                                  {selected ? "✓" : ""}
                                </span>
                                {o.label}
                              </button>
                            );
                          })
                        )}
                      </div>
                      {selectedIds.length > 0 ? (
                        <div className="border-t px-2 py-1.5 text-xs text-muted-foreground">
                          انتخاب‌شده: {selectedIds.length} مورد
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>توضیح (اختیاری)</Label>
                <Input className="h-9" {...form.register("description")} />
              </div>
            </div>
            <SheetFooter className="gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                انصراف
              </Button>
              <Button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  (needsReference && selectedIds.length === 0)
                }
              >
                {createMutation.isPending ? "در حال ثبت…" : "ثبت محدوده"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف محدوده دسترسی</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            اگر این محدوده به کاربری تخصیص داشته باشد، حذف مسدود می‌شود. محدوده
            «{deleteTarget?.scope_name}» در صورت آزاد بودن به‌صورت نرم حذف
            می‌شود.
          </p>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => void confirmDelete()}
            >
              {deleteMutation.isPending ? "در حال حذف…" : "بله، حذف شود"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ScopesListPage;
