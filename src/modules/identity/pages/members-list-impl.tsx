"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowDown, ArrowUp, ArrowUpDown, Columns3, Download, Eye, FileSpreadsheet, FileText,
  Loader2, Plus, RotateCcw, Search, Shield, Sparkles, Trash2, Upload, UserCheck, UserMinus, Users, X,
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
import { Can, useAuthStore, usePermission } from "@/auth";
import { cn, toFaDigits } from "@/shared/lib/utils";
import { useCreateTenantUser, useRestoreTenantUser, useSoftDeleteTenantUser, useTenantUsers, useUpdateTenantUser } from "../hooks/use-tenant-users";
import { IdentityPermissions, type TenantUserDto } from "../types";
import { MSG_LOAD_ERROR, MSG_NO_ACCESS } from "../lib/ui-copy";
import { downloadMembersImportTemplate, exportMembersExcel, exportMembersPdf, readSpreadsheetTable } from "../lib/members-export";
import type { MembershipListFilter } from "../services/tenant-user-service";
import { MemberCreateDrawer } from "../components/member-create-drawer";

type StatusFilter = "all" | "active" | "inactive";
type SortKey = "name" | "email" | "mobile" | "status" | "joined" | "lastChange";
type SortDir = "asc" | "desc";
type ColumnId = "name" | "email" | "mobile" | "status" | "joined" | "lastChange" | "actions";
type BulkKind = "activate" | "deactivate" | "delete" | "restore";
type ConfirmState = null | { kind: BulkKind; count: number; targets: TenantUserDto[] };
type ActivityKind = "new" | "activated" | "deactivated" | "removed" | "restored" | null;

const COLS: { id: ColumnId; label: string; hideable?: boolean; sort?: SortKey }[] = [
  { id: "name", label: "نام", hideable: false, sort: "name" },
  { id: "email", label: "ایمیل", sort: "email" },
  { id: "mobile", label: "موبایل", sort: "mobile" },
  { id: "status", label: "وضعیت", sort: "status" },
  { id: "joined", label: "تاریخ عضویت", sort: "joined" },
  { id: "lastChange", label: "آخرین تغییر وضعیت", sort: "lastChange" },
  { id: "actions", label: "عملیات", hideable: false },
];

const SKY = "identity.members.columns.v3";
const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_DAYS = 7;

function dn(r: TenantUserDto) {
  const u = r.user;
  if (!u) return "—";
  const n = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  return n || u.email || "—";
}

function fd(v?: string | null) {
  if (!v) return "—";
  try {
    return toFaDigits(new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(v)));
  } catch {
    return toFaDigits(v);
  }
}

function fdt(v?: string | null) {
  if (!v) return "—";
  try {
    return toFaDigits(new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(v)));
  } catch {
    return toFaDigits(v);
  }
}

function lastChangeAt(r: TenantUserDto): string | null {
  if (r.deleted_at) return r.deleted_at;
  return r.updated_at ?? r.created_at ?? null;
}

function isRecent(iso?: string | null, days = RECENT_DAYS): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= days * DAY_MS;
}

function activityOf(r: TenantUserDto, deletedView: boolean): ActivityKind {
  const createdMs = r.created_at ? new Date(r.created_at).getTime() : NaN;
  const updatedMs = r.updated_at ? new Date(r.updated_at).getTime() : NaN;
  const statusChanged = Number.isFinite(createdMs) && Number.isFinite(updatedMs) && updatedMs - createdMs > 90_000;
  if (deletedView && r.deleted_at && isRecent(r.deleted_at, 7)) return "removed";
  if (!deletedView && r.updated_at && isRecent(r.updated_at, 7) && statusChanged) {
    if (Number(r.status) === 1) return "activated";
    if (Number(r.status) === 0) return "deactivated";
  }
  if (!deletedView && r.created_at && isRecent(r.created_at, 3) && !statusChanged) return "new";
  return null;
}

const ACTIVITY_LABEL: Record<Exclude<ActivityKind, null>, string> = {
  new: "عضو جدید (حداکثر ۳ روز از عضویت، بدون تغییر وضعیت بعدی)",
  activated: "اخیراً فعال شده (۷ روز اخیر)",
  deactivated: "اخیراً غیرفعال شده (۷ روز اخیر)",
  removed: "اخیراً از سازمان حذف شده (۷ روز اخیر)",
  restored: "اخیراً بازگردانی شده",
};

const ACTIVITY_CLASS: Record<Exclude<ActivityKind, null>, string> = {
  new: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  activated: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  deactivated: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  removed: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  restored: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
};

function ActivityBadge({ kind }: { kind: Exclude<ActivityKind, null> }) {
  const Icon = kind === "new" ? Sparkles : kind === "activated" ? UserCheck : kind === "deactivated" ? UserMinus : kind === "removed" ? Trash2 : RotateCcw;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full", ACTIVITY_CLASS[kind])} aria-label={ACTIVITY_LABEL[kind]}>
          <Icon className="h-3 w-3" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[16rem] text-xs">{ACTIVITY_LABEL[kind]}</TooltipContent>
    </Tooltip>
  );
}

function sv(r: TenantUserDto, k: SortKey): string | number {
  if (k === "name") return dn(r).toLowerCase();
  if (k === "email") return (r.user?.email ?? "").toLowerCase();
  if (k === "mobile") return r.user?.mobile ?? "";
  if (k === "status") return Number(r.status) === 1 ? 1 : 0;
  if (k === "lastChange") {
    const v = lastChangeAt(r);
    return v ? new Date(v).getTime() : 0;
  }
  return r.created_at ? new Date(r.created_at).getTime() : 0;
}

