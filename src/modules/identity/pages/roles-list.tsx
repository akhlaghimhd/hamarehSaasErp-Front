/** FE-P1-T11 — مدیریت نقش‌ها: پنل درختی (راست) + مجوزهای نقش انتخاب‌شده (چپ) */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  Loader2,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserMinus,
  X,
  Save,
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
  useRole,
  useSoftDeleteRole,
  useUpdateRole,
  useAssignPermissionsToRole,
} from "../hooks/use-roles";
import { usePermissions } from "../hooks/use-permissions";
import { IdentityPermissions } from "../types";
import type { RoleDto } from "../services/role-service";
import { MSG_LOAD_ERROR, MSG_NO_ACCESS, MSG_GENERIC_ERROR } from "../lib/ui-copy";
import { RoleCreateDrawer } from "../components/role-create-drawer";

type StatusFilter = "all" | "active" | "inactive";

type TreeNode = {
  role: RoleDto;
  children: TreeNode[];
  depth: number;
};

/** Horizontal indent per tree level (px). */
const TREE_INDENT = 22;

function buildChildrenMap(roles: RoleDto[]): Map<string | null, RoleDto[]> {
  const map = new Map<string | null, RoleDto[]>();
  const ids = new Set(roles.map((r) => r.tenant_role_id));
  for (const r of roles) {
    let key: string | null = r.parent_role_id ?? null;
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

function buildTree(roles: RoleDto[]): TreeNode[] {
  const children = buildChildrenMap(roles);
  const walk = (
    parentId: string | null,
    depth: number,
    path: Set<string>
  ): TreeNode[] => {
    const kids = children.get(parentId) ?? [];
    const out: TreeNode[] = [];
    for (const r of kids) {
      if (path.has(r.tenant_role_id)) continue;
      const next = new Set(path);
      next.add(r.tenant_role_id);
      out.push({
        role: r,
        depth,
        children: walk(r.tenant_role_id, depth + 1, next),
      });
    }
    return out;
  };
  return walk(null, 0, new Set());
}

function matchesRole(r: RoleDto, q: string, status: StatusFilter): boolean {
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

function filterRolesKeepAncestors(
  roles: RoleDto[],
  q: string,
  status: StatusFilter
): RoleDto[] {
  if (!q && status === "all") return roles;
  const byId = new Map(roles.map((r) => [r.tenant_role_id, r]));
  const keep = new Set<string>();
  for (const r of roles) {
    if (!matchesRole(r, q, status)) continue;
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

/**
 * Classic file-tree row:
 * - continuous pale vertical lines through ancestors that still have siblings below
 * - elbow (vertical + horizontal) into this node
 * - expand chevron only when node has children
 */
function RoleTreeItem({
  node,
  isLast,
  ancestorContinues,
  expanded,
  selectedId,
  searching,
  onToggleExpand,
  onSelect,
  canCreate,
  canUpdate,
  canDelete,
  bulkBusy,
  onCreateChild,
  onActivate,
  onDeactivate,
  onDelete,
}: {
  node: TreeNode;
  isLast: boolean;
  /** For each depth 0..depth-1: should the vertical guide continue past this row? */
  ancestorContinues: boolean[];
  expanded: Set<string>;
  selectedId: string | null;
  searching: boolean;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  bulkBusy: boolean;
  onCreateChild: (parentId: string) => void;
  onActivate: (role: RoleDto) => void;
  onDeactivate: (role: RoleDto) => void;
  onDelete: (role: RoleDto) => void;
}) {
  const { role, children, depth } = node;
  const hasChildren = children.length > 0;
  const open = searching || expanded.has(role.tenant_role_id);
  const isSelected = selectedId === role.tenant_role_id;
  const isActive = role.status === undefined || Number(role.status) === 1;

  return (
    <div className="select-none">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(role.tenant_role_id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(role.tenant_role_id);
          }
        }}
        className={cn(
          "group relative flex min-h-[2.75rem] items-center gap-1 rounded-md pe-1 transition-colors",
          isSelected
            ? "bg-primary/10 ring-1 ring-inset ring-primary/25"
            : "hover:bg-muted/50"
        )}
      >
        {/* Tree guide gutters */}
        <div
          className="relative flex shrink-0 self-stretch"
          style={{ width: depth * TREE_INDENT + TREE_INDENT }}
          aria-hidden
        >
          {ancestorContinues.map((continues, i) => (
            <span
              key={i}
              className="absolute top-0 bottom-0 w-px bg-border/70"
              style={{
                insetInlineStart: i * TREE_INDENT + TREE_INDENT / 2,
                opacity: continues ? 1 : 0,
              }}
            />
          ))}
          {depth > 0 ? (
            <>
              {/* vertical segment into this node (full height if not last, half if last) */}
              <span
                className="absolute w-px bg-border/70"
                style={{
                  insetInlineStart: (depth - 1) * TREE_INDENT + TREE_INDENT / 2,
                  top: 0,
                  bottom: isLast ? "50%" : 0,
                }}
              />
              {/* horizontal elbow */}
              <span
                className="absolute h-px bg-border/70"
                style={{
                  insetInlineStart: (depth - 1) * TREE_INDENT + TREE_INDENT / 2,
                  width: TREE_INDENT / 2,
                  top: "50%",
                }}
              />
            </>
          ) : null}
          {/* expand control column at this depth */}
          <div
            className="absolute top-1/2 z-[1] flex -translate-y-1/2 items-center justify-center"
            style={{
              insetInlineStart: depth * TREE_INDENT,
              width: TREE_INDENT,
            }}
          >
            {hasChildren ? (
              <button
                type="button"
                className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!searching) onToggleExpand(role.tenant_role_id);
                }}
                aria-label={open ? "جمع کردن" : "باز کردن"}
                disabled={searching}
              >
                {open ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronLeft className="h-3 w-3" />
                )}
              </button>
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-border" />
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1 py-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-medium">{role.name}</span>
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
                ({toFaDigits(children.length)})
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {isActive ? (
              <StatusChip label="فعال" tone="success" />
            ) : (
              <StatusChip label="غیرفعال" tone="neutral" />
            )}
            {(role.permissions?.length ?? 0) > 0 ? (
              <span className="text-[10px] text-muted-foreground">
                {toFaDigits(role.permissions!.length)} مجوز
              </span>
            ) : null}
          </div>
        </div>

        <div
          className="flex shrink-0 items-center gap-0.5 opacity-60 group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          {canCreate ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={bulkBusy}
                  onClick={() => onCreateChild(role.tenant_role_id)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>زیرنقش</TooltipContent>
            </Tooltip>
          ) : null}
          {canUpdate ? (
            isActive ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={bulkBusy}
                    onClick={() => onDeactivate(role)}
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
                    disabled={bulkBusy}
                    onClick={() => onActivate(role)}
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
                  disabled={bulkBusy}
                  onClick={() => onDelete(role)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>حذف</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </div>

      {hasChildren && open
        ? children.map((child, idx) => (
            <RoleTreeItem
              key={child.role.tenant_role_id}
              node={child}
              isLast={idx === children.length - 1}
              ancestorContinues={[...ancestorContinues, !isLast]}
              expanded={expanded}
              selectedId={selectedId}
              searching={searching}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              canCreate={canCreate}
              canUpdate={canUpdate}
              canDelete={canDelete}
              bulkBusy={bulkBusy}
              onCreateChild={onCreateChild}
              onActivate={onActivate}
              onDeactivate={onDeactivate}
              onDelete={onDelete}
            />
          ))
        : null}
    </div>
  );
}

function PermissionModuleGroup({
  moduleName,
  permissions,
  draftPerms,
  canAssign,
  busy,
  defaultOpen,
  onToggle,
}: {
  moduleName: string;
  permissions: Array<{
    tenant_permission_id: string;
    name: string;
    code?: string;
  }>;
  draftPerms: Set<string>;
  canAssign: boolean;
  busy: boolean;
  defaultOpen: boolean;
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const selectedInGroup = permissions.filter((p) =>
    draftPerms.has(p.tenant_permission_id)
  ).length;

  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <button
        type="button"
        className="flex w-full items-center gap-2 bg-muted/25 px-3 py-2 text-start hover:bg-muted/40"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1 truncate text-xs font-semibold">
          {moduleName}
        </span>
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {toFaDigits(selectedInGroup)}/{toFaDigits(permissions.length)}
        </span>
      </button>
      {open ? (
        <div className="space-y-1 border-t border-border/50 p-2">
          {permissions.map((p) => {
            const checked = draftPerms.has(p.tenant_permission_id);
            return (
              <label
                key={p.tenant_permission_id}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  checked ? "bg-primary/5" : "hover:bg-muted/40",
                  !canAssign && "cursor-default opacity-80"
                )}
              >
                <Checkbox
                  className="mt-0.5"
                  checked={checked}
                  onCheckedChange={() =>
                    canAssign && onToggle(p.tenant_permission_id)
                  }
                  disabled={!canAssign || busy}
                />
                <span className="min-w-0 leading-snug">
                  <span className="font-medium">{p.name}</span>
                  {p.code ? (
                    <span className="ms-1.5 font-mono text-[10px] text-muted-foreground">
                      {p.code}
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function RolesListPage() {
  const canView = usePermission(IdentityPermissions.roleView);
  const canCreate = usePermission(IdentityPermissions.roleCreate);
  const canUpdate = usePermission(IdentityPermissions.roleUpdate);
  const canDelete = usePermission(IdentityPermissions.roleDelete);
  const canAssignPerms = usePermission(
    IdentityPermissions.roleAssignPermissions
  );

  const { data, isLoading, isError, error, refetch, isFetching } = useRoles();
  const { data: allPerms, isLoading: permsLoading } = usePermissions();
  const updateMutation = useUpdateRole();
  const deleteMutation = useSoftDeleteRole();
  const assignMutation = useAssignPermissionsToRole();

  const [roleQuery, setRoleQuery] = useState("");
  const [permQuery, setPermQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [draftPerms, setDraftPerms] = useState<Set<string>>(new Set());
  const [permsDirty, setPermsDirty] = useState(false);
  const expandedInitRef = useRef(false);

  const rows = data ?? [];

  const {
    data: selectedRoleDetail,
    isLoading: detailLoading,
    isFetching: detailFetching,
    refetch: refetchDetail,
  } = useRole(selectedId);

  useEffect(() => {
    if (expandedInitRef.current || !rows.length) return;
    expandedInitRef.current = true;
    const children = buildChildrenMap(rows);
    const rootsWithKids = new Set<string>();
    for (const r of rows) {
      if ((children.get(r.tenant_role_id) ?? []).length) {
        rootsWithKids.add(r.tenant_role_id);
      }
    }
    setExpanded(rootsWithKids);
  }, [rows]);

  useEffect(() => {
    if (!rows.length) {
      setSelectedId(null);
      return;
    }
    if (selectedId && rows.some((r) => r.tenant_role_id === selectedId)) return;
    setSelectedId(rows[0].tenant_role_id);
  }, [rows, selectedId]);

  useEffect(() => {
    if (!selectedRoleDetail) {
      setDraftPerms(new Set());
      setPermsDirty(false);
      return;
    }
    const ids = (selectedRoleDetail.permissions ?? [])
      .map((p) => p.tenant_permission_id)
      .filter(Boolean);
    setDraftPerms(new Set(ids));
    setPermsDirty(false);
  }, [selectedRoleDetail?.tenant_role_id, selectedRoleDetail?.permissions]);

  const filteredRoles = useMemo(
    () =>
      filterRolesKeepAncestors(
        rows,
        roleQuery.trim().toLowerCase(),
        statusFilter
      ),
    [rows, roleQuery, statusFilter]
  );

  const tree = useMemo(() => buildTree(filteredRoles), [filteredRoles]);
  const searchingRoles =
    roleQuery.trim().length > 0 || statusFilter !== "all";

  const filteredPerms = useMemo(() => {
    const list = allPerms ?? [];
    const q = permQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) =>
      [p.name, p.code, p.module_name, p.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [allPerms, permQuery]);

  const permsByModule = useMemo(() => {
    const map = new Map<string, typeof filteredPerms>();
    for (const p of filteredPerms) {
      const mod = p.module_name?.trim() || "سایر";
      const list = map.get(mod) ?? [];
      list.push(p);
      map.set(mod, list);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], "fa")
    );
  }, [filteredPerms]);

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
    const children = buildChildrenMap(filteredRoles);
    for (const r of filteredRoles) {
      if ((children.get(r.tenant_role_id) ?? []).length)
        all.add(r.tenant_role_id);
    }
    setExpanded(all);
  };

  const collapseAll = () => setExpanded(new Set());

  const selectRole = (id: string) => {
    if (permsDirty && selectedId && selectedId !== id) {
      if (
        !window.confirm(
          "تغییرات مجوز ذخیره نشده. بدون ذخیره نقش دیگری انتخاب شود؟"
        )
      ) {
        return;
      }
    }
    setSelectedId(id);
  };

  const activateOne = async (row: RoleDto) => {
    try {
      await updateMutation.mutateAsync({
        id: row.tenant_role_id,
        payload: { status: 1 },
      });
      toast.success("نقش فعال شد");
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message
          ? e.message
          : "فعال‌سازی ممکن نشد"
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
        e instanceof ApiClientError && e.message
          ? e.message
          : "غیرفعال‌سازی ممکن نشد"
      );
    }
  };

  const deleteOne = async (row: RoleDto) => {
    if (!window.confirm(`نقش «${row.name}» حذف نرم شود؟`)) return;
    try {
      await deleteMutation.mutateAsync(row.tenant_role_id);
      toast.success("نقش حذف شد");
      if (selectedId === row.tenant_role_id) setSelectedId(null);
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : "حذف ممکن نشد"
      );
    }
  };

  const openCreate = (parentId?: string | null) => {
    setDefaultParentId(parentId ?? null);
    setCreateOpen(true);
  };

  const togglePerm = (id: string) => {
    setDraftPerms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setPermsDirty(true);
  };

  const savePermissions = async () => {
    if (!selectedId) return;
    try {
      await assignMutation.mutateAsync({
        tenantRoleId: selectedId,
        permissionIds: Array.from(draftPerms),
      });
      toast.success("مجوزهای نقش ذخیره شد");
      setPermsDirty(false);
      void refetchDetail();
      void refetch();
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message
          ? e.message
          : MSG_GENERIC_ERROR
      );
    }
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

  const selectedName =
    selectedRoleDetail?.name ??
    rows.find((r) => r.tenant_role_id === selectedId)?.name ??
    null;

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex min-h-0 flex-col gap-3">
        <PageHeader
          title="نقش‌ها"
          description="درخت نقش‌ها در سمت راست؛ مجوزهای نقش انتخاب‌شده در سمت چپ"
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

        <div className="grid min-h-[calc(100vh-12rem)] grid-cols-1 gap-3 lg:grid-cols-2">
          {/* راست: درخت نقش */}
          <section className="flex min-h-[20rem] flex-col overflow-hidden rounded-xl border border-border/70 bg-card lg:order-1">
            <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/20 px-3 py-2.5">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">نقش‌ها</h2>
              <span className="text-xs text-muted-foreground">
                {toFaDigits(filteredRoles.length)} مورد
              </span>
              {isFetching && !isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : null}
              <div className="ms-auto flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={expandAll}
                >
                  باز کردن همه
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={collapseAll}
                >
                  جمع کردن
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-border/40 px-3 py-2">
              <div className="relative min-w-[10rem] flex-1">
                <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className={cn("h-8 ps-8 text-sm", roleQuery && "pe-8")}
                  placeholder="جستجوی نقش…"
                  value={roleQuery}
                  onChange={(e) => setRoleQuery(e.target.value)}
                />
                {roleQuery ? (
                  <button
                    type="button"
                    className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="پاک کردن"
                    onClick={() => setRoleQuery("")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger className="h-8 w-[8rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                  <SelectItem value="active">فعال</SelectItem>
                  <SelectItem value="inactive">غیرفعال</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {isLoading ? (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : tree.length === 0 ? (
                <EmptyState
                  title={
                    searchingRoles ? "نتیجه‌ای پیدا نشد" : "هنوز نقشی تعریف نشده"
                  }
                  description={
                    searchingRoles
                      ? "عبارت یا فیلتر را تغییر دهید"
                      : canCreate
                        ? "با دکمه «نقش جدید» اولین نقش را بسازید"
                        : undefined
                  }
                />
              ) : (
                <div>
                  {tree.map((node, idx) => (
                    <RoleTreeItem
                      key={node.role.tenant_role_id}
                      node={node}
                      isLast={idx === tree.length - 1}
                      ancestorContinues={[]}
                      expanded={expanded}
                      selectedId={selectedId}
                      searching={searchingRoles}
                      onToggleExpand={toggleExpand}
                      onSelect={selectRole}
                      canCreate={canCreate}
                      canUpdate={canUpdate}
                      canDelete={canDelete}
                      bulkBusy={
                        updateMutation.isPending || deleteMutation.isPending
                      }
                      onCreateChild={(id) => openCreate(id)}
                      onActivate={(r) => void activateOne(r)}
                      onDeactivate={(r) => void deactivateOne(r)}
                      onDelete={(r) => void deleteOne(r)}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* چپ: مجوزها */}
          <section className="flex min-h-[20rem] flex-col overflow-hidden rounded-xl border border-border/70 bg-card lg:order-2">
            <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/20 px-3 py-2.5">
              <h2 className="text-sm font-semibold">
                {selectedName
                  ? `مجوزهای «${selectedName}»`
                  : "مجوزهای نقش"}
              </h2>
              {detailFetching || detailLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : null}
              <span className="text-xs text-muted-foreground">
                {toFaDigits(draftPerms.size)} انتخاب‌شده
              </span>
              {permsDirty ? (
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                  ذخیره‌نشده
                </span>
              ) : null}
              <div className="ms-auto flex gap-1">
                {canAssignPerms && selectedId ? (
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 gap-1"
                    disabled={!permsDirty || assignMutation.isPending}
                    onClick={() => void savePermissions()}
                  >
                    {assignMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    ذخیره
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="border-b border-border/40 px-3 py-2">
              <div className="relative">
                <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className={cn("h-8 ps-8 text-sm", permQuery && "pe-8")}
                  placeholder="جستجوی مجوز…"
                  value={permQuery}
                  onChange={(e) => setPermQuery(e.target.value)}
                  disabled={!selectedId}
                />
                {permQuery ? (
                  <button
                    type="button"
                    className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="پاک کردن"
                    onClick={() => setPermQuery("")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                هر ماژول را باز کنید، تیک بزنید، سپس ذخیره. مجوز هر نقش مستقل
                است.
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {!selectedId ? (
                <EmptyState
                  title="نقشی انتخاب نشده"
                  description="از پنل راست یک نقش را انتخاب کنید"
                />
              ) : detailLoading && !selectedRoleDetail ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : permsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredPerms.length === 0 ? (
                <EmptyState
                  title={
                    permQuery.trim()
                      ? "مجوزی با این جستجو نیست"
                      : "هنوز مجوزی تعریف نشده"
                  }
                />
              ) : (
                <div className="space-y-2">
                  {permsByModule.map(([mod, list], idx) => (
                    <PermissionModuleGroup
                      key={mod}
                      moduleName={mod}
                      permissions={list}
                      draftPerms={draftPerms}
                      canAssign={canAssignPerms}
                      busy={assignMutation.isPending}
                      defaultOpen={idx === 0 || Boolean(permQuery.trim())}
                      onToggle={togglePerm}
                    />
                  ))}
                </div>
              )}
            </div>

            {canAssignPerms && selectedId && permsDirty ? (
              <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-muted/20 px-3 py-2">
                <span className="text-xs text-muted-foreground">
                  تغییرات ذخیره نشده
                </span>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 gap-1.5"
                  disabled={assignMutation.isPending}
                  onClick={() => void savePermissions()}
                >
                  {assignMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  ذخیره مجوزها
                </Button>
              </div>
            ) : null}
          </section>
        </div>

        <RoleCreateDrawer
          open={createOpen}
          onOpenChange={setCreateOpen}
          defaultParentId={defaultParentId}
          onCreated={(role) => {
            if (role.parent_role_id) {
              setExpanded((prev) => new Set([...prev, role.parent_role_id!]));
            }
            setSelectedId(role.tenant_role_id);
            void refetch();
          }}
        />
      </div>
    </TooltipProvider>
  );
}
