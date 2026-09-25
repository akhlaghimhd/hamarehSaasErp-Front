/**
 * FE-ORG — فهرست سراسری واحدهای سازمانی (هم‌تراز شعب: عملیات گروهی کامل)
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown, ArrowUp, ArrowUpDown, CircleHelp, Columns3, Loader2, Network, Pencil, Plus,
  Power, PowerOff, RotateCcw, Search, Sparkles, Trash2, X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { usePermission } from "@/auth";
import { ApiClientError, tokenStorage } from "@/api";
import { cn, toFaDigits } from "@/shared/lib/utils";
import { useCompanies } from "../hooks/use-companies";
import {
  useCreateDepartment,
  useUpdateDepartment,
  useSoftDeleteDepartment,
  departmentsQueryKey,
} from "../hooks/use-departments";
import { departmentService, type DepartmentListFilter } from "../services/department-service";
import { branchService } from "../services/branch-service";
import { companyDetailPath } from "../lib/company-ref";
import { OrganizationPermissions, type DepartmentDto } from "../types";
import { IconAction, fd } from "./companies-list-helpers";

const MSG_ERR = "انجام این کار ممکن نشد. کمی بعد دوباره تلاش کنید.";
const MSG_NO_ACCESS = "برای مشاهده این بخش مجوز لازم را ندارید.";
const COL_STORAGE = "organization.departments.columns.v1";
const ALL = "__all__";

type StatusFilter = "all" | "active" | "inactive";
type SortKey = "name" | "code" | "company" | "branch" | "status" | "created";
type SortDir = "asc" | "desc";
type ColumnId = "name" | "code" | "company" | "branch" | "status" | "created" | "actions";
type BulkKind = "activate" | "deactivate" | "delete" | "restore";
type DeptRow = DepartmentDto & { company_name: string; branch_name: string };
type DeptForm = {
  company_id: string;
  branch_id: string;
  code: string;
  name: string;
  is_active: boolean;
};

const COLS: { id: ColumnId; label: string; hideable?: boolean; sort?: SortKey }[] = [
  { id: "name", label: "نام واحد", hideable: false, sort: "name" },
  { id: "code", label: "کد", sort: "code" },
  { id: "company", label: "شرکت", sort: "company" },
  { id: "branch", label: "شعبه", sort: "branch" },
  { id: "status", label: "وضعیت", sort: "status" },
  { id: "created", label: "تاریخ ایجاد", sort: "created" },
  { id: "actions", label: "عملیات", hideable: false },
];

const emptyForm = (): DeptForm => ({
  company_id: "",
  branch_id: "",
  code: "",
  name: "",
  is_active: true,
});

function rowToForm(r: DeptRow): DeptForm {
  return {
    company_id: r.company_id ?? "",
    branch_id: r.branch_id,
    code: r.code ?? "",
    name: r.name ?? "",
    is_active: r.is_active !== false,
  };
}

function hasAuthContext(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(tokenStorage.getAccessToken() && tokenStorage.getTenantId());
}

function formatCodeDisplay(code?: string | null): { text: string; dir: "ltr" | "rtl" } {
  const s = (code ?? "").trim();
  if (!s) return { text: "—", dir: "rtl" };
  if (/[A-Za-z]/.test(s)) return { text: s, dir: "ltr" };
  return { text: toFaDigits(s), dir: "rtl" };
}

function isRecentCreated(iso?: string | null, days = 3): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= days * 86_400_000;
}

export function DepartmentsListPage() {
  const canView =
    usePermission(OrganizationPermissions.departmentView) ||
    usePermission(OrganizationPermissions.companyView);
  const canCreate = usePermission(OrganizationPermissions.departmentCreate);
  const canUpdate = usePermission(OrganizationPermissions.departmentUpdate);
  const canDelete = usePermission(OrganizationPermissions.departmentDelete);

  const qc = useQueryClient();
  const { data: companies, isLoading: companiesLoading } = useCompanies();
  const companyList = companies ?? [];

  const [query, setQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState(ALL);
  const [membershipFilter, setMembershipFilter] = useState<DepartmentListFilter>("active");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [visible, setVisible] = useState<Record<ColumnId, boolean>>(() => {
    const base = Object.fromEntries(COLS.map((c) => [c.id, true])) as Record<ColumnId, boolean>;
    if (typeof window === "undefined") return base;
    try {
      const raw = localStorage.getItem(COL_STORAGE);
      return raw ? { ...base, ...JSON.parse(raw) } : base;
    } catch {
      return base;
    }
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<DeptRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DeptRow | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState<null | { kind: BulkKind; targets: DeptRow[] }>(null);

  const form = useForm<DeptForm>({ defaultValues: emptyForm() });
  const isDirty = form.formState.isDirty;
  const isDeletedView = membershipFilter === "deleted";
  const formCompanyId = form.watch("company_id");

  const deptQueries = useQueries({
    queries: companyList.map((c) => ({
      queryKey: departmentsQueryKey(c.company_id, membershipFilter),
      queryFn: () => departmentService.listByCompany(c.company_id, membershipFilter),
      enabled: hasAuthContext() && companyList.length > 0,
      staleTime: 30_000,
      retry: 1,
    })),
  });

  const branchQueries = useQueries({
    queries: companyList.map((c) => ({
      queryKey: ["organization", "companies", c.company_id, "branches", "active", "dept-form"],
      queryFn: () => branchService.listByCompany(c.company_id, "active"),
      enabled: hasAuthContext() && companyList.length > 0,
      staleTime: 60_000,
      retry: 1,
    })),
  });

  const branchNameById = useMemo(() => {
    const map = new Map<string, string>();
    companyList.forEach((c, i) => {
      for (const b of branchQueries[i]?.data ?? []) {
        map.set(b.branch_id, b.name);
      }
    });
    return map;
  }, [companyList, branchQueries]);

  const formBranches = useMemo(() => {
    if (!formCompanyId) return [];
    const idx = companyList.findIndex((c) => c.company_id === formCompanyId);
    if (idx < 0) return [];
    return branchQueries[idx]?.data ?? [];
  }, [formCompanyId, companyList, branchQueries]);

  useEffect(() => {
    if (formBranches.length === 1) {
      const onlyId = formBranches[0].branch_id;
      if (form.getValues("branch_id") !== onlyId) {
        form.setValue("branch_id", onlyId, { shouldDirty: false });
      }
    }
  }, [formBranches, form]);

  const isInitialLoading =
    companiesLoading ||
    (companyList.length > 0 && deptQueries.every((q) => q.isLoading && !q.data));
  const isRefreshing = deptQueries.some((q) => q.isFetching && !q.isLoading);
  const isError = deptQueries.some((q) => q.isError);

  const allRows: DeptRow[] = useMemo(() => {
    const out: DeptRow[] = [];
    companyList.forEach((c, i) => {
      const list = deptQueries[i]?.data ?? [];
      for (const d of list) {
        out.push({
          ...d,
          company_name: c.legal_name || c.name,
          branch_name: branchNameById.get(d.branch_id) ?? "—",
        });
      }
    });
    return out;
  }, [companyList, deptQueries, branchNameById]);

  const createMutation = useCreateDepartment(formCompanyId || "");
  const updateMutation = useUpdateDepartment(editing?.company_id || formCompanyId || "");
  const deleteMutation = useSoftDeleteDepartment(confirmDelete?.company_id || "");

  useEffect(() => {
    try {
      localStorage.setItem(COL_STORAGE, JSON.stringify(visible));
    } catch {
      /* ignore */
    }
  }, [visible]);

  const filteredSorted = useMemo(() => {
    let list = allRows;
    if (companyFilter !== ALL) list = list.filter((r) => r.company_id === companyFilter);
    if (!isDeletedView) {
      if (statusFilter === "active") list = list.filter((r) => r.is_active !== false);
      if (statusFilter === "inactive") list = list.filter((r) => r.is_active === false);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        [r.code, r.name, r.company_name, r.branch_name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const pick = (r: DeptRow): string | number => {
        if (sortKey === "name") return (r.name ?? "").toLowerCase();
        if (sortKey === "code") return (r.code ?? "").toLowerCase();
        if (sortKey === "company") return (r.company_name ?? "").toLowerCase();
        if (sortKey === "branch") return (r.branch_name ?? "").toLowerCase();
        if (sortKey === "status") return r.is_active !== false ? 1 : 0;
        return r.created_at ? new Date(r.created_at).getTime() : 0;
      };
      const va = pick(a),
        vb = pick(b);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [allRows, companyFilter, statusFilter, query, sortKey, sortDir, isDeletedView]);

  const total = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredSorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const isFiltered =
    query.trim().length > 0 ||
    companyFilter !== ALL ||
    (!isDeletedView && statusFilter !== "all");
  const pageIds = pageRows.map((r) => r.department_id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id));
  const selectedRows = useMemo(
    () => filteredSorted.filter((r) => selected.has(r.department_id)),
    [filteredSorted, selected]
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };
  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const invalidateDeptLists = (companyId?: string) => {
    if (companyId) {
      void qc.invalidateQueries({
        queryKey: ["organization", "companies", companyId, "departments"],
      });
    } else {
      void qc.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === "organization" &&
          q.queryKey[3] === "departments",
      });
    }
  };

  const openCreate = () => {
    const base = emptyForm();
    if (companyFilter !== ALL) base.company_id = companyFilter;
    else if (companyList.length === 1) base.company_id = companyList[0].company_id;
    form.reset(base);
    setEditing(null);
    setCreateOpen(true);
  };
  const openEdit = (r: DeptRow) => {
    setEditing(r);
    form.reset(rowToForm(r));
    setEditOpen(true);
  };
  const forceCloseCreate = () => {
    setCreateOpen(false);
    form.reset(emptyForm());
  };
  const forceCloseEdit = () => {
    setEditOpen(false);
    setEditing(null);
    form.reset(emptyForm());
  };

  const onCreate = form.handleSubmit(async (values) => {
    if (!values.company_id) {
      toast.error("شرکت را انتخاب کنید.");
      return;
    }
    if (!values.branch_id) {
      toast.error("شعبه را انتخاب کنید.");
      return;
    }
    try {
      await createMutation.mutateAsync({
        branch_id: values.branch_id,
        code: values.code.trim(),
        name: values.name.trim(),
        is_active: values.is_active,
      });
      toast.success("واحد سازمانی ثبت شد");
      forceCloseCreate();
      invalidateDeptLists(values.company_id);
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    }
  });

  const onEdit = form.handleSubmit(async (values) => {
    if (!editing) return;
    try {
      await updateMutation.mutateAsync({
        departmentId: editing.department_id,
        payload: {
          code: values.code.trim(),
          name: values.name.trim(),
          is_active: values.is_active,
          branch_id: values.branch_id || editing.branch_id,
        },
      });
      toast.success("اطلاعات واحد به‌روز شد");
      forceCloseEdit();
      invalidateDeptLists(editing.company_id ?? values.company_id);
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    }
  });

  const setActive = async (row: DeptRow, active: boolean) => {
    try {
      await updateMutation.mutateAsync({
        departmentId: row.department_id,
        payload: {
          code: row.code,
          name: row.name,
          is_active: active,
          branch_id: row.branch_id,
        },
      });
      toast.success(active ? "واحد فعال شد" : "واحد غیرفعال شد");
      invalidateDeptLists(row.company_id ?? undefined);
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    }
  };

  const filterTargetsForKind = (kind: BulkKind, targets: DeptRow[]): DeptRow[] => {
    if (kind === "activate") return targets.filter((r) => r.is_active === false);
    if (kind === "deactivate") return targets.filter((r) => r.is_active !== false);
    return targets;
  };

  const requestBulk = (kind: BulkKind, targets: DeptRow[]) => {
    const filtered = filterTargetsForKind(kind, targets);
    if (filtered.length === 0) {
      if (kind === "activate") toast.message("همهٔ موارد انتخاب‌شده از قبل فعال هستند.");
      else if (kind === "deactivate") toast.message("مورد قابل غیرفعال‌سازی در انتخاب نیست.");
      else toast.message("موردی برای انجام عملیات نیست.");
      return;
    }
    setConfirmBulk({ kind, targets: filtered });
  };

  const runBulk = async (kind: BulkKind, targets: DeptRow[]) => {
    setBulkBusy(true);
    setConfirmBulk(null);
    let ok = 0,
      fail = 0;
    const companyIds = new Set<string>();
    for (const row of targets) {
      try {
        if (kind === "delete") {
          await departmentService.softDelete(row.department_id);
        } else if (kind === "restore") {
          await departmentService.restore(row.department_id);
        } else {
          await departmentService.update(row.department_id, {
            code: row.code,
            name: row.name,
            is_active: kind === "activate",
            branch_id: row.branch_id,
          });
        }
        if (row.company_id) companyIds.add(row.company_id);
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    setSelected(new Set());
    for (const cid of companyIds) invalidateDeptLists(cid);
    setBulkBusy(false);
    if (ok > 0 && fail === 0) {
      const msgs: Record<BulkKind, string> = {
        restore:
          ok === 1
            ? "۱ واحد بازگردانی شد و غیرفعال باقی ماند."
            : `${toFaDigits(ok)} واحد بازگردانی شد و غیرفعال باقی ماندند.`,
        delete: ok === 1 ? "۱ واحد حذف شد." : `${toFaDigits(ok)} واحد حذف شد.`,
        activate: ok === 1 ? "۱ واحد فعال شد." : `${toFaDigits(ok)} واحد فعال شد.`,
        deactivate: ok === 1 ? "۱ واحد غیرفعال شد." : `${toFaDigits(ok)} واحد غیرفعال شد.`,
      };
      toast.success(msgs[kind]);
    } else if (ok > 0) toast.success(`${toFaDigits(ok)} انجام شد؛ ${toFaDigits(fail)} ناموفق.`);
    else toast.error(MSG_ERR);
  };

  const restoreOne = async (row: DeptRow) => {
    try {
      await departmentService.restore(row.department_id);
      toast.success("واحد بازگردانی شد و غیرفعال باقی ماند.");
      setSelected((prev) => {
        const n = new Set(prev);
        n.delete(row.department_id);
        return n;
      });
      invalidateDeptLists(row.company_id ?? undefined);
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete.department_id);
      toast.success("واحد حذف شد");
      setConfirmDelete(null);
      setSelected((prev) => {
        const n = new Set(prev);
        n.delete(confirmDelete.department_id);
        return n;
      });
      invalidateDeptLists(confirmDelete.company_id ?? undefined);
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    }
  };

  const formFields = (
    <div className="space-y-4">
      {companyList.length === 1 ? (
        <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          شرکت:{" "}
          <span className="font-medium text-foreground">
            {companyList[0].legal_name || companyList[0].name}
          </span>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="dept-company">شرکت *</Label>
          <select
            id="dept-company"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.watch("company_id")}
            disabled={Boolean(editing)}
            onChange={(e) => {
              form.setValue("company_id", e.target.value, { shouldDirty: true });
              form.setValue("branch_id", "", { shouldDirty: true });
            }}
          >
            <option value="">— انتخاب شرکت —</option>
            {companyList.map((c) => (
              <option key={c.company_id} value={c.company_id}>
                {c.legal_name || c.name}
                {c.is_primary ? " (اصلی)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {formBranches.length === 1 ? (
        <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          شعبه: <span className="font-medium text-foreground">{formBranches[0].name}</span>
          <span className="ms-1">(تنها شعبه — خودکار)</span>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="dept-branch">شعبه *</Label>
          <select
            id="dept-branch"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            {...form.register("branch_id", { required: true })}
            disabled={!formCompanyId}
          >
            <option value="">— انتخاب شعبه —</option>
            {formBranches.map((b) => (
              <option key={b.branch_id} value={b.branch_id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="dept-code">کد *</Label>
          <Input id="dept-code" className="h-9" dir="ltr" {...form.register("code", { required: true })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dept-name">نام *</Label>
          <Input id="dept-name" className="h-9" {...form.register("name", { required: true })} />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border/80 p-3">
        <p className="text-xs font-medium text-muted-foreground">وضعیت</p>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-1.5 text-start text-sm"
            onClick={() =>
              form.setValue("is_active", !form.getValues("is_active"), { shouldDirty: true })
            }
          >
            <span>فعال</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  role="button"
                  tabIndex={0}
                  className="inline-flex shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  aria-label="راهنمای فعال"
                >
                  <CircleHelp className="h-3.5 w-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[14rem] text-right leading-relaxed">
                اگر خاموش باشد، این واحد در عملیات روزمره قابل استفاده نیست.
              </TooltipContent>
            </Tooltip>
          </button>
          <Switch
            checked={form.watch("is_active")}
            onCheckedChange={(v) => form.setValue("is_active", v, { shouldDirty: true })}
          />
        </div>
      </div>
    </div>
  );

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="واحدهای سازمانی"
          icon={<Network className="h-4 w-4" />}
          breadcrumbs={[
            { label: "سازمان", href: "/dashboard/organization" },
            { label: "واحدها" },
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
          title="واحدهای سازمانی"
          icon={<Network className="h-4 w-4" />}
          description="فهرست واحدهای همه شرکت‌ها — ثبت، ویرایش و مدیریت وضعیت"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "سازمان", href: "/dashboard/organization" },
            { label: "واحدها" },
          ]}
          actions={
            canCreate && !isDeletedView ? (
              <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                واحد جدید
              </Button>
            ) : null
          }
        />

        {isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            بارگذاری بخشی از واحدها ممکن نشد. صفحه را تازه کنید.
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className={cn("h-8 ps-8 text-sm", query && "pe-8")}
              placeholder="نام، کد، شرکت، شعبه…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
            {query ? (
              <button
                type="button"
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted"
                aria-label="پاک کردن جستجو"
                onClick={() => {
                  setQuery("");
                  setPage(1);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <Select
            value={companyFilter}
            onValueChange={(v) => {
              setCompanyFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[12rem]">
              <SelectValue placeholder="شرکت" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>همه شرکت‌ها</SelectItem>
              {companyList.map((c) => (
                <SelectItem key={c.company_id} value={c.company_id}>
                  {c.legal_name || c.name}
                  {c.is_primary ? " (اصلی)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={membershipFilter}
            onValueChange={(v) => {
              setMembershipFilter(v as DepartmentListFilter);
              setSelected(new Set());
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[10rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">واحدهای جاری</SelectItem>
              <SelectItem value="deleted">واحدهای حذف‌شده</SelectItem>
            </SelectContent>
          </Select>
          {!isDeletedView ? (
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as StatusFilter);
                setPage(1);
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
              {COLS.filter((c) => c.hideable !== false).map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  className="gap-2"
                  onSelect={(e) => e.preventDefault()}
                  onClick={() => setVisible((v) => ({ ...v, [c.id]: !v[c.id] }))}
                >
                  <Checkbox checked={visible[c.id] !== false} />
                  {c.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              {bulkBusy
                ? "در حال انجام عملیات گروهی…"
                : `${toFaDigits(selected.size)} مورد انتخاب‌شده`}
            </span>
            {!bulkBusy && isDeletedView && canUpdate ? (
              <Button type="button" size="sm" className="h-7 gap-1" onClick={() => requestBulk("restore", selectedRows)}>
                <RotateCcw className="h-3.5 w-3.5" />
                بازگردانی
              </Button>
            ) : null}
            {!bulkBusy && !isDeletedView ? (
              <>
                {canUpdate ? (
                  <>
                    <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => requestBulk("activate", selectedRows)}>
                      فعال‌سازی
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => requestBulk("deactivate", selectedRows)}>
                      غیرفعال‌سازی
                    </Button>
                  </>
                ) : null}
                {canDelete ? (
                  <Button type="button" size="sm" variant="destructive" className="h-7" onClick={() => requestBulk("delete", selectedRows)}>
                    حذف
                  </Button>
                ) : null}
              </>
            ) : null}
            {!bulkBusy ? (
              <Button type="button" size="sm" variant="ghost" className="h-7" onClick={() => setSelected(new Set())}>
                لغو انتخاب
              </Button>
            ) : null}
          </div>
        ) : null}

        <div
          className={cn(
            "min-h-0 flex-1 overflow-auto rounded-xl border border-border transition-opacity",
            isRefreshing && !isInitialLoading && "opacity-70"
          )}
        >
          {isInitialLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : pageRows.length === 0 ? (
            <EmptyState
              icon={Network}
              title={isFiltered ? "نتیجه‌ای پیدا نشد" : isDeletedView ? "واحد حذف‌شده‌ای نیست" : "واحدی ثبت نشده"}
              description={
                isFiltered
                  ? "عبارت جستجو یا فیلتر را تغییر دهید."
                  : isDeletedView
                    ? "موارد حذف‌شده در این فهرست نمایش داده می‌شوند."
                    : "اولین واحد را برای یکی از شعب ثبت کنید."
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 px-2">
                    <Checkbox
                      checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                      onCheckedChange={(v) => {
                        setSelected((prev) => {
                          const n = new Set(prev);
                          if (v) pageIds.forEach((id) => n.add(id));
                          else pageIds.forEach((id) => n.delete(id));
                          return n;
                        });
                      }}
                      aria-label="انتخاب صفحه"
                    />
                  </TableHead>
                  {COLS.map((c) =>
                    visible[c.id] === false ? null : (
                      <TableHead key={c.id} className="px-2">
                        {c.sort ? (
                          <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort(c.sort!)}>
                            {c.label}
                            <SortIcon k={c.sort} />
                          </button>
                        ) : (
                          c.label
                        )}
                      </TableHead>
                    )
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row) => (
                  <TableRow key={row.department_id}>
                    <TableCell className="px-2">
                      <Checkbox
                        checked={selected.has(row.department_id)}
                        onCheckedChange={(v) => {
                          setSelected((prev) => {
                            const n = new Set(prev);
                            if (v) n.add(row.department_id);
                            else n.delete(row.department_id);
                            return n;
                          });
                        }}
                        aria-label={`انتخاب ${row.name}`}
                      />
                    </TableCell>
                    {visible.name !== false ? (
                      <TableCell className="px-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link
                            href={companyDetailPath(row.company_id ?? "", { from: "departments", hash: "departments" })}
                            className="font-medium hover:underline"
                          >
                            {row.name}
                          </Link>
                          {isRecentCreated(row.created_at) ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300" title="به‌تازگی ثبت شده">
                              <Sparkles className="h-3 w-3" />
                              تازه
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                    ) : null}
                    {visible.code !== false ? (
                      <TableCell className="px-2 font-mono text-xs" dir={formatCodeDisplay(row.code).dir}>
                        {formatCodeDisplay(row.code).text}
                      </TableCell>
                    ) : null}
                    {visible.company !== false ? (
                      <TableCell className="px-2 text-xs">
                        <Link href={companyDetailPath(row.company_id ?? "", { from: "departments" })} className="hover:underline">
                          {row.company_name}
                        </Link>
                      </TableCell>
                    ) : null}
                    {visible.branch !== false ? (
                      <TableCell className="px-2 text-xs">{row.branch_name}</TableCell>
                    ) : null}
                    {visible.status !== false ? (
                      <TableCell className="px-2">
                        {row.is_active !== false ? (
                          <StatusChip label="فعال" tone="success" />
                        ) : (
                          <StatusChip label="غیرفعال" tone="neutral" />
                        )}
                      </TableCell>
                    ) : null}
                    {visible.created !== false ? (
                      <TableCell className="px-2 text-xs text-muted-foreground">{fd(row.created_at)}</TableCell>
                    ) : null}
                    {visible.actions !== false ? (
                      <TableCell className="px-2">
                        <div className="flex items-center gap-0.5">
                          {isDeletedView ? (
                            canUpdate ? (
                              <IconAction label="بازگردانی" onClick={() => void restoreOne(row)}>
                                <RotateCcw className="h-3.5 w-3.5" />
                              </IconAction>
                            ) : null
                          ) : (
                            <>
                              {canUpdate ? (
                                <>
                                  <IconAction label="ویرایش" onClick={() => openEdit(row)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </IconAction>
                                  {row.is_active !== false ? (
                                    <IconAction label="غیرفعال‌سازی" onClick={() => void setActive(row, false)}>
                                      <PowerOff className="h-3.5 w-3.5" />
                                    </IconAction>
                                  ) : (
                                    <IconAction label="فعال‌سازی" onClick={() => void setActive(row, true)}>
                                      <Power className="h-3.5 w-3.5" />
                                    </IconAction>
                                  )}
                                </>
                              ) : null}
                              {canDelete ? (
                                <IconAction label="حذف" variant="destructive" onClick={() => setConfirmDelete(row)}>
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

        {total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {toFaDigits(total)} مورد — صفحه {toFaDigits(safePage)} از {toFaDigits(totalPages)}
            </span>
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="sm" className="h-7" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                قبلی
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-7" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>
                بعدی
              </Button>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
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

        <Dialog open={!!confirmBulk} onOpenChange={(o) => !o && !bulkBusy && setConfirmBulk(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {confirmBulk?.kind === "delete"
                  ? "تأیید حذف"
                  : confirmBulk?.kind === "restore"
                    ? "تأیید بازگردانی"
                    : confirmBulk?.kind === "activate"
                      ? "تأیید فعال‌سازی"
                      : "تأیید غیرفعال‌سازی"}
              </DialogTitle>
              <DialogDescription className="text-right leading-relaxed">
                {confirmBulk
                  ? confirmBulk.kind === "delete"
                    ? `${toFaDigits(confirmBulk.targets.length)} واحد انتخاب‌شده حذف می‌شوند. سوابق حفظ می‌شود.`
                    : confirmBulk.kind === "restore"
                      ? `${toFaDigits(confirmBulk.targets.length)} واحد بازگردانی می‌شوند و تا فعال‌سازی دستی غیرفعال می‌مانند.`
                      : confirmBulk.kind === "activate"
                        ? `${toFaDigits(confirmBulk.targets.length)} واحد فعال می‌شوند.`
                        : `${toFaDigits(confirmBulk.targets.length)} واحد غیرفعال می‌شوند.`
                  : ""}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" disabled={bulkBusy} onClick={() => setConfirmBulk(null)}>
                انصراف
              </Button>
              <Button
                type="button"
                size="sm"
                variant={confirmBulk?.kind === "delete" ? "destructive" : "default"}
                disabled={bulkBusy || !confirmBulk}
                onClick={() => confirmBulk && void runBulk(confirmBulk.kind, confirmBulk.targets)}
              >
                {bulkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "تأیید"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تأیید حذف واحد</DialogTitle>
              <DialogDescription className="text-right leading-relaxed">
                واحد «{confirmDelete?.name}» حذف می‌شود. سوابق حفظ می‌شود.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>
                انصراف
              </Button>
              <Button type="button" size="sm" variant="destructive" disabled={deleteMutation.isPending} onClick={() => void doDelete()}>
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حذف"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Sheet open={createOpen} onOpenChange={(open) => { if (!open) forceCloseCreate(); else setCreateOpen(true); }}>
          <SheetContent
            className="flex w-full flex-col sm:max-w-lg"
            side="right"
            onInteractOutside={(e) => { if (isDirty) e.preventDefault(); }}
            onEscapeKeyDown={(e) => { if (isDirty) e.preventDefault(); }}
          >
            <SheetHeader>
              <SheetTitle>واحد جدید</SheetTitle>
            </SheetHeader>
            <form className="flex min-h-0 flex-1 flex-col" onSubmit={onCreate}>
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">{formFields}</div>
              <SheetFooter>
                <Button type="button" variant="outline" size="sm" onClick={forceCloseCreate}>
                  انصراف
                </Button>
                <Button type="submit" size="sm" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>

        <Sheet open={editOpen} onOpenChange={(open) => { if (!open) forceCloseEdit(); else setEditOpen(true); }}>
          <SheetContent
            className="flex w-full flex-col sm:max-w-lg"
            side="right"
            onInteractOutside={(e) => { if (isDirty) e.preventDefault(); }}
            onEscapeKeyDown={(e) => { if (isDirty) e.preventDefault(); }}
          >
            <SheetHeader>
              <SheetTitle>ویرایش واحد</SheetTitle>
            </SheetHeader>
            <form className="flex min-h-0 flex-1 flex-col" onSubmit={onEdit}>
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">{formFields}</div>
              <SheetFooter>
                <Button type="button" variant="outline" size="sm" onClick={forceCloseEdit}>
                  انصراف
                </Button>
                <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ذخیره"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
