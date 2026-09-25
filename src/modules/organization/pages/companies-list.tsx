/**
 * FE-ORG — فهرست شرکت‌ها
 * Table parity with identity members: sort, select, columns, export Excel/PDF,
 * membership active|deleted + restore, opaque detail ID, system confirm, dirty Sheet guard.
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
  FileText,
  Loader2,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RotateCcw,
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
  useRestoreCompany,
  useSoftDeleteCompany,
  useUpdateCompany,
} from "../hooks/use-companies";
import type { CompanyListFilter } from "../services/company-service";
import {
  OrganizationPermissions,
  ENTITY_KIND_LABELS,
  ENTITY_KIND_FIELD_LABEL,
  ENTITY_KIND_OPTIONS,
  type CompanyDto,
} from "../types";
import { companyDetailPath } from "../lib/company-ref";
import { exportCompaniesExcel, exportCompaniesPdf } from "../lib/companies-export";

const MSG_LOAD = "بارگذاری فهرست شرکت‌ها ممکن نشد. کمی بعد دوباره تلاش کنید.";
const MSG_ERR = "انجام این کار ممکن نشد. کمی بعد دوباره تلاش کنید.";
const MSG_NO_ACCESS = "برای مشاهده این بخش مجوز لازم را ندارید.";
const COL_STORAGE = "organization.companies.columns.v2";

type StatusFilter = "all" | "active" | "inactive";
type SortKey =
  | "name"
  | "code"
  | "kind"
  | "reg"
  | "status"
  | "parent"
  | "branches"
  | "departments"
  | "children"
  | "created";
type SortDir = "asc" | "desc";
type ColumnId =
  | "name"
  | "code"
  | "kind"
  | "reg"
  | "parent"
  | "branches"
  | "departments"
  | "children"
  | "status"
  | "created"
  | "actions";
type BulkKind = "activate" | "deactivate" | "delete" | "restore";
type ConfirmState = null | { kind: BulkKind; count: number; targets: CompanyDto[] };

const RESTORE_ONE_MSG = "شرکت بازگردانی شد.";
const BULK_SUCCESS: Record<BulkKind, (n: number) => string> = {
  activate: (n) => `${toFaDigits(n)} شرکت فعال شد.`,
  deactivate: (n) => `${toFaDigits(n)} شرکت غیرفعال شد.`,
  delete: (n) => `${toFaDigits(n)} شرکت حذف نرم شد.`,
  restore: (n) => `${toFaDigits(n)} شرکت بازگردانی شد.`,
};

const COLS: { id: ColumnId; label: string; hideable?: boolean; sort?: SortKey }[] = [
  { id: "name", label: "نام شرکت", hideable: false, sort: "name" },
  { id: "code", label: "کد", sort: "code" },
  { id: "kind", label: "کاربرد", sort: "kind" },
  { id: "reg", label: "شماره ثبت", sort: "reg" },
  { id: "parent", label: "شرکت والد", sort: "parent" },
  { id: "branches", label: "شعب", sort: "branches" },
  { id: "departments", label: "واحدها", sort: "departments" },
  { id: "children", label: "زیرمجموعه", sort: "children" },
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
  if (key === "branches") return Number(c.branches_count ?? 0);
  if (key === "departments") return Number(c.departments_count ?? 0);
  if (key === "children") return Number(c.children_count ?? 0);
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

export function CompaniesListPage() {
  const canView = usePermission(OrganizationPermissions.companyView);
  const canCreate = usePermission(OrganizationPermissions.companyCreate);
  const canUpdate = usePermission(OrganizationPermissions.companyUpdate);
  const canDelete = usePermission(OrganizationPermissions.companyDelete);

  const [membershipFilter, setMembershipFilter] = useState<CompanyListFilter>("active");
  const { data, isLoading, isError, error, refetch, isFetching } =
    useCompanies(membershipFilter);
  const createMutation = useCreateCompany();
  const updateMutation = useUpdateCompany();
  const deleteMutation = useSoftDeleteCompany();
  const restoreMutation = useRestoreCompany();

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
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyDto | null>(null);

  const form = useForm<CompanyForm>({ defaultValues: emptyForm() });
  const selectedKind = form.watch("entity_kind") || "OPERATING";
  const isDirty = form.formState.isDirty;
  const isDeletedView = membershipFilter === "deleted";

  useEffect(() => {
    try {
      localStorage.setItem(COL_STORAGE, JSON.stringify(visible));
    } catch {
      /* ignore */
    }
  }, [visible]);

  useEffect(() => {
    setSelected(new Set());
    setPage(1);
  }, [membershipFilter]);

  const rows = data ?? [];
  const parentMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of rows) m.set(c.company_id, displayName(c));
    return m;
  }, [rows]);

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (!isDeletedView) {
        if (statusFilter === "active" && r.is_active === false) return false;
        if (statusFilter === "inactive" && r.is_active !== false) return false;
      }
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
  }, [rows, query, statusFilter, sortKey, sortDir, parentMap, isDeletedView]);

  const total = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredSorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const isFiltered = query.trim().length > 0 || (!isDeletedView && statusFilter !== "all");
  const pageIds = pageRows.map((r) => r.company_id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id));
  const selectedRows = useMemo(
    () => filteredSorted.filter((r) => selected.has(r.company_id)),
    [filteredSorted, selected]
  );
  const exportTarget = selectedRows.length > 0 ? selectedRows : filteredSorted;
  const exportLabel = isDeletedView
    ? selected.size > 0
      ? `خروجی حذف‌شده‌های انتخاب‌شده (${toFaDigits(selected.size)})`
      : `خروجی حذف‌شده‌ها (${toFaDigits(total)})`
    : selected.size > 0
      ? `خروجی انتخاب‌شده‌ها (${toFaDigits(selected.size)})`
      : `خروجی فهرست فعلی (${toFaDigits(total)})`;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "created" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
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

  const forceCloseCreate = () => {
    setCreateOpen(false);
    form.reset(emptyForm());
  };

  const forceCloseEdit = () => {
    setEditOpen(false);
    setEditing(null);
    form.reset(emptyForm());
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
      forceCloseCreate();
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
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
      forceCloseEdit();
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    }
  });

  const activateOne = async (row: CompanyDto) => {
    try {
      await updateMutation.mutateAsync({
        companyId: row.company_id,
        payload: { ...payloadFromForm(companyToForm(row)), is_active: true, status: 1 },
      });
      toast.success("شرکت فعال شد");
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    }
  };

  const requestDeactivate = (row: CompanyDto) => {
    if (row.is_primary) {
      toast.error("شرکت اصلی قابل غیرفعال‌سازی نیست. ابتدا شرکت دیگری را اصلی کنید.");
      return;
    }
    setConfirm({ kind: "deactivate", count: 1, targets: [row] });
  };

  const requestDelete = (row: CompanyDto) => {
    if (row.is_primary) {
      toast.error("شرکت اصلی قابل حذف نیست. ابتدا شرکت دیگری را اصلی کنید.");
      return;
    }
    setConfirm({ kind: "delete", count: 1, targets: [row] });
  };

  const restoreOne = async (row: CompanyDto) => {
    try {
      await restoreMutation.mutateAsync(row.company_id);
      toast.success(RESTORE_ONE_MSG);
      setSelected((prev) => {
        const n = new Set(prev);
        n.delete(row.company_id);
        return n;
      });
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    }
  };

  const runBulk = async (kind: BulkKind, targets: CompanyDto[]) => {
    cancelRef.current = false;
    setBulkBusy(true);
    setBulkProgress({ done: 0, total: targets.length });
    let ok = 0;
    let fail = 0;
    let cancelled = false;
    for (let i = 0; i < targets.length; i++) {
      if (cancelRef.current) {
        cancelled = true;
        break;
      }
      const r = targets[i];
      try {
        if (kind === "activate") {
          await updateMutation.mutateAsync({
            companyId: r.company_id,
            payload: { ...payloadFromForm(companyToForm(r)), is_active: true, status: 1 },
          });
        } else if (kind === "deactivate") {
          if (r.is_primary) throw new Error("شرکت اصلی");
          await updateMutation.mutateAsync({
            companyId: r.company_id,
            payload: { ...payloadFromForm(companyToForm(r)), is_active: false, status: 2 },
          });
        } else if (kind === "delete") {
          if (r.is_primary) throw new Error("شرکت اصلی");
          await deleteMutation.mutateAsync(r.company_id);
        } else {
          await restoreMutation.mutateAsync(r.company_id);
        }
        ok += 1;
      } catch {
        fail += 1;
      }
      setBulkProgress({ done: i + 1, total: targets.length });
    }
    setBulkBusy(false);
    setConfirm(null);
    setSelected(new Set());
    if (cancelled) {
      toast.message(`عملیات متوقف شد · انجام‌شده: ${toFaDigits(ok)} · باقی‌مانده انجام نشد`);
    } else if (ok) {
      toast.success(BULK_SUCCESS[kind](ok));
    }
    if (fail) toast.error(`${toFaDigits(fail)} مورد انجام نشد`);
  };

  // UI continued in part 2 - this file is being restored in stages due to size limits
  return (
    <div className="p-6">
      <p className="text-sm text-muted-foreground">در حال تکمیل بارگذاری فهرست شرکت‌ها… لطفاً چند لحظه صبر کنید و صفحه را رفرش کنید.</p>
    </div>
  );
}
