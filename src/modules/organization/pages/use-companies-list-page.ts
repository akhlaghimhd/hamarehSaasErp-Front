/**
 * FE-ORG companies list — page controller (state + handlers)
 * FINAL-aligned: filterTargetsForKind, bulk cancel rollback, primary guards.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import { toFaDigits } from "@/shared/lib/utils";
import {
  useCompanies,
  useCreateCompany,
  useRestoreCompany,
  useSoftDeleteCompany,
  useUpdateCompany,
} from "../hooks/use-companies";
import {
  FEATURE_PACK_CODES,
  useFeaturePackEnabled,
} from "../hooks/use-feature-packs";
import type { CompanyListFilter } from "../services/company-service";
import {
  OrganizationPermissions,
  type CompanyDto,
} from "../types";
import {
  MSG_ERR,
  type StatusFilter,
  type SortKey,
  type SortDir,
  type ColumnId,
  type BulkKind,
  type ConfirmState,
  RESTORE_ONE_MSG,
  BULK_SUCCESS,
  COLS,
  type CompanyForm,
  emptyForm,
  companyToForm,
  displayName,
  sortValue,
} from "./companies-list-helpers";

function isRecentCreated(iso?: string | null, days = 3): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= days * 86_400_000;
}

export function useCompaniesListPage() {
  const canView = usePermission(OrganizationPermissions.companyView);
  const canCreate = usePermission(OrganizationPermissions.companyCreate);
  const canUpdate = usePermission(OrganizationPermissions.companyUpdate);
  const canDelete = usePermission(OrganizationPermissions.companyDelete);
  const { enabled: hasMultiCompany, isLoading: multiCompanyPackLoading } =
    useFeaturePackEnabled(FEATURE_PACK_CODES.multiCompany);

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
    const base = Object.fromEntries(COLS.map((col) => [col.id, true])) as Record<ColumnId, boolean>;
    if (typeof window === "undefined") return base;
    try {
      const raw = localStorage.getItem("organization.companies.columns.v2");
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
      localStorage.setItem("organization.companies.columns.v2", JSON.stringify(visible));
    } catch {
      /* ignore */
    }
  }, [visible]);

  useEffect(() => {
    setSelected(new Set());
    setPage(1);
  }, [membershipFilter]);

  const rows = data ?? [];
  const createBlockedByPack =
    !multiCompanyPackLoading && !hasMultiCompany && rows.length >= 1;

  const parentMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const company of rows) m.set(company.company_id, displayName(company));
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
    if (sortKey !== k) return null;
    return sortDir === "asc" ? "↑" : "↓";
  };

  const openCreate = () => {
    if (createBlockedByPack) {
      toast.message("بسته multi_company فعال نیست؛ ایجاد شرکت دوم مجاز نیست.");
      return;
    }
    form.reset(emptyForm());
    setEditing(null);
    setCreateOpen(true);
  };

  const openEdit = (company: CompanyDto) => {
    setEditing(company);
    form.reset(companyToForm(company));
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

  const filterTargetsForKind = (kind: BulkKind, targets: CompanyDto[]): CompanyDto[] => {
    if (kind === "activate") return targets.filter((r) => r.is_active === false);
    if (kind === "deactivate") return targets.filter((r) => r.is_active !== false && !r.is_primary);
    if (kind === "delete") return targets.filter((r) => !r.is_primary);
    return targets;
  };

  const requestBulk = (kind: BulkKind, targets: CompanyDto[]) => {
    const filtered = filterTargetsForKind(kind, targets);
    if (filtered.length === 0) {
      if (kind === "activate") toast.message("همهٔ موارد انتخاب‌شده از قبل فعال هستند.");
      else if (kind === "deactivate") toast.message("مورد قابل غیرفعال‌سازی در انتخاب نیست.");
      else if (kind === "delete") toast.message("شرکت اصلی قابل حذف نیست یا موردی انتخاب نشده.");
      else toast.message("موردی برای انجام عملیات نیست.");
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
          if (r.is_primary) throw new Error("primary");
          await updateMutation.mutateAsync({
            companyId: r.company_id,
            payload: { ...payloadFromForm(companyToForm(r)), is_active: false, status: 2 },
          });
        } else if (kind === "delete") {
          if (r.is_primary) throw new Error("primary");
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
        toast.message("عملیات قبل از انجام هر مورد متوقف شد.");
      } else if (rolled === completed.length) {
        toast.message(`عملیات متوقف و ${toFaDigits(rolled)} مورد انجام‌شده بازگردانی شد.`);
      } else {
        toast.message(
          `عملیات متوقف شد. ${toFaDigits(ok)} انجام شد؛ ${toFaDigits(rolled)} بازگردانی شد.`
        );
      }
    } else if (ok) {
      toast.success(BULK_SUCCESS[kind](ok));
    }
    if (fail) toast.error(`${toFaDigits(fail)} مورد انجام نشد`);
  };

  return {
    canView,
    canCreate,
    canUpdate,
    canDelete,
    hasMultiCompany,
    multiCompanyPackLoading,
    membershipFilter,
    setMembershipFilter,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    createMutation,
    updateMutation,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    pageSize,
    setPageSize,
    sortKey,
    sortDir,
    visible,
    setVisible,
    selected,
    setSelected,
    bulkBusy,
    bulkProgress,
    cancelRef,
    confirm,
    setConfirm,
    createOpen,
    setCreateOpen,
    editOpen,
    setEditOpen,
    editing,
    form,
    selectedKind,
    isDirty,
    isDeletedView,
    rows,
    createBlockedByPack,
    parentMap,
    total,
    totalPages,
    safePage,
    pageRows,
    isFiltered,
    pageIds,
    allPageSelected,
    somePageSelected,
    selectedRows,
    exportTarget,
    exportLabel,
    toggleSort,
    SortIcon,
    openCreate,
    openEdit,
    forceCloseCreate,
    forceCloseEdit,
    onCreate,
    onEdit,
    activateOne,
    requestDeactivate,
    requestDelete,
    restoreOne,
    runBulk,
    requestBulk,
    isRecentCreated,
  };
}
