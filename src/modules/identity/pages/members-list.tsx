/**
 * FE-P1-T06 — فهرست کاربران سازمان
 * جدول عملیاتی: ستون پویا، سورت، انتخاب گروهی، خروجی، tooltip
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Columns3,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  Search,
  Trash2,
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
import { ApiClientError } from "@/api";
import { cn, toFaDigits } from "@/shared/lib/utils";
import {
  useSoftDeleteTenantUser,
  useTenantUsers,
  useUpdateTenantUser,
} from "../hooks/use-tenant-users";
import { IdentityPermissions, type TenantUserDto } from "../types";
import { MSG_GENERIC_ERROR, MSG_LOAD_ERROR, MSG_NO_ACCESS } from "../lib/ui-copy";

type StatusFilter = "all" | "active" | "inactive";
type SortKey = "name" | "email" | "mobile" | "status" | "joined" | "owner";
type SortDir = "asc" | "desc";

type ColumnId =
  | "name"
  | "email"
  | "mobile"
  | "status"
  | "owner"
  | "joined"
  | "actions";

const COLUMN_DEFS: {
  id: ColumnId;
  label: string;
  defaultVisible: boolean;
  sortable?: SortKey;
  hideable?: boolean;
}[] = [
  { id: "name", label: "نام", defaultVisible: true, sortable: "name", hideable: false },
  { id: "email", label: "ایمیل", defaultVisible: true, sortable: "email" },
  { id: "mobile", label: "موبایل", defaultVisible: true, sortable: "mobile" },
  { id: "status", label: "وضعیت", defaultVisible: true, sortable: "status" },
  { id: "owner", label: "مدیر اصلی", defaultVisible: false, sortable: "owner" },
  { id: "joined", label: "تاریخ عضویت", defaultVisible: true, sortable: "joined" },
  { id: "actions", label: "عملیات", defaultVisible: true, hideable: false },
];

const STORAGE_KEY = "identity.members.columns.v1";
const PAGE_SIZES = [10, 20, 50, 100];

function memberDisplayName(row: TenantUserDto): string {
  const u = row.user;
  if (!u) return "—";
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  return name || u.email || "—";
}

function memberInitials(row: TenantUserDto): string {
  const u = row.user;
  if (!u) return "؟";
  const a = (u.first_name ?? "").trim().charAt(0);
  const b = (u.last_name ?? "").trim().charAt(0);
  const s = `${a}${b}`.trim();
  if (s) return s;
  return (u.email ?? "؟").charAt(0).toUpperCase();
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  try {
    return toFaDigits(
      new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(value))
    );
  } catch {
    return toFaDigits(value);
  }
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  try {
    return toFaDigits(
      new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    );
  } catch {
    return toFaDigits(value);
  }
}

function loadVisibleColumns(): Record<ColumnId, boolean> {
  const base = Object.fromEntries(
    COLUMN_DEFS.map((c) => [c.id, c.defaultVisible])
  ) as Record<ColumnId, boolean>;
  if (typeof window === "undefined") return base;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<Record<ColumnId, boolean>>;
    for (const c of COLUMN_DEFS) {
      if (c.hideable === false) base[c.id] = true;
      else if (typeof parsed[c.id] === "boolean") base[c.id] = parsed[c.id]!;
    }
    return base;
  } catch {
    return base;
  }
}

function sortValue(row: TenantUserDto, key: SortKey): string | number {
  switch (key) {
    case "name":
      return memberDisplayName(row).toLowerCase();
    case "email":
      return (row.user?.email ?? "").toLowerCase();
    case "mobile":
      return row.user?.mobile ?? "";
    case "status":
      return Number(row.status) === 1 ? 1 : 0;
    case "owner":
      return row.is_owner ? 1 : 0;
    case "joined":
      return row.created_at ? new Date(row.created_at).getTime() : 0;
    default:
      return "";
  }
}

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCsv(rows: TenantUserDto[]) {
  const header = ["نام", "ایمیل", "موبایل", "وضعیت", "مدیر اصلی", "تاریخ عضویت"];
  const lines = rows.map((r) =>
    [
      memberDisplayName(r),
      r.user?.email ?? "",
      r.user?.mobile ?? "",
      Number(r.status) === 1 ? "فعال" : "غیرفعال",
      r.is_owner ? "بله" : "خیر",
      formatDate(r.created_at),
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = "\uFEFF" + [header.join(","), ...lines].join("\n");
  downloadBlob(
    `karbaran-sazman-${new Date().toISOString().slice(0, 10)}.csv`,
    csv,
    "text/csv;charset=utf-8"
  );
}

function exportPdfPrint(rows: TenantUserDto[]) {
  const body = rows
    .map(
      (r) => `
      <tr>
        <td>${memberDisplayName(r)}</td>
        <td dir="ltr">${r.user?.email ?? "—"}</td>
        <td>${r.user?.mobile ? toFaDigits(r.user.mobile) : "—"}</td>
        <td>${Number(r.status) === 1 ? "فعال" : "غیرفعال"}</td>
        <td>${r.is_owner ? "بله" : "خیر"}</td>
        <td>${formatDate(r.created_at)}</td>
      </tr>`
    )
    .join("");
  const html = `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/>
    <title>فهرست کاربران سازمان</title>
    <style>
      body{font-family:Tahoma,Arial,sans-serif;padding:24px;color:#111}
      h1{font-size:18px;margin:0 0 8px}
      p{font-size:12px;color:#555;margin:0 0 16px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #ddd;padding:8px;text-align:right}
      th{background:#f5f5f5}
    </style></head><body>
    <h1>فهرست کاربران سازمان</h1>
    <p>تاریخ تهیه: ${formatDateTime(new Date().toISOString())} · تعداد: ${toFaDigits(rows.length)}</p>
    <table><thead><tr>
      <th>نام</th><th>ایمیل</th><th>موبایل</th><th>وضعیت</th><th>مدیر اصلی</th><th>عضویت</th>
    </tr></thead><tbody>${body}</tbody></table>
    <script>window.onload=()=>{window.print();}</script>
    </body></html>`;
  const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!w) {
    toast.error("برای خروجی، باز شدن پنجره جدید را اجازه دهید.");
    return;
  }
  w.document.write(html);
  w.document.close();
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
  return dir === "asc" ? (
    <ArrowUp className="h-3 w-3 text-primary" />
  ) : (
    <ArrowDown className="h-3 w-3 text-primary" />
  );
}

export function MembersListPage() {
  const canView = usePermission(IdentityPermissions.userView);
  const canUpdate = usePermission(IdentityPermissions.userUpdate);
  const canDelete = usePermission(IdentityPermissions.userDelete);
  const currentUserId = useAuthStore((s) => s.user?.user_id);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useTenantUsers();
  const updateMutation = useUpdateTenantUser();
  const deleteMutation = useSoftDeleteTenantUser();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [visible, setVisible] = useState<Record<ColumnId, boolean>>(() =>
    loadVisibleColumns()
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visible));
    } catch {
      /* ignore */
    }
  }, [visible]);

  const rows = data ?? [];

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows.filter((row) => {
      const status = Number(row.status);
      if (statusFilter === "active" && status !== 1) return false;
      if (statusFilter === "inactive" && status !== 0) return false;
      if (!q) return true;
      const u = row.user;
      const hay = [u?.first_name, u?.last_name, u?.email, u?.mobile]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });

    list = [...list].sort((a, b) => {
      const va = sortValue(a, sortKey);
      const vb = sortValue(b, sortKey);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [rows, query, statusFilter, sortKey, sortDir]);

  const total = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredSorted.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const isFiltered = query.trim().length > 0 || statusFilter !== "all";
  const pageIds = pageRows.map((r) => r.tenant_user_id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id));

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleColumn = (id: ColumnId) => {
    const def = COLUMN_DEFS.find((c) => c.id === id);
    if (def?.hideable === false) return;
    setVisible((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleRow = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAllPage = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of pageIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const selectedRows = useMemo(
    () => rows.filter((r) => selected.has(r.tenant_user_id)),
    [rows, selected]
  );

  const exportTarget = selectedRows.length > 0 ? selectedRows : filteredSorted;

  const onBulkDeactivate = async () => {
    if (!canUpdate) return;
    const targets = selectedRows.filter(
      (r) =>
        Number(r.status) === 1 &&
        !(currentUserId && r.user_id === currentUserId)
    );
    if (targets.length === 0) {
      toast.error("مورد قابل غیرفعال‌سازی در انتخاب‌ها نیست.");
      return;
    }
    if (
      !window.confirm(
        `${toFaDigits(targets.length)} کاربر غیرفعال شوند؟`
      )
    )
      return;
    setBulkBusy(true);
    let ok = 0;
    let fail = 0;
    for (const r of targets) {
      try {
        await updateMutation.mutateAsync({
          tenantUserId: r.tenant_user_id,
          payload: { status: 0 },
        });
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    setBulkBusy(false);
    clearSelection();
    if (ok) toast.success(`${toFaDigits(ok)} کاربر غیرفعال شد`);
    if (fail) toast.error(`${toFaDigits(fail)} مورد انجام نشد`);
  };

  const onBulkDelete = async () => {
    if (!canDelete) return;
    const targets = selectedRows.filter(
      (r) => !(currentUserId && r.user_id === currentUserId)
    );
    if (targets.length === 0) {
      toast.error("مورد قابل حذف در انتخاب‌ها نیست.");
      return;
    }
    if (
      !window.confirm(
        `${toFaDigits(targets.length)} کاربر از سازمان حذف شوند؟ این کار قابل برگشت از این فهرست نیست.`
      )
    )
      return;
    setBulkBusy(true);
    let ok = 0;
    let fail = 0;
    for (const r of targets) {
      try {
        await deleteMutation.mutateAsync(r.tenant_user_id);
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    setBulkBusy(false);
    clearSelection();
    if (ok) toast.success(`${toFaDigits(ok)} کاربر حذف شد`);
    if (fail) toast.error(`${toFaDigits(fail)} مورد انجام نشد`);
  };

  const show = useCallback(
    (id: ColumnId) => Boolean(visible[id]),
    [visible]
  );

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="کاربران سازمان"
          description="مدیریت اعضای سازمان"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "کاربران" },
          ]}
        />
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
          {MSG_NO_ACCESS}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={250}>
      <div className="space-y-5">
        <PageHeader
          title="کاربران سازمان"
          description="جستجو، مرتب‌سازی و مدیریت اعضای سازمان"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "کاربران" },
          ]}
          actions={
            <Can permission={IdentityPermissions.userCreate}>
              <Button size="sm" asChild>
                <Link href="/dashboard/identity/members/new">
                  <Plus className="h-4 w-4" />
                  افزودن کاربر
                </Link>
              </Button>
            </Can>
          }
        />

        {isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <p className="font-medium">دریافت فهرست کاربران ممکن نشد</p>
            <p className="mt-1 text-xs opacity-90">
              {error instanceof Error ? error.message : MSG_LOAD_ERROR}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 h-8"
              onClick={() => void refetch()}
            >
              تلاش مجدد
            </Button>
          </div>
        ) : null}

        {/* نوار ابزار */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 ps-8 text-sm"
              placeholder="جستجو نام، ایمیل یا موبایل…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              aria-label="جستجوی کاربران"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as StatusFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-[8.5rem]" aria-label="فیلتر وضعیت">
              <SelectValue placeholder="وضعیت" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              <SelectItem value="active">فعال</SelectItem>
              <SelectItem value="inactive">غیرفعال</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5">
                <Columns3 className="h-3.5 w-3.5" />
                ستون‌ها
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>نمایش ستون‌ها</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COLUMN_DEFS.filter((c) => c.hideable !== false).map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  className="gap-2"
                  onSelect={(e) => {
                    e.preventDefault();
                    toggleColumn(c.id);
                  }}
                >
                  <Checkbox checked={visible[c.id]} className="pointer-events-none" />
                  <span>{c.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5">
                <Download className="h-3.5 w-3.5" />
                خروجی
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {selected.size > 0
                  ? `خروجی از ${toFaDigits(selected.size)} انتخاب‌شده`
                  : `خروجی از ${toFaDigits(total)} مورد فیلترشده`}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2"
                onSelect={() => {
                  exportCsv(exportTarget);
                  toast.success("فایل اکسل (CSV) آماده شد");
                }}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                اکسل (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2"
                onSelect={() => {
                  exportPdfPrint(exportTarget);
                }}
              >
                <FileText className="h-3.5 w-3.5" />
                PDF / چاپ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="ms-auto hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <Users className="h-3.5 w-3.5" />
            <span className="tabular-nums">{toFaDigits(total)} نفر</span>
            {isFetching && !isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin opacity-60" />
            ) : null}
          </div>
        </div>

        {/* نوار عملیات گروهی */}
        {selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/25 bg-primary/[0.06] px-3 py-2 text-sm shadow-[var(--shadow-xs)]">
            <span className="font-medium tabular-nums">
              {toFaDigits(selected.size)} مورد انتخاب شده
            </span>
            <div className="h-4 w-px bg-border" />
            {canUpdate ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                disabled={bulkBusy}
                onClick={() => void onBulkDeactivate()}
              >
                <UserMinus className="h-3.5 w-3.5" />
                غیرفعال‌سازی
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-destructive hover:text-destructive"
                disabled={bulkBusy}
                onClick={() => void onBulkDelete()}
              >
                <Trash2 className="h-3.5 w-3.5" />
                حذف از سازمان
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => {
                exportCsv(selectedRows);
                toast.success("خروجی انتخاب‌شده‌ها آماده شد");
              }}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              اکسل
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 ms-auto gap-1"
              onClick={clearSelection}
            >
              <X className="h-3.5 w-3.5" />
              لغو انتخاب
            </Button>
          </div>
        ) : null}

        {/* جدول */}
        {isLoading ? (
          <div className="space-y-2 rounded-lg border border-border/60 p-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : pageRows.length === 0 ? (
          <EmptyState
            icon={Search}
            title={
              isFiltered ? "نتیجه‌ای پیدا نشد" : "هنوز کاربری ثبت نشده"
            }
            description={
              isFiltered
                ? "عبارت جستجو یا فیلتر وضعیت را تغییر دهید."
                : "اولین کاربر سازمان را اضافه کنید تا در این فهرست دیده شود."
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-[var(--shadow-xs)]">
            <div className="max-h-[min(68vh,42rem)] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10 pe-0">
                      <Checkbox
                        checked={
                          allPageSelected
                            ? true
                            : somePageSelected
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={(v) => toggleAllPage(Boolean(v))}
                        aria-label="انتخاب همه در این صفحه"
                      />
                    </TableHead>
                    {COLUMN_DEFS.filter((c) => show(c.id)).map((c) => (
                      <TableHead
                        key={c.id}
                        className={cn(
                          c.id === "actions" && "w-[6.5rem]",
                          c.sortable && "cursor-pointer select-none"
                        )}
                        onClick={
                          c.sortable
                            ? () => toggleSort(c.sortable!)
                            : undefined
                        }
                      >
                        <span className="inline-flex items-center gap-1">
                          {c.label}
                          {c.sortable ? (
                            <SortIcon
                              active={sortKey === c.sortable}
                              dir={sortDir}
                            />
                          ) : null}
                        </span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((row) => {
                    const isSelf =
                      Boolean(currentUserId) &&
                      row.user_id === currentUserId;
                    const active = Number(row.status) === 1;
                    const name = memberDisplayName(row);
                    return (
                      <TableRow
                        key={row.tenant_user_id}
                        data-state={
                          selected.has(row.tenant_user_id)
                            ? "selected"
                            : undefined
                        }
                        className={cn(
                          "group transition-colors",
                          "hover:bg-primary/[0.04]",
                          selected.has(row.tenant_user_id) &&
                            "bg-primary/[0.06]"
                        )}
                      >
                        <TableCell className="w-10 pe-0">
                          <Checkbox
                            checked={selected.has(row.tenant_user_id)}
                            onCheckedChange={(v) =>
                              toggleRow(row.tenant_user_id, Boolean(v))
                            }
                            aria-label={`انتخاب ${name}`}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>

                        {show("name") ? (
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <div
                                    className={cn(
                                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                                      active
                                        ? "bg-primary/12 text-primary"
                                        : "bg-muted text-muted-foreground"
                                    )}
                                  >
                                    {memberInitials(row)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="truncate font-medium leading-tight">
                                      {name}
                                    </div>
                                    {row.is_owner ? (
                                      <div className="mt-0.5 text-[11px] text-primary">
                                        مدیر اصلی سازمان
                                      </div>
                                    ) : (
                                      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                        {row.user?.email ?? "عضو سازمان"}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <div className="space-y-0.5 text-xs">
                                  <div>{name}</div>
                                  {row.user?.email ? (
                                    <div dir="ltr">{row.user.email}</div>
                                  ) : null}
                                  {row.user?.mobile ? (
                                    <div>{toFaDigits(row.user.mobile)}</div>
                                  ) : null}
                                  <div>
                                    عضویت: {formatDateTime(row.created_at)}
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        ) : null}

                        {show("email") ? (
                          <TableCell>
                            <span
                              className="block max-w-[12rem] truncate text-sm"
                              dir="ltr"
                              title={row.user?.email ?? undefined}
                            >
                              {row.user?.email ?? "—"}
                            </span>
                          </TableCell>
                        ) : null}

                        {show("mobile") ? (
                          <TableCell>
                            <span className="tabular-nums text-sm">
                              {row.user?.mobile
                                ? toFaDigits(row.user.mobile)
                                : "—"}
                            </span>
                          </TableCell>
                        ) : null}

                        {show("status") ? (
                          <TableCell>
                            {active ? (
                              <StatusChip label="فعال" tone="success" />
                            ) : (
                              <StatusChip label="غیرفعال" tone="neutral" />
                            )}
                          </TableCell>
                        ) : null}

                        {show("owner") ? (
                          <TableCell>
                            {row.is_owner ? (
                              <StatusChip label="بله" tone="primary" />
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                خیر
                              </span>
                            )}
                          </TableCell>
                        ) : null}

                        {show("joined") ? (
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-default tabular-nums text-xs text-muted-foreground">
                                  {formatDate(row.created_at)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {formatDateTime(row.created_at)}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        ) : null}

                        {show("actions") ? (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 opacity-80 transition group-hover:opacity-100"
                              asChild
                            >
                              <Link
                                href={`/dashboard/identity/members/${row.tenant_user_id}`}
                              >
                                جزئیات
                              </Link>
                            </Button>
                            {isSelf ? (
                              <span className="sr-only">حساب جاری شما</span>
                            ) : null}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-3 py-2.5 text-xs text-muted-foreground">
              <span className="tabular-nums">
                صفحه {toFaDigits(safePage)} از {toFaDigits(totalPages)} ·{" "}
                {toFaDigits(total)} مورد
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="whitespace-nowrap">در هر صفحه</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      setPageSize(Number(v));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[4.5rem]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZES.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {toFaDigits(n)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  قبل
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  بعد
                </Button>
              </div>
            </div>
          </div>
        )}

        {bulkBusy ? (
          <div className="fixed bottom-4 start-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm shadow-[var(--shadow-md)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            در حال انجام عملیات گروهی…
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
