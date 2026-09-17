/** FE-P1-T11 — فهرست نقش‌ها با امکانات جدول کاربران + سلسله‌مراتب */

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  Loader2,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserMinus,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import { cn, toFaDigits } from "@/shared/lib/utils";
import {
  useRoles,
  useSoftDeleteRole,
  useUpdateRole,
} from "../hooks/use-roles";
import { IdentityPermissions } from "../types";
import type { RoleDto } from "../services/role-service";
import { MSG_LOAD_ERROR, MSG_NO_ACCESS } from "../lib/ui-copy";
import { RoleCreateDrawer } from "../components/role-create-drawer";

type StatusFilter = "all" | "active" | "inactive";
type SortKey = "name" | "parent" | "perms" | "status" | "created";
type SortDir = "asc" | "desc";

function parentName(r: RoleDto, byId: Map<string, RoleDto>): string {
  if (r.parent?.name) return r.parent.name;
  if (r.parent_role_id) return byId.get(r.parent_role_id)?.name ?? "—";
  return "—";
}

function permCount(r: RoleDto): number {
  return r.permissions?.length ?? 0;
}

function depthOf(r: RoleDto, byId: Map<string, RoleDto>, seen = new Set<string>()): number {
  if (!r.parent_role_id) return 0;
  if (seen.has(r.tenant_role_id)) return 0;
  seen.add(r.tenant_role_id);
  const p = byId.get(r.parent_role_id);
  if (!p) return 1;
  return 1 + depthOf(p, byId, seen);
}

