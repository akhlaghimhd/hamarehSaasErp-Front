/**
 * FE-ORG ظ¤ ┘┘ç╪▒╪│╪ز ╪┤╪▒┌ر╪زظî┘ç╪د
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
  Sparkles,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
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
import {
  MSG_LOAD,
  MSG_ERR,
  MSG_NO_ACCESS,
  COL_STORAGE,
  type StatusFilter,
  type SortKey,
  type SortDir,
  type ColumnId,
  type BulkKind,
  type ConfirmState,
  RESTORE_ONE_MSG,
  BULK_SUCCESS,
  confirmTitle,
  confirmBody,
  confirmActionLabel,
  COLS,
  type CompanyForm,
  emptyForm,
  companyToForm,
  displayName,
  fd,
  sortValue,
  IconAction,
} from "./companies-list-helpers";

function isRecentCreated(iso?: string | null, days = 3): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= days * 86_400_000;
}

export function CompaniesListPage() {
  const canView = usePermission(OrganizationPermissions.companyView);
  const canCreate = usePermission(OrganizationPermissions.companyCreate);
  const canUpdate = usePermission(OrganizationPermissions.companyUpdate);
  const canDelete = usePermission(OrganizationPermissions.companyDelete);

  const [membershipFilter, setMembershipFilter] = useState<CompanyListFilter>("active");
  const { data, isLoading, isError, error, refetch, isFetching } = useCompanies(membershipFilter);
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
      ? `╪«╪▒┘ê╪ش█î ╪ص╪░┘ظî╪┤╪»┘çظî┘ç╪د█î ╪د┘╪ز╪«╪د╪ذظî╪┤╪»┘ç (${toFaDigits(selected.size)})`
      : `╪«╪▒┘ê╪ش█î ╪ص╪░┘ظî╪┤╪»┘çظî┘ç╪د (${toFaDigits(total)})`
    : selected.size > 0
      ? `╪«╪▒┘ê╪ش█î ╪د┘╪ز╪«╪د╪ذظî╪┤╪»┘çظî┘ç╪د (${toFaDigits(selected.size)})`
      : `╪«╪▒┘ê╪ش█î ┘┘ç╪▒╪│╪ز ┘╪╣┘█î (${toFaDigits(total)})`;

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
      toast.success("╪┤╪▒┌ر╪ز ╪س╪ذ╪ز ╪┤╪»");
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
      toast.success("╪د╪╖┘╪د╪╣╪د╪ز ╪┤╪▒┌ر╪ز ╪ذ┘çظî╪▒┘ê╪▓ ╪┤╪»");
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
      toast.success("╪┤╪▒┌ر╪ز ┘╪╣╪د┘ ╪┤╪»");
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    }
  };

  const requestDeactivate = (row: CompanyDto) => {
    if (row.is_primary) {
      toast.error("╪┤╪▒┌ر╪ز ╪د╪╡┘█î ┘é╪د╪ذ┘ ╪║█î╪▒┘╪╣╪د┘ظî╪│╪د╪▓█î ┘█î╪│╪ز. ╪د╪ذ╪ز╪»╪د ╪┤╪▒┌ر╪ز ╪»█î┌»╪▒█î ╪▒╪د ╪د╪╡┘█î ┌ر┘█î╪».");
      return;
    }
    setConfirm({ kind: "deactivate", count: 1, targets: [row] });
  };

  const requestDelete = (row: CompanyDto) => {
    if (row.is_primary) {
      toast.error("╪┤╪▒┌ر╪ز ╪د╪╡┘█î ┘é╪د╪ذ┘ ╪ص╪░┘ ┘█î╪│╪ز. ╪د╪ذ╪ز╪»╪د ╪┤╪▒┌ر╪ز ╪»█î┌»╪▒█î ╪▒╪د ╪د╪╡┘█î ┌ر┘█î╪».");
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

  const filterTargetsForKind = (kind: BulkKind, targets: CompanyDto[]): CompanyDto[] => {
    if (kind === "activate") return targets.filter((r) => r.is_active === false);
    if (kind === "deactivate") return targets.filter((r) => r.is_active !== false && !r.is_primary);
    if (kind === "delete") return targets.filter((r) => !r.is_primary);
    return targets;
  };

  const requestBulk = (kind: BulkKind, targets: CompanyDto[]) => {
    const filtered = filterTargetsForKind(kind, targets);
    if (filtered.length === 0) {
      if (kind === "activate") toast.message("┘ç┘à┘ç┘¤ ┘à┘ê╪د╪▒╪» ╪د┘╪ز╪«╪د╪ذظî╪┤╪»┘ç ╪د╪▓ ┘é╪ذ┘ ┘╪╣╪د┘ ┘ç╪│╪ز┘╪».");
      else if (kind === "deactivate") toast.message("┘à┘ê╪▒╪» ┘é╪د╪ذ┘ ╪║█î╪▒┘╪╣╪د┘ظî╪│╪د╪▓█î ╪»╪▒ ╪د┘╪ز╪«╪د╪ذ ┘█î╪│╪ز.");
      else if (kind === "delete") toast.message("╪┤╪▒┌ر╪ز ╪د╪╡┘█î ┘é╪د╪ذ┘ ╪ص╪░┘ ┘█î╪│╪ز █î╪د ┘à┘ê╪▒╪»█î ╪د┘╪ز╪«╪د╪ذ ┘╪┤╪»┘ç.");
      else toast.message("┘à┘ê╪▒╪»█î ╪ذ╪▒╪د█î ╪د┘╪ش╪د┘à ╪╣┘à┘█î╪د╪ز ┘█î╪│╪ز.");
      return;
    }
    setConfirm({ kind, count: filtered.length, targets: filtered });
  };

  const runBulk = async (kind: BulkKind, targets: CompanyDto[]) => {
    cancelRef.current = false;
    const filtered = filterTargetsForKind(kind, targets);
    if (filtered.length === 0) {
      setConfirm(null);
      return;
    }
    setBulkBusy(true);
    setBulkProgress({ done: 0, total: filtered.length });
    let ok = 0;
    let fail = 0;
    let cancelled = false;
    const completed: CompanyDto[] = [];
    for (let i = 0; i < filtered.length; i++) {
      if (cancelRef.current) {
        cancelled = true;
        break;
      }
      const r = filtered[i];
      try {
        if (kind === "activate") {
          await updateMutation.mutateAsync({
            companyId: r.company_id,
            payload: { ...payloadFromForm(companyToForm(r)), is_active: true, status: 1 },
          });
        } else if (kind === "deactivate") {
          if (r.is_primary) throw new Error("╪┤╪▒┌ر╪ز ╪د╪╡┘█î");
          await updateMutation.mutateAsync({
            companyId: r.company_id,
            payload: { ...payloadFromForm(companyToForm(r)), is_active: false, status: 2 },
          });
        } else if (kind === "delete") {
          if (r.is_primary) throw new Error("╪┤╪▒┌ر╪ز ╪د╪╡┘█î");
          await deleteMutation.mutateAsync(r.company_id);
        } else {
          await restoreMutation.mutateAsync(r.company_id);
        }
        ok += 1;
        completed.push(r);
      } catch {
        fail += 1;
      }
      setBulkProgress({ done: i + 1, total: filtered.length });
    }

    let rolled = 0;
    if (cancelled && completed.length > 0) {
      for (const r of completed) {
        try {
          if (kind === "activate") {
            await updateMutation.mutateAsync({
              companyId: r.company_id,
              payload: { ...payloadFromForm(companyToForm(r)), is_active: false, status: 2 },
            });
          } else if (kind === "deactivate") {
            await updateMutation.mutateAsync({
              companyId: r.company_id,
              payload: { ...payloadFromForm(companyToForm(r)), is_active: true, status: 1 },
            });
          } else if (kind === "delete") {
            await restoreMutation.mutateAsync(r.company_id);
          } else {
            await deleteMutation.mutateAsync(r.company_id);
          }
          rolled += 1;
        } catch {
          /* keep as-is if reverse fails */
        }
      }
    }

    setBulkBusy(false);
    setConfirm(null);
    setSelected(new Set());
    if (cancelled) {
      if (completed.length === 0) {
        toast.message("╪╣┘à┘█î╪د╪ز ┘é╪ذ┘ ╪د╪▓ ╪د┘╪ش╪د┘à ┘ç╪▒ ┘à┘ê╪▒╪» ┘à╪ز┘ê┘é┘ ╪┤╪».");
      } else if (rolled === completed.length) {
        toast.message(`╪╣┘à┘█î╪د╪ز ┘à╪ز┘ê┘é┘ ┘ê ${toFaDigits(rolled)} ┘à┘ê╪▒╪» ╪د┘╪ش╪د┘àظî╪┤╪»┘ç ╪ذ╪د╪▓┌»╪▒╪»╪د┘█î ╪┤╪».`);
      } else {
        toast.message(`╪╣┘à┘█î╪د╪ز ┘à╪ز┘ê┘é┘ ╪┤╪». ${toFaDigits(ok)} ╪د┘╪ش╪د┘à ╪┤╪»╪ؤ ${toFaDigits(rolled)} ╪ذ╪د╪▓┌»╪▒╪»╪د┘█î ╪┤╪».`);
      }
    } else if (ok) {
      toast.success(BULK_SUCCESS[kind](ok));
    }
    if (fail) toast.error(`${toFaDigits(fail)} ┘à┘ê╪▒╪» ╪د┘╪ش╪د┘à ┘╪┤╪»`);
  };

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader title="╪┤╪▒┌ر╪زظî┘ç╪د" breadcrumbs={[{ label: "╪│╪د╪▓┘à╪د┘", href: "/dashboard/organization" }, { label: "╪┤╪▒┌ر╪زظî┘ç╪د" }]} />
        <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">{MSG_NO_ACCESS}</div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-0 flex-col gap-3">
        <PageHeader
          title="╪┤╪▒┌ر╪زظî┘ç╪د"
          description="┘┘ç╪▒╪│╪ز ╪┤╪▒┌ر╪زظî┘ç╪د█î ╪│╪د╪▓┘à╪د┘ ظ¤ ┘ê█î╪▒╪د█î╪┤╪î ┘╪╣╪د┘ظî╪│╪د╪▓█î ┘ê ┘à╪»█î╪▒█î╪ز ╪│╪د╪«╪ز╪د╪▒"
          breadcrumbs={[
            { label: "╪»╪د╪┤╪ذ┘ê╪▒╪»", href: "/dashboard" },
            { label: "╪│╪د╪▓┘à╪د┘", href: "/dashboard/organization" },
            { label: "╪┤╪▒┌ر╪زظî┘ç╪د" },
          ]}
          actions={
            canCreate ? (
              <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                ╪┤╪▒┌ر╪ز ╪ش╪»█î╪»
              </Button>
            ) : null
          }
        />

        {isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <p className="font-medium">╪ذ╪د╪▒┌»╪░╪د╪▒█î ┘┘ç╪▒╪│╪ز ┘à┘à┌ر┘ ┘╪┤╪»</p>
            <p className="mt-1 text-xs">{error instanceof ApiClientError && error.message ? error.message : MSG_LOAD}</p>
            <Button variant="outline" size="sm" className="mt-3 h-8" onClick={() => void refetch()}>
              ╪ز┘╪د╪┤ ┘à╪ش╪»╪»
            </Button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className={cn("h-8 ps-8 text-sm", query && "pe-8")}
              placeholder="┘╪د┘à╪î ┌ر╪»╪î ╪┤┘à╪د╪▒┘ç ╪س╪ذ╪زظخ"
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
                aria-label="┘╛╪د┌ر ┌ر╪▒╪»┘ ╪ش╪│╪ز╪ش┘ê"
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
            value={membershipFilter}
            onValueChange={(v) => setMembershipFilter(v as CompanyListFilter)}
          >
            <SelectTrigger className="h-8 w-[10rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">╪┤╪▒┌ر╪زظî┘ç╪د█î ╪ش╪د╪▒█î</SelectItem>
              <SelectItem value="deleted">╪ص╪░┘ظî╪┤╪»┘çظî┘ç╪د</SelectItem>
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
                <SelectItem value="all">┘ç┘à┘ç ┘ê╪╢╪╣█î╪زظî┘ç╪د</SelectItem>
                <SelectItem value="active">┘╪╣╪د┘</SelectItem>
                <SelectItem value="inactive">╪║█î╪▒┘╪╣╪د┘</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1">
                <Columns3 className="h-3.5 w-3.5" />
                ╪│╪ز┘ê┘ظî┘ç╪د
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>┘┘à╪د█î╪┤ ╪│╪ز┘ê┘ظî┘ç╪د</DropdownMenuLabel>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1">
                <Download className="h-3.5 w-3.5" />
                ╪«╪▒┘ê╪ش█î
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{exportLabel}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2"
                onClick={() => exportCompaniesExcel(exportTarget, parentMap)}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                ╪د┌ر╪│┘
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2"
                onClick={() => exportCompaniesPdf(exportTarget, parentMap)}
              >
                <FileText className="h-3.5 w-3.5" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {isFetching && !isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        {selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              {bulkBusy
                ? `╪»╪▒ ╪ص╪د┘ ╪د┘╪ش╪د┘àظخ ${toFaDigits(bulkProgress.done)} ╪د╪▓ ${toFaDigits(bulkProgress.total)}`
                : `${toFaDigits(selected.size)} ┘à┘ê╪▒╪» ╪د┘╪ز╪«╪د╪ذظî╪┤╪»┘ç`}
            </span>
            {!bulkBusy && isDeletedView && canUpdate ? (
              <Button
                type="button"
                size="sm"
                className="h-7 gap-1"
                onClick={() => requestBulk("restore", selectedRows)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                ╪ذ╪د╪▓┌»╪▒╪»╪د┘█î
              </Button>
            ) : null}
            {!bulkBusy && !isDeletedView ? (
              <>
                {canUpdate ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7"
                      onClick={() => requestBulk("activate", selectedRows)}
                    >
                      ┘╪╣╪د┘ظî╪│╪د╪▓█î
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7"
                      onClick={() => requestBulk("deactivate", selectedRows)}
                    >
                      ╪║█î╪▒┘╪╣╪د┘ظî╪│╪د╪▓█î
                    </Button>
                  </>
                ) : null}
                {canDelete ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="h-7"
                    onClick={() => requestBulk("delete", selectedRows)}
                  >
                    ╪ص╪░┘
                  </Button>
                ) : null}
              </>
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
                ╪ز┘ê┘é┘
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7"
                onClick={() => setSelected(new Set())}
              >
                ┘╪║┘ê ╪د┘╪ز╪«╪د╪ذ
              </Button>
            )}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : pageRows.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={isFiltered ? "┘╪ز█î╪ش┘çظî╪د█î ┘╛█î╪»╪د ┘╪┤╪»" : isDeletedView ? "╪┤╪▒┌ر╪ز ╪ص╪░┘ظî╪┤╪»┘çظî╪د█î ┘█î╪│╪ز" : "╪┤╪▒┌ر╪ز█î ╪س╪ذ╪ز ┘╪┤╪»┘ç"}
              description={
                isFiltered
                  ? "╪╣╪ذ╪د╪▒╪ز ╪ش╪│╪ز╪ش┘ê █î╪د ┘█î┘╪ز╪▒ ╪▒╪د ╪ز╪║█î█î╪▒ ╪»┘ç█î╪»."
                  : isDeletedView
                    ? "┘à┘ê╪د╪▒╪» ╪ص╪░┘ظî╪┤╪»┘ç ╪»╪▒ ╪د█î┘ ┘┘ç╪▒╪│╪ز ┘┘à╪د█î╪┤ ╪»╪د╪»┘ç ┘à█îظî╪┤┘ê┘╪»."
                    : "╪د┘ê┘█î┘ ╪┤╪▒┌ر╪ز ╪│╪د╪▓┘à╪د┘ ╪▒╪د ╪س╪ذ╪ز ┌ر┘█î╪»."
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
                      aria-label="╪د┘╪ز╪«╪د╪ذ ╪╡┘╪ص┘ç"
                    />
                  </TableHead>
                  {COLS.map((c) =>
                    visible[c.id] === false ? null : (
                      <TableHead key={c.id} className="px-2">
                        {c.sort ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1"
                            onClick={() => toggleSort(c.sort!)}
                          >
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
                  <TableRow
                    key={row.company_id}
                    data-state={selected.has(row.company_id) ? "selected" : undefined}
                  >
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
                        aria-label={`╪د┘╪ز╪«╪د╪ذ ${displayName(row)}`}
                      />
                    </TableCell>
                    {visible.name !== false ? (
                      <TableCell className="px-2">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Link
                              href={companyDetailPath(row.company_id)}
                              className="font-medium hover:underline"
                            >
                              {displayName(row)}
                            </Link>
                            {isRecentCreated(row.created_at) ? (
                              <span
                                className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300"
                                title="╪ذ┘çظî╪ز╪د╪▓┌»█î ╪س╪ذ╪ز ╪┤╪»┘ç"
                              >
                                <Sparkles className="h-3 w-3" />
                                ╪ز╪د╪▓┘ç
                              </span>
                            ) : null}
                          </div>
                          {row.is_primary ? (
                            <span className="text-[10px] text-amber-700 dark:text-amber-400">
                              ╪┤╪▒┌ر╪ز ╪د╪╡┘█î
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                    ) : null}
                    {visible.code !== false ? (
                      <TableCell className="px-2 font-mono text-xs" dir="ltr">
                        {row.code}
                      </TableCell>
                    ) : null}
                    {visible.kind !== false ? (
                      <TableCell className="px-2 text-xs">
                        {ENTITY_KIND_LABELS[row.entity_kind ?? "OPERATING"] ??
                          row.entity_kind ??
                          "ظ¤"}
                      </TableCell>
                    ) : null}
                    {visible.reg !== false ? (
                      <TableCell className="px-2 text-xs text-muted-foreground" dir="ltr">
                        {row.registration_number || "ظ¤"}
                      </TableCell>
                    ) : null}
                    {visible.parent !== false ? (
                      <TableCell className="px-2 text-xs">
                        {row.parent_company_id
                          ? parentMap.get(row.parent_company_id) ?? "ظ¤"
                          : "ظ¤"}
                      </TableCell>
                    ) : null}
                    {visible.branches !== false ? (
                      <TableCell className="px-2 text-xs tabular-nums">
                        {toFaDigits(Number(row.branches_count ?? 0))}
                      </TableCell>
                    ) : null}
                    {visible.departments !== false ? (
                      <TableCell className="px-2 text-xs tabular-nums">
                        {toFaDigits(Number(row.departments_count ?? 0))}
                      </TableCell>
                    ) : null}
                    {visible.children !== false ? (
                      <TableCell className="px-2 text-xs tabular-nums">
                        {toFaDigits(Number(row.children_count ?? 0))}
                      </TableCell>
                    ) : null}
                    {visible.status !== false ? (
                      <TableCell className="px-2">
                        {row.is_active !== false ? (
                          <StatusChip label="┘╪╣╪د┘" tone="success" />
                        ) : (
                          <StatusChip label="╪║█î╪▒┘╪╣╪د┘" tone="neutral" />
                        )}
                      </TableCell>
                    ) : null}
                    {visible.created !== false ? (
                      <TableCell className="px-2 text-xs text-muted-foreground">
                        {fd(row.created_at)}
                      </TableCell>
                    ) : null}
                    {visible.actions !== false ? (
                      <TableCell className="px-2">
                        <div className="flex items-center gap-0.5">
                          <IconAction label="╪ش╪▓╪خ█î╪د╪ز" asChild>
                            <Link href={companyDetailPath(row.company_id)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                          </IconAction>
                          {isDeletedView ? (
                            canUpdate ? (
                              <IconAction label="╪ذ╪د╪▓┌»╪▒╪»╪د┘█î" onClick={() => void restoreOne(row)}>
                                <RotateCcw className="h-3.5 w-3.5" />
                              </IconAction>
                            ) : null
                          ) : (
                            <>
                              {canUpdate ? (
                                <>
                                  <IconAction label="┘ê█î╪▒╪د█î╪┤" onClick={() => openEdit(row)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </IconAction>
                                  {row.is_active !== false ? (
                                    <IconAction
                                      label="╪║█î╪▒┘╪╣╪د┘ظî╪│╪د╪▓█î"
                                      onClick={() => requestDeactivate(row)}
                                    >
                                      <PowerOff className="h-3.5 w-3.5" />
                                    </IconAction>
                                  ) : (
                                    <IconAction
                                      label="┘╪╣╪د┘ظî╪│╪د╪▓█î"
                                      onClick={() => void activateOne(row)}
                                    >
                                      <Power className="h-3.5 w-3.5" />
                                    </IconAction>
                                  )}
                                </>
                              ) : null}
                              {canDelete ? (
                                <IconAction
                                  label="╪ص╪░┘"
                                  variant="destructive"
                                  onClick={() => requestDelete(row)}
                                >
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
              {toFaDigits(total)} ┘à┘ê╪▒╪» ظ¤ ╪╡┘╪ص┘ç {toFaDigits(safePage)} ╪د╪▓ {toFaDigits(totalPages)}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ┘é╪ذ┘█î
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                ╪ذ╪╣╪»█î
              </Button>
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
            </div>
          </div>
        ) : null}

        <Dialog open={!!confirm} onOpenChange={(o) => !o && !bulkBusy && setConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {confirm ? confirmTitle(confirm.kind, confirm.count) : ""}
              </DialogTitle>
              <DialogDescription className="text-right leading-relaxed">
                {confirm ? confirmBody(confirm.kind, confirm.count) : ""}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={bulkBusy}
                onClick={() => setConfirm(null)}
              >
                ╪د┘╪╡╪▒╪د┘
              </Button>
              <Button
                type="button"
                size="sm"
                variant={confirm?.kind === "delete" ? "destructive" : "default"}
                disabled={bulkBusy || !confirm}
                onClick={() => confirm && void runBulk(confirm.kind, confirm.targets)}
              >
                {bulkBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : confirm ? (
                  confirmActionLabel(confirm.kind)
                ) : null}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Sheet
          open={createOpen}
          onOpenChange={(open) => {
            if (!open) forceCloseCreate();
            else setCreateOpen(true);
          }}
        >
          <SheetContent
            className="flex w-full flex-col sm:max-w-lg"
            side="right"
            onInteractOutside={(e) => {
              if (isDirty) e.preventDefault();
            }}
            onEscapeKeyDown={(e) => {
              if (isDirty) e.preventDefault();
            }}
          >
            <SheetHeader>
              <SheetTitle>╪┤╪▒┌ر╪ز ╪ش╪»█î╪»</SheetTitle>
            </SheetHeader>
            <form className="flex min-h-0 flex-1 flex-col" onSubmit={onCreate}>
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>┌ر╪» *</Label>
                    <Input className="h-9" dir="ltr" {...form.register("code", { required: true })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>┘╪د┘à ┘┘à╪د█î╪┤█î *</Label>
                    <Input className="h-9" {...form.register("name", { required: true })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>┘╪د┘à ╪ص┘é┘ê┘é█î</Label>
                  <Input className="h-9" {...form.register("legal_name")} />
                </div>
                <div className="space-y-1.5">
                  <Label>┘╪د┘à ╪ز╪ش╪د╪▒█î</Label>
                  <Input className="h-9" {...form.register("trade_name")} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>╪┤┘à╪د╪▒┘ç ╪س╪ذ╪ز</Label>
                    <Input className="h-9" dir="ltr" {...form.register("registration_number")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>┌ر╪» ╪د┘é╪ز╪╡╪د╪»█î</Label>
                    <Input className="h-9" dir="ltr" {...form.register("economic_code")} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>╪┤┘╪د╪│┘ç ┘à╪د┘█î╪د╪ز█î</Label>
                  <Input className="h-9" dir="ltr" {...form.register("tax_identifier")} />
                </div>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">{ENTITY_KIND_FIELD_LABEL}</legend>
                  <div className="space-y-1.5">
                    {ENTITY_KIND_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className="flex cursor-pointer items-start gap-2 rounded-lg border border-border/80 px-3 py-2 hover:bg-muted/40"
                      >
                        <input
                          type="radio"
                          className="mt-1"
                          checked={selectedKind === opt.value}
                          onChange={() =>
                            form.setValue("entity_kind", opt.value, { shouldDirty: true })
                          }
                        />
                        <span className="min-w-0 flex-1 text-sm leading-snug">{opt.label}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="mt-0.5 shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                              aria-label={`╪▒╪د┘ç┘┘à╪د█î ${opt.label}`}
                              onClick={(e) => e.preventDefault()}
                            >
                              <CircleHelp className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[16rem] text-right leading-relaxed">
                            {opt.tooltip}
                          </TooltipContent>
                        </Tooltip>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="flex items-center justify-between gap-2 rounded-lg border border-border/80 px-3 py-2">
                  <Label>┘╪╣╪د┘</Label>
                  <Switch
                    checked={form.watch("is_active")}
                    onCheckedChange={(v) => form.setValue("is_active", v, { shouldDirty: true })}
                  />
                </div>
              </div>
              <SheetFooter>
                <Button type="button" variant="outline" size="sm" onClick={forceCloseCreate}>
                  ╪د┘╪╡╪▒╪د┘
                </Button>
                <Button type="submit" size="sm" disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "╪س╪ذ╪ز"
                  )}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>

        <Sheet
          open={editOpen}
          onOpenChange={(open) => {
            if (!open) forceCloseEdit();
            else setEditOpen(true);
          }}
        >
          <SheetContent
            className="flex w-full flex-col sm:max-w-lg"
            side="right"
            onInteractOutside={(e) => {
              if (isDirty) e.preventDefault();
            }}
            onEscapeKeyDown={(e) => {
              if (isDirty) e.preventDefault();
            }}
          >
            <SheetHeader>
              <SheetTitle>┘ê█î╪▒╪د█î╪┤ ╪┤╪▒┌ر╪ز</SheetTitle>
            </SheetHeader>
            <form className="flex min-h-0 flex-1 flex-col" onSubmit={onEdit}>
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>┌ر╪» *</Label>
                    <Input className="h-9" dir="ltr" {...form.register("code", { required: true })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>┘╪د┘à ┘┘à╪د█î╪┤█î *</Label>
                    <Input className="h-9" {...form.register("name", { required: true })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>┘╪د┘à ╪ص┘é┘ê┘é█î</Label>
                  <Input className="h-9" {...form.register("legal_name")} />
                </div>
                <div className="space-y-1.5">
                  <Label>┘╪د┘à ╪ز╪ش╪د╪▒█î</Label>
                  <Input className="h-9" {...form.register("trade_name")} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>╪┤┘à╪د╪▒┘ç ╪س╪ذ╪ز</Label>
                    <Input className="h-9" dir="ltr" {...form.register("registration_number")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>┌ر╪» ╪د┘é╪ز╪╡╪د╪»█î</Label>
                    <Input className="h-9" dir="ltr" {...form.register("economic_code")} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>╪┤┘╪د╪│┘ç ┘à╪د┘█î╪د╪ز█î</Label>
                  <Input className="h-9" dir="ltr" {...form.register("tax_identifier")} />
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg border border-border/80 px-3 py-2">
                  <Label>┘╪╣╪د┘</Label>
                  <Switch
                    checked={form.watch("is_active")}
                    onCheckedChange={(v) => form.setValue("is_active", v, { shouldDirty: true })}
                  />
                </div>
              </div>
              <SheetFooter>
                <Button type="button" variant="outline" size="sm" onClick={forceCloseEdit}>
                  ╪د┘╪╡╪▒╪د┘
                </Button>
                <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "╪░╪«█î╪▒┘ç"
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
