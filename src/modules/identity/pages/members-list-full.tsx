"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  RotateCcw,
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
import { cn, toFaDigits } from "@/shared/lib/utils";
import {
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
type SortKey = "name" | "email" | "mobile" | "status" | "joined";
type SortDir = "asc" | "desc";
type ColumnId = "name" | "email" | "mobile" | "status" | "joined" | "actions";

type ConfirmState =
  | null
  | {
      kind: "deactivate" | "delete";
      count: number;
      targets: TenantUserDto[];
    };

const COLS: {
  id: ColumnId;
  label: string;
  hideable?: boolean;
  sort?: SortKey;
}[] = [
  { id: "name", label: "نام", hideable: false, sort: "name" },
  { id: "email", label: "ایمیل", sort: "email" },
  { id: "mobile", label: "موبایل", sort: "mobile" },
  { id: "status", label: "وضعیت", sort: "status" },
  { id: "joined", label: "تاریخ عضویت", sort: "joined" },
  { id: "actions", label: "عملیات", hideable: false },
];

const SKY = "identity.members.columns.v2";

function dn(r: TenantUserDto) {
  const u = r.user;
  if (!u) return "—";
  const n = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  return n || u.email || "—";
}

function fd(v?: string | null) {
  if (!v) return "—";
  try {
    return toFaDigits(
      new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(v))
    );
  } catch {
    return toFaDigits(v);
  }
}

function fdt(v?: string | null) {
  if (!v) return "—";
  try {
    return toFaDigits(
      new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(v))
    );
  } catch {
    return toFaDigits(v);
  }
}

function sv(r: TenantUserDto, k: SortKey): string | number {
  if (k === "name") return dn(r).toLowerCase();
  if (k === "email") return (r.user?.email ?? "").toLowerCase();
  if (k === "mobile") return r.user?.mobile ?? "";
  if (k === "status") return Number(r.status) === 1 ? 1 : 0;
  return r.created_at ? new Date(r.created_at).getTime() : 0;
}

