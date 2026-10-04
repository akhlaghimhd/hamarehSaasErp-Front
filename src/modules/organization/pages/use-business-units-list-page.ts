/**
 * FE-ORG business units list — page controller (FINAL + multi_business_unit)
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
import { FEATURE_PACK_CODES, useFeaturePackEnabled } from "../hooks/use-feature-packs";
import { businessUnitService, type BusinessUnitDto } from "../services/org-extended-service";
import { OrganizationPermissions } from "../types";
import {
  MSG_ERR,
  COL_STORAGE,
  PAGE_SIZE,
  type StatusFilter,
  type MembershipFilter,
  type SortKey,
  type SortDir,
  type ColumnId,
  type BulkKind,
  type LinkConfirm,
  type BuForm,
  COLS,
  emptyForm,
  rowToForm,
  companyLabels,
} from "./business-units-list-helpers";

function hasAuthContext(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(tokenStorage.getAccessToken() && tokenStorage.getTenantId());
}

export function useBusinessUnitsListPage() {
  const qc = useQueryClient();
  const canView = usePermission(OrganizationPermissions.businessUnitView) || usePermission(OrganizationPermissions.companyView);
  const canManage = usePermission(OrganizationPermissions.businessUnitManage) || usePermission(OrganizationPermissions.companyUpdate);
  const { enabled: hasMultiBu, isLoading: multiBuPackLoading } = useFeaturePackEnabled(
    FEATURE_PACK_CODES.multiBusinessUnit
  );
  const createBuBlocked = !multiBuPackLoading && !hasMultiBu;
  const { data: companies } = useCompanies();

  const [membership, setMembership] = useState<MembershipFilter>("active");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("code");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visibleCols, setVisibleCols] = useState<Set<ColumnId>>(() => {
    if (typeof window === "undefined") return new Set(COLS.map((c) => c.id));
    try {
      const raw = localStorage.getItem(COL_STORAGE);
      if (raw) {
        const arr = JSON.parse(raw) as ColumnId[];
        return new Set(arr);
      }
    } catch { /* ignore */ }
    return new Set(COLS.map((c) => c.id));
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessUnitDto | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<BusinessUnitDto | null>(null);
  const [assignTargets, setAssignTargets] = useState<BusinessUnitDto[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(new Set());
  const [bulkLinkMode, setBulkLinkMode] = useState<"connect" | "disconnect">("connect");
  const [primaryCompanyId, setPrimaryCompanyId] = useState("");
  const [confirm, setConfirm] = useState<null | { kind: BulkKind; targets: BusinessUnitDto[] }>(null);
  const [linkConfirm, setLinkConfirm] = useState<LinkConfirm | null>(null);
  const [busy, setBusy] = useState(false);
  const form = useForm<BuForm>({ defaultValues: emptyForm() });

  useEffect(() => {
    try {
      localStorage.setItem(COL_STORAGE, JSON.stringify([...visibleCols]));
    } catch { /* ignore */ }
  }, [visibleCols]);

  const listQuery = useQuery({
    queryKey: ["org", "business-units", membership] as const,
    queryFn: () => businessUnitService.list({ membership }),
    enabled: canView && hasAuthContext(),
    staleTime: 30_000,
  });
  const rows = listQuery.data ?? [];

  const filtered = useMemo(() => {
    let list = rows;
    if (membership === "active") {
      if (statusFilter === "active") list = list.filter((r) => r.is_active !== false);
      if (statusFilter === "inactive") list = list.filter((r) => r.is_active === false);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        [r.name, r.code, r.description].map((x) => String(x ?? "").toLowerCase()).join(" ").includes(q)
      );
    }
    return [...list].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      if (sortKey === "name") { av = (a.name ?? "").toLowerCase(); bv = (b.name ?? "").toLowerCase(); }
      else if (sortKey === "code") { av = (a.code ?? "").toLowerCase(); bv = (b.code ?? "").toLowerCase(); }
      else if (sortKey === "status") { av = a.is_active !== false ? 1 : 0; bv = b.is_active !== false ? 1 : 0; }
      else if (sortKey === "companies") { av = a.company_assignments?.length ?? 0; bv = b.company_assignments?.length ?? 0; }
      else { av = a.created_at ? new Date(a.created_at).getTime() : 0; bv = b.created_at ? new Date(b.created_at).getTime() : 0; }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, membership, statusFilter, search, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }
  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return null;
    return sortDir === "asc" ? "↑" : "↓";
  }

  function openCreate() {
    if (createBuBlocked) {
      toast.message("بسته multi_business_unit فعال نیست؛ ایجاد واحد کسب‌وکار مجاز نیست.");
      return;
    }
    setEditing(null);
    form.reset(emptyForm());
    setSheetOpen(true);
  }
  function openEdit(row: BusinessUnitDto) {
    setEditing(row);
    form.reset(rowToForm(row));
    setSheetOpen(true);
  }
  function openAssign(row: BusinessUnitDto) {
    setAssignTarget(row);
    setAssignTargets([]);
    const ids = new Set((row.company_assignments ?? []).map((a) => a.company_id));
    setSelectedCompanyIds(ids);
    const prim = (row.company_assignments ?? []).find((a) => a.is_primary)?.company_id ?? "";
    setPrimaryCompanyId(prim);
    setBulkLinkMode("connect");
    setAssignOpen(true);
  }
  function openAssignBulk(targets: BusinessUnitDto[]) {
    const active = targets.filter((r) => r.is_active !== false);
    const skipped = targets.length - active.length;
    if (skipped > 0) toast.message(`${toFaDigits(skipped)} واحد غیرفعال از اتصال گروهی کنار گذاشته شد.`);
    if (!active.length) {
      toast.message("مورد فعالی برای اتصال انتخاب نشده.");
      return;
    }
    setAssignTarget(null);
    setAssignTargets(active);
    setSelectedCompanyIds(new Set());
    setPrimaryCompanyId("");
    setBulkLinkMode("connect");
    setAssignOpen(true);
  }

  async function submitForm(v: BuForm) {
    if (!canManage) return;
    setBusy(true);
    try {
      if (editing) {
        await businessUnitService.update(editing.business_unit_id, {
          code: v.code.trim(),
          name: v.name.trim(),
          description: v.description.trim() || undefined,
          is_active: v.is_active,
        });
        toast.success("واحد به‌روز شد");
      } else {
        await businessUnitService.create({
          code: v.code.trim(),
          name: v.name.trim(),
          description: v.description.trim() || undefined,
          is_active: v.is_active,
        });
        toast.success("واحد ثبت شد");
      }
      setSheetOpen(false);
      form.reset(emptyForm());
      setEditing(null);
      void qc.invalidateQueries({ queryKey: ["org", "business-units"] });
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    } finally {
      setBusy(false);
    }
  }

  async function submitAssign(opts?: { skipLinkConfirm?: boolean }) {
    if (!canManage) return;
    const companyIds = [...selectedCompanyIds];
    const skip = !!opts?.skipLinkConfirm;

    if (assignTarget) {
      const prevPrimary = (assignTarget.company_assignments ?? []).find((a) => a.is_primary)?.company_id;
      const removingPrimary = !!prevPrimary && !companyIds.includes(prevPrimary);
      if (removingPrimary && companyIds.length > 0 && !primaryCompanyId) {
        toast.message("شرکت اصلی قطع می‌شود. لطفاً شرکت اصلی جدید را انتخاب کنید.");
        return;
      }
      if (!skip && removingPrimary && companyIds.length === 0) {
        setLinkConfirm({ kind: "leave_all" });
        return;
      }
      if (!skip && removingPrimary && companyIds.length > 0 && primaryCompanyId) {
        setLinkConfirm({ kind: "swap_primary" });
        return;
      }
      setBusy(true);
      try {
        const primary = primaryCompanyId && companyIds.includes(primaryCompanyId) ? primaryCompanyId : null;
        const res = await businessUnitService.syncCompanies(assignTarget.business_unit_id, companyIds, primary);
        const att = res?.attached ?? 0;
        const det = res?.detached ?? 0;
        if (att === 0 && det === 0) toast.message("تغییری در اتصالات اعمال نشد.");
        else {
          const parts: string[] = [];
          if (att) parts.push(`${toFaDigits(att)} اتصال جدید`);
          if (det) parts.push(`${toFaDigits(det)} انفصال`);
          toast.success(parts.join(" و ") + " ثبت شد.");
        }
        setAssignOpen(false);
        setLinkConfirm(null);
        await qc.invalidateQueries({ queryKey: ["org", "business-units"] });
      } catch (e) {
        toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
      } finally { setBusy(false); }
      return;
    }

    const targets = assignTargets;
    if (!targets.length) return;
    if (!companyIds.length) { toast.message("حداقل یک شرکت را انتخاب کنید."); return; }

    if (!skip && bulkLinkMode === "disconnect") {
      const affected: string[] = [];
      for (const bu of targets) {
        const prim = (bu.company_assignments ?? []).find((a) => a.is_primary)?.company_id;
        if (prim && companyIds.includes(prim)) affected.push(bu.name || bu.code);
      }
      if (affected.length) {
        setLinkConfirm({ kind: "bulk_disconnect_primary", names: affected });
        return;
      }
    }

    if (bulkLinkMode === "connect" && primaryCompanyId && !companyIds.includes(primaryCompanyId)) {
      toast.message("شرکت اصلی باید در فهرست شرکت‌های انتخاب‌شده باشد.");
      return;
    }

    setBusy(true);
    let ok = 0;
    let skipped = 0;
    try {
      for (const bu of targets) {
        if (bu.is_active === false && bulkLinkMode === "connect") { skipped += 1; continue; }
        const linked = new Set((bu.company_assignments ?? []).map((a) => a.company_id));
        for (const cid of companyIds) {
          try {
            if (bulkLinkMode === "connect") {
              if (linked.has(cid)) { skipped += 1; continue; }
              const makePrimary = !!primaryCompanyId && cid === primaryCompanyId;
              await businessUnitService.assignCompany(bu.business_unit_id, cid, makePrimary);
              ok += 1;
            } else {
              if (!linked.has(cid)) { skipped += 1; continue; }
              await businessUnitService.unassignCompany(bu.business_unit_id, cid);
              ok += 1;
            }
          } catch { skipped += 1; }
        }
      }
      if (ok) {
        toast.success(bulkLinkMode === "connect" ? `${toFaDigits(ok)} اتصال انجام شد.` : `${toFaDigits(ok)} انفصال انجام شد.`);
        setAssignOpen(false);
        setAssignTargets([]);
        setSelected(new Set());
        setLinkConfirm(null);
        await qc.invalidateQueries({ queryKey: ["org", "business-units"] });
      } else if (skipped) {
        toast.message(bulkLinkMode === "connect"
          ? "همهٔ جفت‌ها از قبل متصل بودند یا واحد غیرفعال است."
          : "هیچ اتصال فعالی برای انفصال یافت نشد.");
      } else {
        toast.error(MSG_ERR);
      }
    } finally {
      setBusy(false);
    }
  }

  function requestBulk(kind: BulkKind, targets: BusinessUnitDto[]) {
    let list = targets;
    if (kind === "activate") list = targets.filter((r) => r.is_active === false);
    if (kind === "deactivate") list = targets.filter((r) => r.is_active !== false);
    if (!list.length) {
      toast.message("موردی برای این عملیات نیست.");
      return;
    }
    setConfirm({ kind, targets: list });
  }

  async function runBulk() {
    if (!confirm || !canManage) return;
    const { kind, targets } = confirm;
    setBusy(true);
    setConfirm(null);
    let ok = 0, fail = 0;
    for (const row of targets) {
      try {
        if (kind === "delete") await businessUnitService.softDelete(row.business_unit_id);
        else if (kind === "restore") await businessUnitService.restore(row.business_unit_id);
        else await businessUnitService.update(row.business_unit_id, {
          code: row.code,
          name: row.name,
          description: row.description ?? undefined,
          is_active: kind === "activate",
        });
        ok += 1;
      } catch { fail += 1; }
    }
    setSelected(new Set());
    void qc.invalidateQueries({ queryKey: ["org", "business-units"] });
    setBusy(false);
    if (ok > 0 && fail === 0) {
      const n = toFaDigits(ok);
      const msgs: Record<BulkKind, string> = {
        restore: `${n} واحد بازگردانی شد.`,
        delete: `${n} واحد حذف شد.`,
        activate: `${n} واحد فعال شد.`,
        deactivate: `${n} واحد غیرفعال شد.`,
      };
      toast.success(msgs[kind]);
    } else if (ok > 0) toast.success(`${toFaDigits(ok)} انجام شد؛ ${toFaDigits(fail)} ناموفق.`);
    else toast.error(MSG_ERR);
  }

  return {
    canView, canManage,
    hasMultiBu, multiBuPackLoading, createBuBlocked,
    qc, companies: companies ?? [],
    membership, setMembership, statusFilter, setStatusFilter,
    search, setSearch, sortKey, sortDir, page, setPage,
    selected, setSelected, visibleCols, setVisibleCols,
    sheetOpen, setSheetOpen, editing, setEditing,
    assignOpen, setAssignOpen, assignTarget, setAssignTarget,
    assignTargets, setAssignTargets, selectedCompanyIds, setSelectedCompanyIds,
    bulkLinkMode, setBulkLinkMode, primaryCompanyId, setPrimaryCompanyId,
    confirm, setConfirm, linkConfirm, setLinkConfirm, busy, setBusy,
    form, listQuery, rows, filtered, pageCount, pageRows,
    toggleSort, SortIcon,
    openCreate, openEdit, openAssign, openAssignBulk,
    submitForm, submitAssign, requestBulk, runBulk,
    COLS, PAGE_SIZE, companyLabels,
  };
}