export function RolesListPage() {
  const canView = usePermission(IdentityPermissions.roleView);
  const canCreate = usePermission(IdentityPermissions.roleCreate);
  const canUpdate = usePermission(IdentityPermissions.roleUpdate);
  const canDelete = usePermission(IdentityPermissions.roleDelete);

  const { data, isLoading, isError, error, refetch, isFetching } = useRoles();
  const updateMutation = useUpdateRole();
  const deleteMutation = useSoftDeleteRole();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const rows = data ?? [];
  const byId = useMemo(() => {
    const m = new Map<string, RoleDto>();
    for (const r of rows) m.set(r.tenant_role_id, r);
    return m;
  }, [rows]);

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => {
      const st = Number(r.status);
      if (statusFilter === "active" && st !== 1 && r.status !== undefined) return false;
      if (statusFilter === "inactive" && st !== 0) return false;
      if (!q) return true;
      return [r.name, r.description, r.code, parentName(r, byId)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    return [...list].sort((a, b) => {
      let va: string | number = "";
      let vb: string | number = "";
      if (sortKey === "name") {
        va = a.name.toLowerCase();
        vb = b.name.toLowerCase();
      } else if (sortKey === "parent") {
        va = parentName(a, byId).toLowerCase();
        vb = parentName(b, byId).toLowerCase();
      } else if (sortKey === "perms") {
        va = permCount(a);
        vb = permCount(b);
      } else if (sortKey === "status") {
        va = Number(a.status) === 1 || a.status === undefined ? 1 : 0;
        vb = Number(b.status) === 1 || b.status === undefined ? 1 : 0;
      } else {
        va = a.created_at ? new Date(a.created_at).getTime() : 0;
        vb = b.created_at ? new Date(b.created_at).getTime() : 0;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, query, statusFilter, sortKey, sortDir, byId]);

  const total = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredSorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const isFiltered = query.trim().length > 0 || statusFilter !== "all";
  const pageIds = pageRows.map((r) => r.tenant_role_id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id));

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "created" || key === "perms" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const activateOne = async (row: RoleDto) => {
    try {
      await updateMutation.mutateAsync({
        id: row.tenant_role_id,
        payload: { status: 1 },
      });
      toast.success("نقش فعال شد");
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : "فعال‌سازی ممکن نشد");
    }
  };

  const deactivateOne = async (row: RoleDto) => {
    try {
      await updateMutation.mutateAsync({
        id: row.tenant_role_id,
        payload: { status: 0 },
      });
      toast.success("نقش غیرفعال شد");
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : "غیرفعال‌سازی ممکن نشد");
    }
  };

  const deleteOne = async (row: RoleDto) => {
    if (!window.confirm(`نقش «${row.name}» حذف نرم شود؟`)) return;
    try {
      await deleteMutation.mutateAsync(row.tenant_role_id);
      toast.success("نقش حذف شد");
      setSelected((s) => {
        const n = new Set(s);
        n.delete(row.tenant_role_id);
        return n;
      });
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : "حذف ممکن نشد");
    }
  };

  const runBulk = async (kind: "activate" | "deactivate" | "delete") => {
    const targets = filteredSorted.filter((r) => selected.has(r.tenant_role_id));
    if (!targets.length) return;
    if (kind === "delete" && !window.confirm(`${toFaDigits(targets.length)} نقش حذف نرم شوند؟`)) return;
    setBulkBusy(true);
    let ok = 0;
    let fail = 0;
    for (const r of targets) {
      try {
        if (kind === "activate") {
          await updateMutation.mutateAsync({ id: r.tenant_role_id, payload: { status: 1 } });
        } else if (kind === "deactivate") {
          await updateMutation.mutateAsync({ id: r.tenant_role_id, payload: { status: 0 } });
        } else {
          await deleteMutation.mutateAsync(r.tenant_role_id);
        }
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    setBulkBusy(false);
    setSelected(new Set());
    if (ok) {
      toast.success(
        kind === "activate"
          ? `${toFaDigits(ok)} نقش فعال شد`
          : kind === "deactivate"
            ? `${toFaDigits(ok)} نقش غیرفعال شد`
            : `${toFaDigits(ok)} نقش حذف شد`
      );
    }
    if (fail) toast.error(`${toFaDigits(fail)} مورد انجام نشد`);
  };

  const openCreate = (parentId?: string | null) => {
    setDefaultParentId(parentId ?? null);
    setCreateOpen(true);
  };

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="نقش‌ها"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "نقش‌ها" },
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
      <div className="flex min-h-0 flex-col gap-3">
        <PageHeader
          title="نقش‌ها"
          description="تعریف نقش‌های سازمان، زیرنقش و مجوز هر نقش (مجوز والد و فرزند جداگانه)"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "نقش‌ها" },
          ]}
          actions={
            canCreate ? (
              <Button type="button" size="sm" className="h-8 gap-1.5" onClick={() => openCreate(null)}>
                <Plus className="h-4 w-4" />
                نقش جدید
              </Button>
            ) : null
          }
        />

        {isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <p className="font-medium">بارگذاری فهرست ممکن نشد</p>
            <p className="mt-1 text-xs">
              {error instanceof ApiClientError && error.message
                ? error.message
                : MSG_LOAD_ERROR}
            </p>
            <Button variant="outline" size="sm" className="mt-3 h-8" onClick={() => void refetch()}>
              تلاش مجدد
            </Button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className={cn("h-8 ps-8 text-sm", query && "pe-8")}
              placeholder="نام نقش، توضیح یا والد…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
            {query ? (
              <button
                type="button"
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="پاک کردن جستجو"
                onClick={() => {
                  setQuery("");
                  setPage(1);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as StatusFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[8.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              <SelectItem value="active">فعال</SelectItem>
              <SelectItem value="inactive">غیرفعال</SelectItem>
            </SelectContent>
          </Select>
          <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <Shield className="h-3.5 w-3.5" />
            <span>{toFaDigits(total)} نقش</span>
          </div>
          {isFetching && !isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        {selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              {toFaDigits(selected.size)} انتخاب‌شده
            </span>
            {canUpdate ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1"
                  disabled={bulkBusy}
                  onClick={() => void runBulk("activate")}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  فعال
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1"
                  disabled={bulkBusy}
                  onClick={() => void runBulk("deactivate")}
                >
                  <UserMinus className="h-3.5 w-3.5" />
                  غیرفعال
                </Button>
              </>
            ) : null}
            {canDelete ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-destructive"
                disabled={bulkBusy}
                onClick={() => void runBulk("delete")}
              >
                <Trash2 className="h-3.5 w-3.5" />
                حذف
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7"
              onClick={() => setSelected(new Set())}
            >
              لغو انتخاب
            </Button>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-border/70">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">
                  <Checkbox
                    checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                    onCheckedChange={(v) => {
                      if (v) setSelected((s) => new Set([...s, ...pageIds]));
                      else
                        setSelected((s) => {
                          const n = new Set(s);
                          pageIds.forEach((id) => n.delete(id));
                          return n;
                        });
                    }}
                    aria-label="انتخاب صفحه"
                  />
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-medium"
                    onClick={() => toggleSort("name")}
                  >
                    نام نقش
                    <SortIcon k="name" />
                  </button>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-medium"
                    onClick={() => toggleSort("parent")}
                  >
                    نقش والد
                    <SortIcon k="parent" />
                  </button>
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-medium"
                    onClick={() => toggleSort("perms")}
                  >
                    مجوزها
                    <SortIcon k="perms" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-medium"
                    onClick={() => toggleSort("status")}
                  >
                    وضعیت
                    <SortIcon k="status" />
                  </button>
                </TableHead>
                <TableHead className="w-[1%] text-end">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <EmptyState
                      title={isFiltered ? "نتیجه‌ای پیدا نشد" : "هنوز نقشی تعریف نشده"}
                      description={
                        isFiltered
                          ? "عبارت جستجو یا فیلتر را تغییر دهید."
                          : "اولین نقش سازمان را بسازید تا بتوانید به کاربران اختصاص دهید."
                      }
                      className="border-0 py-12"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((row) => {
                  const depth = depthOf(row, byId);
                  const active = Number(row.status) === 1 || row.status === undefined;
                  return (
                    <TableRow key={row.tenant_role_id} data-state={selected.has(row.tenant_role_id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(row.tenant_role_id)}
                          onCheckedChange={(v) => {
                            setSelected((s) => {
                              const n = new Set(s);
                              if (v) n.add(row.tenant_role_id);
                              else n.delete(row.tenant_role_id);
                              return n;
                            });
                          }}
                          aria-label={`انتخاب ${row.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-1" style={{ paddingInlineStart: depth * 12 }}>
                          {depth > 0 ? (
                            <span className="text-muted-foreground/60" aria-hidden>
                              └
                            </span>
                          ) : null}
                          <div className="min-w-0">
                            <div className="truncate font-medium">{row.name}</div>
                            {row.description?.trim() ? (
                              <div className="truncate text-xs text-muted-foreground">
                                {row.description}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {parentName(row, byId)}
                      </TableCell>
                      <TableCell className="hidden tabular-nums text-sm sm:table-cell">
                        {toFaDigits(permCount(row))}
                      </TableCell>
                      <TableCell>
                        {active ? (
                          <StatusChip label="فعال" tone="success" />
                        ) : (
                          <StatusChip label="غیرفعال" tone="neutral" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-0.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                <Link href={`/dashboard/identity/roles/${row.tenant_role_id}`}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>جزئیات و مجوزها</TooltipContent>
                          </Tooltip>
                          {canCreate ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => openCreate(row.tenant_role_id)}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>زیرنقش جدید</TooltipContent>
                            </Tooltip>
                          ) : null}
                          {canUpdate ? (
                            active ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    disabled={updateMutation.isPending}
                                    onClick={() => void deactivateOne(row)}
                                  >
                                    <UserMinus className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>غیرفعال</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    disabled={updateMutation.isPending}
                                    onClick={() => void activateOne(row)}
                                  >
                                    <UserCheck className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>فعال</TooltipContent>
                              </Tooltip>
                            )
                          ) : null}
                          {canDelete ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                  disabled={deleteMutation.isPending}
                                  onClick={() => void deleteOne(row)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>حذف</TooltipContent>
                            </Tooltip>
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

        {total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
              صفحه {toFaDigits(safePage)} از {toFaDigits(totalPages)} · {toFaDigits(total)} مورد
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
                  {[10, 20, 50].map((n) => (
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
                قبلی
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                بعدی
              </Button>
            </div>
          </div>
        ) : null}

        <RoleCreateDrawer
          open={createOpen}
          onOpenChange={setCreateOpen}
          defaultParentId={defaultParentId}
          onCreated={(id) => {
            window.location.href = `/dashboard/identity/roles/${id}`;
          }}
        />
      </div>
    </TooltipProvider>
  );
}
