/** FE-P1-T11 — فهرست نقش‌ها به‌صورت درخت سلسله‌مراتبی */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
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
type BulkKind = "activate" | "deactivate" | "delete";

type FlatNode = {
  role: RoleDto;
  depth: number;
  hasChildren: boolean;
};

function buildChildrenMap(roles: RoleDto[]): Map<string | null, RoleDto[]> {
  const map = new Map<string | null, RoleDto[]>();
  const ids = new Set(roles.map((r) => r.tenant_role_id));
  for (const r of roles) {
    let key: string | null = r.parent_role_id ?? null;
    // orphan: parent not in current list → treat as root
    if (key && !ids.has(key)) key = null;
    const list = map.get(key) ?? [];
    list.push(r);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "fa"));
  }
  return map;
}

function flattenTree(
  roles: RoleDto[],
  expanded: Set<string>,
  forceExpandAll: boolean
): FlatNode[] {
  const children = buildChildrenMap(roles);
  const out: FlatNode[] = [];
  const walk = (parentId: string | null, depth: number, path: Set<string>) => {
    const kids = children.get(parentId) ?? [];
    for (const r of kids) {
      if (path.has(r.tenant_role_id)) continue;
      const childList = children.get(r.tenant_role_id) ?? [];
      const hasChildren = childList.length > 0;
      out.push({ role: r, depth, hasChildren });
      const open = forceExpandAll || expanded.has(r.tenant_role_id);
      if (hasChildren && open) {
        const next = new Set(path);
        next.add(r.tenant_role_id);
        walk(r.tenant_role_id, depth + 1, next);
      }
    }
  };
  walk(null, 0, new Set());
  return out;
}

function matchesFilter(r: RoleDto, q: string, status: StatusFilter): boolean {
  const st = Number(r.status);
  if (status === "active" && r.status !== undefined && st !== 1) return false;
  if (status === "inactive" && st !== 0) return false;
  if (!q) return true;
  return [r.name, r.description, r.code]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(q);
}

