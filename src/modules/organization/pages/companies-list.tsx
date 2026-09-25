/**
 * FE-ORG — فهرست شرکت‌ها
 * Table parity with identity members: sort, select, columns, export, bulk.
 * Create/Edit: right Sheet. Activate/deactivate + soft-delete with BE guards.
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  CircleHelp,
  Columns3,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  Trash2,
  X,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import { cn, toFaDigits } from "@/shared/lib/utils";
import {
  useCompanies,
  useCreateCompany,
  useSoftDeleteCompany,
  useUpdateCompany,
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
const COL_STORAGE = "organization.companies.columns.v1";

type StatusFilter = "all" | "active" | "inactive";
type SortKey =
  | "name"
  | "code"
  | "kind"
  | "reg"
  | "status"
  | "parent"
  | "created";
type SortDir = "asc" | "desc";
type ColumnId =
  | "name"
  | "code"
  | "kind"
  | "reg"
  | "parent"
  | "status"
  | "created"
  | "actions";
type BulkKind = "activate" | "deactivate" | "delete";

const COLS: { id: ColumnId; label: string; hideable?: boolean; sort?: SortKey }[] =
  [
    { id: "name", label: "نام شرکت", hideable: false, sort: "name" },
    { id: "code", label: "کد", sort: "code" },
    { id: "kind", label: "کاربرد", sort: "kind" },
    { id: "reg", label: "شماره ثبت", sort: "reg" },
    { id: "parent", label: "شرکت والد", sort: "parent" },
    { id: "status", label: "وضعیت", sort: "status" },
    { id: "created", label: "تاریخ ایجاد", sort: "created" },
    { id: "actions", label: "عملیات", hideable: false },
  ];

type CompanyForm = {
  code: string;
  name: string;
  legal_name: string;
  trade_name: string;
  registration_number: string;
  economic_code: string;
  tax_identifier: string;
  entity_kind: string;
  is_primary: boolean;
  parent_company_id: string;
  is_active: boolean;
};

const emptyForm = (): CompanyForm => ({
  code: "",
  name: "",
  legal_name: "",
  trade_name: "",
  registration_number: "",
  economic_code: "",
  tax_identifier: "",
  entity_kind: "OPERATING",
  is_primary: false,
  parent_company_id: "",
  is_active: true,
});

function companyToForm(c: CompanyDto): CompanyForm {
  return {
    code: c.code ?? "",
    name: c.name ?? "",
    legal_name: c.legal_name ?? "",
    trade_name: c.trade_name ?? "",
    registration_number: c.registration_number ?? "",
    economic_code: c.economic_code ?? "",
    tax_identifier: c.tax_identifier ?? "",
    entity_kind: (c.entity_kind as string) || "OPERATING",
    is_primary: Boolean(c.is_primary),
    parent_company_id: c.parent_company_id ?? "",
    is_active: c.is_active !== false,
  };
}

function displayName(c: CompanyDto) {
  return (c.legal_name || c.name || "—").trim() || "—";
}

function fd(v?: string | null) {
  if (!v) return "—";
  try {
    return toFaDigits(
      new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(v))
    );
  } catch {
    return toFaDigits(v);
  }
}

function sortValue(c: CompanyDto, key: SortKey, parentMap: Map<string, string>): string | number {
  if (key === "name") return displayName(c).toLowerCase();
  if (key === "code") return (c.code ?? "").toLowerCase();
  if (key === "kind")
    return (ENTITY_KIND_LABELS[c.entity_kind ?? "OPERATING"] ?? "").toLowerCase();
  if (key === "reg") return c.registration_number ?? "";
  if (key === "parent")
    return (c.parent_company_id ? parentMap.get(c.parent_company_id) ?? "" : "").toLowerCase();
  if (key === "status") return c.is_active !== false ? 1 : 0;
  return c.created_at ? new Date(c.created_at).getTime() : 0;
}

function IconAction({
  label,
  onClick,
  disabled,
  variant = "ghost",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "ghost" | "destructive";
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 shrink-0",
            variant === "destructive" &&
              "text-destructive hover:bg-destructive/10 hover:text-destructive"
          )}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

function exportCompaniesCsv(rows: CompanyDto[], parentMap: Map<string, string>) {
  const header = [
    "code",
    "name",
    "legal_name",
    "entity_kind",
    "registration_number",
    "is_primary",
    "is_active",
    "parent",
    "created_at",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    const cells = [
      r.code,
      displayName(r),
      r.legal_name ?? "",
      r.entity_kind ?? "OPERATING",
      r.registration_number ?? "",
      r.is_primary ? "1" : "0",
      r.is_active !== false ? "1" : "0",
      r.parent_company_id ? parentMap.get(r.parent_company_id) ?? "" : "",
      r.created_at ?? "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
    lines.push(cells.join(","));
  }
  const blob = new Blob(["\ufeff" + lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `companies-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function CompaniesListPage() {
  const canView = usePermission(OrganizationPermissions.companyView);
  const canCreate = usePermission(OrganizationPermissions.companyCreate);
  const canUpdate = usePermission(OrganizationPermissions.companyUpdate);
  const canDelete = usePermission(OrganizationPermissions.companyDelete);

  const { data, isLoading, isError, error, refetch, isFetching } = useCompanies();
  const createMutation = useCreateCompany();
  const updateMutation = useUpdateCompany();
  const deleteMutation = useSoftDeleteCompany();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [visible, setVisible] = useState<Record<ColumnId, boolean>>(() => {
    const base = Object.fromEntries(COLS.map((c) => [c.id, true])) as Record<
      ColumnId,
      boolean
    >;
    if (typeof window === "undefined") return base;
    try {
      const raw = localStorage.getItem(COL_STORAGE);
      return raw ? { ...base, ...JSON.parse(raw) } : base;
    } catch {
      return base;
    }
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const cancelRef = useRef(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyDto | null>(null);

  const form = useForm<CompanyForm>({ defaultValues: emptyForm() });
  const selectedKind = form.watch("entity_kind") || "OPERATING";

  useEffect(() => {
    try {
      localStorage.setItem(COL_STORAGE, JSON.stringify(visible));
    } catch {
      /* ignore */
    }
  }, [visible]);

  const rows = data ?? [];
  const parentMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of rows) m.set(c.company_id, displayName(c));
    return m;
  }, [rows]);

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (statusFilter === "active" && r.is_active === false) return false;
      if (statusFilter === "inactive" && r.is_active !== false) return false;
      if (!q) return true;
      return [r.code, r.name, r.legal_name, r.registration_number, r.economic_code]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    return [...list].sort((a, b) => {
      const va = sortValue(a, sortKey, parentMap);
      const vb = sortValue(b, sortKey, parentMap);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, query, statusFilter, sortKey, sortDir, parentMap]);

  const total = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredSorted.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );
  const isFiltered = query.trim().length > 0 || statusFilter !== "all";
  const pageIds = pageRows.map((r) => r.company_id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id));
  const selectedRows = useMemo(
    () => filteredSorted.filter((r) => selected.has(r.company_id)),
    [filteredSorted, selected]
  );
  const exportTarget = selectedRows.length > 0 ? selectedRows : filteredSorted;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "created" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  };

  const openCreate = () => {
    form.reset(emptyForm());
    setEditing(null);
    setCreateOpen(true);
  };

  const openEdit = (c: CompanyDto) => {
    setEditing(c);
    form.reset(companyToForm(c));
    setEditOpen(true);
  };

  const payloadFromForm = (values: CompanyForm) => ({
    code: values.code.trim(),
    name: values.name.trim(),
    legal_name: values.legal_name.trim() || values.name.trim(),
    trade_name: values.trade_name.trim() || null,
    registration_number: values.registration_number.trim() || null,
    economic_code: values.economic_code.trim() || null,
    tax_identifier: values.tax_identifier.trim() || null,
    entity_kind: values.entity_kind || "OPERATING",
    is_primary: values.is_primary,
    parent_company_id: values.parent_company_id || null,
    is_active: values.is_active,
    status: values.is_active ? 1 : 2,
  });

  const onCreate = form.handleSubmit(async (values) => {
    try {
      await createMutation.mutateAsync(payloadFromForm(values));
      toast.success("شرکت ثبت شد");
      setCreateOpen(false);
      form.reset(emptyForm());
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_ERR
      );
    }
  });

  const onEdit = form.handleSubmit(async (values) => {
    if (!editing) return;
    try {
      await updateMutation.mutateAsync({
        companyId: editing.company_id,
        payload: payloadFromForm(values),
      });
      toast.success("اطلاعات شرکت به‌روز شد");
      setEditOpen(false);
      setEditing(null);
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_ERR
      );
    }
  });

  const activateOne = async (row: CompanyDto) => {
    try {
      await updateMutation.mutateAsync({
        companyId: row.company_id,
        payload: {
          ...payloadFromForm(companyToForm(row)),
          is_active: true,
          status: 1,
        },
      });
      toast.success("شرکت فعال شد");
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_ERR
      );
    }
  };

  const deactivateOne = async (row: CompanyDto) => {
    if (row.is_primary) {
      toast.error(
        "شرکت اصلی قابل غیرفعال‌سازی نیست. ابتدا شرکت دیگری را اصلی کنید."
      );
      return;
    }
    if (
      !window.confirm(
        `شرکت «${displayName(row)}» و زیرمجموعه‌هایش غیرفعال شوند؟ داده‌های گذشته قابل مشاهده می‌مانند.`
      )
    )
      return;
    try {
      await updateMutation.mutateAsync({
        companyId: row.company_id,
        payload: {
          ...payloadFromForm(companyToForm(row)),
          is_active: false,
          status: 2,
        },
      });
      toast.success("شرکت و زیرمجموعه‌ها غیرفعال شدند");
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_ERR
      );
    }
  };

  const deleteOne = async (row: CompanyDto) => {
    if (row.is_primary) {
      toast.error(
        "شرکت اصلی قابل حذف نیست. ابتدا شرکت دیگری را اصلی کنید."
      );
      return;
    }
    if (
      !window.confirm(
        `شرکت «${displayName(row)}» حذف نرم شود؟ در صورت داشتن شعبه یا زیرمجموعه، حذف انجام نمی‌شود.`
      )
    )
      return;
    try {
      await deleteMutation.mutateAsync(row.company_id);
      toast.success("شرکت حذف شد (حذف نرم)");
      setSelected((prev) => {
        const n = new Set(prev);
        n.delete(row.company_id);
        return n;
      });
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_ERR
      );
    }
  };

  const runBulk = async (kind: BulkKind, targets: CompanyDto[]) => {
    cancelRef.current = false;
    setBulkBusy(true);
    setBulkProgress({ done: 0, total: targets.length });
    let ok = 0;
    let fail = 0;
    for (let i = 0; i < targets.length; i++) {
      if (cancelRef.current) break;
      const r = targets[i];
      try {
        if (kind === "activate") {
          await updateMutation.mutateAsync({
            companyId: r.company_id,
            payload: {
              ...payloadFromForm(companyToForm(r)),
              is_active: true,
              status: 1,
            },
          });
        } else if (kind === "deactivate") {
          if (r.is_primary) throw new Error("شرکت اصلی");
          await updateMutation.mutateAsync({
            companyId: r.company_id,
            payload: {
              ...payloadFromForm(companyToForm(r)),
              is_active: false,
              status: 2,
            },
          });
        } else {
          if (r.is_primary) throw new Error("شرکت اصلی");
          await deleteMutation.mutateAsync(r.company_id);
        }
        ok += 1;
      } catch {
        fail += 1;
      }
      setBulkProgress({ done: i + 1, total: targets.length });
    }
    setBulkBusy(false);
    setSelected(new Set());
    if (ok)
      toast.success(
        kind === "activate"
          ? `${toFaDigits(ok)} شرکت فعال شد`
          : kind === "deactivate"
            ? `${toFaDigits(ok)} شرکت غیرفعال شد`
            : `${toFaDigits(ok)} شرکت حذف شد`
      );
    if (fail) toast.error(`${toFaDigits(fail)} مورد انجام نشد`);
  };

  const entityKindField = (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium leading-none">
        {ENTITY_KIND_FIELD_LABEL}
      </legend>
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
                  form.setValue("entity_kind", opt.value, { shouldDirty: true })
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
    </fieldset>
  );

  const formFields = (
    excludeId?: string
  ) => (
    <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>کد *</Label>
          <Input className="h-9" dir="ltr" {...form.register("code", { required: true })} />
        </div>
        <div className="space-y-1.5">
          <Label>نام نمایشی *</Label>
          <Input className="h-9" {...form.register("name", { required: true })} />
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
          <Input className="h-9" dir="ltr" {...form.register("registration_number")} />
        </div>
        <div className="space-y-1.5">
          <Label>کد اقتصادی</Label>
          <Input className="h-9" dir="ltr" {...form.register("economic_code")} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>شناسه مالیاتی</Label>
        <Input className="h-9" dir="ltr" {...form.register("tax_identifier")} />
      </div>
      {entityKindField}
      <div className="space-y-1.5">
        <Label>شرکت والد</Label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          {...form.register("parent_company_id")}
        >
          <option value="">— بدون والد —</option>
          {rows
            .filter((c) => c.company_id !== excludeId)
            .map((c) => (
              <option key={c.company_id} value={c.company_id}>
                {displayName(c)} ({c.code})
              </option>
            ))}
        </select>
      </div>
      <div className="flex items-center justify-between gap-2 pt-1">
        <Label>شرکت اصلی سازمان</Label>
        <Switch
          checked={form.watch("is_primary")}
          onCheckedChange={(v) => form.setValue("is_primary", v, { shouldDirty: true })}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <Label>فعال</Label>
        <Switch
          checked={form.watch("is_active")}
          onCheckedChange={(v) => form.setValue("is_active", v, { shouldDirty: true })}
        />
      </div>
    </div>
  );

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
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-0 flex-col gap-3">
        <PageHeader
          title="شرکت‌ها"
          description="فهرست شرکت‌های سازمان — ویرایش، فعال‌سازی و مدیریت ساختار"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "سازمان", href: "/dashboard/organization" },
            { label: "شرکت‌ها" },
          ]}
          actions={
            canCreate ? (
              <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                شرکت جدید
              </Button>
            ) : null
          }
        />

        {isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <p className="font-medium">بارگذاری فهرست ممکن نشد</p>
            <p className="mt-1 text-xs">
              {error instanceof ApiClientError && error.message
                ? error.message
                : MSG_LOAD}
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
              className={cn("h-8 ps-8 text-sm", query && "pe-8")}
              placeholder="نام، کد، شماره ثبت…"
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5">
                <Columns3 className="h-3.5 w-3.5" />
                ستون‌ها
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>نمایش ستون‌ها</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COLS.filter((c) => c.hideable !== false).map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  className="gap-2"
                  onSelect={(e) => {
                    e.preventDefault();
                    setVisible((p) => ({ ...p, [c.id]: !p[c.id] }));
                  }}
                >
                  <Checkbox checked={visible[c.id]} className="pointer-events-none" />
                  <span>{c.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5">
                <Download className="h-3.5 w-3.5" />
                خروجی
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {selected.size > 0
                  ? `خروجی انتخاب‌شده‌ها (${toFaDigits(selected.size)})`
                  : `خروجی فهرست (${toFaDigits(total)})`}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2"
                onSelect={() => exportCompaniesCsv(exportTarget, parentMap)}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                CSV / اکسل
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {isFetching && !isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : null}
          <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <Building2 className="h-3.5 w-3.5" />
            <span>{toFaDigits(total)} شرکت</span>
          </div>
        </div>

        {selected.size > 0 || bulkBusy ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm">
            <span className="text-xs text-muted-foreground">
              {bulkBusy
                ? `در حال انجام… ${toFaDigits(bulkProgress.done)}/${toFaDigits(bulkProgress.total)}`
                : `${toFaDigits(selected.size)} انتخاب‌شده`}
            </span>
            {canUpdate && !bulkBusy ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7"
                  onClick={() => void runBulk("activate", selectedRows)}
                >
                  فعال‌سازی
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7"
                  onClick={() => {
                    if (
                      window.confirm(
                        "شرکت‌های انتخاب‌شده (غیر از اصلی) و زیرمجموعه‌هایشان غیرفعال شوند؟"
                      )
                    )
                      void runBulk("deactivate", selectedRows);
                  }}
                >
                  غیرفعال‌سازی
                </Button>
              </>
            ) : null}
            {canDelete && !bulkBusy ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-destructive"
                onClick={() => {
                  if (window.confirm("حذف نرم موارد انتخاب‌شده؟"))
                    void runBulk("delete", selectedRows);
                }}
              >
                حذف
              </Button>
            ) : null}
            {bulkBusy ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7"
                onClick={() => {
                  cancelRef.current = true;
                }}
              >
                توقف
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7"
                onClick={() => setSelected(new Set())}
              >
                لغو انتخاب
              </Button>
            )}
          </div>
        ) : null}

        {isLoading ? (
          <div className="space-y-1.5 rounded-lg border p-2.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : pageRows.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={isFiltered ? "نتیجه‌ای پیدا نشد" : "شرکتی ثبت نشده"}
            description={
              isFiltered
                ? "عبارت یا فیلتر را تغییر دهید."
                : "اولین شرکت سازمان را ثبت کنید."
            }
          />
        ) : (
          <div className="relative max-h-[min(70vh,40rem)] overflow-auto rounded-lg border border-border/60">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 px-2">
                    <Checkbox
                      checked={
                        allPageSelected
                          ? true
                          : somePageSelected
                            ? "indeterminate"
                            : false
                      }
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
                  {COLS.filter((c) => visible[c.id]).map((c) => (
                    <TableHead key={c.id} className="h-9 px-2 text-[11px]">
                      {c.sort ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 font-medium"
                          onClick={() => toggleSort(c.sort!)}
                        >
                          {c.label}
                          <SortIcon k={c.sort!} />
                        </button>
                      ) : (
                        c.label
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row) => (
                  <TableRow key={row.company_id} className="[&_td]:py-1.5">
                    <TableCell className="px-2">
                      <Checkbox
                        checked={selected.has(row.company_id)}
                        onCheckedChange={(v) => {
                          setSelected((prev) => {
                            const n = new Set(prev);
                            if (v) n.add(row.company_id);
                            else n.delete(row.company_id);
                            return n;
                          });
                        }}
                        aria-label={`انتخاب ${displayName(row)}`}
                      />
                    </TableCell>
                    {visible.name ? (
                      <TableCell className="px-2">
                        <div className="flex flex-col gap-0.5">
                          <Link
                            href={`/dashboard/organization/companies/${row.company_id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {displayName(row)}
                          </Link>
                          {row.is_primary ? (
                            <span className="text-[10px] text-amber-700 dark:text-amber-400">
                              شرکت اصلی
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                    ) : null}
                    {visible.code ? (
                      <TableCell className="px-2">
                        <span className="font-mono text-xs" dir="ltr">
                          {row.code}
                        </span>
                      </TableCell>
                    ) : null}
                    {visible.kind ? (
                      <TableCell className="px-2 text-xs">
                        {ENTITY_KIND_LABELS[row.entity_kind ?? "OPERATING"] ??
                          row.entity_kind ??
                          "—"}
                      </TableCell>
                    ) : null}
                    {visible.reg ? (
                      <TableCell className="px-2 text-xs text-muted-foreground" dir="ltr">
                        {row.registration_number || "—"}
                      </TableCell>
                    ) : null}
                    {visible.parent ? (
                      <TableCell className="px-2 text-xs">
                        {row.parent_company_id
                          ? parentMap.get(row.parent_company_id) ?? "—"
                          : "—"}
                      </TableCell>
                    ) : null}
                    {visible.status ? (
                      <TableCell className="px-2">
                        {row.is_active !== false ? (
                          <StatusChip label="فعال" tone="success" />
                        ) : (
                          <StatusChip label="غیرفعال" tone="neutral" />
                        )}
                      </TableCell>
                    ) : null}
                    {visible.created ? (
                      <TableCell className="px-2 text-xs text-muted-foreground">
                        {fd(row.created_at)}
                      </TableCell>
                    ) : null}
                    {visible.actions ? (
                      <TableCell className="px-2">
                        <div className="flex items-center gap-0.5">
                          <IconAction label="مشاهده جزئیات" onClick={() => {
                            window.location.href = `/dashboard/organization/companies/${row.company_id}`;
                          }}>
                            <Eye className="h-3.5 w-3.5" />
                          </IconAction>
                          {canUpdate ? (
                            <IconAction label="ویرایش" onClick={() => openEdit(row)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </IconAction>
                          ) : null}
                          {canUpdate && row.is_active !== false ? (
                            <IconAction
                              label={
                                row.is_primary
                                  ? "شرکت اصلی قابل غیرفعال نیست"
                                  : "غیرفعال‌سازی"
                              }
                              disabled={Boolean(row.is_primary)}
                              onClick={() => void deactivateOne(row)}
                            >
                              <PowerOff className="h-3.5 w-3.5" />
                            </IconAction>
                          ) : null}
                          {canUpdate && row.is_active === false ? (
                            <IconAction
                              label="فعال‌سازی"
                              onClick={() => void activateOne(row)}
                            >
                              <Power className="h-3.5 w-3.5" />
                            </IconAction>
                          ) : null}
                          {canDelete ? (
                            <IconAction
                              label="حذف نرم"
                              variant="destructive"
                              disabled={Boolean(row.is_primary)}
                              onClick={() => void deleteOne(row)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </IconAction>
                          ) : null}
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">
              صفحه {toFaDigits(safePage)} از {toFaDigits(totalPages)} ·{" "}
              {toFaDigits(total)} مورد
            </span>
            <div className="flex items-center gap-2">
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[4.75rem]">
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
                variant="outline"
                size="sm"
                className="h-8"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                قبل
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                بعد
              </Button>
            </div>
          </div>
        ) : null}

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
            <form onSubmit={onCreate} className="flex min-h-0 flex-1 flex-col">
              {formFields()}
              <SheetFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
                  انصراف
                </Button>
                <Button type="submit" size="sm" disabled={createMutation.isPending}>
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

        <Sheet
          open={editOpen}
          onOpenChange={(open) => {
            if (!open && form.formState.isDirty) {
              if (!window.confirm("تغییرات ذخیره نشده‌اند. فرم بسته شود؟")) return;
            }
            setEditOpen(open);
            if (!open) setEditing(null);
          }}
        >
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>ویرایش شرکت</SheetTitle>
            </SheetHeader>
            <form onSubmit={onEdit} className="flex min-h-0 flex-1 flex-col">
              {formFields(editing?.company_id)}
              <SheetFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditOpen(false);
                    setEditing(null);
                  }}
                >
                  انصراف
                </Button>
                <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "ذخیره"
                  )}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
