/** فهرست محدوده‌های دسترسی — هم‌تراز الگوی جدول کاربران / SoD */

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Columns3,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  Power,
  PowerOff,
  RotateCcw,
  Scan,
  Search,
  Trash2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
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
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { apiGet, ApiClientError } from "@/api";
import { usePermission } from "@/auth";
import { cn, toFaDigits } from "@/shared/lib/utils";
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

const SCOPE_TYPE_OPTIONS = [
  { value: "COMPANY", label: "شرکت" },
  { value: "BRANCH", label: "شعبه" },
  { value: "DEPARTMENT", label: "واحد سازمانی" },
  { value: "BUSINESS_UNIT", label: "واحد کسب‌وکار" },
  { value: "COST_CENTER", label: "مرکز هزینه" },
  { value: "WAREHOUSE", label: "انبار" },
  { value: "CUSTOM", label: "سفارشی" },
] as const;

type RefOption = { id: string; label: string };
type ListStatusFilter = "all" | "active" | "inactive" | "deleted";
type SortKey =
  | "name"
  | "type"
  | "ref"
  | "status"
  | "created_at"
  | "updated_at";
type SortDir = "asc" | "desc";

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

function formatJalaliDateTime(value?: string | null): string {
  if (!value) return "—";
  try {
    return toFaDigits(
      new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    );
  } catch {
    return toFaDigits(String(value));
  }
}

function formatJalaliDate(value?: string | null): string {
  if (!value) return "—";
  try {
    return toFaDigits(
      new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(value))
    );
  } catch {
    return toFaDigits(String(value));
  }
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sortValue(r: ScopeDto, key: SortKey): string | number {
  switch (key) {
    case "name":
      return (r.scope_name ?? "").toLowerCase();
    case "type":
      return (r.scope_type ?? "").toLowerCase();
    case "ref":
      return (r.reference_id ?? "").toLowerCase();
    case "status":
      if (r.deleted_at) return 2;
      if (r.is_active === false) return 1;
      return 0;
    case "created_at":
      return r.created_at ? new Date(String(r.created_at)).getTime() : 0;
    case "updated_at":
      return r.updated_at ? new Date(String(r.updated_at)).getTime() : 0;
    default:
      return "";
  }
}

function exportScopesExcel(rows: ScopeDto[]) {
  const aoa: (string | number)[][] = [
    [
      "نام محدوده",
      "نوع",
      "مرجع",
      "وضعیت",
      "توضیح",
      "تاریخ ایجاد",
      "آخرین ویرایش",
    ],
  ];
  for (const r of rows) {
    const status = r.deleted_at
      ? "حذف‌شده"
      : r.is_active === false
        ? "غیرفعال"
        : "فعال";
    aoa.push([
      r.scope_name ?? "",
      scopeTypeLabel(r.scope_type),
      r.reference_id ?? "",
      status,
      r.description ?? "",
      formatJalaliDateTime(r.created_at ? String(r.created_at) : null),
      formatJalaliDateTime(r.updated_at ? String(r.updated_at) : null),
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "محدوده‌ها");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `scopes-${formatJalaliDate(new Date().toISOString()).replace(/\//g, "-")}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast.success("فایل اکسل آماده شد");
}

function exportScopesPdf(rows: ScopeDto[]) {
  const body = rows
    .map((r) => {
      const status = r.deleted_at
        ? "حذف‌شده"
        : r.is_active === false
          ? "غیرفعال"
          : "فعال";
      const cells = [
        escapeHtml(r.scope_name ?? "—"),
        escapeHtml(scopeTypeLabel(r.scope_type)),
        escapeHtml(
          r.reference_id ? String(r.reference_id).slice(0, 8) + "…" : "—"
        ),
        escapeHtml(status),
        escapeHtml(formatJalaliDate(r.created_at ? String(r.created_at) : null)),
      ];
      return `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
    })
    .join("");
  const html = `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/><title>محدوده‌های دسترسی</title>
<style>body{font-family:Tahoma,Arial,sans-serif;font-size:12px;padding:16px;direction:rtl}h1{font-size:16px;margin:0 0 12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 8px;text-align:right}th{background:#f3f4f6}</style></head><body>
<h1>محدوده‌های دسترسی</h1>
<table><thead><tr><th>نام</th><th>نوع</th><th>مرجع</th><th>وضعیت</th><th>ایجاد</th></tr></thead>
<tbody>${body}</tbody></table>
<script>window.onload=function(){window.print()}</script></body></html>`;
  const w = window.open("", "_blank");
  if (!w) {
    toast.error("مرورگر پنجره چاپ را مسدود کرد");
    return;
  }
  w.document.write(html);
  w.document.close();
}

