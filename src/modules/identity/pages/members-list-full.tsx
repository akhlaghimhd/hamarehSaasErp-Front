"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Columns3,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  UserMinus,
  Users,
  X,
} from "lucide-react";
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
import { Can, useAuthStore, usePermission } from "@/auth";
import { cn, toFaDigits } from "@/shared/lib/utils";
import {
  useCreateTenantUser,
  useRestoreTenantUser,
  useSoftDeleteTenantUser,
  useTenantUsers,
  useUpdateTenantUser,
} from "../hooks/use-tenant-users";
import { IdentityPermissions, type TenantUserDto } from "../types";
import { MSG_LOAD_ERROR, MSG_NO_ACCESS } from "../lib/ui-copy";
import { exportMembersExcel, exportMembersPdf } from "../lib/members-export";
import type { MembershipListFilter } from "../services/tenant-user-service";

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
  const statusChanged =
    Number.isFinite(createdMs) && Number.isFinite(updatedMs) && updatedMs - createdMs > 90_000;

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
  const Icon =
    kind === "new" ? Sparkles : kind === "activated" ? UserCheck : kind === "deactivated" ? UserMinus : kind === "removed" ? Trash2 : RotateCcw;
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

function parseDelimited(text: string): string[][] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const delim = lines[0].includes("\t") ? "\t" : lines[0].includes(";") ? ";" : ",";
  return lines.map((line) => {
    const cells: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = !inQ;
      } else if (ch === delim && !inQ) {
        cells.push(cur.trim());
        cur = "";
      } else cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  });
}

function normalizeHeader(h: string) {
  return h.replace(/\s+/g, "").toLowerCase();
}

type ImportRow = { first_name: string; last_name: string; email: string; mobile?: string; password: string };

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
        .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
        .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
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