const BULK_SUCCESS: Record<BulkKind, (n: number) => string> = {
  activate: (n) => `${toFaDigits(n)} کاربر فعال شد`,
  deactivate: (n) => `${toFaDigits(n)} کاربر غیرفعال شد`,
  delete: (n) => `${toFaDigits(n)} کاربر به فهرست حذف‌شده‌ها منتقل شد`,
  restore: (n) => `${toFaDigits(n)} کاربر به فهرست سازمان برگشت؛ برای ورود به سامانه وضعیتشان را فعال کنید`,
};

const RESTORE_ONE_MSG = "کاربر به فهرست سازمان برگشت؛ برای ورود به سامانه وضعیتش را فعال کنید.";

type ImportRow = { first_name: string; last_name: string; email: string; mobile?: string; password: string };

function normalizeHeader(h: string) {
  return h.replace(/\s+/g, "").toLowerCase();
}

function mapImportRows(table: string[][]): ImportRow[] {
  if (table.length < 2) return [];
  const headers = table[0].map(normalizeHeader);
  const idx = (names: string[]) => headers.findIndex((h) => names.some((n) => h.includes(n)));
  const iFirst = idx(["firstname", "first_name", "نام", "name"]);
  const iLast = idx(["lastname", "last_name", "نام‌خانوادگی", "نامخانوادگی", "family"]);
  const iEmail = idx(["email", "ایمیل", "پست"]);
  const iMobile = idx(["mobile", "phone", "موبایل", "تلفن"]);
  const iPass = idx(["password", "رمز", "password"]);
  const out: ImportRow[] = [];
  for (let r = 1; r < table.length; r++) {
    const row = table[r];
    const email = (iEmail >= 0 ? row[iEmail] : row[2] ?? "").trim();
    const first = (iFirst >= 0 ? row[iFirst] : row[0] ?? "").trim() || "کاربر";
    let last = (iLast >= 0 ? row[iLast] : row[1] ?? "").trim();
    if (!last && iFirst < 0 && row[0]) {
      const parts = String(row[0]).trim().split(/\s+/);
      if (parts.length > 1) last = parts.slice(1).join(" ");
    }
    if (!last) last = "سازمان";
    if (!email || !email.includes("@")) continue;
    let mobile = (iMobile >= 0 ? row[iMobile] : "").trim() || undefined;
    if (mobile) {
      mobile = mobile
        .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
        .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
        .replace(/[^0-9+]/g, "");
      if (!mobile) mobile = undefined;
    }
    const emailNorm = email.toLowerCase().replace(/\s+/g, "");
    const passwordRaw = (iPass >= 0 ? row[iPass] : "").trim();
    const password = passwordRaw.length >= 8 ? passwordRaw : `Im${Math.random().toString(36).slice(2, 8)}Aa1!`;
    out.push({ first_name: first, last_name: last, email: emailNorm, mobile, password });
  }
  return out;
}

function IconAction({ label, onClick, disabled, variant = "ghost", className, children }: {
  label: string; onClick: () => void; disabled?: boolean; variant?: "ghost" | "destructive"; className?: string; children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className={cn("h-7 w-7 shrink-0", variant === "destructive" && "text-destructive hover:bg-destructive/10 hover:text-destructive", className)} disabled={disabled} onClick={(e) => { e.stopPropagation(); onClick(); }} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export function MembersListPage() {
  const canView = usePermission(IdentityPermissions.userView);
  const canCreate = usePermission(IdentityPermissions.userCreate);
  const canUpdate = usePermission(IdentityPermissions.userUpdate);
  const canDelete = usePermission(IdentityPermissions.userDelete);
  const canRestore = usePermission(IdentityPermissions.userRestore);
  const currentUserId = useAuthStore((s) => s.user?.user_id);

  const [membershipFilter, setMembershipFilter] = useState<MembershipListFilter>("active");
  const { data, isLoading, isError, error, refetch, isFetching } = useTenantUsers(membershipFilter);
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
  useEffect(() => { setSelected(new Set()); setPage(1); }, [membershipFilter]);

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
      toast.success("کاربر فعال شد و می‌تواند وارد سامانه شود.");
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
        toast.error("ردیف معتبری پیدا نشد. ستون‌های لازم: نام، نام خانوادگی، ایمیل — موبایل اختیاری است.");
        return;
      }
      toast.message(`ورود اکسل: ${toFaDigits(mapped.length)} ردیف آماده`);
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
          description="جستجو، مرتب‌سازی و مدیریت کاربران سازمان — حذف نرم است و قابل بازگردانی"
          breadcrumbs={[{ label: "داشبورد", href: "/dashboard" }, { label: "هویت و دسترسی", href: "/dashboard/identity" }, { label: "کاربران" }]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {canCreate ? (
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
            <p className="font-medium">دریافت فهرست ممکن نشد</p>
            <p className="mt-1 text-xs">{error instanceof Error ? error.message : MSG_LOAD_ERROR}</p>
            <Button variant="outline" size="sm" className="mt-3 h-8" onClick={() => void refetch()}>تلاش مجدد</Button>
          </div>
        ) : null}

        <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          فهرست کامل در حال همگام‌سازی از مخزن تمیز است. اگر جدول کامل را نمی‌بینید، یک‌بار pull کنید.
        </div>

        <MemberCreateDrawer open={createOpen} onOpenChange={setCreateOpen} onCreated={() => void refetch()} />
      </div>
    </TooltipProvider>
  );
}
