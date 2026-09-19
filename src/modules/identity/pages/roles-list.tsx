/** FE-P1-T11 — مدیریت نقش‌ها: پنل درختی (راست) + مجوزهای نقش انتخاب‌شده (چپ) */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Plus,
  Search,
  Shield,
  X,
  Save,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
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
import {
  RoleTreeItem,
  buildTree,
  buildChildrenMap,
  filterRolesKeepAncestors,
} from "./roles-tree";
import { PermissionModuleGroup } from "./roles-perm-group";
import { localizeModuleName } from "../lib/permission-labels";

type StatusFilter = "all" | "active" | "inactive";

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
  const [baselinePerms, setBaselinePerms] = useState<Set<string>>(new Set());
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
      setBaselinePerms(new Set());
      setPermsDirty(false);
      return;
    }
    const ids = (selectedRoleDetail.permissions ?? [])
      .map((p) => p.tenant_permission_id)
      .filter(Boolean);
    const set = new Set(ids);
    setDraftPerms(set);
    setBaselinePerms(new Set(ids));
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
      [
        p.name,
        p.code,
        p.module_name,
        p.description,
        localizeModuleName(p.module_name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [allPerms, permQuery]);

  const permsByModule = useMemo(() => {
    const map = new Map<string, typeof filteredPerms>();
    for (const p of filteredPerms) {
      const mod = localizeModuleName(p.module_name);
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

  const toggleManyPerms = (ids: string[], checked: boolean) => {
    setDraftPerms((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
    setPermsDirty(true);
  };

  const resetPermissions = () => {
    setDraftPerms(new Set(baselinePerms));
    setPermsDirty(false);
    toast.message("انتخاب مجوزها به آخرین ذخیره برگشت");
  };

  const savePermissions = async () => {
    if (!selectedId) return;
    try {
      await assignMutation.mutateAsync({
        tenantRoleId: selectedId,
        permissionIds: Array.from(draftPerms),
      });
      toast.success("مجوزهای نقش ذخیره شد");
      setBaselinePerms(new Set(draftPerms));
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
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={expandAll}>
                  باز کردن همه
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={collapseAll}>
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
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
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
                  title={searchingRoles ? "نتیجه‌ای پیدا نشد" : "هنوز نقشی تعریف نشده"}
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
                      bulkBusy={updateMutation.isPending || deleteMutation.isPending}
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

          <section className="flex min-h-[20rem] flex-col overflow-hidden rounded-xl border border-border/70 bg-card lg:order-2">
            <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/20 px-3 py-2.5">
              <h2 className="text-sm font-semibold">
                {selectedName ? `مجوزهای «${selectedName}»` : "مجوزهای نقش"}
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
                {canAssignPerms && selectedId && permsDirty ? (
                  <Button type="button" variant="ghost" size="sm" className="h-7 gap-1" disabled={assignMutation.isPending} onClick={resetPermissions}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    انصراف
                  </Button>
                ) : null}
                {canAssignPerms && selectedId ? (
                  <Button type="button" size="sm" className="h-7 gap-1" disabled={!permsDirty || assignMutation.isPending} onClick={() => void savePermissions()}>
                    {assignMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
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
                  <button type="button" className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="پاک کردن" onClick={() => setPermQuery("")}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                هر ماژول را باز کنید، تیک بزنید، سپس ذخیره. برای برگرداندن همه تغییرات از «انصراف» استفاده کنید.
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {!selectedId ? (
                <EmptyState title="نقشی انتخاب نشده" description="از پنل راست یک نقش را انتخاب کنید" />
              ) : detailLoading && !selectedRoleDetail ? (
                <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : permsLoading ? (
                <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : filteredPerms.length === 0 ? (
                <EmptyState title={permQuery.trim() ? "مجوزی با این جستجو نیست" : "هنوز مجوزی تعریف نشده"} />
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
                      onToggleMany={toggleManyPerms}
                    />
                  ))}
                </div>
              )}
            </div>

            {canAssignPerms && selectedId && permsDirty ? (
              <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-muted/20 px-3 py-2">
                <span className="text-xs text-muted-foreground">تغییرات ذخیره نشده</span>
                <div className="flex gap-1.5">
                  <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" disabled={assignMutation.isPending} onClick={resetPermissions}>
                    <RotateCcw className="h-4 w-4" />
                    انصراف
                  </Button>
                  <Button type="button" size="sm" className="h-8 gap-1.5" disabled={assignMutation.isPending} onClick={() => void savePermissions()}>
                    {assignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    ذخیره مجوزها
                  </Button>
                </div>
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
