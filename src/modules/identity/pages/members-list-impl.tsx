"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown, ArrowUp, ArrowUpDown, Columns3, Download, Eye, FileSpreadsheet, FileText,
  Loader2, Plus, RotateCcw, Search, Shield, Trash2, Upload, UserCheck, UserMinus, Users, X,
} from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { useAuthStore, usePermission } from "@/auth";
import { cn, toFaDigits } from "@/shared/lib/utils";
import { useCreateTenantUser, useRestoreTenantUser, useSoftDeleteTenantUser, useTenantUsers, useUpdateTenantUser } from "../hooks/use-tenant-users";
import { MembersCompanyFilter } from "../components/members-company-filter";
import { useIdentityHoldingAccess } from "../hooks/use-identity-holding-access";
import { IdentityPermissions, type TenantUserDto } from "../types";
import { MSG_LOAD_ERROR, MSG_NO_ACCESS } from "../lib/ui-copy";
import { downloadMembersImportTemplate, exportMembersExcel, exportMembersPdf, readSpreadsheetTable } from "../lib/members-export";
import type { MembershipListFilter } from "../services/tenant-user-service";
import { MemberCreateDrawer } from "../components/member-create-drawer";
import { memberDetailPath } from "../lib/member-ref";
import {
  COLS, SKY, dn, fd, fdt, lastChangeAt, activityOf, sv, BULK_SUCCESS, RESTORE_ONE_MSG,
  mapImportRows, IconAction, ActivityBadge, highestRoleName, scopeNames,
  type StatusFilter, type SortKey, type SortDir, type ColumnId, type BulkKind, type ConfirmState,
} from "./members-list-helpers";

