/**
 * FE-ORG departments list — page controller (FINAL PERF tenant-wide)
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { usePermission } from "@/auth";
import { ApiClientError, tokenStorage } from "@/api";
import { toFaDigits } from "@/shared/lib/utils";
import { useCompanies } from "../hooks/use-companies";
import {
  useCreateDepartment,
  useUpdateDepartment,
  useSoftDeleteDepartment,
  departmentsQueryKey,
} from "../hooks/use-departments";
import { departmentService, type DepartmentListFilter } from "../services/department-service";
import { branchService } from "../services/branch-service";
import { OrganizationPermissions } from "../types";
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
  type DeptRow,
  type DeptForm,
  emptyForm,
  rowToForm,
} from "./departments-list-helpers";

function hasAuthContext(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(tokenStorage.getAccessToken() && tokenStorage.getTenantId());
}

export function useDepartmentsListPage() {
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

  const deptsQuery = useQuery({
    queryKey: ["organization", "departments", membershipFilter] as const,
    queryFn: () => departmentService.listAll(membershipFilter),
    enabled: hasAuthContext(),
    staleTime: 30_000,
    retry: 1,
  });

  const branchesQuery = useQuery({
    queryKey: ["organization", "branches", "active", "dept-form"] as const,
    queryFn: () => branchService.listAll("active"),
    enabled: hasAuthContext(),
    staleTime: 60_000,
    retry: 1,
  });

  const allBranches = branchesQuery.data ?? [];

  const isInitialLoading =
    companiesLoading || (deptsQuery.isLoading && !deptsQuery.data);
  const isRefreshing = deptsQuery.isFetching && !deptsQuery.isLoading;
  const isError = deptsQuery.isError;

  const companyNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of companyList) m.set(c.company_id, c.legal_name || c.name);
    return m;
  }, [companyList]);

  const branchNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of allBranches) {
      if (b?.branch_id) m.set(b.branch_id, b.name);
    }
    return m;
  }, [allBranches]);

  const formBranches = useMemo(() => {
    if (!formCompanyId) return [];
    return allBranches.filter((b) => b.company_id === formCompanyId);
  }, [allBranches, formCompanyId]);

  useEffect(() => {
    if (formBranches.length === 1 && !form.watch("branch_id")) {
      const onlyId = formBranches[0].branch_id;
      form.setValue("branch_id", onlyId, { shouldDirty: false });
    }
  }, [formBranches, form]);

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

  const allRows: DeptRow[] = useMemo(() => {
    const list = deptsQuery.data ?? [];
    return list.map((d) => ({
      ...d,
      company_name: companyNameById.get(d.company_id ?? "") || "—",
      branch_name: branchNameById.get(d.branch_id) || "—",
    }));
  }, [deptsQuery.data, companyNameById, branchNameById]);

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
        [r.code, r.name, r.company_name, r.branch_name].filter(Boolean).join(" ").toLowerCase().includes(q)
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
    query.trim().length > 0 || companyFilter !== ALL || (!isDeletedView && statusFilter !== "all");
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
    if (sortKey !== k) return null;
    return sortDir === "asc" ? "↑" : "↓";
  };

  const invalidateDeptLists = (companyId?: string) => {
    void qc.invalidateQueries({ queryKey: ["organization", "departments"] });
    void qc.invalidateQueries({ queryKey: departmentsQueryKey });
    if (companyId)
      void qc.invalidateQueries({ queryKey: ["organization", "companies", companyId, "departments"] });
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
        company_id: values.company_id,
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

  return {
    canView, canCreate, canUpdate, canDelete,
    qc, companyList, companiesLoading,
    query, setQuery, companyFilter, setCompanyFilter,
    membershipFilter, setMembershipFilter,
    statusFilter, setStatusFilter,
    page, setPage, pageSize, setPageSize,
    sortKey, sortDir, visible, setVisible,
    selected, setSelected,
    createOpen, setCreateOpen, editOpen, setEditOpen, editing, setEditing,
    confirmDelete, setConfirmDelete,
    bulkBusy, setBulkBusy, confirmBulk, setConfirmBulk,
    form, isDirty, isDeletedView, formCompanyId,
    deptsQuery, branchesQuery, isInitialLoading, isRefreshing, isError,
    companyNameById, branchNameById, allRows, formBranches, allBranches,
    createMutation, updateMutation, deleteMutation,
    filteredSorted, total, totalPages, safePage, pageRows, isFiltered,
    pageIds, allPageSelected, somePageSelected, selectedRows,
    toggleSort, SortIcon, invalidateDeptLists,
    openCreate, openEdit, forceCloseCreate, forceCloseEdit,
    onCreate, onEdit, setActive, requestBulk, runBulk, restoreOne, doDelete,
    ALL, COLS, refetch: () => void deptsQuery.refetch(),
  };
}