function IconAction({
  label,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn("h-8 w-8", className)}
          disabled={disabled}
          onClick={onClick}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export function ScopesListPage() {
  const canView = usePermission(IdentityPermissions.scopeView);
  const canCreate = usePermission("identity.scope.create");
  const canUpdate = usePermission("identity.scope.update");
  const canDelete = usePermission("identity.scope.delete");

  const [listStatus, setListStatus] = useState<ListStatusFilter>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [visibleCols, setVisibleCols] = useState<Set<string>>(
    () =>
      new Set([
        "name",
        "type",
        "ref",
        "status",
        "created_at",
        "updated_at",
        "actions",
      ])
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ScopeDto | null>(null);

  const membershipFilter: ScopeMembershipFilter =
    listStatus === "deleted" ? "deleted" : "active";

  const { data, isLoading, isError, error, refetch } =
    useScopes(membershipFilter);
  const createMutation = useCreateScope();
  const updateMutation = useUpdateScope();
  const deleteMutation = useSoftDeleteScope();
  const restoreMutation = useRestoreScope();

  const [refOptions, setRefOptions] = useState<RefOption[]>([]);
  const [refLoading, setRefLoading] = useState(false);
  const [refHint, setRefHint] = useState<string | null>(null);
  const [refSearch, setRefSearch] = useState("");

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
  const formDirty = Boolean(
    form.watch("scope_name")?.trim() ||
      form.watch("description")?.trim() ||
      form.watch("reference_id") ||
      form.watch("scope_type") !== "BRANCH"
  );

  useEffect(() => {
    if (!createOpen) return;
    form.setValue("reference_id", "");
    setRefOptions([]);
    setRefHint(null);
    setRefSearch("");

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

  const filteredSorted = useMemo(() => {
    let list = data ?? [];
    if (listStatus === "active") {
      list = list.filter((r) => r.is_active !== false);
    } else if (listStatus === "inactive") {
      list = list.filter((r) => r.is_active === false);
    }
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter((r) => {
        const typeFa = scopeTypeLabel(r.scope_type);
        return [r.scope_name, typeFa, r.description, r.reference_id].some((v) =>
          String(v ?? "")
            .toLowerCase()
            .includes(term)
        );
      });
    }
    return [...list].sort((a, b) => {
      const va = sortValue(a, sortKey);
      const vb = sortValue(b, sortKey);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, listStatus, q, sortKey, sortDir]);

  const total = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredSorted.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "created_at" || key === "updated_at" ? "desc" : "asc");
    }
    setPage(1);
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  };

  const COL_META: { id: string; label: string; locked?: boolean }[] = [
    { id: "name", label: "نام محدوده", locked: true },
    { id: "type", label: "نوع" },
    { id: "ref", label: "مرجع" },
    { id: "status", label: "وضعیت" },
    { id: "created_at", label: "تاریخ ایجاد" },
    { id: "updated_at", label: "آخرین ویرایش" },
    { id: "actions", label: "عملیات", locked: true },
  ];

  const toggleCol = (id: string) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredRefOptions = useMemo(() => {
    const term = refSearch.trim().toLowerCase();
    if (!term) return refOptions;
    return refOptions.filter((o) => o.label.toLowerCase().includes(term));
  }, [refOptions, refSearch]);

  function resetCreateForm() {
    form.reset({
      scope_name: "",
      scope_type: "BRANCH",
      reference_id: "",
      description: "",
    });
    setRefSearch("");
    setRefOptions([]);
    setRefHint(null);
  }

  function handleCreateOpenChange(next: boolean) {
    if (!next) resetCreateForm();
    setCreateOpen(next);
  }

  async function onToggleActive(row: ScopeDto, active: boolean) {
    try {
      await updateMutation.mutateAsync({
        id: row.scope_id,
        payload: { is_active: active },
      });
      toast.success(active ? "محدوده فعال شد" : "محدوده غیرفعال شد");
    } catch (e) {
      toast.error(
        e instanceof ApiClientError ? e.message : MSG_GENERIC_ERROR
      );
    }
  }

  async function onRestore(row: ScopeDto) {
    try {
      await restoreMutation.mutateAsync(row.scope_id);
      toast.success("محدوده بازگردانی شد");
    } catch (e) {
      toast.error(
        e instanceof ApiClientError ? e.message : MSG_GENERIC_ERROR
      );
    }
  }

  async function onConfirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.scope_id);
      toast.success("محدوده حذف شد (قابل بازیابی)");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(
        e instanceof ApiClientError ? e.message : MSG_GENERIC_ERROR
      );
    }
  }

  async function onCreateSubmit(values: CreateForm) {
    const name = values.scope_name.trim();
    if (!name) {
      toast.error("نام محدوده الزامی است");
      return;
    }
    const type = String(values.scope_type).toUpperCase();
    const refId = (values.reference_id || "").trim() || null;
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
      toast.success("محدوده دسترسی ثبت شد");
      handleCreateOpenChange(false);
    } catch (e) {
      toast.error(
        e instanceof ApiClientError ? e.message : MSG_GENERIC_ERROR
      );
    }
  }

  if (!canView) {
    return (
      <div className="flex min-h-0 flex-col gap-3">
        <EmptyState title="دسترسی ندارید" description={MSG_NO_ACCESS} />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-0 flex-col gap-3">
        <PageHeader
          title="محدوده‌های دسترسی"
          description="تعیین محدودهٔ سازمانی که نقش‌ها و کاربران در آن عمل می‌کنند"
          icon={<Scan className="h-5 w-5" />}
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "محدوده‌ها" },
          ]}
          actions={
            canCreate ? (
              <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="me-1.5 h-4 w-4" />
                محدوده جدید
              </Button>
            ) : null
          }
        />

        {isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <p className="font-medium">بارگذاری فهرست ممکن نشد</p>
            <p className="mt-1 text-xs">
              {error instanceof Error ? error.message : MSG_LOAD_ERROR}
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

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 ps-8 text-sm"
              placeholder="جستجو…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={listStatus}
            onValueChange={(v) => {
              setListStatus(v as ListStatusFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[9.5rem]">
              <SelectValue placeholder="وضعیت" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              <SelectItem value="active">فعال</SelectItem>
              <SelectItem value="inactive">غیرفعال</SelectItem>
              <SelectItem value="deleted">سطل بازیابی</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5">
                <Columns3 className="h-3.5 w-3.5" />
                ستون‌ها
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>نمایش ستون‌ها</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COL_META.filter((c) => !c.locked).map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  className="gap-2"
                  onSelect={(e) => {
                    e.preventDefault();
                    toggleCol(c.id);
                  }}
                >
                  <Checkbox
                    checked={visibleCols.has(c.id)}
                    className="pointer-events-none"
                  />
                  <span>{c.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                disabled={filteredSorted.length === 0}
              >
                <Download className="h-3.5 w-3.5" />
                خروجی
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                خروجی {toFaDigits(filteredSorted.length)} مورد
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2"
                onSelect={() => exportScopesExcel(filteredSorted)}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                اکسل
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2"
                onSelect={() => exportScopesPdf(filteredSorted)}
              >
                <FileText className="h-3.5 w-3.5" />
                PDF / چاپ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b bg-card shadow-sm">
                <TableHead className="sticky top-0 z-20 w-10 bg-card px-2 text-center text-xs">
                  #
                </TableHead>
                {visibleCols.has("name") ? (
                  <TableHead className="sticky top-0 z-20 bg-card">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      onClick={() => toggleSort("name")}
                    >
                      نام محدوده
                      <SortIcon k="name" />
                    </button>
                  </TableHead>
                ) : null}
                {visibleCols.has("type") ? (
                  <TableHead className="sticky top-0 z-20 bg-card">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      onClick={() => toggleSort("type")}
                    >
                      نوع
                      <SortIcon k="type" />
                    </button>
                  </TableHead>
                ) : null}
                {visibleCols.has("ref") ? (
                  <TableHead className="sticky top-0 z-20 bg-card">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      onClick={() => toggleSort("ref")}
                    >
                      مرجع
                      <SortIcon k="ref" />
                    </button>
                  </TableHead>
                ) : null}
                {visibleCols.has("status") ? (
                  <TableHead className="sticky top-0 z-20 bg-card">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      onClick={() => toggleSort("status")}
                    >
                      وضعیت
                      <SortIcon k="status" />
                    </button>
                  </TableHead>
                ) : null}
                {visibleCols.has("created_at") ? (
                  <TableHead className="sticky top-0 z-20 bg-card">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      onClick={() => toggleSort("created_at")}
                    >
                      تاریخ ایجاد
                      <SortIcon k="created_at" />
                    </button>
                  </TableHead>
                ) : null}
                {visibleCols.has("updated_at") ? (
                  <TableHead className="sticky top-0 z-20 bg-card">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      onClick={() => toggleSort("updated_at")}
                    >
                      آخرین ویرایش
                      <SortIcon k="updated_at" />
                    </button>
                  </TableHead>
                ) : null}
                <TableHead className="sticky top-0 z-20 w-[5.5rem] bg-card text-end">
                  عملیات
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8} className="py-2">
                      <Skeleton className="h-7 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="p-0">
                    <EmptyState
                      title={
                        Boolean(q.trim()) || listStatus !== "all"
                          ? "نتیجه‌ای پیدا نشد"
                          : "محدوده‌ای ثبت نشده"
                      }
                      description={
                        Boolean(q.trim()) || listStatus !== "all"
                          ? "عبارت جستجو یا فیلتر وضعیت را تغییر دهید."
                          : "با «محدوده جدید» اولین محدوده دسترسی را بسازید."
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((r, idx) => (
                  <TableRow key={r.scope_id}>
                    <TableCell className="px-2 py-1 text-center text-xs tabular-nums text-muted-foreground">
                      {toFaDigits((safePage - 1) * pageSize + idx + 1)}
                    </TableCell>
                    {visibleCols.has("name") ? (
                      <TableCell className="px-2 py-1">
                        <div className="min-w-0 max-w-[220px]">
                          <div className="truncate text-sm font-medium">
                            {r.scope_name || "—"}
                          </div>
                          {r.description ? (
                            <div className="truncate text-[11px] text-muted-foreground">
                              {r.description}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                    ) : null}
                    {visibleCols.has("type") ? (
                      <TableCell className="px-2 py-1 text-xs">
                        {scopeTypeLabel(r.scope_type)}
                      </TableCell>
                    ) : null}
                    {visibleCols.has("ref") ? (
                      <TableCell className="px-2 py-1">
                        <span
                          className="font-mono text-[11px] text-muted-foreground"
                          dir="ltr"
                        >
                          {r.reference_id
                            ? `${String(r.reference_id).slice(0, 8)}…`
                            : "—"}
                        </span>
                      </TableCell>
                    ) : null}
                    {visibleCols.has("status") ? (
                      <TableCell className="px-2 py-1">
                        {listStatus === "deleted" || r.deleted_at ? (
                          <StatusChip label="حذف‌شده" tone="danger" />
                        ) : r.is_active === false ? (
                          <StatusChip label="غیرفعال" tone="warning" />
                        ) : (
                          <StatusChip label="فعال" tone="success" />
                        )}
                      </TableCell>
                    ) : null}
                    {visibleCols.has("created_at") ? (
                      <TableCell className="px-2 py-1 whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                        {formatJalaliDateTime(
                          r.created_at ? String(r.created_at) : null
                        )}
                      </TableCell>
                    ) : null}
                    {visibleCols.has("updated_at") ? (
                      <TableCell className="px-2 py-1 whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                        {formatJalaliDateTime(
                          r.updated_at ? String(r.updated_at) : null
                        )}
                      </TableCell>
                    ) : null}
                    <TableCell className="px-2 py-1">
                      {listStatus === "deleted" ? (
                        canUpdate ? (
                          <div className="flex justify-end">
                            <IconAction
                              label="بازگردانی"
                              disabled={restoreMutation.isPending}
                              onClick={() => void onRestore(r)}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </IconAction>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )
                      ) : (
                        <div className="flex items-center justify-end gap-0.5">
                          {canUpdate ? (
                            r.is_active !== false ? (
                              <IconAction
                                label="غیرفعال‌سازی"
                                className="text-amber-700"
                                disabled={updateMutation.isPending}
                                onClick={() => void onToggleActive(r, false)}
                              >
                                <PowerOff className="h-3.5 w-3.5" />
                              </IconAction>
                            ) : (
                              <IconAction
                                label="فعال‌سازی"
                                className="text-emerald-700"
                                disabled={updateMutation.isPending}
                                onClick={() => void onToggleActive(r, true)}
                              >
                                <Power className="h-3.5 w-3.5" />
                              </IconAction>
                            )
                          ) : null}
                          {canDelete ? (
                            <IconAction
                              label="حذف"
                              className="text-destructive"
                              onClick={() => setDeleteTarget(r)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </IconAction>
                          ) : null}
                          {!canUpdate && !canDelete ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : null}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {total === 0
              ? "موردی نیست"
              : `نمایش ${toFaDigits((safePage - 1) * pageSize + 1)}–${toFaDigits(Math.min(safePage * pageSize, total))} از ${toFaDigits(total)}`}
          </span>
          <div className="flex items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(1);
              }}
            >
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
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
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
              className="h-7"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              بعدی
            </Button>
          </div>
        </div>

        <Sheet open={createOpen} onOpenChange={handleCreateOpenChange}>
          <SheetContent
            side="right"
            className="flex h-full max-h-dvh w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
            onInteractOutside={(e) => {
              if (formDirty) e.preventDefault();
            }}
            onPointerDownOutside={(e) => {
              if (formDirty) e.preventDefault();
            }}
            onEscapeKeyDown={(e) => {
              if (formDirty) e.preventDefault();
            }}
          >
            <SheetHeader className="shrink-0 space-y-1 border-b px-6 py-4 text-start">
              <SheetTitle>محدوده دسترسی جدید</SheetTitle>
              <SheetDescription>
                نام، نوع و در صورت نیاز موجودیت مرجع را مشخص کنید.
              </SheetDescription>
            </SheetHeader>
            <form
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
              onSubmit={form.handleSubmit((v) => void onCreateSubmit(v))}
            >
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="scope-name">نام محدوده</Label>
                  <Input
                    id="scope-name"
                    className="h-9"
                    placeholder="مثال: شعبه مرکزی"
                    {...form.register("scope_name", { required: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>نوع محدوده</Label>
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
                      {SCOPE_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {needsReference ? (
                  <div className="space-y-2">
                    <Label>موجودیت مرجع</Label>
                    {refLoading ? (
                      <div className="flex h-9 items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        در حال بارگذاری فهرست…
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <div className="border-b p-1.5">
                          <Input
                            className="h-8"
                            placeholder="جستجوی موجودیت…"
                            value={refSearch}
                            onChange={(e) => setRefSearch(e.target.value)}
                          />
                        </div>
                        <div className="max-h-40 overflow-y-auto p-1">
                          {filteredRefOptions.length === 0 ? (
                            <p className="px-2 py-2 text-xs text-muted-foreground">
                              موردی یافت نشد
                            </p>
                          ) : (
                            filteredRefOptions.map((o) => (
                              <button
                                key={o.id}
                                type="button"
                                className={cn(
                                  "flex w-full rounded px-2 py-1.5 text-start text-sm hover:bg-muted/60",
                                  form.watch("reference_id") === o.id &&
                                    "bg-muted font-medium"
                                )}
                                onClick={() =>
                                  form.setValue("reference_id", o.id, {
                                    shouldDirty: true,
                                    shouldTouch: true,
                                  })
                                }
                              >
                                {o.label}
                              </button>
                            ))
                          )}
                        </div>
                        {form.watch("reference_id") ? (
                          <div className="border-t px-2 py-1.5 text-xs text-muted-foreground">
                            انتخاب‌شده:{" "}
                            {refOptions.find(
                              (o) => o.id === form.watch("reference_id")
                            )?.label ?? "—"}
                          </div>
                        ) : null}
                      </div>
                    )}
                    {refHint ? (
                      <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                        {refHint}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="scope-desc">توضیح (اختیاری)</Label>
                  <Input
                    id="scope-desc"
                    className="h-9"
                    {...form.register("description")}
                  />
                </div>
              </div>
              <SheetFooter className="shrink-0 gap-2 border-t px-6 py-4 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCreateOpenChange(false)}
                >
                  انصراف
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending ||
                    (needsReference && !form.watch("reference_id"))
                  }
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
                      در حال ثبت…
                    </>
                  ) : (
                    "ثبت محدوده"
                  )}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>

        <Dialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>حذف محدوده دسترسی</DialogTitle>
              <DialogDescription>
                محدوده «{deleteTarget?.scope_name}» به‌صورت نرم حذف می‌شود و از
                «سطل بازیابی» قابل بازگردانی است.
              </DialogDescription>
            </DialogHeader>
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
                disabled={deleteMutation.isPending || !deleteTarget}
                onClick={() => void onConfirmDelete()}
              >
                {deleteMutation.isPending ? "در حال حذف…" : "بله، حذف شود"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