export function MembersListPage() {
  const canView = usePermission(IdentityPermissions.userView);
  const canCreate = usePermission(IdentityPermissions.userCreate);
  const canUpdate = usePermission(IdentityPermissions.userUpdate);
  const canDelete = usePermission(IdentityPermissions.userDelete);
  const canRestore = usePermission(IdentityPermissions.userRestore);
  const { canMutateMembers, isGroupObserver, isBranchScopedOnly } = useIdentityHoldingAccess();
    const canCreateOp = canCreate && canMutateMembers;
  const canUpdateOp = canUpdate && canMutateMembers;
  const canDeleteOp = canDelete && canMutateMembers;
  const canRestoreOp = canRestore && canMutateMembers;
  const currentUserId = useAuthStore((s) => s.user?.user_id);

  const [membershipFilter, setMembershipFilter] = useState<MembershipListFilter>("active");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const { data, isLoading, isError, error, refetch, isFetching } = useTenantUsers(
    membershipFilter,
    companyFilter !== "all" ? { companyId: companyFilter } : undefined
  );
  const updateMutation = useUpdateTenantUser();
  const deleteMutation = useSoftDeleteTenantUser();
  const restoreMutation = useRestoreTenantUser();
  const createMutation = useCreateTenantUser();

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
      const raw = localStorage.getItem(SKY);
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
  const importRef = useRef<HTMLInputElement>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => { try { localStorage.setItem(SKY, JSON.stringify(visible)); } catch {} }, [visible]);
  useEffect(() => { setSelected(new Set()); setPage(1); }, [membershipFilter, companyFilter]);

  const rows = data ?? [];
  const isDeletedView = membershipFilter === "deleted";

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((row) => {
      if (!isDeletedView) {
        const st = Number(row.status);
        if (statusFilter === "active" && st !== 1) return false;
        if (statusFilter === "inactive" && st !== 0) return false;
      }
      if (!q) return true;
      const u = row.user;
      return [u?.first_name, u?.last_name, u?.email, u?.mobile].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
    return [...list].sort((a, b) => {
      const va = sv(a, sortKey);
      const vb = sv(b, sortKey);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, query, statusFilter, sortKey, sortDir, isDeletedView]);

  const total = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredSorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const isFiltered = query.trim().length > 0 || (!isDeletedView && statusFilter !== "all");
  const pageIds = pageRows.map((r) => r.tenant_user_id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id));
  const selectedRowsOrdered = useMemo(() => filteredSorted.filter((r) => selected.has(r.tenant_user_id)), [filteredSorted, selected]);
  const exportTarget = selectedRowsOrdered.length > 0 ? selectedRowsOrdered : filteredSorted;
  const exportLabel = isDeletedView
    ? selected.size > 0 ? `ط®ط±ظˆط¬غŒ ط­ط°ظپâ€Œط´ط¯ظ‡â€Œظ‡ط§غŒ ط§ظ†طھط®ط§ط¨â€Œط´ط¯ظ‡ (${toFaDigits(selected.size)})` : `ط®ط±ظˆط¬غŒ ط­ط°ظپâ€Œط´ط¯ظ‡â€Œظ‡ط§ (${toFaDigits(total)})`
    : selected.size > 0 ? `ط®ط±ظˆط¬غŒ ط§ظ†طھط®ط§ط¨â€Œط´ط¯ظ‡â€Œظ‡ط§ (${toFaDigits(selected.size)})` : `ط®ط±ظˆط¬غŒ ظپظ‡ط±ط³طھ ظپط¹ظ„غŒ (${toFaDigits(total)})`;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "joined" || key === "lastChange" ? "desc" : "asc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const runBulk = async (kind: BulkKind, targets: TenantUserDto[]) => {
    cancelRef.current = false;
    setBulkBusy(true);
    setBulkProgress({ done: 0, total: targets.length });
    let ok = 0; let fail = 0; let cancelled = false;
    for (let i = 0; i < targets.length; i++) {
      if (cancelRef.current) { cancelled = true; break; }
      const r = targets[i];
      try {
        if (kind === "activate") await updateMutation.mutateAsync({ tenantUserId: r.tenant_user_id, payload: { status: 1 } });
        else if (kind === "deactivate") await updateMutation.mutateAsync({ tenantUserId: r.tenant_user_id, payload: { status: 0 } });
        else if (kind === "delete") await deleteMutation.mutateAsync(r.tenant_user_id);
        else await restoreMutation.mutateAsync(r.tenant_user_id);
        ok += 1;
      } catch { fail += 1; }
      setBulkProgress({ done: i + 1, total: targets.length });
    }
    setBulkBusy(false);
    setConfirm(null);
    setSelected(new Set());
    if (cancelled) toast.message(`ط¹ظ…ظ„غŒط§طھ ظ…طھظˆظ‚ظپ ط´ط¯ آ· ط§ظ†ط¬ط§ظ…â€Œط´ط¯ظ‡: ${toFaDigits(ok)} آ· ط¨ط§ظ‚غŒâ€Œظ…ط§ظ†ط¯ظ‡ ط§ظ†ط¬ط§ظ… ظ†ط´ط¯`);
    else if (ok) toast.success(BULK_SUCCESS[kind](ok));
    if (fail) toast.error(`${toFaDigits(fail)} ظ…ظˆط±ط¯ ط§ظ†ط¬ط§ظ… ظ†ط´ط¯`);
  };

  const activateOne = async (row: TenantUserDto) => {
    try {
      await updateMutation.mutateAsync({ tenantUserId: row.tenant_user_id, payload: { status: 1 } });
      toast.success("ع©ط§ط±ط¨ط± ظپط¹ط§ظ„ ط´ط¯.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "ظپط¹ط§ظ„â€Œط³ط§ط²غŒ ظ…ظ…ع©ظ† ظ†ط´ط¯"); }
  };

  const deactivateOne = async (row: TenantUserDto) => {
    if (currentUserId && row.user_id === currentUserId) { toast.error("ظ†ظ…غŒâ€Œطھظˆط§ظ†غŒط¯ ط®ظˆط¯طھط§ظ† ط±ط§ ط؛غŒط±ظپط¹ط§ظ„ ع©ظ†غŒط¯."); return; }
    try {
      await updateMutation.mutateAsync({ tenantUserId: row.tenant_user_id, payload: { status: 0 } });
      toast.success("ع©ط§ط±ط¨ط± ط؛غŒط±ظپط¹ط§ظ„ ط´ط¯.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "ط؛غŒط±ظپط¹ط§ظ„â€Œط³ط§ط²غŒ ظ…ظ…ع©ظ† ظ†ط´ط¯"); }
  };

  const deleteOne = async (row: TenantUserDto) => {
    if (currentUserId && row.user_id === currentUserId) { toast.error("ظ†ظ…غŒâ€Œطھظˆط§ظ†غŒط¯ ط®ظˆط¯طھط§ظ† ط±ط§ ط­ط°ظپ ع©ظ†غŒط¯."); return; }
    setConfirm({ kind: "delete", count: 1, targets: [row] });
  };

  const restoreOne = async (row: TenantUserDto) => {
    try {
      await restoreMutation.mutateAsync(row.tenant_user_id);
      toast.success(RESTORE_ONE_MSG);
    } catch (e) { toast.error(e instanceof Error ? e.message : "ط¨ط§ط²ع¯ط±ط¯ط§ظ†غŒ ظ…ظ…ع©ظ† ظ†ط´ط¯"); }
  };

  const onImportFile = async (file: File) => {
    setImportBusy(true);
    try {
      const table = await readSpreadsheetTable(file);
      const mapped = mapImportRows(table);
      if (!mapped.length) {
        toast.error("ط¯ط± ظپط§غŒظ„ ط±ط¯غŒظپ ظ…ط¹طھط¨ط±غŒ ظ¾غŒط¯ط§ ظ†ط´ط¯. ط§ط² ط§ظ„ع¯ظˆغŒ ط§ع©ط³ظ„ ط§ط³طھظپط§ط¯ظ‡ ع©ظ†غŒط¯.");
        return;
      }
      const seen = new Set<string>();
      const unique: typeof mapped = [];
      let dupInFile = 0;
      for (const row of mapped) {
        const key = row.email.toLowerCase();
        if (seen.has(key)) { dupInFile += 1; continue; }
        seen.add(key);
        unique.push(row);
      }
      cancelRef.current = false;
      setBulkBusy(true);
      setBulkProgress({ done: 0, total: unique.length });
      let ok = 0; let fail = 0;
      const failSamples: string[] = [];
      for (let i = 0; i < unique.length; i++) {
        if (cancelRef.current) break;
        const row = unique[i];
        try {
          const local = row.email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9._-]/g, "") || undefined;
          if (!row.mobile) {
            fail += 1;
            if (failSamples.length < 3) failSamples.push(`${row.email}: ظ…ظˆط¨ط§غŒظ„ ط§ظ„ط²ط§ظ…غŒ ط§ط³طھ`);
            setBulkProgress({ done: i + 1, total: unique.length });
            continue;
          }
          await createMutation.mutateAsync({
            first_name: row.first_name,
            last_name: row.last_name,
            mobile: row.mobile,
            email_local_part: local,
          });
          ok += 1;
        } catch (e) {
          fail += 1;
          const msg = e instanceof Error ? e.message : "ط®ط·ط§غŒ ظ†ط§ظ…ط´ط®طµ";
          if (failSamples.length < 3) failSamples.push(`${row.email}: ${msg}`);
        }
        setBulkProgress({ done: i + 1, total: unique.length });
      }
      setBulkBusy(false);
      if (ok) toast.success(`${toFaDigits(ok)} ع©ط§ط±ط¨ط± ط§ط² ظپط§غŒظ„ ط§ظپط²ظˆط¯ظ‡ ط´ط¯`);
      if (dupInFile) toast.message(`${toFaDigits(dupInFile)} ط±ط¯غŒظپ ط¨ظ‡â€Œط®ط§ط·ط± ط§غŒظ…غŒظ„ طھع©ط±ط§ط±غŒ ط¯ط§ط®ظ„ ظپط§غŒظ„ ظ†ط§ط¯غŒط¯ظ‡ ع¯ط±ظپطھظ‡ ط´ط¯`);
      if (fail) toast.error(`${toFaDigits(fail)} ط±ط¯غŒظپ ط«ط¨طھ ظ†ط´ط¯. ${failSamples.join(" آ· ")}`);
    } catch {
      toast.error("ط®ظˆط§ظ†ط¯ظ† ظپط§غŒظ„ ظ…ظ…ع©ظ† ظ†ط´ط¯. ط§ظ„ع¯ظˆغŒ ط§ع©ط³ظ„ ط±ط§ ط¯ط§ظ†ظ„ظˆط¯ ع©ظ†غŒط¯ ظˆ ط¯ظˆط¨ط§ط±ظ‡ طھظ„ط§ط´ ع©ظ†غŒط¯.");
    } finally {
      setImportBusy(false);
      if (importRef.current) importRef.current.value = "";
    }
  };

  const downloadTemplate = () => { downloadMembersImportTemplate(); };

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader title="ع©ط§ط±ط¨ط±ط§ظ† ط³ط§ط²ظ…ط§ظ†" breadcrumbs={[{ label: "ط¯ط§ط´ط¨ظˆط±ط¯", href: "/dashboard" }, { label: "ظ‡ظˆغŒطھ ظˆ ط¯ط³طھط±ط³غŒ", href: "/dashboard/identity" }, { label: "ع©ط§ط±ط¨ط±ط§ظ†" }]} />
        <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">{MSG_NO_ACCESS}</div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex min-h-0 flex-col gap-3">
        <PageHeader
          title="ع©ط§ط±ط¨ط±ط§ظ† ط³ط§ط²ظ…ط§ظ†"
          description="ط§ط¹ط¶ط§غŒ ط³ط§ط²ظ…ط§ظ† ط±ط§ ط¬ط³طھط¬ظˆ ع©ظ†غŒط¯طŒ ظˆط¶ط¹غŒطھط´ط§ظ† ط±ط§ طھط؛غŒغŒط± ط¯ظ‡غŒط¯ غŒط§ ط¹ط¶ظˆ ط¬ط¯غŒط¯ ط§ط¶ط§ظپظ‡ ع©ظ†غŒط¯"
          breadcrumbs={[{ label: "ط¯ط§ط´ط¨ظˆط±ط¯", href: "/dashboard" }, { label: "ظ‡ظˆغŒطھ ظˆ ط¯ط³طھط±ط³غŒ", href: "/dashboard/identity" }, { label: "ع©ط§ط±ط¨ط±ط§ظ†" }]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {canCreateOp ? (
                <>
                  <input ref={importRef} type="file" accept=".xlsx,.xls,.xlsm,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImportFile(f); }} />
                  <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5" disabled={importBusy || bulkBusy} onClick={() => importRef.current?.click()}>
                    {importBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    ظˆط±ظˆط¯ ط§ط² ط§ع©ط³ظ„
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={downloadTemplate}>ط§ظ„ع¯ظˆغŒ ظپط§غŒظ„</Button>
                  <Button type="button" size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4" />ط§ظپط²ظˆط¯ظ† ع©ط§ط±ط¨ط±
                  </Button>
                </>
              ) : null}
            </div>
          }
        />

        {isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <p className="font-medium">ط¨ط§ط±ع¯ط°ط§ط±غŒ ظپظ‡ط±ط³طھ ظ…ظ…ع©ظ† ظ†ط´ط¯</p>
            <p className="mt-1 text-xs">{error instanceof Error ? error.message : MSG_LOAD_ERROR}</p>
            <Button variant="outline" size="sm" className="mt-3 h-8" onClick={() => void refetch()}>طھظ„ط§ط´ ظ…ط¬ط¯ط¯</Button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className={cn("h-8 ps-8 text-sm", query && "pe-8")} placeholder="ظ†ط§ظ…طŒ ط§غŒظ…غŒظ„ غŒط§ ظ…ظˆط¨ط§غŒظ„â€¦" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
            {query ? (
              <button type="button" className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="ظ¾ط§ع© ع©ط±ط¯ظ† ط¬ط³طھط¬ظˆ" onClick={() => { setQuery(""); setPage(1); }}>
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <Select value={membershipFilter} onValueChange={(v) => setMembershipFilter(v as MembershipListFilter)}>
            <SelectTrigger className="h-8 w-[9.5rem]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">ع©ط§ط±ط¨ط±ط§ظ† ط¬ط§ط±غŒ</SelectItem>
              <SelectItem value="deleted">ع©ط§ط±ط¨ط±ط§ظ† ط­ط°ظپâ€Œط´ط¯ظ‡</SelectItem>
            </SelectContent>
          </Select>
          
      {isGroupObserver && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
          ط¯ط³طھط±ط³غŒ ط´ظ…ط§ ط¯ط± ط§غŒظ† ط¨ط®ط´ ظپظ‚ط· ظ…ط´ط§ظ‡ط¯ظ‡ ط§ط³طھط› ط§غŒط¬ط§ط¯ غŒط§ ظˆغŒط±ط§غŒط´ ط¹ط¶ظˆ ظ…ط¬ط§ط² ظ†غŒط³طھ.
        </div>
      )}
          
      {isBranchScopedOnly && (
        <div className="rounded-lg border border-sky-200 bg-sky-50/80 px-3 py-2 text-xs text-sky-900">
          ظ…ط¯غŒط±غŒطھ ط´ظ…ط§ ظ…ط­ط¯ظˆط¯ ط¨ظ‡ ط§ط¹ط¶ط§غŒ ط´ط¹ط¨ظ‡ظ” ظ…ط¬ط§ط² ط§ط³طھط› ط§ط¹ط¶ط§غŒ ط³ط§غŒط± ط´ط¹ط¨ غŒط§ ط´ط±ع©طھâ€Œظ‡ط§ ط¯ط± ط§غŒظ† ظپظ‡ط±ط³طھ ط¯غŒط¯ظ‡ ظ†ظ…غŒâ€Œط´ظˆظ†ط¯.
        </div>
      )}
          <MembersCompanyFilter value={companyFilter} onChange={(v) => { setCompanyFilter(v); setPage(1); }} />
          {!isDeletedView ? (
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); setPage(1); }}>
              <SelectTrigger className="h-8 w-[8.5rem]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ظ‡ظ…ظ‡ ظˆط¶ط¹غŒطھâ€Œظ‡ط§</SelectItem>
                <SelectItem value="active">ظپط¹ط§ظ„</SelectItem>
                <SelectItem value="inactive">ط؛غŒط±ظپط¹ط§ظ„</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5"><Columns3 className="h-3.5 w-3.5" />ط³طھظˆظ†â€Œظ‡ط§</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>ظ†ظ…ط§غŒط´ ط³طھظˆظ†â€Œظ‡ط§</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COLS.filter((c) => c.hideable !== false).map((c) => (
                <DropdownMenuItem key={c.id} className="gap-2" onSelect={(e) => { e.preventDefault(); setVisible((p) => ({ ...p, [c.id]: !p[c.id] })); }}>
                  <Checkbox checked={visible[c.id]} className="pointer-events-none" /><span>{c.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5"><Download className="h-3.5 w-3.5" />ط®ط±ظˆط¬غŒ</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{exportLabel}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2" onSelect={() => exportMembersExcel(exportTarget)}><FileSpreadsheet className="h-3.5 w-3.5" />ط§ع©ط³ظ„</DropdownMenuItem>
              <DropdownMenuItem className="gap-2" onSelect={() => exportMembersPdf(exportTarget)}><FileText className="h-3.5 w-3.5" />PDF / ع†ط§ظ¾</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {isFetching && !isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
        </div>

        {selected.size > 0 || bulkBusy ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            {bulkBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>ط¯ط± ط­ط§ظ„ ط§ظ†ط¬ط§ظ…â€¦ {toFaDigits(bulkProgress.done)} ط§ط² {toFaDigits(bulkProgress.total)}</span>
                <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => { cancelRef.current = true; }}>طھظˆظ‚ظپ</Button>
              </>
            ) : (
              <>
                <span className="text-muted-foreground">{toFaDigits(selected.size)} ظ…ظˆط±ط¯ ط§ظ†طھط®ط§ط¨â€Œط´ط¯ظ‡</span>
                {!isDeletedView && canUpdate ? (
                  <>
                    <Button type="button" size="sm" variant="outline" className="h-7 gap-1" onClick={() => setConfirm({ kind: "activate", count: selected.size, targets: selectedRowsOrdered })}><UserCheck className="h-3.5 w-3.5" />ظپط¹ط§ظ„</Button>
                    <Button type="button" size="sm" variant="outline" className="h-7 gap-1" onClick={() => setConfirm({ kind: "deactivate", count: selected.size, targets: selectedRowsOrdered })}><UserMinus className="h-3.5 w-3.5" />ط؛غŒط±ظپط¹ط§ظ„</Button>
                  </>
                ) : null}
                {!isDeletedView && canDelete ? (
                  <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-destructive" onClick={() => setConfirm({ kind: "delete", count: selected.size, targets: selectedRowsOrdered })}><Trash2 className="h-3.5 w-3.5" />ط­ط°ظپ</Button>
                ) : null}
                {isDeletedView && canRestore ? (
                  <Button type="button" size="sm" variant="outline" className="h-7 gap-1" onClick={() => setConfirm({ kind: "restore", count: selected.size, targets: selectedRowsOrdered })}><RotateCcw className="h-3.5 w-3.5" />ط¨ط§ط²ع¯ط±ط¯ط§ظ†غŒ</Button>
                ) : null}
                <Button type="button" size="sm" variant="ghost" className="h-7" onClick={() => setSelected(new Set())}>ظ„ط؛ظˆ ط§ظ†طھط®ط§ط¨</Button>
              </>
            )}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b bg-card shadow-sm">
                <TableHead className="sticky top-0 z-30 w-10 bg-card px-2">
                  <Checkbox checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false} onCheckedChange={(v) => {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (v) pageIds.forEach((id) => next.add(id));
                      else pageIds.forEach((id) => next.delete(id));
                      return next;
                    });
                  }} aria-label="ط§ظ†طھط®ط§ط¨ ظ‡ظ…ظ‡ ط§غŒظ† طµظپط­ظ‡" />
                </TableHead>
                <TableHead className="sticky top-0 z-30 w-12 bg-card px-2 text-center text-xs">ط±ط¯غŒظپ</TableHead>
                {COLS.map((c) => {
                  if (c.id !== "name" && c.id !== "actions" && !visible[c.id]) return null;
                  return (
                    <TableHead key={c.id} className={cn("sticky top-0 z-30 whitespace-nowrap bg-card text-xs", c.id === "actions" && "w-[7.5rem] text-center")}>
                      {c.sort ? (
                        <button type="button" className="inline-flex items-center gap-1 font-medium hover:text-foreground" onClick={() => toggleSort(c.sort!)}>
                          {c.label}<SortIcon k={c.sort} />
                        </button>
                      ) : c.label}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={12} className="py-2"><Skeleton className="h-7 w-full" /></TableCell></TableRow>
                ))
              ) : pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="p-0">
                    <EmptyState
                      icon={Users}
                      title={isFiltered ? "ظ†طھغŒط¬ظ‡â€Œط§غŒ ظ¾غŒط¯ط§ ظ†ط´ط¯" : isDeletedView ? "ع©ط§ط±ط¨ط± ط­ط°ظپâ€Œط´ط¯ظ‡â€Œط§غŒ ظ†غŒط³طھ" : "ظ‡ظ†ظˆط² ط¹ط¶ظˆغŒ ط«ط¨طھ ظ†ط´ط¯ظ‡"}
                      description={isFiltered ? "ط¹ط¨ط§ط±طھ ط¬ط³طھط¬ظˆ غŒط§ ظپغŒظ„طھط± ط±ط§ طھط؛غŒغŒط± ط¯ظ‡غŒط¯." : isDeletedView ? "ط¯ط± طµظˆط±طھ ط­ط°ظپ ط§ط´طھط¨ط§ظ‡طŒ ظ…غŒâ€Œطھظˆط§ظ†غŒط¯ ع©ط§ط±ط¨ط± ط±ط§ ط§ط² ط§غŒظ†ط¬ط§ ط¨ط§ط²ع¯ط±ط¯ط§ظ†غŒط¯." : "ط¨ط±ط§غŒ ط´ط±ظˆط¹طŒ ع©ط§ط±ط¨ط± ط¬ط¯غŒط¯ ط§ط¶ط§ظپظ‡ ع©ظ†غŒط¯ غŒط§ ط§ط² ظپط§غŒظ„ ط§ع©ط³ظ„ ظˆط§ط±ط¯ ع©ظ†غŒط¯."}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((row, idx) => {
                  const active = Number(row.status) === 1;
                  const act = activityOf(row, isDeletedView);
                  const isSelf = Boolean(currentUserId && row.user_id === currentUserId);
                  return (
                    <TableRow key={row.tenant_user_id} className={cn(selected.has(row.tenant_user_id) && "bg-primary/5")}>
                      <TableCell className="px-2 py-1">
                        <Checkbox checked={selected.has(row.tenant_user_id)} onCheckedChange={(v) => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (v) next.add(row.tenant_user_id);
                            else next.delete(row.tenant_user_id);
                            return next;
                          });
                        }} aria-label="ط§ظ†طھط®ط§ط¨ ط±ط¯غŒظپ" />
                      </TableCell>
                      <TableCell className="px-2 py-1 text-center text-xs tabular-nums text-muted-foreground">{toFaDigits((safePage - 1) * pageSize + idx + 1)}</TableCell>
                      {visible.name ? (
                        <TableCell className="px-2 py-1">
                          <div className="flex min-w-0 items-center gap-1.5">
                            {act ? <ActivityBadge kind={act} /> : null}
                            <Link href={memberDetailPath(row.tenant_user_id)} className="truncate text-sm font-medium hover:underline">{dn(row)}</Link>
                          </div>
                        </TableCell>
                      ) : null}
                      {visible.email ? <TableCell className="px-2 py-1 text-xs" dir="ltr"><span className="truncate block max-w-[12rem]">{row.user?.email ?? "â€”"}</span></TableCell> : null}
                      {visible.mobile ? <TableCell className="px-2 py-1 text-xs tabular-nums" dir="ltr">{row.user?.mobile ? toFaDigits(row.user.mobile) : "â€”"}</TableCell> : null}
                      {visible.role ? (
                        <TableCell className="px-2 py-1 text-xs">
                          <span className="inline-flex max-w-[10rem] items-center gap-1 truncate">
                            {row.is_owner ? <Shield className="h-3 w-3 shrink-0 text-amber-600" /> : null}
                            <span className="truncate">{highestRoleName(row)}</span>
                          </span>
                        </TableCell>
                      ) : null}
                      {visible.scope ? (
                        <TableCell className="px-2 py-1 text-xs">
                          <span className="inline-block max-w-[12rem] truncate" title={scopeNames(row)}>
                            {scopeNames(row)}
                          </span>
                        </TableCell>
                      ) : null}
                      {visible.status ? <TableCell className="px-2 py-1"><StatusChip label={active ? "ظپط¹ط§ظ„" : "ط؛غŒط±ظپط¹ط§ظ„"} tone={active ? "success" : "neutral"} /></TableCell> : null}
                      {visible.joined ? <TableCell className="px-2 py-1 text-xs tabular-nums text-muted-foreground">{fd(row.created_at as string | null | undefined)}</TableCell> : null}
                      {visible.lastChange ? (
                        <TableCell className="px-2 py-1 text-xs tabular-nums text-muted-foreground">
                          <Tooltip>
                            <TooltipTrigger asChild><span>{fd(lastChangeAt(row))}</span></TooltipTrigger>
                            <TooltipContent>{fdt(lastChangeAt(row))}</TooltipContent>
                          </Tooltip>
                        </TableCell>
                      ) : null}
                      <TableCell className="px-1 py-1">
                        <div className="flex items-center justify-center gap-0.5">
                          <IconAction label="ظ…ط´ط§ظ‡ط¯ظ‡" onClick={() => { window.location.href = memberDetailPath(row.tenant_user_id); }}>
                            <Eye className="h-3.5 w-3.5" />
                          </IconAction>
                          {!isDeletedView && canUpdateOp && !isSelf ? (
                            active ? (
                              <IconAction label="ط؛غŒط±ظپط¹ط§ظ„â€Œط³ط§ط²غŒ" onClick={() => void deactivateOne(row)}>
                                <UserMinus className="h-3.5 w-3.5" />
                              </IconAction>
                            ) : (
                              <IconAction label="ظپط¹ط§ظ„â€Œط³ط§ط²غŒ" onClick={() => void activateOne(row)}>
                                <UserCheck className="h-3.5 w-3.5" />
                              </IconAction>
                            )
                          ) : null}
                          {!isDeletedView && canDeleteOp && !isSelf ? (
                            <IconAction label="ط­ط°ظپ ط§ط² ط³ط§ط²ظ…ط§ظ†" variant="destructive" onClick={() => void deleteOne(row)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </IconAction>
                          ) : null}
                          {isDeletedView && canRestore ? (
                            <IconAction label="ط¨ط§ط²ع¯ط±ط¯ط§ظ†غŒ" onClick={() => void restoreOne(row)}>
                              <RotateCcw className="h-3.5 w-3.5" />
                            </IconAction>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {total === 0 ? "ظ…ظˆط±ط¯غŒ ظ†غŒط³طھ" : `ظ†ظ…ط§غŒط´ ${toFaDigits((safePage - 1) * pageSize + 1)}â€“${toFaDigits(Math.min(safePage * pageSize, total))} ط§ط² ${toFaDigits(total)}`}
          </span>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-7 w-[4.5rem]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>{toFaDigits(n)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" size="sm" variant="outline" className="h-7" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>ظ‚ط¨ظ„غŒ</Button>
            <span className="tabular-nums">{toFaDigits(safePage)} / {toFaDigits(totalPages)}</span>
            <Button type="button" size="sm" variant="outline" className="h-7" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>ط¨ط¹ط¯غŒ</Button>
          </div>
        </div>

        {confirm ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl border bg-card p-5 shadow-lg" role="dialog" aria-modal="true">
              <p className="text-base font-semibold">
                {confirm.kind === "activate" && "ظپط¹ط§ظ„â€Œط³ط§ط²غŒ ط§ظ†طھط®ط§ط¨â€Œط´ط¯ظ‡â€Œظ‡ط§"}
                {confirm.kind === "deactivate" && "ط؛غŒط±ظپط¹ط§ظ„â€Œط³ط§ط²غŒ ط§ظ†طھط®ط§ط¨â€Œط´ط¯ظ‡â€Œظ‡ط§"}
                {confirm.kind === "delete" && "ط­ط°ظپ ط§ط² ط³ط§ط²ظ…ط§ظ†"}
                {confirm.kind === "restore" && "ط¨ط§ط²ع¯ط±ط¯ط§ظ†غŒ ط§ظ†طھط®ط§ط¨â€Œط´ط¯ظ‡â€Œظ‡ط§"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {toFaDigits(confirm.count)} ظ…ظˆط±ط¯ ط§ظ†طھط®ط§ط¨ ط´ط¯ظ‡ ط§ط³طھ. ط§ط¯ط§ظ…ظ‡ ظ…غŒâ€Œط¯ظ‡غŒط¯طں
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setConfirm(null)}>ط§ظ†طµط±ط§ظپ</Button>
                <Button type="button" size="sm" variant={confirm.kind === "delete" ? "destructive" : "default"} onClick={() => void runBulk(confirm.kind, confirm.targets)}>طھط£غŒغŒط¯</Button>
              </div>
            </div>
          </div>
        ) : null}

        <MemberCreateDrawer open={createOpen} onOpenChange={setCreateOpen} onCreated={() => void refetch()} />
      </div>
    </TooltipProvider>
  );
}