export function MembersListPage() {
  const canView = usePermission(IdentityPermissions.userView);
  const canUpdate = usePermission(IdentityPermissions.userUpdate);
  const canDelete = usePermission(IdentityPermissions.userDelete);
  const canRestore = usePermission(IdentityPermissions.userRestore);
  const currentUserId = useAuthStore((s) => s.user?.user_id);

  const [membershipFilter, setMembershipFilter] =
    useState<MembershipListFilter>("active");
  const { data, isLoading, isError, error, refetch, isFetching } =
    useTenantUsers(membershipFilter);
  const updateMutation = useUpdateTenantUser();
  const deleteMutation = useSoftDeleteTenantUser();
  const restoreMutation = useRestoreTenantUser();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [visible, setVisible] = useState<Record<ColumnId, boolean>>(() => {
    const base = Object.fromEntries(COLS.map((c) => [c.id, true])) as Record<
      ColumnId,
      boolean
    >;
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

  useEffect(() => {
    try {
      localStorage.setItem(SKY, JSON.stringify(visible));
    } catch {
      /* ignore */
    }
  }, [visible]);

  useEffect(() => {
    setSelected(new Set());
    setPage(1);
  }, [membershipFilter]);

  const rows = data ?? [];
  const isDeletedView = membershipFilter === "deleted";

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows.filter((row) => {
      if (!isDeletedView) {
        const st = Number(row.status);
        if (statusFilter === "active" && st !== 1) return false;
        if (statusFilter === "inactive" && st !== 0) return false;
      }
      if (!q) return true;
      const u = row.user;
      return [u?.first_name, u?.last_name, u?.email, u?.mobile]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
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
  const pageRows = filteredSorted.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );
  const isFiltered =
    query.trim().length > 0 || (!isDeletedView && statusFilter !== "all");
  const pageIds = pageRows.map((r) => r.tenant_user_id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id));
  const selectedRows = useMemo(
    () => rows.filter((r) => selected.has(r.tenant_user_id)),
    [rows, selected]
  );
  const exportTarget = selectedRows.length > 0 ? selectedRows : filteredSorted;

  const runBulk = async (kind: "deactivate" | "delete", targets: TenantUserDto[]) => {
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
        if (kind === "deactivate") {
          await updateMutation.mutateAsync({
            tenantUserId: r.tenant_user_id,
            payload: { status: 0 },
          });
        } else {
          await deleteMutation.mutateAsync(r.tenant_user_id);
        }
        ok += 1;
      } catch {
        fail += 1;
      }
      setBulkProgress({ done: i + 1, total: targets.length });
    }
    setBulkBusy(false);
    setConfirm(null);
    setSelected(new Set());
    if (cancelled) {
      toast.message(
        `عملیات متوقف شد · انجام‌شده: ${toFaDigits(ok)} · باقی‌مانده انجام نشد`
      );
    } else if (ok) {
      toast.success(
        kind === "deactivate"
          ? `${toFaDigits(ok)} کاربر غیرفعال شد`
          : `${toFaDigits(ok)} کاربر به فهرست حذف‌شده‌ها منتقل شد`
      );
    }
    if (fail) toast.error(`${toFaDigits(fail)} مورد انجام نشد`);
  };

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="کاربران سازمان"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "کاربران" },
          ]}
        />
        <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
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
          description="جستجو، مرتب‌سازی و مدیریت اعضای سازمان — حذف نرم است و قابل بازگردانی"
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
            <p className="font-medium">دریافت فهرست ممکن نشد</p>
            <p className="mt-1 text-xs">
              {error instanceof Error ? error.message : MSG_LOAD_ERROR}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 h-8"
              onClick={() => void refetch()}
            >
              تلاش مجدد
            </Button>
          </div>
        ) : null}

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
            />
          </div>

          <Select
            value={membershipFilter}
            onValueChange={(v) => setMembershipFilter(v as MembershipListFilter)}
          >
            <SelectTrigger className="h-9 w-[9.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">اعضای جاری</SelectItem>
              <SelectItem value="deleted">حذف‌شده‌ها</SelectItem>
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
              <SelectTrigger className="h-9 w-[8.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                <SelectItem value="active">فعال</SelectItem>
                <SelectItem value="inactive">غیرفعال</SelectItem>
              </SelectContent>
            </Select>
          ) : null}

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
              {COLS.filter((c) => c.hideable !== false).map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  className="gap-2"
                  onSelect={(e) => {
                    e.preventDefault();
                    setVisible((p) => ({ ...p, [c.id]: !p[c.id] }));
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
                  : `خروجی از ${toFaDigits(total)} مورد`}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2"
                onSelect={() => exportMembersExcel(exportTarget)}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                اکسل
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2"
                onSelect={() => exportMembersPdf(exportTarget)}
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

        {selected.size > 0 && !isDeletedView ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/25 bg-primary/[0.06] px-3 py-2 text-sm">
            <span className="font-medium tabular-nums">
              {toFaDigits(selected.size)} مورد انتخاب شده
            </span>
            {canUpdate ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                disabled={bulkBusy}
                onClick={() => {
                  const targets = selectedRows.filter(
                    (r) =>
                      Number(r.status) === 1 &&
                      !(currentUserId && r.user_id === currentUserId)
                  );
                  if (!targets.length) {
                    toast.error("مورد قابل غیرفعال‌سازی نیست.");
                    return;
                  }
                  setConfirm({ kind: "deactivate", count: targets.length, targets });
                }}
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
                className="h-8 gap-1.5 text-destructive"
                disabled={bulkBusy}
                onClick={() => {
                  const targets = selectedRows.filter(
                    (r) => !(currentUserId && r.user_id === currentUserId)
                  );
                  if (!targets.length) {
                    toast.error("مورد قابل حذف نیست.");
                    return;
                  }
                  setConfirm({ kind: "delete", count: targets.length, targets });
                }}
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
              onClick={() => exportMembersExcel(selectedRows)}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              اکسل
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 ms-auto gap-1"
              onClick={() => setSelected(new Set())}
            >
              <X className="h-3.5 w-3.5" />
              لغو انتخاب
            </Button>
          </div>
        ) : null}

        {isLoading ? (
          <div className="space-y-2 rounded-lg border p-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : pageRows.length === 0 ? (
          <EmptyState
            icon={Search}
            title={
              isDeletedView
                ? "کاربر حذف‌شده‌ای نیست"
                : isFiltered
                  ? "نتیجه‌ای پیدا نشد"
                  : "هنوز کاربری ثبت نشده"
            }
            description={
              isDeletedView
                ? "حذف از سازمان نرم است؛ پس از حذف اینجا دیده می‌شوند."
                : isFiltered
                  ? "عبارت یا فیلتر را تغییر دهید."
                  : "اولین کاربر را اضافه کنید."
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-xs)]">
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
                        onCheckedChange={(v) => {
                          const on = Boolean(v);
                          setSelected((prev) => {
                            const next = new Set(prev);
                            pageIds.forEach((id) =>
                              on ? next.add(id) : next.delete(id)
                            );
                            return next;
                          });
                        }}
                      />
                    </TableHead>
                    {COLS.filter((c) => visible[c.id]).map((c) => (
                      <TableHead
                        key={c.id}
                        className={cn(c.sort && "cursor-pointer select-none")}
                        onClick={
                          c.sort
                            ? () => {
                                if (sortKey === c.sort)
                                  setSortDir((d) =>
                                    d === "asc" ? "desc" : "asc"
                                  );
                                else {
                                  setSortKey(c.sort!);
                                  setSortDir("asc");
                                }
                              }
                            : undefined
                        }
                      >
                        <span className="inline-flex items-center gap-1">
                          {c.label}
                          {c.sort ? (
                            sortKey === c.sort ? (
                              sortDir === "asc" ? (
                                <ArrowUp className="h-3 w-3 text-primary" />
                              ) : (
                                <ArrowDown className="h-3 w-3 text-primary" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-40" />
                            )
                          ) : null}
                        </span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((row) => {
                    const active = Number(row.status) === 1;
                    const name = dn(row);
                    return (
                      <TableRow
                        key={row.tenant_user_id}
                        data-state={
                          selected.has(row.tenant_user_id)
                            ? "selected"
                            : undefined
                        }
                        className={cn(
                          "group hover:bg-primary/[0.04]",
                          selected.has(row.tenant_user_id) && "bg-primary/[0.06]"
                        )}
                      >
                        <TableCell className="w-10 pe-0">
                          <Checkbox
                            checked={selected.has(row.tenant_user_id)}
                            onCheckedChange={(v) =>
                              setSelected((prev) => {
                                const next = new Set(prev);
                                if (v) next.add(row.tenant_user_id);
                                else next.delete(row.tenant_user_id);
                                return next;
                              })
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        {visible.name ? (
                          <TableCell>
                            <div className="min-w-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="block cursor-default truncate font-medium leading-tight">
                                    {name}
                                  </span>
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
                                    <div>عضویت: {fdt(row.created_at)}</div>
                                    {row.is_owner ? (
                                      <div>مدیر اصلی سازمان</div>
                                    ) : null}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                              {row.is_owner ? (
                                <div className="mt-0.5 text-[11px] text-primary">
                                  مدیر اصلی
                                </div>
                              ) : null}
                            </div>
                          </TableCell>
                        ) : null}
                        {visible.email ? (
                          <TableCell>
                            <span
                              className="block max-w-[12rem] truncate text-sm"
                              dir="ltr"
                            >
                              {row.user?.email ?? "—"}
                            </span>
                          </TableCell>
                        ) : null}
                        {visible.mobile ? (
                          <TableCell>
                            <span className="tabular-nums text-sm">
                              {row.user?.mobile
                                ? toFaDigits(row.user.mobile)
                                : "—"}
                            </span>
                          </TableCell>
                        ) : null}
                        {visible.status ? (
                          <TableCell>
                            {isDeletedView ? (
                              <StatusChip label="حذف‌شده" tone="neutral" />
                            ) : active ? (
                              <StatusChip label="فعال" tone="success" />
                            ) : (
                              <StatusChip label="غیرفعال" tone="neutral" />
                            )}
                          </TableCell>
                        ) : null}
                        {visible.joined ? (
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-default tabular-nums text-xs text-muted-foreground">
                                  {isDeletedView
                                    ? fd(row.deleted_at)
                                    : fd(row.created_at)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {isDeletedView
                                  ? fdt(row.deleted_at)
                                  : fdt(row.created_at)}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        ) : null}
                        {visible.actions ? (
                          <TableCell>
                            {isDeletedView ? (
                              canRestore ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 gap-1"
                                  disabled={restoreMutation.isPending}
                                  onClick={() => {
                                    void restoreMutation
                                      .mutateAsync(row.tenant_user_id)
                                      .then(() =>
                                        toast.success(
                                          "عضویت بازگردانی شد؛ برای استفاده باید دوباره فعال شود."
                                        )
                                      )
                                      .catch((e) =>
                                        toast.error(
                                          e instanceof Error
                                            ? e.message
                                            : "بازگردانی ممکن نشد"
                                        )
                                      );
                                  }}
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  بازگردانی
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  —
                                </span>
                              )
                            ) : (
                              <Button variant="ghost" size="sm" className="h-8" asChild>
                                <Link
                                  href={`/dashboard/identity/members/${row.tenant_user_id}`}
                                >
                                  جزئیات
                                </Link>
                              </Button>
                            )}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2.5 text-xs text-muted-foreground">
              <span className="tabular-nums">
                صفحه {toFaDigits(safePage)} از {toFaDigits(totalPages)} ·{" "}
                {toFaDigits(total)} مورد
              </span>
              <div className="flex items-center gap-2">
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
                    {[10, 20, 50, 100].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {toFaDigits(n)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

        {confirm ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-md rounded-xl border bg-card p-5 shadow-[var(--shadow-md)]"
            >
              <h2 className="text-base font-semibold">
                {confirm.kind === "delete"
                  ? "تأیید حذف از سازمان"
                  : "تأیید غیرفعال‌سازی"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {confirm.kind === "delete" ? (
                  <>
                    قرار است {" "}
                    <strong className="text-foreground">
                      {toFaDigits(confirm.count)}
                    </strong>{" "}
                    کاربر از سازمان حذف شوند. حذف <strong>نرم</strong> است:
                    سوابق و اثرات کارهای قبلی از بین نمی‌رود و از فهرست
                    «حذف‌شده‌ها» قابل بازگردانی است.
                  </>
                ) : (
                  <>
                    {toFaDigits(confirm.count)} کاربر غیرفعال می‌شوند و تا فعال‌سازی
                    دوباره به سامانه دسترسی نخواهند داشت.
                  </>
                )}
              </p>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={bulkBusy}
                  onClick={() => setConfirm(null)}
                >
                  انصراف
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={confirm.kind === "delete" ? "destructive" : "default"}
                  disabled={bulkBusy}
                  onClick={() => void runBulk(confirm.kind, confirm.targets)}
                >
                  {confirm.kind === "delete" ? "حذف نرم" : "غیرفعال‌سازی"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {bulkBusy ? (
          <div className="fixed bottom-4 start-1/2 z-50 flex -translate-x-1/2 flex-wrap items-center gap-3 rounded-full border bg-card px-4 py-2 text-sm shadow-[var(--shadow-md)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="tabular-nums">
              در حال انجام… {toFaDigits(bulkProgress.done)} از{" "}
              {toFaDigits(bulkProgress.total)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => {
                cancelRef.current = true;
              }}
            >
              توقف
            </Button>
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