function IconAction({
  label,
  onClick,
  disabled,
  variant = "ghost",
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "ghost" | "destructive";
  className?: string;
  children: ReactNode;
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
            variant === "destructive" && "text-destructive hover:bg-destructive/10 hover:text-destructive",
            className
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

  useEffect(() => {
    try {
      localStorage.setItem(SKY, JSON.stringify(visible));
    } catch {}
  }, [visible]);

  useEffect(() => {
    setSelected(new Set());
    setPage(1);
  }, [membershipFilter]);

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
      setSortDir(key === "joined" || key === "lastChange" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const runBulk = async (kind: BulkKind, targets: TenantUserDto[]) => {
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
        if (kind === "activate") await updateMutation.mutateAsync({ tenantUserId: r.tenant_user_id, payload: { status: 1 } });
        else if (kind === "deactivate") await updateMutation.mutateAsync({ tenantUserId: r.tenant_user_id, payload: { status: 0 } });
        else if (kind === "delete") await deleteMutation.mutateAsync(r.tenant_user_id);
        else await restoreMutation.mutateAsync(r.tenant_user_id);
        ok += 1;
      } catch {
        fail += 1;
      }
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فعال‌سازی ممکن نشد");
    }
  };

  const deactivateOne = async (row: TenantUserDto) => {
    if (currentUserId && row.user_id === currentUserId) {
      toast.error("نمی‌توانید خودتان را غیرفعال کنید.");
      return;
    }
    try {
      await updateMutation.mutateAsync({ tenantUserId: row.tenant_user_id, payload: { status: 0 } });
      toast.success("کاربر غیرفعال شد.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "غیرفعال‌سازی ممکن نشد");
    }
  };

  const deleteOne = async (row: TenantUserDto) => {
    if (currentUserId && row.user_id === currentUserId) {
      toast.error("نمی‌توانید خودتان را حذف کنید.");
      return;
    }
    setConfirm({ kind: "delete", count: 1, targets: [row] });
  };

  const restoreOne = async (row: TenantUserDto) => {
    try {
      await restoreMutation.mutateAsync(row.tenant_user_id);
      toast.success(RESTORE_ONE_MSG);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "بازگردانی ممکن نشد");
    }
  };

  const onImportFile = async (file: File) => {
    setImportBusy(true);
    try {
      const nameLower = file.name.toLowerCase();
      if (nameLower.endsWith(".xlsx")) {
        toast.error("فایل اکسل خام (.xlsx) پشتیبانی نمی‌شود. از «الگوی فایل» استفاده کنید یا در اکسل Save As → CSV (UTF-8) بگیرید.");
        return;
      }
      const raw = await file.text();
      if (!raw || raw.includes("\0")) {
        toast.error("محتوای فایل خوانا نیست. لطفاً خروجی CSV با رمزگذاری UTF-8 بدهید.");
        return;
      }
      const table = parseDelimited(raw);
      const mapped = mapImportRows(table);
      if (!mapped.length) {
        toast.error("ردیف معتبری پیدا نشد. ستون‌های لازم: نام، نام خانوادگی، ایمیل — موبایل اختیاری است.");
        return;
      }
      const seen = new Set<string>();
      const unique: typeof mapped = [];
      let dupInFile = 0;
      for (const row of mapped) {
        const key = row.email.toLowerCase();
        if (seen.has(key)) {
          dupInFile += 1;
          continue;
        }
        seen.add(key);
        unique.push(row);
      }
      cancelRef.current = false;
      setBulkBusy(true);
      setBulkProgress({ done: 0, total: unique.length });
      let ok = 0;
      let fail = 0;
      const failSamples: string[] = [];
      for (let i = 0; i < unique.length; i++) {
        if (cancelRef.current) break;
        const row = unique[i];
        try {
          await createMutation.mutateAsync({
            email: row.email,
            password: row.password,
            first_name: row.first_name,
            last_name: row.last_name,
            mobile: row.mobile ?? null,
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
      toast.error("خواندن فایل ممکن نشد. الگوی فایل را دانلود کنید یا CSV با UTF-8 بسازید.");
    } finally {
      setImportBusy(false);
      if (importRef.current) importRef.current.value = "";
    }
  };

  const downloadTemplate = () => {
    const csv = "\uFEFFنام,نام خانوادگی,ایمیل,موبایل\nعلی,رضایی,ali.rezaei.import@example.com,09121234567\nسارا,محمدی,sara.mohammadi.import@example.com,09129876543\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "olgu-karbaran.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.message("الگوی CSV دانلود شد. در اکسل پر کنید و همان CSV را ذخیره کنید؛ سپس «ورود از اکسل».");
  };

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
                  <input ref={importRef} type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImportFile(f); }} />
                  <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5" disabled={importBusy || bulkBusy} onClick={() => importRef.current?.click()}>
                    {importBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    ورود از اکسل
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={downloadTemplate}>الگوی فایل</Button>
                  <Button size="sm" className="h-8" asChild>
                    <Link href="/dashboard/identity/members/new"><Plus className="h-4 w-4" />افزودن کاربر</Link>
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

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className={cn("h-8 ps-8 text-sm", query && "pe-8")} placeholder="جستجو نام، ایمیل یا موبایل…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
            {query ? (
              <button type="button" className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="پاک کردن جستجو" onClick={() => { setQuery(""); setPage(1); }}>
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <Select value={membershipFilter} onValueChange={(v) => setMembershipFilter(v as MembershipListFilter)}>
            <SelectTrigger className="h-8 w-[9.5rem]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">اعضای جاری</SelectItem>
              <SelectItem value="deleted">حذف‌شده‌ها</SelectItem>
            </SelectContent>
          </Select>
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
              {COLS.filter((c) => c.hideable !== false).map((c) => (
                <DropdownMenuItem key={c.id} className="gap-2" onSelect={(e) => { e.preventDefault(); setVisible((p) => ({ ...p, [c.id]: !p[c.id] })); }}>
                  <Checkbox checked={visible[c.id]} className="pointer-events-none" />
                  <span>{c.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5"><Download className="h-3.5 w-3.5" />خروجی</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{exportLabel}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2" onSelect={() => exportMembersExcel(exportTarget)}><FileSpreadsheet className="h-3.5 w-3.5" />اکسل</DropdownMenuItem>
              <DropdownMenuItem className="gap-2" onSelect={() => exportMembersPdf(exportTarget)}><FileText className="h-3.5 w-3.5" />PDF / چاپ</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {isFetching && !isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
        </div>

        {selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            <span className="tabular-nums text-muted-foreground">{toFaDigits(selected.size)} انتخاب‌شده</span>
            <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => setSelected(new Set())}>لغو انتخاب</Button>
            {!isDeletedView && canUpdate ? (
              <>
                <Button type="button" size="sm" variant="outline" className="h-7 gap-1" disabled={bulkBusy} onClick={() => {
                  const targets = selectedRowsOrdered.filter((r) => Number(r.status) !== 1);
                  if (!targets.length) { toast.message("کاربر غیرفعالی در انتخاب نیست"); return; }
                  setConfirm({ kind: "activate", count: targets.length, targets });
                }}><UserCheck className="h-3.5 w-3.5" />فعال‌سازی گروهی</Button>
                <Button type="button" size="sm" variant="outline" className="h-7 gap-1" disabled={bulkBusy} onClick={() => {
                  const targets = selectedRowsOrdered.filter((r) => Number(r.status) === 1 && !(currentUserId && r.user_id === currentUserId));
                  if (!targets.length) { toast.message("کاربر فعالی (به‌جز خودتان) در انتخاب نیست"); return; }
                  setConfirm({ kind: "deactivate", count: targets.length, targets });
                }}><UserMinus className="h-3.5 w-3.5" />غیرفعال‌سازی گروهی</Button>
              </>
            ) : null}
            {!isDeletedView && canDelete ? (
              <Button type="button" size="sm" variant="destructive" className="h-7 gap-1" disabled={bulkBusy} onClick={() => {
                const targets = selectedRowsOrdered.filter((r) => !(currentUserId && r.user_id === currentUserId));
                if (!targets.length) { toast.error("نمی‌توانید خودتان را حذف کنید"); return; }
                setConfirm({ kind: "delete", count: targets.length, targets });
              }}><Trash2 className="h-3.5 w-3.5" />حذف گروهی</Button>
            ) : null}
            {isDeletedView && canRestore ? (
              <Button type="button" size="sm" className="h-7 gap-1" disabled={bulkBusy} onClick={() => setConfirm({ kind: "restore", count: selectedRowsOrdered.length, targets: selectedRowsOrdered })}>
                <RotateCcw className="h-3.5 w-3.5" />بازگردانی گروهی
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-xs)]">
          <div className="min-h-0 flex-1 overflow-auto" style={{ maxHeight: "min(62vh, calc(100dvh - 14.5rem))" }}>
            <Table noWrapper className="border-separate border-spacing-0">
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
                    }} aria-label="انتخاب همه این صفحه" />
                  </TableHead>
                  <TableHead className="sticky top-0 z-30 w-12 bg-card px-2 text-center text-xs">ردیف</TableHead>
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
                    <TableRow key={i}><TableCell colSpan={10} className="py-2"><Skeleton className="h-7 w-full" /></TableCell></TableRow>
                  ))
                ) : pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="p-0">
                      <EmptyState
                        icon={Users}
                        title={isFiltered ? "نتیجه‌ای یافت نشد" : isDeletedView ? "حذف‌شده‌ای نیست" : "هنوز کاربری افزوده نشده"}
                        description={isFiltered ? "عبارت جستجو یا فیلتر را تغییر دهید" : isDeletedView ? "کاربران حذف‌شده از اینجا قابل بازگردانی هستند" : "با دکمه افزودن یا ورود از اکسل شروع کنید"}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((row, idx) => {
                    const active = Number(row.status) === 1;
                    const isSelf = Boolean(currentUserId && row.user_id === currentUserId);
                    const act = activityOf(row, isDeletedView);
                    const rowNo = (safePage - 1) * pageSize + idx + 1;
                    return (
                      <TableRow key={row.tenant_user_id} data-state={selected.has(row.tenant_user_id) ? "selected" : undefined} className="h-9 transition-colors hover:bg-muted/50 data-[state=selected]:bg-primary/5">
                        <TableCell className="px-2 py-1">
                          <Checkbox checked={selected.has(row.tenant_user_id)} onCheckedChange={(v) => {
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (v) next.add(row.tenant_user_id);
                              else next.delete(row.tenant_user_id);
                              return next;
                            });
                          }} aria-label={`انتخاب ${dn(row)}`} />
                        </TableCell>
                        <TableCell className="px-2 py-1 text-center text-xs tabular-nums text-muted-foreground">{toFaDigits(rowNo)}</TableCell>
                        {visible.name !== false ? (
                          <TableCell className="max-w-[14rem] px-2 py-1">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <Tooltip>
                                <TooltipTrigger asChild><span className="truncate text-sm font-medium">{dn(row)}</span></TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <div className="space-y-0.5 text-xs">
                                    <div>{dn(row)}</div>
                                    {row.user?.email ? <div className="text-muted-foreground">{row.user.email}</div> : null}
                                    {row.user?.mobile ? <div className="tabular-nums text-muted-foreground">{toFaDigits(row.user.mobile)}</div> : null}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                              {row.is_owner ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-amber-500/15 p-0.5 text-amber-700 dark:text-amber-300"><Shield className="h-3 w-3" /></span>
                                  </TooltipTrigger>
                                  <TooltipContent>مدیر اصلی سازمان</TooltipContent>
                                </Tooltip>
                              ) : null}
                              {act ? <ActivityBadge kind={act} /> : null}
                            </div>
                          </TableCell>
                        ) : null}
                        {visible.email ? <TableCell className="max-w-[11rem] truncate px-2 py-1 text-xs text-muted-foreground">{row.user?.email ?? "—"}</TableCell> : null}
                        {visible.mobile ? <TableCell className="px-2 py-1 text-xs tabular-nums text-muted-foreground">{row.user?.mobile ? toFaDigits(row.user.mobile) : "—"}</TableCell> : null}
                        {visible.status ? <TableCell className="px-2 py-1"><StatusChip status={active ? "active" : "inactive"} label={active ? "فعال" : "غیرفعال"} /></TableCell> : null}
                        {visible.joined ? <TableCell className="px-2 py-1 text-xs tabular-nums text-muted-foreground">{fd(row.created_at)}</TableCell> : null}
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
                            {isDeletedView ? (
                              canRestore ? (
                                <IconAction label="بازگردانی به سازمان" onClick={() => void restoreOne(row)} disabled={bulkBusy}><RotateCcw className="h-3.5 w-3.5" /></IconAction>
                              ) : null
                            ) : (
                              <>
                                {canUpdate && !active ? <IconAction label="فعال‌سازی" onClick={() => void activateOne(row)} disabled={bulkBusy}><UserCheck className="h-3.5 w-3.5" /></IconAction> : null}
                                {canUpdate && active && !isSelf ? <IconAction label="غیرفعال‌سازی" onClick={() => void deactivateOne(row)} disabled={bulkBusy}><UserMinus className="h-3.5 w-3.5" /></IconAction> : null}
                                {canDelete && !isSelf ? <IconAction label="حذف از سازمان" variant="destructive" onClick={() => void deleteOne(row)} disabled={bulkBusy}><Trash2 className="h-3.5 w-3.5" /></IconAction> : null}
                              </>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
                                  <Link href={`/dashboard/identity/members/${row.tenant_user_id}`} aria-label="جزئیات" onClick={(e) => e.stopPropagation()}><Eye className="h-3.5 w-3.5" /></Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">جزئیات</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-3 py-2 text-xs">
            <div className="tabular-nums text-muted-foreground">
              {total === 0 ? "موردی نیست" : `نمایش ${toFaDigits((safePage - 1) * pageSize + 1)} تا ${toFaDigits(Math.min(safePage * pageSize, total))} از ${toFaDigits(total)}`}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-7 w-[4.5rem]"><SelectValue /></SelectTrigger>
                <SelectContent>{[10, 20, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{toFaDigits(n)}</SelectItem>)}</SelectContent>
              </Select>
              <Button type="button" variant="outline" size="sm" className="h-7" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>قبلی</Button>
              <span className="tabular-nums text-muted-foreground">{toFaDigits(safePage)} / {toFaDigits(totalPages)}</span>
              <Button type="button" variant="outline" size="sm" className="h-7" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>بعدی</Button>
            </div>
          </div>
        </div>

        {confirm ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl border bg-card p-5 shadow-lg">
              <h3 className="text-base font-semibold">
                {confirm.kind === "delete" ? "تأیید حذف از سازمان" : confirm.kind === "restore" ? "تأیید بازگردانی" : confirm.kind === "activate" ? "تأیید فعال‌سازی" : "تأیید غیرفعال‌سازی"}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {confirm.kind === "delete" ? (
                  <>قرار است <strong className="text-foreground">{toFaDigits(confirm.count)}</strong> کاربر از سازمان حذف شوند. حذف <strong>نرم</strong> است: سوابق از بین نمی‌رود و از فهرست «حذف‌شده‌ها» قابل بازگردانی است.</>
                ) : confirm.kind === "restore" ? (
                  <>{toFaDigits(confirm.count)} کاربر به فهرست سازمان برمی‌گردند. پس از بازگردانی وضعیتشان غیرفعال است؛ برای ورود به سامانه باید فعال شوند.</>
                ) : confirm.kind === "activate" ? (
                  <>{toFaDigits(confirm.count)} کاربر فعال می‌شوند و می‌توانند وارد سامانه شوند.</>
                ) : (
                  <>{toFaDigits(confirm.count)} کاربر غیرفعال می‌شوند و تا فعال‌سازی دوباره به سامانه دسترسی نخواهند داشت.</>
                )}
              </p>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" size="sm" disabled={bulkBusy} onClick={() => setConfirm(null)}>انصراف</Button>
                <Button type="button" size="sm" variant={confirm.kind === "delete" ? "destructive" : "default"} disabled={bulkBusy} onClick={() => void runBulk(confirm.kind, confirm.targets)}>
                  {confirm.kind === "delete" ? "حذف نرم" : confirm.kind === "restore" ? "بازگردانی" : confirm.kind === "activate" ? "فعال‌سازی" : "غیرفعال‌سازی"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {bulkBusy ? (
          <div className="fixed bottom-4 start-1/2 z-50 flex -translate-x-1/2 flex-wrap items-center gap-3 rounded-full border bg-card px-4 py-2 text-sm shadow-[var(--shadow-md)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="tabular-nums">در حال انجام… {toFaDigits(bulkProgress.done)} از {toFaDigits(bulkProgress.total)}</span>
            <Button type="button" variant="outline" size="sm" className="h-7" onClick={() => { cancelRef.current = true; }}>توقف</Button>
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