/** Keep ancestors of matching nodes so tree context remains visible. */
function filterRolesKeepAncestors(
  roles: RoleDto[],
  q: string,
  status: StatusFilter
): RoleDto[] {
  if (!q && status === "all") return roles;
  const byId = new Map(roles.map((r) => [r.tenant_role_id, r]));
  const keep = new Set<string>();
  for (const r of roles) {
    if (!matchesFilter(r, q, status)) continue;
    keep.add(r.tenant_role_id);
    let pid = r.parent_role_id;
    const seen = new Set<string>();
    while (pid && !seen.has(pid)) {
      seen.add(pid);
      keep.add(pid);
      pid = byId.get(pid)?.parent_role_id ?? null;
    }
  }
  return roles.filter((r) => keep.has(r.tenant_role_id));
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const cancelRef = useRef(false);
  const expandedInitRef = useRef(false);

  const rows = data ?? [];

  // Expand all roots (and first level) once data arrives
  useEffect(() => {
    if (expandedInitRef.current || !rows.length) return;
    expandedInitRef.current = true;
    const rootsWithKids = new Set<string>();
    const children = buildChildrenMap(rows);
    for (const r of rows) {
      const kids = children.get(r.tenant_role_id) ?? [];
      if (kids.length) rootsWithKids.add(r.tenant_role_id);
    }
    setExpanded(rootsWithKids);
  }, [rows]);

  const filtered = useMemo(
    () => filterRolesKeepAncestors(rows, query.trim().toLowerCase(), statusFilter),
    [rows, query, statusFilter]
  );

  const searching = query.trim().length > 0 || statusFilter !== "all";
  const flat = useMemo(
    () => flattenTree(filtered, expanded, searching),
    [filtered, expanded, searching]
  );

  const total = filtered.length;
  const visibleIds = flat.map((n) => n.role.tenant_role_id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someVisibleSelected = visibleIds.some((id) => selected.has(id));

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<string>();
    const children = buildChildrenMap(filtered);
    for (const r of filtered) {
      if ((children.get(r.tenant_role_id) ?? []).length) all.add(r.tenant_role_id);
    }
    setExpanded(all);
  };

  const collapseAll = () => setExpanded(new Set());

  const activateOne = async (row: RoleDto) => {
    try {
      await updateMutation.mutateAsync({
        id: row.tenant_role_id,
        payload: { status: 1 },
      });
      toast.success("نقش فعال شد");
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : "فعال‌سازی ممکن نشد"
      );
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
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : "غیرفعال‌سازی ممکن نشد"
      );
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
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : "حذف ممکن نشد"
      );
    }
  };

  const runBulk = async (kind: BulkKind) => {
    const targets = filtered.filter((r) => selected.has(r.tenant_role_id));
    if (!targets.length) return;
    if (
      kind === "delete" &&
      !window.confirm(`${toFaDigits(targets.length)} نقش حذف نرم شوند؟`)
    ) {
      return;
    }
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
        if (kind === "activate") {
          await updateMutation.mutateAsync({
            id: r.tenant_role_id,
            payload: { status: 1 },
          });
        } else if (kind === "deactivate") {
          await updateMutation.mutateAsync({
            id: r.tenant_role_id,
            payload: { status: 0 },
          });
        } else {
          await deleteMutation.mutateAsync(r.tenant_role_id);
        }
        ok += 1;
      } catch {
        fail += 1;
      }
      setBulkProgress({ done: i + 1, total: targets.length });
    }
    setBulkBusy(false);
    setSelected(new Set());
    if (cancelled) {
      toast.message(
        `عملیات متوقف شد · انجام‌شده: ${toFaDigits(ok)} · باقی‌مانده انجام نشد`
      );
    } else if (ok) {
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
          description="سلسله‌مراتب نقش‌های سازمان؛ هر نقش مجوز مستقل دارد"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "نقش‌ها" },
          ]}
          actions={
            canCreate ? (
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => openCreate(null)}
              >
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
              className={cn("h-8 ps-8 text-sm", query && "pe-8")}
              placeholder="جستجوی نام نقش…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query ? (
              <button
                type="button"
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="پاک کردن جستجو"
                onClick={() => setQuery("")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
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
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={expandAll}>
            باز کردن همه
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-8" onClick={collapseAll}>
            جمع کردن
          </Button>
          <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <Shield className="h-3.5 w-3.5" />
            <span>{toFaDigits(total)} نقش</span>
          </div>
          {isFetching && !isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        {bulkBusy ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>
              در حال انجام… {toFaDigits(bulkProgress.done)} از{" "}
              {toFaDigits(bulkProgress.total)}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7"
              onClick={() => {
                cancelRef.current = true;
              }}
            >
              توقف / انصراف
            </Button>
          </div>
        ) : null}

        {selected.size > 0 && !bulkBusy ? (
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
          <div className="flex items-center gap-2 border-b border-border/60 bg-muted/20 px-3 py-2 text-xs font-medium text-muted-foreground">
            <div className="w-8 shrink-0">
              <Checkbox
                checked={
                  allVisibleSelected
                    ? true
                    : someVisibleSelected
                      ? "indeterminate"
                      : false
                }
                onCheckedChange={(v) => {
                  if (v) setSelected((s) => new Set([...s, ...visibleIds]));
                  else
                    setSelected((s) => {
                      const n = new Set(s);
                      visibleIds.forEach((id) => n.delete(id));
                      return n;
                    });
                }}
                aria-label="انتخاب همهٔ نمایش‌داده‌شده"
              />
            </div>
            <div className="min-w-0 flex-1">نام نقش</div>
            <div className="hidden w-20 shrink-0 text-center sm:block">مجوز</div>
            <div className="w-20 shrink-0 text-center">وضعیت</div>
            <div className="w-[7.5rem] shrink-0 text-end">عملیات</div>
          </div>

          {isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : flat.length === 0 ? (
            <EmptyState
              title={searching ? "نتیجه‌ای پیدا نشد" : "هنوز نقشی تعریف نشده"}
              description={
                searching
                  ? "عبارت جستجو یا فیلتر را تغییر دهید."
                  : "اولین نقش سازمان را بسازید."
              }
              className="border-0 py-12"
            />
          ) : (
            <ul className="divide-y divide-border/50">
              {flat.map(({ role, depth, hasChildren }) => {
                const active =
                  Number(role.status) === 1 || role.status === undefined;
                const open = searching || expanded.has(role.tenant_role_id);
                const perms = role.permissions?.length ?? 0;
                return (
                  <li
                    key={role.tenant_role_id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/40",
                      selected.has(role.tenant_role_id) && "bg-muted/50"
                    )}
                  >
                    <div className="w-8 shrink-0">
                      <Checkbox
                        checked={selected.has(role.tenant_role_id)}
                        onCheckedChange={(v) => {
                          setSelected((s) => {
                            const n = new Set(s);
                            if (v) n.add(role.tenant_role_id);
                            else n.delete(role.tenant_role_id);
                            return n;
                          });
                        }}
                        aria-label={`انتخاب ${role.name}`}
                      />
                    </div>

                    <div
                      className="flex min-w-0 flex-1 items-center gap-1"
                      style={{ paddingInlineStart: depth * 16 }}
                    >
                      {hasChildren ? (
                        <button
                          type="button"
                          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-muted"
                          onClick={() => toggleExpand(role.tenant_role_id)}
                          aria-label={open ? "جمع کردن" : "باز کردن"}
                          disabled={searching}
                        >
                          {open ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronLeft className="h-3.5 w-3.5" />
                          )}
                        </button>
                      ) : (
                        <span className="inline-block h-6 w-6 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate font-medium">{role.name}</span>
                          {depth === 0 ? (
                            <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300">
                              ریشه
                            </span>
                          ) : (
                            <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
                              زیرنقش
                            </span>
                          )}
                          {hasChildren ? (
                            <span className="text-[10px] text-muted-foreground">
                              ({toFaDigits((buildChildrenMap(filtered).get(role.tenant_role_id) ?? []).length)} زیرمجموعه)
                            </span>
                          ) : null}
                        </div>
                        {role.description?.trim() ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {role.description}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="hidden w-20 shrink-0 text-center tabular-nums text-muted-foreground sm:block">
                      {toFaDigits(perms)}
                    </div>
                    <div className="flex w-20 shrink-0 justify-center">
                      {active ? (
                        <StatusChip label="فعال" tone="success" />
                      ) : (
                        <StatusChip label="غیرفعال" tone="neutral" />
                      )}
                    </div>
                    <div className="flex w-[7.5rem] shrink-0 items-center justify-end gap-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <Link href={`/dashboard/identity/roles/${role.tenant_role_id}`}>
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
                              disabled={bulkBusy}
                              onClick={() => openCreate(role.tenant_role_id)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>زیرنقش زیر «{role.name}»</TooltipContent>
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
                                disabled={bulkBusy || updateMutation.isPending}
                                onClick={() => void deactivateOne(role)}
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
                                disabled={bulkBusy || updateMutation.isPending}
                                onClick={() => void activateOne(role)}
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
                              disabled={bulkBusy || deleteMutation.isPending}
                              onClick={() => void deleteOne(role)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>حذف</TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <RoleCreateDrawer
          open={createOpen}
          onOpenChange={setCreateOpen}
          defaultParentId={defaultParentId}
          onCreated={(role) => {
            // Stay on list; expand parent so new child is visible
            if (role.parent_role_id) {
              setExpanded((prev) => new Set([...prev, role.parent_role_id!]));
            }
            void refetch();
          }}
        />
      </div>
    </TooltipProvider>
  );
}
