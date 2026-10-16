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
  /** IDORG-T14: permission AND holding mutate gate (observer/read-only cannot create) */
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
    ? selected.size > 0 ? `خروجی حذف‌شده‌های انتخاب‌شده (${toFaDigits(selected.size)})` : `خروجی حذف‌شده‌ها (${toFaDigits(total)})`
    : selected.size > 0 ? `خروجی انتخاب‌شده‌ها (${toFaDigits(selected.size)})` : `خروجی فهرست فعلی (${toFaDigits(total)})`;

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
    if (cancelled) toast.message(`عملیات متوقف شد · انجام‌شده: ${toFaDigits(ok)} · باقی‌مانده انجام نشد`);
    else if (ok) toast.success(BULK_SUCCESS[kind](ok));
    if (fail) toast.error(`${toFaDigits(fail)} مورد انجام نشد`);
  };

  const activateOne = async (row: TenantUserDto) => {
    try {
      await updateMutation.mutateAsync({ tenantUserId: row.tenant_user_id, payload: { status: 1 } });
      toast.success("کاربر فعال شد.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "فعال‌سازی ممکن نشد"); }
  };

  const deactivateOne = async (row: TenantUserDto) => {
    if (currentUserId && row.user_id === currentUserId) { toast.error("نمی‌توانید خودتان را غیرفعال کنید."); return; }
    try {
      await updateMutation.mutateAsync({ tenantUserId: row.tenant_user_id, payload: { status: 0 } });
      toast.success("کاربر غیرفعال شد.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "غیرفعال‌سازی ممکن نشد"); }
  };

  const deleteOne = async (row: TenantUserDto) => {
    if (currentUserId && row.user_id === currentUserId) { toast.error("نمی‌توانید خودتان را حذف کنید."); return; }
    setConfirm({ kind: "delete", count: 1, targets: [row] });
  };

  const restoreOne = async (row: TenantUserDto) => {
    try {
      await restoreMutation.mutateAsync(row.tenant_user_id);
      toast.success(RESTORE_ONE_MSG);
    } catch (e) { toast.error(e instanceof Error ? e.message : "بازگردانی ممکن نشد"); }
  };

  const onImportFile = async (file: File) => {
    setImportBusy(true);
    try {
      const table = await readSpreadsheetTable(file);
      const mapped = mapImportRows(table);
      if (!mapped.length) {
        toast.error("در فایل ردیف معتبری پیدا نشد. از الگوی اکسل استفاده کنید.");
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
            if (failSamples.length < 3) failSamples.push(`${row.email}: موبایل الزامی است`);
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
          const msg = e instanceof Error ? e.message : "خطای نامشخص";
          if (failSamples.length < 3) failSamples.push(`${row.email}: ${msg}`);
        }
        setBulkProgress({ done: i + 1, total: unique.length });
      }
      setBulkBusy(false);
      if (ok) toast.success(`${toFaDigits(ok)} کاربر از فایل افزوده شد`);
      if (dupInFile) toast.message(`${toFaDigits(dupInFile)} ردیف به‌خاطر ایمیل تکراری داخل فایل نادیده گرفته شد`);
      if (fail) toast.error(`${toFaDigits(fail)} ردیف ثبت نشد. ${failSamples.join(" · ")}`);
    } catch {
      toast.error("خواندن فایل ممکن نشد. الگوی اکسل را دانلود کنید و دوباره تلاش کنید.");
    } finally {
      setImportBusy(false);
      if (importRef.current) importRef.current.value = "";
    }
  };

  const downloadTemplate = () => { downloadMembersImportTemplate(); };

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader title="کاربران سازمان" breadcrumbs={[{ label: "داشبورد", href: "/dashboard" }, { label: "هویت و دسترسی", href: "/dashboard/identity" }, { label: "کاربران" }]} />
        <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">{MSG_NO_ACCESS}</div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex min-h-0 flex-col gap-3">
        <PageHeader
          title="کاربران سازمان"
          description="اعضای سازمان را جستجو کنید، وضعیتشان را تغییر دهید یا عضو جدید اضافه کنید"
          breadcrumbs={[{ label: "داشبورد", href: "/dashboard" }, { label: "هویت و دسترسی", href: "/dashboard/identity" }, { label: "کاربران" }]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {canCreateOp ? (
                <>
                  <input ref={importRef} type="file" accept=".xlsx,.xls,.xlsm,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImportFile(f); }} />
                  <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5" disabled={importBusy || bulkBusy} onClick={() => importRef.current?.click()}>
                    {importBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    ورود از اکسل
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={downloadTemplate}>الگوی فایل</Button>
                  <Button type="button" size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4" />افزودن کاربر
                  </Button>
                </>
              ) : null}
            </div>
          }
        />

        {isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <p className="font-medium">بارگذاری فهرست ممکن نشد</p>
            <p className="mt-1 text-xs">{error instanceof Error ? error.message : MSG_LOAD_ERROR}</p>
            <Button variant="outline" size="sm" className="mt-3 h-8" onClick={() => void refetch()}>تلاش مجدد</Button>
          </div>
        ) : null}

        {(isGroupObserver || isBranchScopedOnly) && (
          <div className="space-y-2">
            {isGroupObserver ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
                دسترسی شما در این بخش فقط مشاهده است؛ ایجاد یا ویرایش عضو مجاز نیست.
              </div>
            ) : null}
            {isBranchScopedOnly ? (
              <div className="rounded-lg border border-sky-200 bg-sky-50/80 px-3 py-2 text-xs text-sky-900">
                مدیریت شما محدود به اعضای شعبهٔ مجاز است؛ اعضای سایر شعب یا شرکت‌ها در این فهرست دیده نمی‌شوند.
              </div>
            ) : null}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className={cn("h-8 ps-8 text-sm", query && "pe-8")} placeholder="نام، ایمیل یا موبایل…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
            {query ? (
              <button type="button" className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="پاک کردن جستجو" onClick={() => { setQuery(""); setPage(1); }}>
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <Select value={membershipFilter} onValueChange={(v) => setMembershipFilter(v as MembershipListFilter)}>
            <SelectTrigger className="h-8 w-[9.5rem]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">کاربران جاری</SelectItem>
              <SelectItem value="deleted">کاربران حذف‌شده</SelectItem>
            </SelectContent>
          </Select>
          <MembersCompanyFilter value={companyFilter} onChange={(v) => { setCompanyFilter(v); setPage(1); }} />
          {!isDeletedView ? (
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); setPage(1); }}>
              <SelectTrigger className="h-8 w-[8.5rem]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                <SelectItem value="active">فعال</SelectItem>
                <SelectItem value="inactive">غیرفعال</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5"><Columns3 className="h-3.5 w-3.5" />ستون‌ها</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>نمایش ستون‌ها</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COLS.map((c) => (
                <DropdownMenuItem key={c.id} onSelect={(e) => e.preventDefault()} className="gap-2" onClick={() => setVisible((v) => ({ ...v, [c.id]: !v[c.id] }))}>
                  <Checkbox checked={visible[c.id]} />
                  {c.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" disabled={!total}><Download className="h-3.5 w-3.5" />{exportLabel}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportMembersExcel(exportTarget)}><FileSpreadsheet className="me-2 h-3.5 w-3.5" />اکسل</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportMembersPdf(exportTarget)}><FileText className="me-2 h-3.5 w-3.5" />PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {isFetching && !isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
        </div>

        {selected.size > 0 && !bulkBusy ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <span className="text-muted-foreground">{toFaDigits(selected.size)} انتخاب‌شده</span>
            {canUpdateOp && !isDeletedView ? (
              <>
                <Button size="sm" variant="outline" className="h-7" onClick={() => setConfirm({ kind: "activate", count: selected.size, targets: selectedRowsOrdered })}>فعال‌سازی</Button>
                <Button size="sm" variant="outline" className="h-7" onClick={() => setConfirm({ kind: "deactivate", count: selected.size, targets: selectedRowsOrdered })}>غیرفعال</Button>
              </>
            ) : null}
            {canDeleteOp && !isDeletedView ? (
              <Button size="sm" variant="destructive" className="h-7" onClick={() => setConfirm({ kind: "delete", count: selected.size, targets: selectedRowsOrdered })}>حذف</Button>
            ) : null}
            {canRestoreOp && isDeletedView ? (
              <Button size="sm" variant="outline" className="h-7" onClick={() => setConfirm({ kind: "restore", count: selected.size, targets: selectedRowsOrdered })}>بازگردانی</Button>
            ) : null}
            <Button size="sm" variant="ghost" className="h-7" onClick={() => setSelected(new Set())}>لغو انتخاب</Button>
          </div>
        ) : null}

        {bulkBusy ? (
          <div className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>در حال انجام… {toFaDigits(bulkProgress.done)} / {toFaDigits(bulkProgress.total)}</span>
            <Button size="sm" variant="outline" className="h-7 ms-auto" onClick={() => { cancelRef.current = true; }}>توقف</Button>
          </div>
        ) : null}

        {isLoading ? (
          <div className="space-y-2 rounded-xl border p-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : total === 0 ? (
          <EmptyState
            icon={Users}
            title={isFiltered ? "نتیجه‌ای یافت نشد" : isDeletedView ? "کاربر حذف‌شده‌ای نیست" : "هنوز عضوی ثبت نشده"}
            description={isFiltered ? "فیلتر یا جستجو را تغییر دهید." : canCreateOp ? "اولین عضو را اضافه کنید." : undefined}
            action={canCreateOp && !isFiltered && !isDeletedView ? { label: "افزودن کاربر", onClick: () => setCreateOpen(true) } : undefined}
          />
        ) : (
          <div className="overflow-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={allPageSelected} onCheckedChange={() => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (allPageSelected) pageIds.forEach((id) => next.delete(id));
                        else pageIds.forEach((id) => next.add(id));
                        return next;
                      });
                    }} />
                  </TableHead>
                  {visible.name ? (
                    <TableHead className="cursor-pointer" onClick={() => toggleSort("name")}>
                      <span className="inline-flex items-center gap-1">نام <SortIcon k="name" /></span>
                    </TableHead>
                  ) : null}
                  {visible.email ? <TableHead>ایمیل</TableHead> : null}
                  {visible.mobile ? <TableHead>موبایل</TableHead> : null}
                  {visible.status ? <TableHead>وضعیت</TableHead> : null}
                  {visible.roles ? <TableHead>نقش</TableHead> : null}
                  {visible.scopes ? <TableHead>محدوده</TableHead> : null}
                  {visible.joined ? (
                    <TableHead className="cursor-pointer" onClick={() => toggleSort("joined")}>
                      <span className="inline-flex items-center gap-1">عضویت <SortIcon k="joined" /></span>
                    </TableHead>
                  ) : null}
                  {visible.actions ? <TableHead className="text-end">عملیات</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row) => {
                  const u = row.user;
                  const name = [u?.first_name, u?.last_name].filter(Boolean).join(" ") || "—";
                  const isSelf = Boolean(currentUserId && row.user_id === currentUserId);
                  return (
                    <TableRow key={row.tenant_user_id} className={cn(selected.has(row.tenant_user_id) && "bg-muted/40")}>
                      <TableCell>
                        <Checkbox checked={selected.has(row.tenant_user_id)} onCheckedChange={() => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(row.tenant_user_id)) next.delete(row.tenant_user_id);
                            else next.add(row.tenant_user_id);
                            return next;
                          });
                        }} />
                      </TableCell>
                      {visible.name ? (
                        <TableCell>
                          <Link href={memberDetailPath(row.tenant_user_id)} className="font-medium hover:underline">{name}</Link>
                          {isSelf ? <span className="ms-1 text-[10px] text-muted-foreground">(شما)</span> : null}
                        </TableCell>
                      ) : null}
                      {visible.email ? <TableCell className="text-xs text-muted-foreground">{u?.email || "—"}</TableCell> : null}
                      {visible.mobile ? <TableCell className="tabular-nums text-xs">{u?.mobile ? toFaDigits(u.mobile) : "—"}</TableCell> : null}
                      {visible.status ? (
                        <TableCell>
                          {isDeletedView ? <StatusChip tone="neutral">حذف‌شده</StatusChip> : Number(row.status) === 1 ? <StatusChip tone="success">فعال</StatusChip> : <StatusChip tone="warning">غیرفعال</StatusChip>}
                        </TableCell>
                      ) : null}
                      {visible.roles ? <TableCell className="max-w-[8rem] truncate text-xs">{highestRoleName(row) || "—"}</TableCell> : null}
                      {visible.scopes ? <TableCell className="max-w-[8rem] truncate text-xs">{scopeNames(row) || "—"}</TableCell> : null}
                      {visible.joined ? <TableCell className="text-xs text-muted-foreground">{row.created_at ? fdt(row.created_at) : "—"}</TableCell> : null}
                      {visible.actions ? (
                        <TableCell className="text-end">
                          <div className="inline-flex items-center gap-0.5">
                            <IconAction title="جزئیات" href={memberDetailPath(row.tenant_user_id)}><Eye className="h-3.5 w-3.5" /></IconAction>
                            {!isDeletedView && canUpdateOp && Number(row.status) === 0 ? (
                              <IconAction title="فعال‌سازی" onClick={() => void activateOne(row)}><UserCheck className="h-3.5 w-3.5" /></IconAction>
                            ) : null}
                            {!isDeletedView && canUpdateOp && Number(row.status) === 1 && !isSelf ? (
                              <IconAction title="غیرفعال" onClick={() => void deactivateOne(row)}><UserMinus className="h-3.5 w-3.5" /></IconAction>
                            ) : null}
                            {!isDeletedView && canDeleteOp && !isSelf ? (
                              <IconAction title="حذف" onClick={() => void deleteOne(row)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></IconAction>
                            ) : null}
                            {isDeletedView && canRestoreOp ? (
                              <IconAction title="بازگردانی" onClick={() => void restoreOne(row)}><RotateCcw className="h-3.5 w-3.5" /></IconAction>
                            ) : null}
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>{toFaDigits(total)} مورد · صفحه {toFaDigits(safePage)} از {toFaDigits(totalPages)}</span>
            <div className="flex items-center gap-2">
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-8 w-[4.5rem]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 20, 50].map((n) => <SelectItem key={n} value={String(n)}>{toFaDigits(n)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-8" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>قبلی</Button>
              <Button size="sm" variant="outline" className="h-8" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>بعدی</Button>
            </div>
          </div>
        ) : null}

        {confirm ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl border bg-background p-4 shadow-lg">
              <h3 className="font-medium">تأیید عملیات</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {confirm.kind === "delete" && `${toFaDigits(confirm.count)} عضو حذف نرم شوند؟`}
                {confirm.kind === "activate" && `${toFaDigits(confirm.count)} عضو فعال شوند؟`}
                {confirm.kind === "deactivate" && `${toFaDigits(confirm.count)} عضو غیرفعال شوند؟`}
                {confirm.kind === "restore" && `${toFaDigits(confirm.count)} عضو بازگردانی شوند؟`}
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setConfirm(null)}>انصراف</Button>
                <Button size="sm" variant={confirm.kind === "delete" ? "destructive" : "default"} onClick={() => void runBulk(confirm.kind, confirm.targets)}>تأیید</Button>
              </div>
            </div>
          </div>
        ) : null}

        <MemberCreateDrawer open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    </TooltipProvider>
  );
}
