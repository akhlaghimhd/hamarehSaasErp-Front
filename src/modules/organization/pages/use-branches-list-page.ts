/**
 * FE-ORG branches list — page controller (FINAL staged restore)
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { usePermission } from "@/auth";
import { ApiClientError, tokenStorage } from "@/api";
import { toFaDigits } from "@/shared/lib/utils";
import { useCompanies } from "../hooks/use-companies";
import { FEATURE_PACK_CODES, useFeaturePackEnabled } from "../hooks/use-feature-packs";
import {
  useAllBranches,
  useCreateBranch,
  useUpdateBranch,
  useSoftDeleteBranch,
  useRestoreBranch,
} from "../hooks/use-branches";
import { branchService, type BranchListFilter } from "../services/branch-service";
import { OrganizationPermissions, BRANCH_KIND_LABELS } from "../types";
import {
  MSG_ERR,
  ALL,
  COL_STORAGE,
  COLS,
  type StatusFilter,
  type SortKey,
  type SortDir,
  type ColumnId,
  type BulkKind,
  type BranchRow,
  type BranchForm,
  emptyForm,
  rowToForm,
} from "./branches-list-helpers";

function hasAuthContext(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(tokenStorage.getAccessToken() && tokenStorage.getTenantId());
}

export function useBranchesListPage() {
  const canView = usePermission(OrganizationPermissions.branchView) || usePermission(OrganizationPermissions.companyView);
  const canCreate = usePermission(OrganizationPermissions.branchCreate);
  const canUpdate = usePermission(OrganizationPermissions.branchUpdate);
  const canDelete = usePermission(OrganizationPermissions.branchDelete);
  const { enabled: hasMultiBranch, isLoading: multiBranchPackLoading } =
    useFeaturePackEnabled(FEATURE_PACK_CODES.multiBranch);

  const qc = useQueryClient();
  const { data: companies, isLoading: companiesLoading } = useCompanies();
  const companyList = companies ?? [];
  const companyIds = useMemo(() => companyList.map((c) => c.company_id), [companyList]);

  const [query, setQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState(ALL);
  const [membershipFilter, setMembershipFilter] = useState<BranchListFilter>("active");
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
    } catch { return base; }
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<BranchRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BranchRow | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<null | { row: BranchRow; active: boolean }>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState<null | { kind: BulkKind; targets: BranchRow[] }>(null);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);

  const form = useForm<BranchForm>({ defaultValues: emptyForm() });
  const isDirty = form.formState.isDirty;
  const isDeletedView = membershipFilter === "deleted";
  const formCompanyId = form.watch("company_id");

  const {
    data: branchesData,
    isLoading: branchesLoading,
    isFetching: branchesFetching,
    isError,
    refetch: refetchBranches,
  } = useAllBranches(membershipFilter, companyIds);

  const isInitialLoading = companiesLoading || (hasAuthContext() && branchesLoading && !branchesData);
  const isRefreshing = branchesFetching && !branchesLoading;

  const companyNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of companyList) m.set(c.company_id, c.legal_name || c.name);
    return m;
  }, [companyList]);

  const allRows: BranchRow[] = useMemo(() => {
    return (branchesData ?? []).map((b) => ({
      ...b,
      company_name: companyNameById.get(b.company_id) || b.company?.legal_name || b.company?.name || "—",
    }));
  }, [branchesData, companyNameById]);

  const createBlockedByPack =
    !multiBranchPackLoading && !hasMultiBranch && allRows.length >= 1;

  const parentBranchOptions = useMemo(() => {
    if (!formCompanyId) return [];
    return allRows.filter((r) => r.company_id === formCompanyId && (!editing || r.branch_id !== editing.branch_id));
  }, [allRows, formCompanyId, editing]);

  const createMutation = useCreateBranch(formCompanyId || "");
  const updateMutation = useUpdateBranch(editing?.company_id || formCompanyId || "");
  const deleteMutation = useSoftDeleteBranch(confirmDelete?.company_id || "");
  const restoreMutation = useRestoreBranch("");

  useEffect(() => {
    try { localStorage.setItem(COL_STORAGE, JSON.stringify(visible)); } catch { /* ignore */ }
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
        [r.code, r.name, r.address, r.company_name, r.branch_kind].filter(Boolean).join(" ").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const pick = (r: BranchRow): string | number => {
        if (sortKey === "name") return (r.name ?? "").toLowerCase();
        if (sortKey === "code") return (r.code ?? "").toLowerCase();
        if (sortKey === "company") return (r.company_name ?? "").toLowerCase();
        if (sortKey === "kind") return (BRANCH_KIND_LABELS[r.branch_kind ?? ""] ?? r.branch_kind ?? "").toLowerCase();
        if (sortKey === "address") return (r.address ?? "").toLowerCase();
        if (sortKey === "status") return r.is_active !== false ? 1 : 0;
        return r.created_at ? new Date(r.created_at).getTime() : 0;
      };
      const va = pick(a), vb = pick(b);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [allRows, companyFilter, statusFilter, query, sortKey, sortDir, isDeletedView]);

  const total = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredSorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const isFiltered = query.trim().length > 0 || companyFilter !== ALL || (!isDeletedView && statusFilter !== "all");
  const pageIds = pageRows.map((r) => r.branch_id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id));
  const selectedRows = useMemo(() => filteredSorted.filter((r) => selected.has(r.branch_id)), [filteredSorted, selected]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };
  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return null;
    return sortDir === "asc" ? "↑" : "↓";
  };

  const invalidateBranchLists = (companyId?: string) => {
    void qc.invalidateQueries({ queryKey: ["organization", "branches"] });
    if (companyId) void qc.invalidateQueries({ queryKey: ["organization", "companies", companyId, "branches"] });
  };

  const openCreate = () => {
    if (createBlockedByPack) {
      toast.message("بسته multi_branch فعال نیست؛ ایجاد شعبه دوم مجاز نیست.");
      return;
    }
    const base = emptyForm();
    if (companyFilter !== ALL) base.company_id = companyFilter;
    form.reset(base); setEditing(null); setCreateOpen(true);
  };
  const openEdit = (r: BranchRow) => { setEditing(r); form.reset(rowToForm(r)); setEditOpen(true); };
  const forceCloseCreate = () => { setCreateOpen(false); form.reset(emptyForm()); };
  const forceCloseEdit = () => { setEditOpen(false); setEditing(null); form.reset(emptyForm()); };

  const onCreate = form.handleSubmit(async (values) => {
    if (!values.company_id) { toast.error("شرکت را انتخاب کنید."); return; }
    try {
      await createMutation.mutateAsync({
        company_id: values.company_id, code: values.code.trim(), name: values.name.trim(),
        address: values.address.trim() || null, branch_kind: values.branch_kind || "OFFICE",
        parent_branch_id: values.parent_branch_id?.trim() || null,
        default_warehouse_id: values.default_warehouse_id?.trim() || null,
        supports_shipping: values.supports_shipping, supports_receiving: values.supports_receiving,
        is_manufacturing_site: values.is_manufacturing_site, is_active: values.is_active,
      } as never);
      toast.success("شعبه ثبت شد"); forceCloseCreate(); invalidateBranchLists(values.company_id);
    } catch (e) { toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR); }
  });

  const onEdit = form.handleSubmit(async (values) => {
    if (!editing) return;
    try {
      await updateMutation.mutateAsync({
        branchId: editing.branch_id,
        payload: {
          code: values.code.trim(), name: values.name.trim(), address: values.address.trim() || null,
          branch_kind: values.branch_kind || "OFFICE",
          parent_branch_id: values.parent_branch_id?.trim() || null,
          default_warehouse_id: values.default_warehouse_id?.trim() || null,
          supports_shipping: values.supports_shipping,
          supports_receiving: values.supports_receiving, is_manufacturing_site: values.is_manufacturing_site,
          is_active: values.is_active, company_id: values.company_id || editing.company_id,
        },
      });
      toast.success("اطلاعات شعبه به‌روز شد"); forceCloseEdit(); invalidateBranchLists(editing.company_id);
    } catch (e) { toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR); }
  });

  const runSetActive = async (row: BranchRow, active: boolean) => {
    setRowBusyId(row.branch_id);
    try {
      await branchService.update(row.branch_id, {
        code: row.code, name: row.name, address: row.address ?? null,
        branch_kind: row.branch_kind ?? "OFFICE",
        parent_branch_id: row.parent_branch_id ?? null,
        default_warehouse_id: row.default_warehouse_id ?? null,
        supports_shipping: row.supports_shipping,
        supports_receiving: row.supports_receiving, is_manufacturing_site: row.is_manufacturing_site,
        is_active: active, company_id: row.company_id,
      });
      toast.success(active ? "شعبه فعال شد" : "شعبه غیرفعال شد");
      invalidateBranchLists(row.company_id);
    } catch (e) { toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR); }
    finally { setRowBusyId(null); setConfirmStatus(null); }
  };

  const filterTargetsForKind = (kind: BulkKind, targets: BranchRow[]): BranchRow[] => {
    if (kind === "activate") return targets.filter((r) => r.is_active === false);
    if (kind === "deactivate") return targets.filter((r) => r.is_active !== false);
    return targets;
  };

  const requestBulk = (kind: BulkKind, targets: BranchRow[]) => {
    const filtered = filterTargetsForKind(kind, targets);
    if (filtered.length === 0) {
      if (kind === "activate") toast.message("همهٔ موارد انتخاب‌شده از قبل فعال هستند.");
      else if (kind === "deactivate") toast.message("مورد قابل غیرفعال‌سازی در انتخاب نیست.");
      else toast.message("موردی برای انجام عملیات نیست.");
      return;
    }
    setConfirmBulk({ kind, targets: filtered });
  };

  const runBulk = async (kind: BulkKind, targets: BranchRow[]) => {
    setBulkBusy(true);
    setConfirmBulk(null);
    let ok = 0, fail = 0;
    const companyIdsTouched = new Set<string>();
    for (const row of targets) {
      try {
        if (kind === "delete") await branchService.softDelete(row.branch_id);
        else if (kind === "restore") await branchService.restore(row.branch_id);
        else {
          await branchService.update(row.branch_id, {
            code: row.code, name: row.name, address: row.address ?? null,
            branch_kind: row.branch_kind ?? "OFFICE",
            parent_branch_id: row.parent_branch_id ?? null,
            default_warehouse_id: row.default_warehouse_id ?? null,
            supports_shipping: row.supports_shipping,
            supports_receiving: row.supports_receiving, is_manufacturing_site: row.is_manufacturing_site,
            is_active: kind === "activate", company_id: row.company_id,
          });
        }
        companyIdsTouched.add(row.company_id);
        ok += 1;
      } catch { fail += 1; }
    }
    setSelected(new Set());
    for (const cid of companyIdsTouched) invalidateBranchLists(cid);
    setBulkBusy(false);
    if (ok > 0 && fail === 0) {
      const msgs: Record<BulkKind, string> = {
        restore: ok === 1 ? "۱ شعبه بازگردانی شد و غیرفعال باقی ماند." : `${toFaDigits(ok)} شعبه بازگردانی شد و غیرفعال باقی ماندند.`,
        delete: ok === 1 ? "۱ شعبه حذف شد." : `${toFaDigits(ok)} شعبه حذف شد.`,
        activate: ok === 1 ? "۱ شعبه فعال شد." : `${toFaDigits(ok)} شعبه فعال شد.`,
        deactivate: ok === 1 ? "۱ شعبه غیرفعال شد." : `${toFaDigits(ok)} شعبه غیرفعال شد.`,
      };
      toast.success(msgs[kind]);
    } else if (ok > 0) toast.success(`${toFaDigits(ok)} انجام شد؛ ${toFaDigits(fail)} ناموفق.`);
    else toast.error(MSG_ERR);
  };

  const restoreOne = async (row: BranchRow) => {
    setRowBusyId(row.branch_id);
    try {
      await restoreMutation.mutateAsync(row.branch_id);
      toast.success("شعبه بازگردانی شد و غیرفعال باقی ماند.");
      setSelected((prev) => { const n = new Set(prev); n.delete(row.branch_id); return n; });
      invalidateBranchLists(row.company_id);
    } catch (e) { toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR); }
    finally { setRowBusyId(null); }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete.branch_id);
      toast.success("شعبه حذف شد");
      setConfirmDelete(null);
      setSelected((prev) => { const n = new Set(prev); n.delete(confirmDelete.branch_id); return n; });
      invalidateBranchLists(confirmDelete.company_id);
    } catch (e) { toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR); }
  };

  return {
    canView, canCreate, canUpdate, canDelete,
    hasMultiBranch, multiBranchPackLoading, createBlockedByPack,
    qc, companyList, companyIds, companiesLoading,
    query, setQuery, companyFilter, setCompanyFilter,
    membershipFilter, setMembershipFilter,
    statusFilter, setStatusFilter,
    page, setPage, pageSize, setPageSize,
    sortKey, sortDir, visible, setVisible,
    selected, setSelected,
    createOpen, setCreateOpen, editOpen, setEditOpen, editing, setEditing,
    confirmDelete, setConfirmDelete, confirmStatus, setConfirmStatus,
    bulkBusy, setBulkBusy, confirmBulk, setConfirmBulk, rowBusyId, setRowBusyId,
    form, isDirty, isDeletedView, formCompanyId,
    branchesData, branchesLoading, branchesFetching, isError, refetchBranches,
    isInitialLoading, isRefreshing,
    companyNameById, allRows, parentBranchOptions,
    createMutation, updateMutation, deleteMutation, restoreMutation,
    filteredSorted, total, totalPages, safePage, pageRows, isFiltered,
    pageIds, allPageSelected, somePageSelected, selectedRows,
    toggleSort, SortIcon, invalidateBranchLists,
    openCreate, openEdit, forceCloseCreate, forceCloseEdit,
    onCreate, onEdit, runSetActive, requestBulk, runBulk, restoreOne, doDelete,
    BRANCH_KIND_LABELS, ALL, COLS,
  };
}
